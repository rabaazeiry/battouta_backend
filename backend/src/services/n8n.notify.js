// backend/src/services/n8n.notify.js
// Fire-and-forget HTTP notifier that posts pipeline events to n8n.
// Gated by N8N_WEBHOOK_URL + N8N_WEBHOOK_SECRET env.

const crypto = require('crypto');
const axios = require('axios');
const { N8N_WEBHOOK_URL, N8N_WEBHOOK_SECRET } = require('../config/env');

function signBody(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

/**
 * Notify n8n that a pipeline event occurred.
 * @param {string} event    e.g. 'scraping:complete', 'campaign:generated'
 * @param {object} payload  arbitrary JSON payload (projectId, user, etc.)
 * @returns {Promise<void>} resolves even on failure — does not throw.
 */
async function notify(event, payload = {}) {
  if (!N8N_WEBHOOK_URL) return;

  const body = JSON.stringify({ event, payload, at: Date.now() });
  const headers = { 'Content-Type': 'application/json' };
  if (N8N_WEBHOOK_SECRET) {
    headers['X-N8N-Signature'] = signBody(body, N8N_WEBHOOK_SECRET);
  }

  try {
    await axios.post(`${N8N_WEBHOOK_URL}/webhook/pipeline-event`, body, {
      headers,
      timeout: 3000
    });
  } catch (err) {
    // Non-fatal: log and move on.
    console.warn('[n8n.notify] delivery failed:', err.message);
  }
}

module.exports = { notify, signBody };
