export const PLANE_WEIGHTS = {
  structural:   0.20,
  setup:        0.15,
  trigger:      0.30,
  squeeze:      0.25,
  distribution: 0.10,
} as const;

export type Plane = keyof typeof PLANE_WEIGHTS;

export const SIGNALS = {
  structural: [
    { id: 's1', w: 0.30, label: 'Top 3 wallets hold >70% of supply' },
    { id: 's2', w: 0.20, label: 'Circulating float <30% of total' },
    { id: 's3', w: 0.20, label: 'Recent perp listing on leverage venue' },
    { id: 's4', w: 0.15, label: 'Deployer wallet not doxxed / audited' },
    { id: 's5', w: 0.15, label: 'Token age <6 months' },
  ],
  setup: [
    { id: 'u1', w: 0.40, label: 'Non-exchange wallets accumulated >1% at lows' },
    { id: 'u2', w: 0.20, label: 'New exchange listings in last 30 days' },
    { id: 'u3', w: 0.25, label: 'Early pump 50-200% before main move' },
    { id: 'u4', w: 0.15, label: 'Social mention velocity rising' },
  ],
  trigger: [
    { id: 't1', w: 0.35, label: 'Accumulator wallets deposit to perp exchange' },
    { id: 't2', w: 0.20, label: 'Funding rate deeply negative' },
    { id: 't3', w: 0.15, label: 'Short/long ratio >2.0' },
    { id: 't4', w: 0.20, label: 'Open interest >30% of circulating MC' },
    { id: 't5', w: 0.10, label: 'Small on-chain sleuth posts flagging flows' },
  ],
  squeeze: [
    { id: 'q1', w: 0.30, label: 'Short liquidations >3x long liquidations' },
    { id: 'q2', w: 0.20, label: 'Funding flips to extreme positive' },
    { id: 'q3', w: 0.20, label: 'Vertical price, few large trades' },
    { id: 'q4', w: 0.20, label: 'Same wallets withdraw from exchange' },
    { id: 'q5', w: 0.10, label: 'Social volume explosion' },
  ],
  distribution: [
    { id: 'd1', w: 0.25, label: 'Price holds, volume fading DoD' },
    { id: 'd2', w: 0.20, label: 'Lower highs on hourly chart' },
    { id: 'd3', w: 0.25, label: 'Insider wallets staggered exchange sends' },
    { id: 'd4', w: 0.15, label: 'Narrative retrofitting in news after move' },
    { id: 'd5', w: 0.15, label: 'Retail mentions at all-time high' },
  ],
} as const;

// Enforce weights sum to 1.0 for each plane — validated by unit test
export type SignalId = 's1'|'s2'|'s3'|'s4'|'s5'|'u1'|'u2'|'u3'|'u4'|'t1'|'t2'|'t3'|'t4'|'t5'|'q1'|'q2'|'q3'|'q4'|'q5'|'d1'|'d2'|'d3'|'d4'|'d5';
