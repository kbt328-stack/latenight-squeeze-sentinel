// d3: Insider wallets staggered exchange sends (number of distinct sends)
export function activate_d3(staggeredSendCount: number | null | undefined): number {
  if (staggeredSendCount == null || isNaN(staggeredSendCount)) return 0;
  if (staggeredSendCount >= 5) return 100;
  if (staggeredSendCount < 2) return 0;
  return Math.round((staggeredSendCount - 2) / 3 * 100);
}
