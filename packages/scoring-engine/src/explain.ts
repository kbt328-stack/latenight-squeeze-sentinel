import { SIGNALS, type Plane, type SignalId } from "./model.js";
import { type SignalValues } from "./compose.js";

export interface SignalExplanation {
  id: string;
  label: string;
  plane: string;
  value: number;
  weight: number;
  contribution: number;
}

export function explainSignals(signalValues: SignalValues, topN = 5): SignalExplanation[] {
  const results: SignalExplanation[] = [];

  for (const plane of Object.keys(SIGNALS) as Plane[]) {
    for (const signal of SIGNALS[plane]) {
      const value = signalValues[signal.id as SignalId] ?? 0;
      results.push({
        id: signal.id,
        label: signal.label,
        plane,
        value,
        weight: signal.w,
        contribution: value * signal.w,
      });
    }
  }

  return results.sort((a, b) => b.contribution - a.contribution).slice(0, topN);
}
