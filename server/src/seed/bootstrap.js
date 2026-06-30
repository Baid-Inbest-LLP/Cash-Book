import { User } from '../models/User.js';
import { ensureCompanies } from './ensureCompanies.js';

const DEFAULT_SUPERADMIN = {
  name: 'Super Admin',
  email: process.env.SUPERADMIN_EMAIL || 'superadmin@cashbook.com',
  password: process.env.SUPERADMIN_PASSWORD || 'super123',
  role: 'superadmin',
};

const DEFAULT_ACCOUNTANT = {
  name: 'Accountant',
  email: process.env.ACCOUNTANT_EMAIL || 'accountant@cashbook.com',
  password: process.env.ACCOUNTANT_PASSWORD || 'accountant123',
  role: 'accountant',
};

/** Ensures a superadmin exists (upgrades or creates when missing). */
export const ensureSuperAdminAccount = async () => {
  const existing = await User.findOne({ role: 'superadmin' });
  if (existing) return;

  const email = DEFAULT_SUPERADMIN.email;
  const byEmail = await User.findOne({ email });
  if (byEmail) {
    byEmail.role = 'superadmin';
    await byEmail.save({ validateBeforeSave: false });
    console.log(`Upgraded ${email} to superadmin`);
    return;
  }

  if ((await User.countDocuments()) === 0) return;

  await User.create(DEFAULT_SUPERADMIN);
  console.log(`Created superadmin: ${email} / ${DEFAULT_SUPERADMIN.password}`);
};

/** Migrate legacy admin/user roles to accountant. */
const migrateLegacyRoles = async () => {
  const result = await User.updateMany(
    { role: { $in: ['admin', 'user'] } },
    { $set: { role: 'accountant' } },
  );
  if (result.modifiedCount > 0) {
    console.log(`Migrated ${result.modifiedCount} legacy user(s) to accountant role`);
  }
};

export const ensureDefaultUsers = async () => {
  await migrateLegacyRoles();

  const count = await User.countDocuments();
  if (count > 0) {
    await ensureSuperAdminAccount();
    return;
  }

  await User.create([DEFAULT_SUPERADMIN, DEFAULT_ACCOUNTANT]);

  console.log('\n--- Default accounts created (database was empty) ---');
  console.log(`  Superadmin: ${DEFAULT_SUPERADMIN.email} / ${DEFAULT_SUPERADMIN.password}`);
  console.log(`  Accountant: ${DEFAULT_ACCOUNTANT.email} / ${DEFAULT_ACCOUNTANT.password}`);
  console.log('--- Run `pnpm --filter server seed` for full sample data ---\n');
};

export const bootstrapCompanies = async () => {
  try {
    await ensureCompanies();
  } catch (err) {
    console.error('Company bootstrap failed:', err.message);
  }
};
