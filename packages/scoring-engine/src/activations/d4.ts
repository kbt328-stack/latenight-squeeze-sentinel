// d4: Narrative retrofitting in news after move (boolean)
export function activate_d4(hasRetrofittedNarrative: boolean | null | undefined): number {
  if (hasRetrofittedNarrative == null) return 0;
  return hasRetrofittedNarrative ? 100 : 0;
}
