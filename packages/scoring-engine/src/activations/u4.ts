// u4: Social mention velocity rising (normalized 0-100 velocity score)
export function activate_u4(velocityScore: number | null | undefined): number {
  if (velocityScore == null || isNaN(velocityScore)) return 0;
  return Math.min(100, Math.max(0, Math.round(velocityScore)));
}
