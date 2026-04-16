// s3: Recent perp listing on leverage venue (boolean)
export function activate_s3(hasRecentPerpListing: boolean | null | undefined): number {
  if (hasRecentPerpListing == null) return 0;
  return hasRecentPerpListing ? 100 : 0;
}
