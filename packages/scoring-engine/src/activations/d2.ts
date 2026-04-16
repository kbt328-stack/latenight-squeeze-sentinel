// d2: Lower highs on hourly chart (count of lower-high candles in last 12h)
export function activate_d2(lowerHighCount: number | null | undefined): number {
  if (lowerHighCount == null || isNaN(lowerHighCount)) return 0;
  if (lowerHighCount >= 8) return 100;
  if (lowerHighCount < 3) return 0;
  return Math.round((lowerHighCount - 3) / 5 * 100);
}
