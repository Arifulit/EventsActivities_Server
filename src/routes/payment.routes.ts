import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireHostOrAdmin } from '../middleware/role.middleware';
import { getHostPayments, getHostEarningsSummary } from '../controllers/payment.controller';

const router = Router();

router.use(authenticate);

router.get('/host', requireHostOrAdmin, getHostPayments);
router.get('/host/summary', requireHostOrAdmin, getHostEarningsSummary);

export default router;
