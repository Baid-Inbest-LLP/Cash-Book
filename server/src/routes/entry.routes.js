import { Router } from 'express';
import * as controller from '../controllers/entry.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createPaymentSchema,
  createReceiptSchema,
  entryIdParamSchema,
  entryIdsBodySchema,
  listEntriesQuerySchema,
  updateEntrySchema,
} from '../validators/entry.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(listEntriesQuerySchema, 'query'), controller.listEntries);
router.get('/export', validate(listEntriesQuerySchema, 'query'), controller.exportEntries);
router.post('/receipt', validate(createReceiptSchema), controller.createReceipt);
router.post('/payment', validate(createPaymentSchema), controller.createPayment);
router.patch('/exclude', validate(entryIdsBodySchema), controller.excludeEntries);
router.patch('/restore', validate(entryIdsBodySchema), controller.restoreEntries);
router.delete(
  '/permanent',
  authorize('superadmin'),
  validate(entryIdsBodySchema),
  controller.deleteEntries,
);
router.put(
  '/:id',
  validate(entryIdParamSchema, 'params'),
  validate(updateEntrySchema),
  controller.updateEntry,
);

export default router;
