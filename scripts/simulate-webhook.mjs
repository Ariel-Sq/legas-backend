// Simulate a MercadoPago payment webhook against the LOCAL backend.
//
// MP can't reach localhost, so a sandbox payment never updates the local
// order. This signs a webhook with the local MERCADOPAGO_WEBHOOK_SECRET and
// POSTs it, so the handler fetches the payment from MP and updates the order.
//
// Usage:
//   node scripts/simulate-webhook.mjs <paymentId> [status]
//   # status is only used for the log label; the real status comes from MP.
//
// Find the paymentId in the MP redirect URL (payment_id=...) or in the MP
// sandbox activity. Requires the payment to exist for the test account.

import 'dotenv/config';
import crypto from 'node:crypto';

const paymentId = process.argv[2];
if (!paymentId) {
  console.error('Usage: node scripts/simulate-webhook.mjs <paymentId>');
  process.exit(1);
}

const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
if (!secret) {
  console.error('Missing MERCADOPAGO_WEBHOOK_SECRET (in .env)');
  process.exit(1);
}
const port = process.env.PORT || '8080';

const ts = String(Date.now());
const requestId = crypto.randomUUID();
const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
const v1 = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

const body = {
  id: '1',
  live_mode: false,
  type: 'payment',
  date_created: new Date().toISOString(),
  user_id: '0',
  api_version: 'v1',
  action: 'payment.created',
  data: { id: paymentId },
};

const res = await fetch(
  `http://localhost:${port}/api/payments/mercadopago/webhook?data.id=${paymentId}`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-request-id': requestId,
      'x-signature': `ts=${ts},v1=${v1}`,
    },
    body: JSON.stringify(body),
  },
);
console.log('webhook status:', res.status, await res.text());
