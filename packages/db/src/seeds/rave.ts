import { db } from '../client.js';
import { tokens, wallets, entityClusters, watchlist, backtestCases } from '../schema/index.js';

export async function seedRave() {
  console.log('Seeding RAVE token...');

  const [token] = await db.insert(tokens).values({
    symbol: 'RAVE',
    contractAddress: '0x17205fab260a7a6383a81452ce6315a39370db97',
    chain: 'ethereum',
    metadata: { name: 'RaveDAO', description: 'Calibration case token' },
  }).onConflictDoNothing().returning();

  console.log('Seeding entity cluster...');

  const [cluster] = await db.insert(entityClusters).values({
    name: 'RAVE Insider Group',
    confidence: 0.95,
    firstObservedCase: 'RAVE-2026-04',
  }).returning();

  console.log('Seeding insider wallets...');

  await db.insert(wallets).values([
    {
      address: '0xdeployer1rave000000000000000000000000000',
      chain: 'ethereum',
      labels: ['deployer', 'early_accumulator'],
      entityClusterId: cluster.id,
      flags: { suspected_insider: true, source: 'rave_apr26' },
    },
    {
      address: '0xdeployer2rave000000000000000000000000000',
      chain: 'ethereum',
      labels: ['deployer', 'early_accumulator'],
      entityClusterId: cluster.id,
      flags: { suspected_insider: true, source: 'rave_apr26' },
    },
    {
      address: '0xaccumulator1rave00000000000000000000000',
      chain: 'ethereum',
      labels: ['early_accumulator'],
      entityClusterId: cluster.id,
      flags: { suspected_insider: true, source: 'rave_apr26' },
    },
  ]).onConflictDoNothing();

  if (token) {
    await db.insert(watchlist).values({
      tokenId: token.id,
      addedBy: 'seed',
    }).onConflictDoNothing();

    await db.insert(backtestCases).values({
      tokenSymbol: 'RAVE',
      eventName: 'RAVE-2026-04',
      pumpStartAt: new Date('2026-04-10T00:00:00Z'),
      pumpPeakAt: new Date('2026-04-12T12:00:00Z'),
      dumpStartAt: new Date('2026-04-12T14:00:00Z'),
      peakPriceUsd: '0.085',
      postDumpPriceUsd: '0.012',
      drawdownPct: 85.9,
      labeledInsiderWallets: [
        '0xdeployer1rave000000000000000000000000000',
        '0xdeployer2rave000000000000000000000000000',
        '0xaccumulator1rave00000000000000000000000',
      ],
      notes: 'Calibration case. System must score composite >=75 at 2026-04-12 09:00 UTC.',
    });
  }

  console.log('RAVE seed complete.');
}
