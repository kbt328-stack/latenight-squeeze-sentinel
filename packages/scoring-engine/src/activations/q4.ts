// q4: Same accumulator wallets withdraw from exchange post-pump
export function activate_q4(pctWithdrawn: number | null | undefined): number {
  if (pctWithdrawn == null || isNaN(pctWithdrawn)) return 0;
  if (pctWithdrawn >= 50) return 100;
  if (pctWithdrawn < 5) return 0;
  return Math.round((pctWithdrawn - 5) / 45 * 100);
}
