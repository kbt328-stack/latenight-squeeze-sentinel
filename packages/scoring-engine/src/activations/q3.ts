// q3: Vertical price action, few large trades (price change % in 1h)
export function activate_q3(priceChange1hPct: number | null | undefined): number {
  if (priceChange1hPct == null || isNaN(priceChange1hPct)) return 0;
  const abs = Math.abs(priceChange1hPct);
  if (abs < 10) return 0;
  if (abs >= 50) return 100;
  return Math.round((abs - 10) / 40 * 100);
}
