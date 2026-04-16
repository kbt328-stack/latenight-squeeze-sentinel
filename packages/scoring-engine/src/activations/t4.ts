// t4: Open interest >30% of circulating market cap
export function activate_t4(oiVsMcPct: number | null | undefined): number {
  if (oiVsMcPct == null || isNaN(oiVsMcPct)) return 0;
  if (oiVsMcPct < 30) return 0;
  if (oiVsMcPct >= 100) return 100;
  return Math.round((oiVsMcPct - 30) / 70 * 100);
}
