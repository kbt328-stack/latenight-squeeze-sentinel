// q1: Short liquidations >3x long liquidations
export function activate_q1(shortToLongLiqRatio: number | null | undefined): number {
  if (shortToLongLiqRatio == null || isNaN(shortToLongLiqRatio)) return 0;
  if (shortToLongLiqRatio < 3) return 0;
  if (shortToLongLiqRatio >= 10) return 100;
  return Math.round((shortToLongLiqRatio - 3) / 7 * 100);
}
