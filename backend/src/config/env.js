// src/config/env.js

require('dotenv').config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  MONGODB_URI: process.env.MONGODB_URI,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  VALUESERP_API_KEY: process.env.VALUESERP_API_KEY || '',
  SERPER_API_KEY: process.env.SERPER_API_KEY || '',
  TAVILY_API_KEY: process.env.TAVILY_API_KEY || '',
  CHROMA_API_KEY: process.env.CHROMA_API_KEY || '',
  CHROMA_TENANT: process.env.CHROMA_TENANT || '',
  CHROMA_DATABASE: process.env.CHROMA_DATABASE || '',
  APIFY_API_KEY: process.env.APIFY_API_KEY || ''
};
