// backend/src/routes/admin.routes.js

const express = require('express');
const router = express.Router();
const { protect, requireRoles } = require('../middlewares/auth.middleware');
const admin = require('../controllers/admin.controller');

// All admin routes require auth + admin role
router.use(protect, requireRoles('admin'));

router.get('/stats', admin.stats);
router.get('/users', admin.listUsers);
router.get('/users/:id', admin.getUser);
router.patch('/users/:id/role', admin.updateUserRole);
router.patch('/users/:id/toggle-active', admin.toggleUserActive);
router.delete('/users/:id', admin.deleteUser);

module.exports = router;
