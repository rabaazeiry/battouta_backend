// backend/src/routes/marketResearch.routes.js
// ✅ Ajout route /generate

const express = require('express');
const router  = express.Router();
const {
  getMarketResearch,
  createMarketResearch,
  updateMarketSummary,
  updateMarketOverview,
  completeMarketResearch,
  generateMarketResearch  // ✅ nouveau
} = require('../controllers/marketResearch.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

// ─── CRUD DE BASE ──────────────────────────────────────────
router.get ('/project/:projectId',          getMarketResearch);
router.post('/project/:projectId',          createMarketResearch);

// ─── ROUTES SPÉCIALES ──────────────────────────────────────
router.patch('/project/:projectId/summary',  updateMarketSummary);
router.patch('/project/:projectId/overview', updateMarketOverview);
router.patch('/project/:projectId/complete', completeMarketResearch);
router.post ('/project/:projectId/generate', generateMarketResearch); // ✅ nouveau

module.exports = router;
