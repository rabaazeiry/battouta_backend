// src/utils/bcrypt.util.js

const bcrypt = require('bcryptjs');

/**
 * Hasher (crypter) un mot de passe
 * @param {string} password - Mot de passe en clair
 * @returns {Promise<string>} - Mot de passe hashé
 * 
 * Exemple:
 * hashPassword("password123") → "$2a$10$XqZ8.wJx3..."
 */
exports.hashPassword = async (password) => {
  // genSalt(10) = niveau de sécurité (10 est un bon compromis)
  // Plus le nombre est élevé, plus c'est sécurisé mais plus lent
  const salt = await bcrypt.genSalt(10);
  
  // Transformer le mot de passe en hash
  return await bcrypt.hash(password, salt);
};

/**
 * Comparer un mot de passe avec son hash
 * @param {string} password - Mot de passe en clair (saisi par l'utilisateur)
 * @param {string} hashedPassword - Mot de passe hashé (stocké dans la DB)
 * @returns {Promise<boolean>} - true si ça correspond, false sinon
 * 
 * Exemple:
 * comparePassword("password123", "$2a$10$...") → true
 * comparePassword("mauvaispass", "$2a$10$...") → false
 */
exports.comparePassword = async (password, hashedPassword) => {
  // bcrypt compare automatiquement en recréant le hash
  return await bcrypt.compare(password, hashedPassword);
};