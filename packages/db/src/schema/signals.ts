import { pgTable, uuid, text, real, jsonb, timestamp, primaryKey } from 'drizzle-orm/pg-core';

export const signals = pgTable('signals', {
  tokenId: uuid('token_id').notNull(),
  plane: text('plane').notNull(),
  signalId: text('signal_id').notNull(),
  value: real('value').notNull(),
  rawPayload: jsonb('raw_payload'),
  source: text('source').notNull(),
  observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.tokenId, t.signalId, t.observedAt] }),
}));
