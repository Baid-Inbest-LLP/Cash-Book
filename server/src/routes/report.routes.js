import { Router } from 'express';
import * as controller from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  expenseHeadReportQuerySchema,
  exportExpenseHeadReportQuerySchema,
  exportMonthwiseQuerySchema,
  monthwiseQuerySchema,
  reportQuerySchema,
} from '../validators/report.validator.js';

const router = Router();

router.use(authenticate);

router.get('/monthwise', validate(monthwiseQuerySchema, 'query'), controller.monthwise);
router.get(
  '/monthwise/export/excel',
  validate(exportMonthwiseQuerySchema, 'query'),
  controller.exportMonthwiseExcel,
);
router.get(
  '/monthwise/export/pdf',
  validate(exportMonthwiseQuerySchema, 'query'),
  controller.exportMonthwisePdf,
);
router.get(
  '/expense-heads',
  validate(expenseHeadReportQuerySchema, 'query'),
  controller.expenseHeads,
);
router.get(
  '/expense-heads/export/excel',
  validate(exportExpenseHeadReportQuerySchema, 'query'),
  controller.exportExpenseHeadsExcel,
);
router.get(
  '/expense-heads/export/pdf',
  validate(exportExpenseHeadReportQuerySchema, 'query'),
  controller.exportExpenseHeadsPdf,
);
router.get('/companies', validate(reportQuerySchema, 'query'), controller.companies);
router.get(
  '/companies/export/excel',
  validate(reportQuerySchema, 'query'),
  controller.exportCompaniesExcel,
);
router.get(
  '/companies/export/pdf',
  validate(reportQuerySchema, 'query'),
  controller.exportCompaniesPdf,
);

export default router;
