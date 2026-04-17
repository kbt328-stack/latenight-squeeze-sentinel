import Fastify from 'fastify';
import cors from '@fastify/cors';
import { db, sql } from '@sentinel/db';
import { logger } from '@sentinel/shared';

const app = Fastify({ logger: false });
await app.register(cors, { origin: true });

// GET /health
app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

// GET /tokens — watchlist with latest score per token
app.get('/tokens', async (_req, reply) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        t.id, t.symbol, t.contract_address, t.chain, t.metadata,
        s.composite, s.band, s.plane_scores, s.scored_at,
        s.contributing_signals, s.action
      FROM tokens t
      INNER JOIN watchlist w ON w.token_id = t.id
      LEFT JOIN LATERAL (
        SELECT * FROM scores
        WHERE token_id = t.id
        ORDER BY scored_at DESC
        LIMIT 1
      ) s ON true
      ORDER BY s.composite DESC NULLS LAST
    `);
    return reply.send(rows);
  } catch (err) {
    logger.error({ err }, 'GET /tokens failed');
    return reply.status(500).send({ error: 'internal' });
  }
});

// GET /tokens/:symbol/scores — score history
app.get<{ Params: { symbol: string }; Querystring: { limit?: string } }>(
  '/tokens/:symbol/scores',
  async (req, reply) => {
    const { symbol } = req.params;
    const limit = Math.min(parseInt(req.query.limit ?? '100'), 500);
    try {
      const rows = await db.execute(sql`
        SELECT s.composite, s.band, s.plane_scores, s.scored_at,
               s.contributing_signals, s.action, s.drawdown_probability
        FROM scores s
        JOIN tokens t ON t.id = s.token_id
        WHERE UPPER(t.symbol) = UPPER(${symbol})
        ORDER BY s.scored_at DESC
        LIMIT ${limit}
      `);
      if (!rows.length) return reply.status(404).send({ error: 'token not found' });
      return reply.send(rows);
    } catch (err) {
      logger.error({ err }, 'GET /tokens/:symbol/scores failed');
      return reply.status(500).send({ error: 'internal' });
    }
  }
);

// GET /tokens/:symbol/signals — latest signals grouped by plane
app.get<{ Params: { symbol: string } }>(
  '/tokens/:symbol/signals',
  async (req, reply) => {
    const { symbol } = req.params;
    try {
      const rows = await db.execute(sql`
        SELECT DISTINCT ON (sig.signal_id)
          sig.signal_id, sig.plane, sig.value, sig.source,
          sig.raw_payload, sig.observed_at
        FROM signals sig
        JOIN tokens t ON t.id = sig.token_id
        WHERE UPPER(t.symbol) = UPPER(${symbol})
        ORDER BY sig.signal_id, sig.observed_at DESC
      `);
      if (!rows.length) return reply.status(404).send({ error: 'token not found' });
      // Group by plane
      const grouped: Record<string, unknown[]> = {};
      for (const row of rows as any[]) {
        if (!grouped[row.plane]) grouped[row.plane] = [];
        grouped[row.plane].push(row);
      }
      return reply.send(grouped);
    } catch (err) {
      logger.error({ err }, 'GET /tokens/:symbol/signals failed');
      return reply.status(500).send({ error: 'internal' });
    }
  }
);

// GET /alerts — recent alerts
app.get<{ Querystring: { limit?: string; severity?: string } }>(
  '/alerts',
  async (req, reply) => {
    const limit = Math.min(parseInt(req.query.limit ?? '50'), 200);
    const { severity } = req.query;
    try {
      const rows = await db.execute(sql`
        SELECT a.id, a.severity, a.channel, a.sent_at, a.payload, a.dedup_key,
               t.symbol, t.contract_address
        FROM alerts a
        JOIN tokens t ON t.id = a.token_id
        ${severity ? sql`WHERE a.severity = ${severity}` : sql``}
        ORDER BY a.sent_at DESC
        LIMIT ${limit}
      `);
      return reply.send(rows);
    } catch (err) {
      logger.error({ err }, 'GET /alerts failed');
      return reply.status(500).send({ error: 'internal' });
    }
  }
);

const port = parseInt(process.env['API_PORT'] ?? '3001');
const host = process.env['API_HOST'] ?? '0.0.0.0';

try {
  await app.listen({ port, host });
  logger.info({ port, host }, 'API server started');
} catch (err) {
  logger.error({ err }, 'API failed to start');
  process.exit(1);
}
