// backend/src/routes/index.js

const express = require('express');
const router = express.Router();

const authRoutes           = require('./auth.routes');
const projectRoutes        = require('./project.routes');
const competitorRoutes     = require('./competitor.routes');
const marketResearchRoutes = require('./marketResearch.routes');
const classificationRoutes = require('./classification.routes');
// ✅ AJOUTER
const scrapingRoutes       = require('./scraping.routes');

router.use('/auth',           authRoutes);
router.use('/projects',       projectRoutes);
router.use('/competitors',    competitorRoutes);
router.use('/market-research',marketResearchRoutes);
router.use('/classification', classificationRoutes);
// ✅ AJOUTER
router.use('/scraping',       scrapingRoutes);

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;