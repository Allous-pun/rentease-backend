import { Router } from 'express'
import protect from '../../middleware/protect.js'
import {
  recordDeposit,
  getDeposits,
  getTenantDeposits,
  refundDeposit,
  getDepositStats
} from './deposit.controller.js'

const router = Router()

router.use(protect)

router.post('/deposits', recordDeposit)
router.get('/deposits', getDeposits)
router.get('/tenants/:id/deposits', getTenantDeposits)
router.patch('/deposits/:id/refund', refundDeposit)
router.get('/deposits/stats', getDepositStats)

export default router