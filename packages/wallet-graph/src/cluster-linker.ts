import { logger } from '@sentinel/shared';
import { db, sql } from '@sentinel/db';

export interface ClusterLink {
  walletA: string;
  walletB: string;
  reason: string;
  confidence: number;
}

export interface ClusterResult {
  clusterId: string;
  wallets: string[];
  confidence: number;
  name: string;
}

export async function linkClusters(
  walletAddresses: string[],
  caseName: string,
): Promise<ClusterResult[]> {
  if (walletAddresses.length === 0) return [];

  logger.info({ event: 'cluster_link_start', walletCount: walletAddresses.length, caseName }, 'Running cluster linker');

  const links: ClusterLink[] = [];

  const timingRows = await db.execute<{
    wallet_a: string;
    wallet_b: string;
    token_id: string;
    time_diff_minutes: number;
  }>(
    sql`
      SELECT
        a.wallet_address AS wallet_a,
        b.wallet_address AS wallet_b,
        a.token_id::text,
        EXTRACT(EPOCH FROM ABS(a.snapshot_at - b.snapshot_at)) / 60 AS time_diff_minutes
      FROM wallet_token_positions a
      JOIN wallet_token_positions b
        ON a.token_id = b.token_id
        AND a.wallet_address < b.wallet_address
        AND ABS(EXTRACT(EPOCH FROM (a.snapshot_at - b.snapshot_at))) < 900
      WHERE a.wallet_address = ANY(${walletAddresses})
        AND b.wallet_address = ANY(${walletAddresses})
      GROUP BY a.wallet_address, b.wallet_address, a.token_id, time_diff_minutes
      ORDER BY time_diff_minutes ASC
    `,
  );

  for (const row of timingRows) {
    const confidence = Math.max(0.5, 1 - row.time_diff_minutes / 15);
    links.push({ walletA: row.wallet_a, walletB: row.wallet_b, reason: `correlated_position_timing_${Math.round(row.time_diff_minutes)}min`, confidence });
  }

  const existingRows = await db.execute<{ address: string; entity_cluster_id: string }>(
    sql`SELECT address, entity_cluster_id::text FROM wallets WHERE address = ANY(${walletAddresses}) AND entity_cluster_id IS NOT NULL`,
  );

  const clusterMap = new Map<string, string[]>();
  for (const row of existingRows) {
    if (!clusterMap.has(row.entity_cluster_id)) clusterMap.set(row.entity_cluster_id, []);
    clusterMap.get(row.entity_cluster_id)!.push(row.address);
  }
  for (const [, members] of clusterMap) {
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        links.push({ walletA: members[i]!, walletB: members[j]!, reason: 'existing_cluster_membership', confidence: 0.9 });
      }
    }
  }

  if (links.length === 0) {
    logger.info({ event: 'cluster_link_no_links', caseName }, 'No cluster links found');
    return [];
  }

  const parent = new Map<string, string>();
  function find(x: string): string {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  }
  function union(a: string, b: string) { parent.set(find(a), find(b)); }

  for (const link of links) union(link.walletA, link.walletB);

  const groups = new Map<string, Set<string>>();
  for (const addr of walletAddresses) {
    const root = find(addr);
    if (!groups.has(root)) groups.set(root, new Set());
    groups.get(root)!.add(addr);
  }

  const results: ClusterResult[] = [];

  for (const [, members] of groups) {
    if (members.size < 2) continue;
    const memberList = [...members];
    const relevantLinks = links.filter(l => members.has(l.walletA) && members.has(l.walletB));
    const avgConfidence = relevantLinks.reduce((s, l) => s + l.confidence, 0) / Math.max(1, relevantLinks.length);
    const clusterName = `${caseName}-cluster-${memberList[0]!.slice(2, 8)}`;

    const clusterRows = await db.execute<{ id: string }>(
      sql`INSERT INTO entity_clusters (name, confidence, first_observed_case, created_at) VALUES (${clusterName}, ${avgConfidence}, ${caseName}, NOW()) ON CONFLICT DO NOTHING RETURNING id::text`,
    );

    let clusterId: string;
    if (clusterRows.length > 0 && clusterRows[0]) {
      clusterId = clusterRows[0].id;
    } else {
      const existing = await db.execute<{ id: string }>(sql`SELECT id::text FROM entity_clusters WHERE name = ${clusterName} LIMIT 1`);
      if (!existing[0]) continue;
      clusterId = existing[0].id;
    }

    for (const addr of memberList) {
      await db.execute(
        sql`INSERT INTO wallets (address, chain, labels, entity_cluster_id, last_updated) VALUES (${addr}, 'ethereum', ARRAY[]::text[], ${clusterId}::uuid, NOW()) ON CONFLICT (address) DO UPDATE SET entity_cluster_id = ${clusterId}::uuid, last_updated = NOW()`,
      );
    }

    logger.info({ event: 'cluster_created', clusterId, clusterName, memberCount: memberList.length, confidence: avgConfidence, caseName }, `Cluster ${clusterName} created with ${memberList.length} wallets`);
    results.push({ clusterId, wallets: memberList, confidence: avgConfidence, name: clusterName });
  }

  return results;
}
