// backend/src/routes/webhooks.routes.js
// Incoming webhooks from n8n (callbacks into the backend).
// Protected by a shared HMAC secret header.

const express = require('express');
const router = express.Router();
const { signBody } = require('../services/n8n.notify');
const { N8N_WEBHOOK_SECRET } = require('../config/env');
const { emitToProject, events: E } = require('../config/socket');

// Keep the raw body so we can verify the HMAC signature.
const rawJson = express.raw({ type: 'application/json', limit: '1mb' });

function verifyN8N(req, res, next) {
  if (!N8N_WEBHOOK_SECRET) {
    return res.status(503).json({ success: false, message: 'Webhook secret not configured' });
  }
  const sig = req.header('X-N8N-Signature');
  if (!sig) {
    return res.status(401).json({ success: false, message: 'Missing signature' });
  }
  const expected = signBody(req.body.toString('utf8'), N8N_WEBHOOK_SECRET);
  if (sig.length !== expected.length || !require('crypto').timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.status(401).json({ success: false, message: 'Invalid signature' });
  }
  try {
    req.payload = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }
  next();
}

// n8n -> backend  (e.g. "run scraping now", "notify user X")
router.post('/n8n', rawJson, verifyN8N, async (req, res) => {
  const { action, projectId, message } = req.payload || {};
  console.log('[webhook/n8n]', action, projectId);

  if (action === 'notify' && projectId) {
    emitToProject(projectId, E.NOTIFICATION, { level: 'info', message: message || 'n8n notification' });
  }

  res.json({ success: true, received: action });
});

module.exports = router;
