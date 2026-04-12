// backend/src/routes/competitor.routes.js
// VERSION 2 — Ajout route inject-known

const express = require('express');
const router = express.Router();
const {
  createCompetitor,
  getCompetitorsByProject,
  getCompetitor,
  updateCompetitor,
  deleteCompetitor,
  getCompetitorStats,
  discoverCompetitors,
  getDiscoveryStatus,
  updateClassification,
  updateLogo,
  enrichCompetitors,
  enrichOne,
  cleanupFalsePositives,
  injectKnownHotels,
} = require('../controllers/competitor.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

// ─── PAR PROJET ─────────────────────────────────────────────
router.get( '/project/:projectId',                   getCompetitorsByProject);
router.get( '/project/:projectId/stats',             getCompetitorStats);
router.post('/project/:projectId/discover',          discoverCompetitors);
router.get( '/project/:projectId/discover/status',   getDiscoveryStatus);
router.post('/project/:projectId/enrich',            enrichCompetitors);
router.post('/project/:projectId/cleanup',           cleanupFalsePositives);
router.post('/project/:projectId/inject-known',      injectKnownHotels); // ✅ AJOUTÉ

// ─── CRUD ────────────────────────────────────────────────────
router.post('/', createCompetitor);

router.route('/:id')
  .get(getCompetitor)
  .put(updateCompetitor)
  .delete(deleteCompetitor);

// ─── PAR CONCURRENT ──────────────────────────────────────────
router.patch('/:id/classification', updateClassification);
router.patch('/:id/logo',           updateLogo);
router.post( '/:id/enrich',         enrichOne);

module.exports = router;