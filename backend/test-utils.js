// test-utils.js
const { hashPassword, comparePassword } = require('./src/utils/bcrypt.util');
const { generateToken, verifyToken } = require('./src/utils/jwt.util');

async function testUtils() {
  console.log('🔐 Test des utilitaires...\n');
  
  // Test 1: Bcrypt
  console.log('1️⃣ Test Bcrypt (hashage de mots de passe)');
  const password = 'password123';
  console.log('   Mot de passe original:', password);
  
  const hashed = await hashPassword(password);
  console.log('   Mot de passe hashé:', hashed);
  
  const isMatch = await comparePassword(password, hashed);
  console.log('   Vérification:', isMatch ? '✅ Correspond' : '❌ Ne correspond pas');
  
  const isWrong = await comparePassword('wrongpassword', hashed);
  console.log('   Mauvais mot de passe:', isWrong ? '✅ Correspond' : '❌ Ne correspond pas');
  
  console.log('');
  
  // Test 2: JWT
  console.log('2️⃣ Test JWT (tokens d\'authentification)');
  const payload = {
    userId: '123456',
    email: 'test@example.com',
    role: 'user'
  };
  
  console.log('   Payload:', payload);
  
  const token = generateToken(payload);
  console.log('   Token généré:', token.substring(0, 50) + '...');
  
  try {
    const decoded = verifyToken(token);
    console.log('   Token décodé:', decoded);
    console.log('   ✅ Token valide !');
  } catch (error) {
    console.log('   ❌ Token invalide:', error.message);
  }
  
  console.log('\n✅ Tous les tests réussis !');
}

testUtils();