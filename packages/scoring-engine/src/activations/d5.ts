// d5: Retail mentions at all-time high (normalized 0-100)
export function activate_d5(retailMentionScore: number | null | undefined): number {
  if (retailMentionScore == null || isNaN(retailMentionScore)) return 0;
  return Math.min(100, Math.max(0, Math.round(retailMentionScore)));
}
