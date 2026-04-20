import { Router } from 'express'
import protect from '../../middleware/protect.js'
import {
  arrears,
  aging,
  dashboard,
  monthly,
  expenseSummary,
  profitReport
} from './reports.controller.js'

const router = Router()

router.use(protect)

router.get('/reports/arrears', arrears)
router.get('/reports/arrears-aging', aging)
router.get('/reports/dashboard', dashboard)
router.get('/reports/monthly', monthly)
router.get('/reports/expenses', expenseSummary)
router.get('/reports/profit', profitReport)

export default router