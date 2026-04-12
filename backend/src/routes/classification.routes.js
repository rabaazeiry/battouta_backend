// backend/src/routes/classification.routes.js

const express = require('express');
const router = express.Router();
const { classifyAll, classifyOne } = require('../controllers/classification.controller');
const { protect } = require('../middlewares/auth.middleware');

// Classifier tous les concurrents d'un projet
router.post('/project/:projectId', protect, classifyAll);

// Classifier un seul concurrent
router.post('/competitor/:competitorId', protect, classifyOne);

module.exports = router;