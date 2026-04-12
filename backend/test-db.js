// test-db.js
const connectDB = require('./src/config/database');

console.log('🔍 Test de connexion MongoDB...');

connectDB()
  .then(() => {
    console.log('✅ Connexion réussie !');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  });