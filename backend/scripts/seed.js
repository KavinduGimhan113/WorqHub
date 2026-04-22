<<<<<<< Updated upstream
/**
 * Seed: creates one Tenant and one Super Admin user so you can log in.
 * Run: npm run seed (from backend folder).
 * Super Admin: admin@worqhub.com / Admin@123
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Tenant = require('../src/models/Tenant');
const User = require('../src/models/User');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const SUPER_ADMIN_EMAIL = 'admin@worqhub.com';
const SUPER_ADMIN_PASSWORD = 'Admin@123';

async function seed() {
  if (!MONGO_URI) {
    console.error('Set MONGO_URI or MONGODB_URI in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  /** Prefer canonical name first (deterministic). Then migrate legacy demo name; then create. */
  let tenant = await Tenant.findOne({ name: 'Worqhub' });
  if (tenant) {
    console.log('Using existing tenant:', tenant.name, tenant._id);
  } else {
    const legacyDemo = await Tenant.findOne({ name: 'Worqhub Demo' });
    if (legacyDemo) {
      legacyDemo.name = 'Worqhub';
      await legacyDemo.save();
      tenant = legacyDemo;
      console.log('Renamed tenant Worqhub Demo → Worqhub:', tenant._id);
    } else {
      tenant = await Tenant.create({ name: 'Worqhub', plan: 'standard' });
      console.log('Created tenant:', tenant.name, tenant._id);
    }
  }

  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
  let user = await User.findOne({ tenantId: tenant._id, email: SUPER_ADMIN_EMAIL });
  if (!user) {
    user = await User.create({
      tenantId: tenant._id,
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      name: 'Super Admin',
      role: 'SuperAdmin',
    });
    console.log('Created Super Admin user:', user.email);
  } else {
    await User.updateOne(
      { _id: user._id },
      { passwordHash, name: 'Super Admin', role: 'SuperAdmin' }
    );
    console.log('Updated Super Admin:', user.email);
  }

  console.log('\n--- Super Admin login credentials ---');
  console.log('Email:     ', SUPER_ADMIN_EMAIL);
  console.log('Password:  ', SUPER_ADMIN_PASSWORD);
  console.log('Tenant ID: ', tenant._id.toString());
  console.log('-----------------------------------\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
=======
/**
 * Seed: creates one Tenant and one Super Admin user so you can log in.
 * Run: npm run seed (from backend folder).
 * Super Admin: admin@worqhub.com / Admin@123
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Tenant = require('../src/models/Tenant');
const User = require('../src/models/User');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const SUPER_ADMIN_EMAIL = 'admin@worqhub.com';
const SUPER_ADMIN_PASSWORD = 'Admin@123';

async function seed() {
  if (!MONGO_URI) {
    console.error('Set MONGO_URI or MONGODB_URI in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  let tenant = await Tenant.findOne({ name: 'Worqhub Demo' });
  if (!tenant) {
    tenant = await Tenant.create({ name: 'Worqhub Demo', plan: 'standard' });
    console.log('Created tenant:', tenant.name, tenant._id);
  } else {
    console.log('Using existing tenant:', tenant.name, tenant._id);
  }

  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
  let user = await User.findOne({ tenantId: tenant._id, email: SUPER_ADMIN_EMAIL });
  if (!user) {
    user = await User.create({
      tenantId: tenant._id,
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      name: 'Super Admin',
      role: 'SuperAdmin',
    });
    console.log('Created Super Admin user:', user.email);
  } else {
    await User.updateOne(
      { _id: user._id },
      { passwordHash, name: 'Super Admin', role: 'SuperAdmin' }
    );
    console.log('Updated Super Admin:', user.email);
  }

  console.log('\n--- Super Admin login credentials ---');
  console.log('Email:     ', SUPER_ADMIN_EMAIL);
  console.log('Password:  ', SUPER_ADMIN_PASSWORD);
  console.log('Tenant ID: ', tenant._id.toString());
  console.log('-----------------------------------\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
>>>>>>> Stashed changes
