// backend/server.js
require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/database');
const config = require('./src/config/env');
const { initSocket } = require('./src/config/socket');

const startServer = async () => {
  try {
    await connectDB();

    const httpServer = http.createServer(app);
    initSocket(httpServer);

    httpServer.listen(config.PORT, () => {
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║   🚀 SERVEUR DÉMARRÉ AVEC SUCCÈS      ║');
      console.log('╠════════════════════════════════════════╣');
      console.log(`║   📡 URL: http://localhost:${config.PORT}       ║`);
      console.log(`║   🔌 WS : ws://localhost:${config.PORT}         ║`);
      console.log(`║   📝 ENV: ${config.NODE_ENV.padEnd(16)} ║`);
      console.log('╠════════════════════════════════════════╣');
      console.log('║   📚 ENDPOINTS:                        ║');
      console.log('║   • POST /api/auth/register           ║');
      console.log('║   • POST /api/auth/login              ║');
      console.log('║   • GET  /api/auth/me                 ║');
      console.log('║   • GET  /api/projects                ║');
      console.log('║   • GET  /api/admin/users             ║');
      console.log('╚════════════════════════════════════════╝\n');
    });

    process.on('unhandledRejection', (err) => {
      console.error('❌ Erreur non gérée (Promise Rejection):', err);
      httpServer.close(() => process.exit(1));
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

startServer();
