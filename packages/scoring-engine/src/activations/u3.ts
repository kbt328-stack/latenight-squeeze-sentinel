// u3: Early pump 50-200% before main move
export function activate_u3(pumpPct: number | null | undefined): number {
  if (pumpPct == null || isNaN(pumpPct)) return 0;
  if (pumpPct < 50) return 0;
  if (pumpPct >= 200) return 100;
  return Math.round((pumpPct - 50) / 150 * 100);
}
