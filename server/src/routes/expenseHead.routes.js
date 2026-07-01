import { Router } from 'express';
import * as controller from '../controllers/expenseHead.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createExpenseHeadSchema,
  updateExpenseHeadSchema,
} from '../validators/expenseHead.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', controller.listExpenseHeads);
router.post(
  '/',
  authorize('superadmin'),
  validate(createExpenseHeadSchema),
  controller.createExpenseHead,
);
router.put(
  '/:id',
  authorize('superadmin'),
  validate(updateExpenseHeadSchema),
  controller.updateExpenseHead,
);
router.delete('/:id', authorize('superadmin'), controller.deleteExpenseHead);

export default router;
