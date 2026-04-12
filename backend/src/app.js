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
// - Accepts a comma-separated list in FRONTEND_URL (e.g. "http://localhost:5173,https://app.example.com")
// - In development, also accepts any localhost / 127.0.0.1 / ::1 origin (handy when the frontend
//   is served by Vite on :5173, the nginx container on :80, Storybook, Postman, etc.)
// - Echoes requester origin so credentials + cookies work; never responds with "*"
const configuredOrigins = (config.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const isDevLocalhost = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl, server-to-server, same-origin
    if (configuredOrigins.includes(origin)) return cb(null, true);
    if (config.NODE_ENV !== 'production' && isDevLocalhost(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-N8N-Signature', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Disposition'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // explicit preflight handler

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
