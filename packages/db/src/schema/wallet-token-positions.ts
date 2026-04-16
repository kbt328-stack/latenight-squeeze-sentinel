import { pgTable, text, uuid, timestamp, numeric, real, primaryKey } from 'drizzle-orm/pg-core';

export const walletTokenPositions = pgTable('wallet_token_positions', {
  walletAddress: text('wallet_address').notNull(),
  tokenId: uuid('token_id').notNull(),
  snapshotAt: timestamp('snapshot_at', { withTimezone: true }).notNull(),
  balance: numeric('balance').notNull(),
  pctOfCirculating: real('pct_of_circulating').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.walletAddress, t.tokenId, t.snapshotAt] }),
}));
