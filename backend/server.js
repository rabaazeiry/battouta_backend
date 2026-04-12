// backend/server.js
require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');
const config = require('./src/config/env');

/**
 * Démarrage du serveur
 */
const startServer = async () => {
  try {
    // 1. Connexion à MongoDB
    await connectDB();

    // 2. Démarrage du serveur Express
    const server = app.listen(config.PORT, () => {
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║   🚀 SERVEUR DÉMARRÉ AVEC SUCCÈS      ║');
      console.log('╠════════════════════════════════════════╣');
      console.log(`║   📡 URL: http://localhost:${config.PORT}       ║`);
      console.log(`║   📝 ENV: ${config.NODE_ENV.padEnd(16)} ║`);
      console.log('╠════════════════════════════════════════╣');
      console.log('║   📚 ENDPOINTS:                        ║');
      console.log('║   • POST /api/auth/register           ║');
      console.log('║   • POST /api/auth/login              ║');
      console.log('║   • GET  /api/auth/me                 ║');
      console.log('║   • GET  /api/projects                ║');
      console.log('║   • POST /api/projects                ║');
      console.log('║   • GET  /api/competitors             ║');
      console.log('╚════════════════════════════════════════╝\n');
    });

    // Gestion des erreurs non capturées
    process.on('unhandledRejection', (err) => {
      console.error('❌ Erreur non gérée (Promise Rejection):', err);
      server.close(() => process.exit(1));
    });

    process.on('uncaughtException', (err) => {
      console.error('❌ Erreur non gérée (Exception):', err);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Erreur au démarrage du serveur:', error);
    process.exit(1);
  }
};

// Démarrer l'application
startServer();
