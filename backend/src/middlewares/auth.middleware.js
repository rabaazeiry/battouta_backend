// backend/src/middlewares/auth.middleware.js

const { verifyToken } = require('../utils/jwt.util');
const User = require('../models/User.model');

/**
 * Middleware de protection des routes (authentification requise)
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Vérifier si le token est dans le header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Vérifier si le token existe
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Non autorisé - Token manquant'
      });
    }

    // Vérifier le token
    const decoded = verifyToken(token);

    // Récupérer l'utilisateur
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur introuvable'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Compte désactivé'
      });
    }

    // Attacher l'utilisateur à la requête
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Non autorisé - Token invalide'
    });
  }
};

/**
 * Middleware de vérification du rôle admin
 */
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé - Droits administrateur requis'
    });
  }
};

module.exports = {
  protect,
  admin
};