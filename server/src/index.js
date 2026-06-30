import app from './app.js';
import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { ensureDefaultUsers, ensureSuperAdminAccount, bootstrapCompanies } from './seed/bootstrap.js';

const start = async () => {
  await connectDatabase();
  await ensureDefaultUsers();
  await ensureSuperAdminAccount();
  await bootstrapCompanies();
  app.listen(config.port, () => {
    console.log(`Cash Book Server running on port ${config.port} [${config.env}]`);
  });
};

start();
