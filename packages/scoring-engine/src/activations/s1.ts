// s1: Top 3 wallets hold >70% of supply
export function activate_s1(top3PctOfSupply: number | null | undefined): number {
  if (top3PctOfSupply == null || isNaN(top3PctOfSupply)) return 0;
  if (top3PctOfSupply >= 90) return 100;
  if (top3PctOfSupply >= 70) return 50 + (top3PctOfSupply - 70) * 2.5;
  if (top3PctOfSupply >= 50) return (top3PctOfSupply - 50) * 2.5;
  return 0;
}
