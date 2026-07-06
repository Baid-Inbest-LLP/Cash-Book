import { Router } from 'express';
import * as controller from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  expenseHeadReportQuerySchema,
  monthwiseQuerySchema,
  reportQuerySchema,
} from '../validators/report.validator.js';

const router = Router();

router.use(authenticate);

router.get('/monthwise', validate(monthwiseQuerySchema, 'query'), controller.monthwise);
router.get(
  '/monthwise/export',
  validate(monthwiseQuerySchema, 'query'),
  controller.exportMonthwise,
);
router.get(
  '/expense-heads',
  validate(expenseHeadReportQuerySchema, 'query'),
  controller.expenseHeads,
);
router.get(
  '/expense-heads/export',
  validate(expenseHeadReportQuerySchema, 'query'),
  controller.exportExpenseHeads,
);
router.get('/companies', validate(reportQuerySchema, 'query'), controller.companies);
router.get('/companies/export', validate(reportQuerySchema, 'query'), controller.exportCompanies);

export default router;
