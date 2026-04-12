// src/utils/jwt.util.js

const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

/**
 * Générer un token JWT
 * @param {Object} payload - Données à encoder dans le token
 * @returns {string} - Token JWT signé
 * 
 * Exemple:
 * generateToken({ userId: "123", email: "user@example.com" })
 * → "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */
exports.generateToken = (payload) => {
  // jwt.sign() crée et signe le token
  return jwt.sign(
    payload,              // Les données qu'on veut mettre dans le token
    JWT_SECRET,           // La clé secrète pour signer (comme un mot de passe)
    { expiresIn: JWT_EXPIRES_IN }  // Durée de validité (24h par défaut)
  );
};

/**
 * Vérifier et décoder un token JWT
 * @param {string} token - Token JWT à vérifier
 * @returns {Object} - Payload décodé si valide
 * @throws {Error} - Si le token est invalide ou expiré
 * 
 * Exemple:
 * verifyToken("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
 * → { userId: "123", email: "user@example.com", iat: ..., exp: ... }
 */
exports.verifyToken = (token) => {
  try {
    // jwt.verify() vérifie la signature et la date d'expiration
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    // Si le token est invalide, expiré, ou mal signé
    throw new Error('Token invalide ou expiré');
  }
};

/**
 * Décoder un token SANS vérification (juste pour lire)
 * ⚠️ N'utilisez PAS cette fonction pour l'authentification !
 * @param {string} token - Token JWT
 * @returns {Object|null} - Payload décodé (peut être falsifié)
 * 
 * Utilisation: Juste pour lire les infos, pas pour sécuriser
 */
exports.decodeToken = (token) => {
  return jwt.decode(token);
};