// src/config/database.js

const mongoose = require('mongoose');
const dns = require('dns');
const { MONGODB_URI } = require('./env');

// 🔧 FORCER LES DNS GOOGLE (Solution au problème ECONNREFUSED)
dns.setServers(['8.8.8.8', '8.8.4.4']);

/**
 * Fonction pour connecter à MongoDB
 * Utilise les DNS Google pour résoudre l'adresse MongoDB Atlas
 */
const connectDB = async () => {
  try {
    console.log('🔍 Serveurs DNS utilisés:', dns.getServers());
    console.log('⏳ Connexion à MongoDB Atlas...');
    
    // Options de connexion recommandées
    const options = {
      serverSelectionTimeoutMS: 10000, // 10 secondes timeout
      socketTimeoutMS: 45000,           // 45 secondes socket timeout
    };
    
    await mongoose.connect(MONGODB_URI, options);
    
    console.log('✅ MongoDB Connected');
    console.log('📁 Base de données:', mongoose.connection.name);
    
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;