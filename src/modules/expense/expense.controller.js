import {
  createExpenseService,
  getExpensesService,
  getExpenseByIdService,
  updateExpenseService,
  deleteExpenseService
} from './expense.service.js'

export async function createExpense(req, res) {
  try {
    const { amount, description, date, notes, propertyId, unitId, maintenanceId } = req.body
    const { organizationId, userId } = req.user

    if (!amount || !description || !date) {
      return res.status(400).json({
        message: 'amount, description, and date are required'
      })
    }

    const expense = await createExpenseService(
      { amount, description, date, notes, propertyId, unitId, maintenanceId },
      organizationId,
      userId
    )

    res.status(201).json(expense)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export async function getExpenses(req, res) {
  try {
    const { organizationId } = req.user
    const { propertyId, unitId, maintenanceId, startDate, endDate } = req.query

    const expenses = await getExpensesService(
      organizationId,
      { propertyId, unitId, maintenanceId, startDate, endDate }
    )

    res.json(expenses)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export async function getExpenseById(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user

    const expense = await getExpenseByIdService(id, organizationId)

    res.json(expense)
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
}

export async function updateExpense(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user
    const { amount, description, date, notes } = req.body

    const expense = await updateExpenseService(
      id,
      organizationId,
      { amount, description, date, notes }
    )

    res.json(expense)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export async function deleteExpense(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user

    await deleteExpenseService(id, organizationId)

    res.json({ message: 'Expense deleted successfully' })
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
}