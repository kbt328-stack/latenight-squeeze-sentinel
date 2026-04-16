import { pgTable, uuid, timestamp, real, jsonb, text, primaryKey } from 'drizzle-orm/pg-core';

export const scores = pgTable('scores', {
  tokenId: uuid('token_id').notNull(),
  scoredAt: timestamp('scored_at', { withTimezone: true }).notNull(),
  composite: real('composite').notNull(),
  planeScores: jsonb('plane_scores').notNull(),
  band: text('band').notNull(),
  drawdownProbability: real('drawdown_probability').notNull(),
  action: text('action').notNull(),
  contributingSignals: text('contributing_signals').array().notNull().default([]),
}, (t) => ({
  pk: primaryKey({ columns: [t.tokenId, t.scoredAt] }),
}));
