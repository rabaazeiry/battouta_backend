// backend/src/app.js

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middlewares/errorHandler.middleware');
require('./models');

const app = express();

// ===== MIDDLEWARES GLOBAUX =====

// CORS
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger (en développement)
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ===== ROUTES =====

// Route racine
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 PFE Marketing Agent API',
    version: '1.0.0',
    environment: config.NODE_ENV,
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      projects: '/api/projects',
      competitors: '/api/competitors'
    }
  });
});

// API Routes
app.use('/api', routes);

// ===== GESTION D'ERREURS =====

// 404 - Route non trouvée
app.use(notFound);

// Error handler global
app.use(errorHandler);

module.exports = app;
