import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const watchlist = pgTable('watchlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenId: uuid('token_id').notNull(),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
  addedBy: text('added_by').notNull().default('system'),
  active: boolean('active').notNull().default(true),
});
