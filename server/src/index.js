import app from './app.js';
import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';

const start = async () => {
  await connectDatabase();
  app.listen(config.port, () => {
    console.log(`Cash Book Server running on port ${config.port} [${config.env}]`);
  });
};

start();
