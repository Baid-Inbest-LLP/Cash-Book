import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User, Company, Location } from '../models/index.js';
import { normalizeMongoUri } from '../config/index.js';
import { getConnectionOptions } from '../config/database.js';
import { ensureCompanies } from './ensureCompanies.js';

dotenv.config();

const uri = normalizeMongoUri(process.env.MONGODB_URI);

const seed = async () => {
  await mongoose.connect(uri, getConnectionOptions(uri));
  console.log('Connected for seeding...');

  await Promise.all([User.deleteMany(), Company.deleteMany(), Location.deleteMany()]);

  await User.create({
    name: 'Super Admin',
    email: process.env.SUPERADMIN_EMAIL || 'superadmin@cashbook.com',
    password: process.env.SUPERADMIN_PASSWORD || 'super123',
    role: 'superadmin',
  });

  await User.create({
    name: 'Accountant',
    email: process.env.ACCOUNTANT_EMAIL || 'accountant@cashbook.com',
    password: process.env.ACCOUNTANT_PASSWORD || 'accountant123',
    role: 'accountant',
  });

  await ensureCompanies();

  console.log('Seed completed!');
  console.log(`Superadmin: ${process.env.SUPERADMIN_EMAIL || 'superadmin@cashbook.com'} / ${process.env.SUPERADMIN_PASSWORD || 'super123'}`);
  console.log(`Accountant: ${process.env.ACCOUNTANT_EMAIL || 'accountant@cashbook.com'} / ${process.env.ACCOUNTANT_PASSWORD || 'accountant123'}`);
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
