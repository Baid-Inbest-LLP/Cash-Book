import { Router } from 'express';
import * as controller from '../controllers/entry.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createPaymentSchema,
  createReceiptSchema,
  entryIdParamSchema,
  listEntriesQuerySchema,
  updateEntrySchema,
} from '../validators/entry.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(listEntriesQuerySchema, 'query'), controller.listEntries);
router.post('/receipt', validate(createReceiptSchema), controller.createReceipt);
router.post('/payment', validate(createPaymentSchema), controller.createPayment);
router.put(
  '/:id',
  validate(entryIdParamSchema, 'params'),
  validate(updateEntrySchema),
  controller.updateEntry,
);
router.delete('/:id', validate(entryIdParamSchema, 'params'), controller.excludeEntry);
router.patch('/:id/restore', validate(entryIdParamSchema, 'params'), controller.restoreEntry);
router.delete(
  '/:id/permanent',
  authorize('superadmin'),
  validate(entryIdParamSchema, 'params'),
  controller.deleteEntry,
);

export default router;
