// s5: Token age <6 months
export function activate_s5(ageMonths: number | null | undefined): number {
  if (ageMonths == null || isNaN(ageMonths)) return 0;
  if (ageMonths <= 1) return 100;
  if (ageMonths >= 6) return 0;
  return Math.round((6 - ageMonths) / 5 * 100);
}
