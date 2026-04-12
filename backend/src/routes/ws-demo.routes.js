// backend/src/routes/ws-demo.routes.js
// Minimal demo to prove WS end-to-end during the sprint.
// POST /api/ws-demo/emit  { projectId, steps? }

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { emitToProject, events: E } = require('../config/socket');

router.post('/emit', protect, async (req, res) => {
  const { projectId = 'demo', steps = 5 } = req.body || {};

  emitToProject(projectId, E.SCRAPING_STARTED, { competitorCount: steps });

  (async () => {
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, 800));
      emitToProject(projectId, E.SCRAPING_PROGRESS, {
        step: 'scrape_instagram',
        pct: Math.round((i / steps) * 100),
        competitorId: `c${i}`,
        message: `Competitor ${i}/${steps}`
      });
    }
    emitToProject(projectId, E.SCRAPING_COMPLETE, { summary: { total: steps } });
  })().catch((e) => console.error('ws-demo error', e));

  res.json({ success: true, message: 'Demo WS stream started', projectId, steps });
});

module.exports = router;
