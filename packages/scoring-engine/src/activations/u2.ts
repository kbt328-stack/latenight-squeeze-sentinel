// u2: New exchange listings in last 30 days
export function activate_u2(newListings: number | null | undefined): number {
  if (newListings == null || isNaN(newListings)) return 0;
  if (newListings >= 3) return 100;
  if (newListings === 2) return 70;
  if (newListings === 1) return 40;
  return 0;
}
