import { pgTable, uuid, text, timestamp, numeric, real } from 'drizzle-orm/pg-core';

export const backtestCases = pgTable('backtest_cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenSymbol: text('token_symbol').notNull(),
  eventName: text('event_name').notNull(),
  pumpStartAt: timestamp('pump_start_at', { withTimezone: true }).notNull(),
  pumpPeakAt: timestamp('pump_peak_at', { withTimezone: true }).notNull(),
  dumpStartAt: timestamp('dump_start_at', { withTimezone: true }).notNull(),
  peakPriceUsd: numeric('peak_price_usd').notNull(),
  postDumpPriceUsd: numeric('post_dump_price_usd').notNull(),
  drawdownPct: real('drawdown_pct').notNull(),
  labeledInsiderWallets: text('labeled_insider_wallets').array().notNull().default([]),
  notes: text('notes'),
});
