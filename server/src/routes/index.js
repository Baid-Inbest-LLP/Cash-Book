import { Router } from 'express';
import authRoutes from './auth.routes.js';
import masterRoutes from './master.routes.js';
import companyRoutes from './company.routes.js';
import expenseHeadRoutes from './expenseHead.routes.js';
import entryRoutes from './entry.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Cash Book API is running',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/masters', masterRoutes);
router.use('/companies', companyRoutes);
router.use('/expense-heads', expenseHeadRoutes);
router.use('/entries', entryRoutes);

export default router;
