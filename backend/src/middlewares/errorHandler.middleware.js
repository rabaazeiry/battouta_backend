// backend/src/middlewares/errorHandler.middleware.js

const config = require('../config/env');

/**
 * Middleware global de gestion d'erreurs
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Erreur:', err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Erreur serveur interne';

  // Erreur de validation Mongoose
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map(e => e.message)
      .join(', ');
  }

  // Erreur de cast MongoDB (ID invalide)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'ID invalide';
  }

  // Erreur de duplication (clé unique)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} déjà existant`;
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token invalide';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expiré';
  }

  // Réponse
  res.status(statusCode).json({
    success: false,
    message,
    ...(config.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Middleware pour routes non trouvées (404)
 */
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route non trouvée: ${req.method} ${req.originalUrl}`
  });
};

module.exports = {
  errorHandler,
  notFound
};