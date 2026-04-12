// backend/src/routes/project.routes.js

const express = require('express');
const router = express.Router();
const {
  createProject,
  getAllProjects,
  getProject,
  updateProject,
  deleteProject,
  updateProgress    // ✅ AJOUTÉ
} = require('../controllers/project.controller');
const { protect } = require('../middlewares/auth.middleware');

// Toutes les routes sont protégées
router.use(protect);

router.route('/')
  .get(getAllProjects)
  .post(createProject);

router.route('/:id')
  .get(getProject)
  .put(updateProject)
  .delete(deleteProject);

// ✅ AJOUTÉ : Route pour mettre à jour la progression (Dashboard)
router.patch('/:id/progress', updateProgress);

module.exports = router;