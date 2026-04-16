// q2: Funding flips to extreme positive (annualized %)
export function activate_q2(fundingRateAnnualized: number | null | undefined): number {
  if (fundingRateAnnualized == null || isNaN(fundingRateAnnualized)) return 0;
  if (fundingRateAnnualized <= 0) return 0;
  if (fundingRateAnnualized >= 200) return 100;
  return Math.round(fundingRateAnnualized / 2);
}
