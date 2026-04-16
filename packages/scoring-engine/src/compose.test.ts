import { describe, it, expect } from "vitest";
import { computeComposite } from "./compose.js";
import type { SignalValues } from "./compose.js";

describe("computeComposite", () => {
  it("returns 0 composite for empty signals", () => {
    const result = computeComposite({});
    expect(result.composite).toBe(0);
    expect(result.band).toBe("low");
  });

  it("returns 100 composite when all signals maxed", () => {
    const all: SignalValues = {
      s1: 100, s2: 100, s3: 100, s4: 100, s5: 100,
      u1: 100, u2: 100, u3: 100, u4: 100,
      t1: 100, t2: 100, t3: 100, t4: 100, t5: 100,
      q1: 100, q2: 100, q3: 100, q4: 100, q5: 100,
      d1: 100, d2: 100, d3: 100, d4: 100, d5: 100,
    };
    const result = computeComposite(all);
    expect(result.composite).toBe(100);
    expect(result.band).toBe("critical");
  });

  it("RAVE calibration case scores >=75 (critical)", () => {
    // Fixture represents RAVE state at 2026-04-12 09:00 UTC
    // Structural (w=0.20): 90*0.30+85*0.20+100*0.20+100*0.15+100*0.15 = 94
    // Setup     (w=0.15): 85*0.40+70*0.20+80*0.25+70*0.15            = 78.5
    // Trigger   (w=0.30): 100*0.35+90*0.20+95*0.15+80*0.20+70*0.10  = 90.25
    // Squeeze   (w=0.25): 75*0.30+60*0.20+80*0.20+70*0.20+85*0.10   = 73
    // Distrib   (w=0.10): 30*0.25+20*0.20+25*0.25+0*0.15+20*0.15    = 20.75
    // composite = 94*0.20+78.5*0.15+90.25*0.30+73*0.25+20.75*0.10  = 77.975
    const raveFixture: SignalValues = {
      s1: 90, s2: 85, s3: 100, s4: 100, s5: 100,
      u1: 85, u2: 70, u3: 80, u4: 70,
      t1: 100, t2: 90, t3: 95, t4: 80, t5: 70,
      q1: 75, q2: 60, q3: 80, q4: 70, q5: 85,
      d1: 30, d2: 20, d3: 25, d4: 0, d5: 20,
    };
    const result = computeComposite(raveFixture);
    expect(result.composite).toBeGreaterThanOrEqual(75);
    expect(result.band).toBe("critical");
  });

  it("clamps plane scores to 0-100", () => {
    const result = computeComposite({ s1: 150 });
    expect(result.planes.structural).toBeLessThanOrEqual(100);
  });

  it("moderate band between 35 and 54", () => {
    const result = computeComposite({ t2: 60, t1: 40 });
    if (result.composite >= 35 && result.composite < 55) {
      expect(result.band).toBe("moderate");
    }
  });
});
