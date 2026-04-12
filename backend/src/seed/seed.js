// backend/src/seed/seed.js
// Seed admin + demo user + sample project + a few competitors.
// Usage:
//   node src/seed/seed.js           → idempotent (skips existing)
//   node src/seed/seed.js --reset   → wipes users/projects/competitors first

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User.model');
const Project = require('../models/Project.model');
const Competitor = require('../models/Competitor.model');

const RESET = process.argv.includes('--reset');

const USERS = [
  {
    email: 'admin@pfe.local',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'Root',
    role: 'admin',
    isActive: true,
    isEmailVerified: true
  },
  {
    email: 'user@pfe.local',
    password: 'User123!',
    firstName: 'Demo',
    lastName: 'User',
    role: 'user',
    isActive: true,
    isEmailVerified: true
  }
];

const COMPETITOR_SAMPLES = [
  { companyName: 'Patisserie Masmoudi',   website: 'https://www.masmoudi.com',        classificationMaturity: 'leader'  },
  { companyName: 'Zaphir Bakery',         website: 'https://zaphir.example.com',      classificationMaturity: 'leader'  },
  { companyName: 'La Rose des Sables',    website: 'https://rosedessables.example',   classificationMaturity: 'startup' },
  { companyName: 'Délices de Tunis',      website: 'https://delicestunis.example',    classificationMaturity: 'startup' }
];

async function upsertUser(def) {
  const existing = await User.findOne({ email: def.email });
  if (existing) {
    console.log(`  · skip user ${def.email} (exists)`);
    return existing;
  }
  const user = await User.create(def);
  console.log(`  ✓ created user ${user.email} [${user.role}]`);
  return user;
}

async function seedProjectForUser(user) {
  const existing = await Project.findOne({ userId: user._id, businessIdea: /Pâtisserie artisanale tunisienne/i });
  if (existing) {
    console.log(`  · skip sample project (exists) ${existing._id}`);
    return existing;
  }
  const project = await Project.create({
    userId: user._id,
    businessIdea: 'Pâtisserie artisanale tunisienne haut de gamme orientée export et événementiel.',
    marketCategory: 'Pâtisserie artisanale',
    targetCountry: 'TN',
    competitorsHint: ['masmoudi', 'zaphir'],
    status: 'active',
    pipelineStatus: 'step3_scraping'
  });
  console.log(`  ✓ created project ${project._id}`);
  return project;
}

async function seedCompetitors(project) {
  const count = await Competitor.countDocuments({ projectId: project._id });
  if (count > 0) {
    console.log(`  · skip competitors (${count} already exist for project)`);
    return;
  }
  const docs = COMPETITOR_SAMPLES.map((c) => ({
    projectId: project._id,
    companyName: c.companyName,
    website: c.website,
    classificationMaturity: c.classificationMaturity,
    classification: c.classificationMaturity,
    isActive: true
  }));
  const created = await Competitor.insertMany(docs);
  console.log(`  ✓ created ${created.length} competitors`);
}

async function main() {
  console.log('🌱 PFE Marketing Agent — DB seed');
  console.log(`   mode: ${RESET ? 'RESET (wipe first)' : 'upsert (idempotent)'}`);

  await connectDB();

  if (RESET) {
    console.log('⚠  Wiping users / projects / competitors…');
    await Promise.all([
      User.deleteMany({}),
      Project.deleteMany({}),
      Competitor.deleteMany({})
    ]);
    console.log('   cleared');
  }

  console.log('\n👤 Users');
  const [admin, demoUser] = await Promise.all(USERS.map(upsertUser));

  console.log('\n📁 Sample project (owned by demo user)');
  const project = await seedProjectForUser(demoUser);

  console.log('\n🏢 Competitors');
  await seedCompetitors(project);

  console.log('\n✅ Seed complete');
  console.log('\nLogin credentials:');
  console.log(`  admin → ${admin.email}  /  Admin123!`);
  console.log(`  user  → ${demoUser.email}  /  User123!`);

  await mongoose.connection.close();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('❌ Seed failed:', err);
  try { await mongoose.connection.close(); } catch {}
  process.exit(1);
});
