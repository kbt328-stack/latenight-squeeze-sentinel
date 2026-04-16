import { describe, it, expect } from "vitest";
import { activate_s1 } from "../s1.js";
import { activate_s2 } from "../s2.js";
import { activate_s3 } from "../s3.js";
import { activate_s4 } from "../s4.js";
import { activate_s5 } from "../s5.js";
import { activate_u1 } from "../u1.js";
import { activate_u2 } from "../u2.js";
import { activate_u3 } from "../u3.js";
import { activate_u4 } from "../u4.js";
import { activate_t1 } from "../t1.js";
import { activate_t2 } from "../t2.js";
import { activate_t3 } from "../t3.js";
import { activate_t4 } from "../t4.js";
import { activate_t5 } from "../t5.js";
import { activate_q1 } from "../q1.js";
import { activate_q2 } from "../q2.js";
import { activate_q3 } from "../q3.js";
import { activate_q4 } from "../q4.js";
import { activate_q5 } from "../q5.js";
import { activate_d1 } from "../d1.js";
import { activate_d2 } from "../d2.js";
import { activate_d3 } from "../d3.js";
import { activate_d4 } from "../d4.js";
import { activate_d5 } from "../d5.js";

describe("s1: top 3 wallet concentration", () => {
  it("returns 0 below 50%", () => expect(activate_s1(40)).toBe(0));
  it("returns ~50 at 70%", () => expect(activate_s1(70)).toBe(50));
  it("returns 100 at 90%+", () => expect(activate_s1(95)).toBe(100));
  it("handles null", () => expect(activate_s1(null)).toBe(0));
});

describe("s2: low float", () => {
  it("returns 0 at 30%+", () => expect(activate_s2(35)).toBe(0));
  it("returns 50 at 20%", () => expect(activate_s2(20)).toBe(50));
  it("returns 100 at <=10%", () => expect(activate_s2(5)).toBe(100));
  it("handles undefined", () => expect(activate_s2(undefined)).toBe(0));
});

describe("s3: perp listing boolean", () => {
  it("returns 0 when false", () => expect(activate_s3(false)).toBe(0));
  it("returns 100 when true", () => expect(activate_s3(true)).toBe(100));
  it("returns 0 when null", () => expect(activate_s3(null)).toBe(0));
});

describe("s4: unaudited deployer", () => {
  it("returns 0 when false", () => expect(activate_s4(false)).toBe(0));
  it("returns 100 when true", () => expect(activate_s4(true)).toBe(100));
  it("returns 0 when null", () => expect(activate_s4(null)).toBe(0));
});

describe("s5: token age", () => {
  it("returns 0 at 6+ months", () => expect(activate_s5(6)).toBe(0));
  it("returns non-zero at 3 months", () => expect(activate_s5(3)).toBeGreaterThan(0));
  it("returns 100 at 1 month", () => expect(activate_s5(1)).toBe(100));
  it("handles null", () => expect(activate_s5(null)).toBe(0));
});

describe("u1: accumulation pct", () => {
  it("returns 0 below 1%", () => expect(activate_u1(0.5)).toBe(0));
  it("returns >0 at 2%", () => expect(activate_u1(2)).toBeGreaterThan(0));
  it("returns 100 at 5%+", () => expect(activate_u1(5)).toBe(100));
  it("handles null", () => expect(activate_u1(null)).toBe(0));
});

describe("u2: new listings", () => {
  it("returns 0 for no listings", () => expect(activate_u2(0)).toBe(0));
  it("returns 40 for 1 listing", () => expect(activate_u2(1)).toBe(40));
  it("returns 100 for 3+ listings", () => expect(activate_u2(3)).toBe(100));
  it("handles null", () => expect(activate_u2(null)).toBe(0));
});

describe("u3: early pump pct", () => {
  it("returns 0 below 50%", () => expect(activate_u3(30)).toBe(0));
  it("returns 33 at 100%", () => expect(activate_u3(100)).toBe(33));
  it("returns 100 at 200%+", () => expect(activate_u3(200)).toBe(100));
  it("handles null", () => expect(activate_u3(null)).toBe(0));
});

describe("u4: social velocity", () => {
  it("returns 0 at 0", () => expect(activate_u4(0)).toBe(0));
  it("returns 50 at 50", () => expect(activate_u4(50)).toBe(50));
  it("returns 100 at 100", () => expect(activate_u4(100)).toBe(100));
  it("handles null", () => expect(activate_u4(null)).toBe(0));
});

describe("t1: accumulator deposits to perp", () => {
  it("returns 0 below 5%", () => expect(activate_t1(3)).toBe(0));
  it("returns >0 at 25%", () => expect(activate_t1(25)).toBeGreaterThan(0));
  it("returns 100 at 50%+", () => expect(activate_t1(60)).toBe(100));
  it("handles null", () => expect(activate_t1(null)).toBe(0));
});

describe("t2: funding rate deeply negative", () => {
  it("returns 0 at 0%", () => expect(activate_t2(0)).toBe(0));
  it("returns 50 at -100%", () => expect(activate_t2(-100)).toBe(50));
  it("returns 100 at -200%", () => expect(activate_t2(-200)).toBe(100));
  it("handles null", () => expect(activate_t2(null)).toBe(0));
  it("returns 0 for positive rate", () => expect(activate_t2(50)).toBe(0));
});

