// q5: Social volume explosion (normalized 0-100)
export function activate_q5(socialVolumeScore: number | null | undefined): number {
  if (socialVolumeScore == null || isNaN(socialVolumeScore)) return 0;
  return Math.min(100, Math.max(0, Math.round(socialVolumeScore)));
}
