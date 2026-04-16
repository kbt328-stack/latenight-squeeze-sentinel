// d1: Price holds but volume fading day-over-day (volume decline %)
export function activate_d1(volumeDeclinePct: number | null | undefined): number {
  if (volumeDeclinePct == null || isNaN(volumeDeclinePct)) return 0;
  if (volumeDeclinePct <= 0) return 0;
  if (volumeDeclinePct >= 70) return 100;
  return Math.round(volumeDeclinePct / 70 * 100);
}
