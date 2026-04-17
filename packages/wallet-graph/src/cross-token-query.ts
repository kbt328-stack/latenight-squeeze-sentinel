import { logger } from '@sentinel/shared';
import { db, sql } from '@sentinel/db';

export interface CrossTokenHit {
  walletAddress: string;
  tokenId: string;
  tokenSymbol: string;
  labels: string[];
  entityClusterId: string | null;
  firstSeenAt: Date;
}

export interface CrossTokenResult {
  queriedWallets: string[];
  hits: CrossTokenHit[];
  tokenCount: number;
  multiTokenClusters: string[];
}

export async function crossTokenQuery(
  walletAddresses: string[],
  excludeTokenId?: string,
): Promise<CrossTokenResult> {
  if (walletAddresses.length === 0) {
    return { queriedWallets: [], hits: [], tokenCount: 0, multiTokenClusters: [] };
  }

  logger.info({ event: 'cross_token_query_start', walletCount: walletAddresses.length, excludeTokenId }, 'Running cross-token query');

  const excludeFilter = excludeTokenId ? sql`AND wtp.token_id != ${excludeTokenId}::uuid` : sql``;

  const rows = await db.execute<{
    wallet_address: string;
    token_id: string;
    token_symbol: string;
    labels: string[];
    entity_cluster_id: string | null;
    first_seen_at: Date;
  }>(
    sql`
      SELECT
        w.address AS wallet_address,
        wtp.token_id::text,
        t.symbol AS token_symbol,
        w.labels,
        w.entity_cluster_id::text,
        w.first_seen_at
      FROM wallets w
      JOIN wallet_token_positions wtp ON wtp.wallet_address = w.address
      JOIN tokens t ON t.id = wtp.token_id
      WHERE w.address = ANY(${walletAddresses})
        AND (
          'early_accumulator' = ANY(w.labels)
          OR 'insider' = ANY(w.labels)
          OR 'deployer' = ANY(w.labels)
        )
        ${excludeFilter}
      GROUP BY w.address, wtp.token_id, t.symbol, w.labels, w.entity_cluster_id, w.first_seen_at
      ORDER BY w.first_seen_at DESC
    `,
  );

  const hits: CrossTokenHit[] = rows.map(row => ({
    walletAddress: row.wallet_address,
    tokenId: row.token_id,
    tokenSymbol: row.token_symbol,
    labels: row.labels ?? [],
    entityClusterId: row.entity_cluster_id,
    firstSeenAt: new Date(row.first_seen_at),
  }));

  const uniqueTokenIds = new Set(hits.map(h => h.tokenId));
  const clusterTokenCounts = new Map<string, Set<string>>();
  for (const hit of hits) {
    if (!hit.entityClusterId) continue;
    if (!clusterTokenCounts.has(hit.entityClusterId)) clusterTokenCounts.set(hit.entityClusterId, new Set());
    clusterTokenCounts.get(hit.entityClusterId)!.add(hit.tokenId);
  }
  const multiTokenClusters = [...clusterTokenCounts.entries()].filter(([, tokens]) => tokens.size > 1).map(([id]) => id);

  const result: CrossTokenResult = { queriedWallets: walletAddresses, hits, tokenCount: uniqueTokenIds.size, multiTokenClusters };
  logger.info({ event: 'cross_token_query_complete', hitCount: hits.length, uniqueTokens: uniqueTokenIds.size, multiTokenClusters: multiTokenClusters.length }, `Cross-token query: ${hits.length} hits across ${uniqueTokenIds.size} tokens`);
  return result;
}

export async function crossTokenQueryByCluster(
  clusterId: string,
  excludeTokenId?: string,
): Promise<CrossTokenResult> {
  const rows = await db.execute<{ address: string }>(
    sql`SELECT address FROM wallets WHERE entity_cluster_id = ${clusterId}::uuid`,
  );
  return crossTokenQuery(rows.map(r => r.address), excludeTokenId);
}
