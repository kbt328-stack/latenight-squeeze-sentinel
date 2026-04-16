import { pgTable, uuid, text, timestamp, numeric, integer, jsonb, unique } from 'drizzle-orm/pg-core';

export const tokens = pgTable('tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  symbol: text('symbol').notNull(),
  contractAddress: text('contract_address').notNull(),
  chain: text('chain').notNull(),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
  totalSupply: numeric('total_supply'),
  decimals: integer('decimals'),
  metadata: jsonb('metadata'),
}, (t) => ({
  uniqChainContract: unique().on(t.chain, t.contractAddress),
}));
