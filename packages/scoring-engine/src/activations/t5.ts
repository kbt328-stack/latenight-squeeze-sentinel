// t5: On-chain sleuth posts flagging flows (boolean / count)
export function activate_t5(sleutPostCount: number | null | undefined): number {
  if (sleutPostCount == null || isNaN(sleutPostCount)) return 0;
  if (sleutPostCount >= 3) return 100;
  if (sleutPostCount === 2) return 70;
  if (sleutPostCount === 1) return 40;
  return 0;
}
