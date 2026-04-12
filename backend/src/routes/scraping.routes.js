// backend/src/routes/scraping.routes.js

const express = require('express');
const router = express.Router();
const scrapingController = require('../controllers/scraping.controller');
const { protect } = require('../middlewares/auth.middleware');

// Toutes les routes nécessitent authentification
router.use(protect);

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES PRINCIPALES
// ═══════════════════════════════════════════════════════════════════════════

// Scrape Instagram + Facebook
router.post('/project/:projectId/scrape', scrapingController.scrapeCompetitors);

// ✅ NOUVEAU - Scrape Instagram SEULEMENT
router.post('/project/:projectId/scrape-instagram', scrapingController.scrapeInstagramOnly);

// Scrape Facebook SEULEMENT
router.post('/project/:projectId/scrape-facebook', scrapingController.scrapeFacebookOnly);

// Scrape un seul concurrent
router.post('/competitor/:competitorId/scrape', scrapingController.scrapeOneCompetitor);

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES STATUS & RESULTS
// ═══════════════════════════════════════════════════════════════════════════

// Récupérer le statut du scraping
router.get('/project/:projectId/status', scrapingController.getScrapingStatus);

// Récupérer les résultats
router.get('/project/:projectId/results', scrapingController.getScrapingResults);

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES RESET
// ═══════════════════════════════════════════════════════════════════════════

// Reset tout (Instagram + Facebook)
router.delete('/project/:projectId/reset', scrapingController.resetScraping);

// Reset Facebook seulement
router.delete('/project/:projectId/reset-facebook', scrapingController.resetFacebook);

module.exports = router;