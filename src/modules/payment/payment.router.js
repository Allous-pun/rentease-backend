import { Router } from 'express'
import protect from '../../middleware/protect.js'
import {
  recordPayment,
  getPayments,
  getTenantPayments,
  getMonthlyStatus,
  updatePayment,
  deletePayment
} from './payment.controller.js'

const router = Router()

// All routes require authentication
router.use(protect)

// Payment routes
router.post('/payments', recordPayment)
router.get('/payments', getPayments)
router.get('/payments/monthly-status', getMonthlyStatus)
router.get('/tenants/:id/payments', getTenantPayments)
router.patch('/payments/:id', updatePayment)
router.delete('/payments/:id', deletePayment)

export default router