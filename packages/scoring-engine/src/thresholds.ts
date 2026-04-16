// All numeric thresholds in one place — never inline magic numbers elsewhere
export const THRESHOLDS = {
  // s1
  TOP3_WALLET_SUPPLY_PCT: 70,
  // s2
  FLOAT_PCT_LOW: 30,
  // s3: boolean signal, no numeric threshold
  // s4: boolean signal
  // s5
  TOKEN_AGE_MONTHS: 6,
  // u1
  ACCUMULATION_PCT_OF_SUPPLY: 1,
  // u2: boolean signal
  // u3
  EARLY_PUMP_LOW_PCT: 50,
  EARLY_PUMP_HIGH_PCT: 200,
  // t2
  FUNDING_RATE_MAX_NEGATIVE: -200,
  // t3
  SHORT_LONG_RATIO_MIN: 2.0,
  // t4
  OI_VS_MC_PCT: 30,
  // q1
  SHORT_LIQ_RATIO: 3,
  // q2: continuous
  // Band thresholds
  BAND_CRITICAL: 75,
  BAND_HIGH: 55,
  BAND_MODERATE: 35,
} as const;
