import { Router } from 'express';
import * as master from '../controllers/master.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/lookups', master.getLookupData);

router.get('/companies', master.companyController.list);
router.post('/companies', authorize('superadmin'), master.companyController.create);
router.put('/companies/:id', authorize('superadmin'), master.companyController.update);
router.delete('/companies/:id', authorize('superadmin'), master.companyController.remove);

router.get('/locations', master.locationController.list);
router.post('/locations', authorize('superadmin'), master.locationController.create);
router.put('/locations/:id', authorize('superadmin'), master.locationController.update);
router.delete('/locations/:id', authorize('superadmin'), master.locationController.remove);

router.get('/users', authorize('superadmin'), master.listUsers);
router.put('/users/:id', authorize('superadmin'), master.updateUser);
router.delete('/users/:id', authorize('superadmin'), master.deleteUser);
router.post('/users/:id/reset-password', authorize('superadmin'), master.resetPassword);

export default router;
