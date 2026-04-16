// t1: Accumulator wallets deposit to perp exchange (pct of holdings moved)
export function activate_t1(pctOfHoldingsMoved: number | null | undefined): number {
  if (pctOfHoldingsMoved == null || isNaN(pctOfHoldingsMoved)) return 0;
  if (pctOfHoldingsMoved >= 50) return 100;
  if (pctOfHoldingsMoved < 5) return 0;
  return Math.round((pctOfHoldingsMoved - 5) / 45 * 100);
}
