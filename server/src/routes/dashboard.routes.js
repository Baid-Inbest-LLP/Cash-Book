import { Router } from 'express';
import * as controller from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reportQuerySchema } from '../validators/report.validator.js';
import {
  expenseByMonthQuerySchema,
  topExpenseHeadsQuerySchema,
} from '../validators/dashboard.validator.js';

const router = Router();

router.use(authenticate);

router.get('/expense-by-company', validate(reportQuerySchema, 'query'), controller.expenseByCompany);
router.get(
  '/expense-by-expense-head',
  validate(reportQuerySchema, 'query'),
  controller.expenseByExpenseHead,
);
router.get('/expense-by-month', validate(expenseByMonthQuerySchema, 'query'), controller.expenseByMonth);
router.get('/stats', validate(expenseByMonthQuerySchema, 'query'), controller.stats);
router.get(
  '/top-expense-heads',
  validate(topExpenseHeadsQuerySchema, 'query'),
  controller.topExpenseHeads,
);

export default router;
