// s4: Deployer wallet not doxxed / audited (boolean)
export function activate_s4(isUnaudited: boolean | null | undefined): number {
  if (isUnaudited == null) return 0;
  return isUnaudited ? 100 : 0;
}
