import { THRESHOLDS } from "./thresholds.js";

export type Band = "critical" | "high" | "moderate" | "low";

export interface BandResult {
  band: Band;
  drawdownProbability: number;
  action: string;
}

export function getBand(composite: number): BandResult {
  if (composite >= THRESHOLDS.BAND_CRITICAL) {
    return { band: "critical", drawdownProbability: 0.85, action: "Flag · alert · fade" };
  }
  if (composite >= THRESHOLDS.BAND_HIGH) {
    return { band: "high", drawdownProbability: 0.60, action: "Watch · avoid long" };
  }
  if (composite >= THRESHOLDS.BAND_MODERATE) {
    return { band: "moderate", drawdownProbability: 0.30, action: "Watchlist only" };
  }
  return { band: "low", drawdownProbability: 0.10, action: "No signal" };
}
