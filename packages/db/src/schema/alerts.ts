import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenId: uuid('token_id').notNull(),
  scoreId: uuid('score_id').notNull(),
  severity: text('severity').notNull(),
  channel: text('channel').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  payload: jsonb('payload').notNull(),
  dedupKey: text('dedup_key').unique().notNull(),
});
