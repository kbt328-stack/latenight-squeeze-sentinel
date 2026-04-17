import { logger } from '@sentinel/shared';
import type { AlertPayload } from './formatter.js';
import { formatTelegramMessage, formatDiscordMessage } from './formatter.js';

async function post(url: string, body: object): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
}

export async function sendTelegram(payload: AlertPayload): Promise<void> {
  const token = process.env['TELEGRAM_BOT_TOKEN'];
  const chatId = process.env['TELEGRAM_DEFAULT_CHAT_ID'];
  if (!token || !chatId) {
    logger.warn({ event: 'alert_skip' }, 'TELEGRAM_BOT_TOKEN or TELEGRAM_DEFAULT_CHAT_ID not set');
    return;
  }
  const text = formatTelegramMessage(payload);
  await post(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
  });
  logger.info({ event: 'alert_sent', channel: 'telegram', symbol: payload.tokenSymbol }, 'Telegram alert sent');
}

export async function sendDiscord(payload: AlertPayload, webhookUrl: string): Promise<void> {
  const body = formatDiscordMessage(payload);
  await post(webhookUrl, body);
  logger.info({ event: 'alert_sent', channel: 'discord', symbol: payload.tokenSymbol }, 'Discord alert sent');
}
