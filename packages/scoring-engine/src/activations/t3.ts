// t3: Short/long ratio >2.0
export function activate_t3(shortLongRatio: number | null | undefined): number {
  if (shortLongRatio == null || isNaN(shortLongRatio)) return 0;
  if (shortLongRatio < 2.0) return 0;
  if (shortLongRatio >= 5.0) return 100;
  return Math.round((shortLongRatio - 2.0) / 3.0 * 100);
}
