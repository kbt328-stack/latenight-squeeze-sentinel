// t2: Funding rate deeply negative (annualized %)
export function activate_t2(fundingRateAnnualized: number | null | undefined): number {
  if (fundingRateAnnualized == null || isNaN(fundingRateAnnualized)) return 0;
  if (fundingRateAnnualized >= 0) return 0;
  if (fundingRateAnnualized <= -200) return 100;
  return Math.round(Math.abs(fundingRateAnnualized) / 2);
}
