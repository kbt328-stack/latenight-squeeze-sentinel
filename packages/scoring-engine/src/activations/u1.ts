// u1: Non-exchange wallets accumulated >1% of supply at lows
export function activate_u1(accumulatedPct: number | null | undefined): number {
  if (accumulatedPct == null || isNaN(accumulatedPct)) return 0;
  if (accumulatedPct >= 5) return 100;
  if (accumulatedPct < 1) return 0;
  return Math.round((accumulatedPct - 1) / 4 * 100);
}
