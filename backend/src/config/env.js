// src/config/env.js

require('dotenv').config();

module.exports = {
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Server
  PORT: process.env.PORT || 5000,
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI,
  
  // Si MONGODB_URI n'est pas défini, on utilise une DB locale
  // (mais dans votre cas, vous utilisez MongoDB Atlas, donc ça sera toujours défini)
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  
  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
};