describe("t3: short/long ratio", () => {
  it("returns 0 below 2.0", () => expect(activate_t3(1.5)).toBe(0));
  it("returns >0 at 3.5", () => expect(activate_t3(3.5)).toBeGreaterThan(0));
  it("returns 100 at 5.0+", () => expect(activate_t3(5.0)).toBe(100));
  it("handles null", () => expect(activate_t3(null)).toBe(0));
});

describe("t4: OI vs market cap", () => {
  it("returns 0 below 30%", () => expect(activate_t4(20)).toBe(0));
  it("returns >0 at 60%", () => expect(activate_t4(60)).toBeGreaterThan(0));
  it("returns 100 at 100%+", () => expect(activate_t4(110)).toBe(100));
  it("handles null", () => expect(activate_t4(null)).toBe(0));
});

describe("t5: sleuth post count", () => {
  it("returns 0 for 0 posts", () => expect(activate_t5(0)).toBe(0));
  it("returns 40 for 1 post", () => expect(activate_t5(1)).toBe(40));
  it("returns 100 for 3+ posts", () => expect(activate_t5(3)).toBe(100));
  it("handles null", () => expect(activate_t5(null)).toBe(0));
});

describe("q1: short liq ratio", () => {
  it("returns 0 below 3x", () => expect(activate_q1(2)).toBe(0));
  it("returns >0 at 5x", () => expect(activate_q1(5)).toBeGreaterThan(0));
  it("returns 100 at 10x+", () => expect(activate_q1(10)).toBe(100));
  it("handles null", () => expect(activate_q1(null)).toBe(0));
});

describe("q2: funding flips positive", () => {
  it("returns 0 at 0%", () => expect(activate_q2(0)).toBe(0));
  it("returns 50 at 100%", () => expect(activate_q2(100)).toBe(50));
  it("returns 100 at 200%+", () => expect(activate_q2(200)).toBe(100));
  it("returns 0 for negative", () => expect(activate_q2(-50)).toBe(0));
  it("handles null", () => expect(activate_q2(null)).toBe(0));
});

describe("q3: vertical price action", () => {
  it("returns 0 below 10%", () => expect(activate_q3(5)).toBe(0));
  it("returns >0 at 30%", () => expect(activate_q3(30)).toBeGreaterThan(0));
  it("returns 100 at 50%+", () => expect(activate_q3(55)).toBe(100));
  it("handles negative move", () => expect(activate_q3(-60)).toBe(100));
  it("handles null", () => expect(activate_q3(null)).toBe(0));
});

describe("q4: accumulator withdrawals", () => {
  it("returns 0 below 5%", () => expect(activate_q4(2)).toBe(0));
  it("returns >0 at 25%", () => expect(activate_q4(25)).toBeGreaterThan(0));
  it("returns 100 at 50%+", () => expect(activate_q4(60)).toBe(100));
  it("handles null", () => expect(activate_q4(null)).toBe(0));
});

describe("q5: social volume explosion", () => {
  it("returns 0 at 0", () => expect(activate_q5(0)).toBe(0));
  it("returns 75 at 75", () => expect(activate_q5(75)).toBe(75));
  it("returns 100 at 100+", () => expect(activate_q5(110)).toBe(100));
  it("handles null", () => expect(activate_q5(null)).toBe(0));
});

describe("d1: volume fade", () => {
  it("returns 0 at 0% decline", () => expect(activate_d1(0)).toBe(0));
  it("returns >0 at 35%", () => expect(activate_d1(35)).toBeGreaterThan(0));
  it("returns 100 at 70%+", () => expect(activate_d1(70)).toBe(100));
  it("handles null", () => expect(activate_d1(null)).toBe(0));
});

describe("d2: lower highs", () => {
  it("returns 0 below 3 candles", () => expect(activate_d2(2)).toBe(0));
  it("returns >0 at 5 candles", () => expect(activate_d2(5)).toBeGreaterThan(0));
  it("returns 100 at 8+ candles", () => expect(activate_d2(8)).toBe(100));
  it("handles null", () => expect(activate_d2(null)).toBe(0));
});

describe("d3: staggered exchange sends", () => {
  it("returns 0 below 2 sends", () => expect(activate_d3(1)).toBe(0));
  it("returns >0 at 3 sends", () => expect(activate_d3(3)).toBeGreaterThan(0));
  it("returns 100 at 5+ sends", () => expect(activate_d3(5)).toBe(100));
  it("handles null", () => expect(activate_d3(null)).toBe(0));
});

describe("d4: retrofitted narrative", () => {
  it("returns 0 when false", () => expect(activate_d4(false)).toBe(0));
  it("returns 100 when true", () => expect(activate_d4(true)).toBe(100));
  it("returns 0 when null", () => expect(activate_d4(null)).toBe(0));
});

describe("d5: retail mentions ATH", () => {
  it("returns 0 at 0", () => expect(activate_d5(0)).toBe(0));
  it("returns 60 at 60", () => expect(activate_d5(60)).toBe(60));
  it("returns 100 at 100", () => expect(activate_d5(100)).toBe(100));
  it("handles null", () => expect(activate_d5(null)).toBe(0));
});
