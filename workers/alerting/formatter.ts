import type { ScoreRow } from '@sentinel/db';

export interface AlertPayload {
  tokenSymbol: string;
  composite: number;
  band: string;
  previousBand: string;
  contributingSignals: string[];
  scoredAt: Date;
  action: string;
  drawdownProbability: number;
}

const BAND_EMOJI: Record<string, string> = {
  critical: '🚨',
  high: '⚠️',
  moderate: '👁',
  low: '✅',
};

const SIGNAL_LABELS: Record<string, string> = {
  s1: 'Top 3 wallets >70% supply',
  s2: 'Float <30% of total',
  s3: 'Recent perp listing',
  s4: 'Deployer not doxxed',
  s5: 'Token age <6mo',
  u1: 'Non-exchange accumulation >1%',
  u2: 'New exchange listings',
  u3: 'Early 50-200% pump',
  u4: 'Social velocity rising',
  t1: 'Accumulators → perp exchange',
  t2: 'Funding rate deeply negative',
  t3: 'Short/long ratio >2.0',
  t4: 'OI >30% of circ MC',
  t5: 'On-chain sleuth flags',
  q1: 'Short liquidations 3x longs',
  q2: 'Funding flips extreme +',
  q3: 'Vertical price, large trades',
  q4: 'Wallets withdraw from exchange',
  q5: 'Social volume explosion',
  d1: 'Price holds, volume fading',
  d2: 'Lower highs on hourly',
  d3: 'Insider staggered sends',
  d4: 'Narrative retrofitting',
  d5: 'Retail mentions ATH',
};

export function formatTelegramMessage(p: AlertPayload): string {
  const emoji = BAND_EMOJI[p.band] ?? '📊';
  const signals = p.contributingSignals
    .slice(0, 5)
    .map((id) => `• ${id.toUpperCase()}: ${SIGNAL_LABELS[id] ?? id}`)
    .join('\n');

  return [
    `${emoji} *${p.tokenSymbol} — ${p.band.toUpperCase()} ALERT*`,
    ``,
    `Score: *${p.composite.toFixed(1)}* (was ${p.previousBand})`,
    `Drawdown probability: ${Math.round(p.drawdownProbability * 100)}%`,
    `Action: ${p.action}`,
    ``,
    `*Top signals:*`,
    signals,
    ``,
    `_${new Date(p.scoredAt).toISOString()}_`,
  ].join('\n');
}

export function formatDiscordMessage(p: AlertPayload): object {
  const color = p.band === 'critical' ? 0xff2222 : p.band === 'high' ? 0xff9900 : 0x4444ff;
  const signals = p.contributingSignals
    .slice(0, 5)
    .map((id) => `\`${id.toUpperCase()}\` ${SIGNAL_LABELS[id] ?? id}`)
    .join('\n');

  return {
    embeds: [
      {
        title: `${BAND_EMOJI[p.band] ?? '📊'} ${p.tokenSymbol} — ${p.band.toUpperCase()}`,
        color,
        fields: [
          { name: 'Score', value: `${p.composite.toFixed(1)} / 100`, inline: true },
          { name: 'Drawdown probability', value: `${Math.round(p.drawdownProbability * 100)}%`, inline: true },
          { name: 'Action', value: p.action, inline: false },
          { name: 'Top signals', value: signals || '—', inline: false },
        ],
        footer: { text: `Previous band: ${p.previousBand} • ${new Date(p.scoredAt).toISOString()}` },
      },
    ],
  };
}
