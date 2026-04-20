import { Router } from 'express'
import protect from '../../middleware/protect.js'
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
} from './expense.controller.js'

const router = Router()

router.use(protect)

router.post('/expenses', createExpense)
router.get('/expenses', getExpenses)
router.get('/expenses/:id', getExpenseById)
router.patch('/expenses/:id', updateExpense)
router.delete('/expenses/:id', deleteExpense)

export default router