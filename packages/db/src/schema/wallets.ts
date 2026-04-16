import { pgTable, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';

export const wallets = pgTable('wallets', {
  address: text('address').primaryKey(),
  chain: text('chain').notNull(),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
  labels: text('labels').array().notNull().default([]),
  entityClusterId: uuid('entity_cluster_id'),
  flags: jsonb('flags'),
  lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow().notNull(),
});
