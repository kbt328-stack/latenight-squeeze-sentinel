import { PLANE_WEIGHTS, SIGNALS, type Plane, type SignalId } from "./model.js";
import { getBand, type BandResult } from "./bands.js";

export type SignalValues = Partial<Record<SignalId, number>>;

export interface PlaneScores {
  structural: number;
  setup: number;
  trigger: number;
  squeeze: number;
  distribution: number;
}

export interface CompositeResult extends BandResult {
  composite: number;
  planes: PlaneScores;
  contributingSignals: string[];
}

export function computeComposite(signalValues: SignalValues): CompositeResult {
  const planes = {} as PlaneScores;
  const contributing: string[] = [];

  for (const plane of Object.keys(PLANE_WEIGHTS) as Plane[]) {
    let planeScore = 0;
    for (const signal of SIGNALS[plane]) {
      const value = signalValues[signal.id as SignalId] ?? 0;
      planeScore += value * signal.w;
      if (value >= 50) contributing.push(signal.id);
    }
    planes[plane] = Math.min(100, Math.max(0, planeScore));
  }

  const composite = Object.keys(PLANE_WEIGHTS).reduce((sum, plane) => {
    return sum + planes[plane as Plane] * PLANE_WEIGHTS[plane as Plane];
  }, 0);

  const rounded = Math.round(composite * 100) / 100;
  return { composite: rounded, planes, contributingSignals: contributing, ...getBand(rounded) };
}
