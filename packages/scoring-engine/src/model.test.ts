import { describe, it, expect } from "vitest";
import { PLANE_WEIGHTS, SIGNALS } from "./model.js";

describe("PLANE_WEIGHTS", () => {
  it("sums to exactly 1.0", () => {
    const sum = Object.values(PLANE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.round(sum * 1000) / 1000).toBe(1.0);
  });

  it("has exactly 5 planes", () => {
    expect(Object.keys(PLANE_WEIGHTS)).toHaveLength(5);
  });
});

describe("SIGNALS structural weights sum to 1.0", () => {
  it("structural", () => {
    const sum = SIGNALS.structural.reduce((a, s) => a + s.w, 0);
    expect(Math.round(sum * 1000) / 1000).toBe(1.0);
  });
  it("setup", () => {
    const sum = SIGNALS.setup.reduce((a, s) => a + s.w, 0);
    expect(Math.round(sum * 1000) / 1000).toBe(1.0);
  });
  it("trigger", () => {
    const sum = SIGNALS.trigger.reduce((a, s) => a + s.w, 0);
    expect(Math.round(sum * 1000) / 1000).toBe(1.0);
  });
  it("squeeze", () => {
    const sum = SIGNALS.squeeze.reduce((a, s) => a + s.w, 0);
    expect(Math.round(sum * 1000) / 1000).toBe(1.0);
  });
  it("distribution", () => {
    const sum = SIGNALS.distribution.reduce((a, s) => a + s.w, 0);
    expect(Math.round(sum * 1000) / 1000).toBe(1.0);
  });
});
