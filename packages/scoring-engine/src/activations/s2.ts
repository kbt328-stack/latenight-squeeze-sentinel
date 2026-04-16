// s2: Circulating float <30% of total supply
export function activate_s2(circulatingPct: number | null | undefined): number {
  if (circulatingPct == null || isNaN(circulatingPct)) return 0;
  if (circulatingPct <= 10) return 100;
  if (circulatingPct >= 30) return 0;
  return Math.round((30 - circulatingPct) / 20 * 100);
}
