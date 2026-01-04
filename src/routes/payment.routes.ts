import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireHostOrAdmin } from '../middleware/role.middleware';
import { createPaymentIntent, confirmPayment, testConfirmPayment, getHostPayments, getHostEarningsSummary } from '../controllers/payment.controller';

const router = Router();

router.use(authenticate);

// Payment Intent
router.post('/create-intent', createPaymentIntent);
router.post('/confirm', confirmPayment);
router.post('/test-confirm', testConfirmPayment); // For testing without frontend

// Host Payments
router.get('/host', requireHostOrAdmin, getHostPayments);
router.get('/host/summary', requireHostOrAdmin, getHostEarningsSummary);

export default router;
