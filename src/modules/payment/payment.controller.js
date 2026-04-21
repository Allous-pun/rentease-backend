import {
  recordPaymentService,
  getPaymentsService,
  getTenantPaymentsService,
  getMonthlyStatusService,
  updatePaymentService,
  deletePaymentService
} from './payment.service.js'

export async function recordPayment(req, res) {
  try {
    const { tenantId, amount, paymentDate, method, transactionRef, notes } = req.body
    const { organizationId } = req.user

    if (!tenantId || !amount || !paymentDate || !method) {
      return res.status(400).json({
        message: 'tenantId, amount, paymentDate, and method are required'
      })
    }

    if (method === 'mpesa' && !transactionRef) {
      return res.status(400).json({
        message: 'transactionRef is required for M-Pesa payments'
      })
    }

    const payment = await recordPaymentService(
      { tenantId, amount, paymentDate, method, transactionRef, notes },
      organizationId
    )

    res.status(201).json(payment)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export async function getPayments(req, res) {
  try {
    const { organizationId } = req.user
    const payments = await getPaymentsService(organizationId)

    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      expectedAmount: payment.expectedAmount,
      paymentDate: payment.paymentDate,
      dueDate: payment.dueDate,
      month: payment.month,
      year: payment.year,
      status: payment.status,
      method: payment.method,
      transactionRef: payment.transactionRef,
      notes: payment.notes,
      unitId: payment.unitId,
      tenant: {
        id: payment.tenant.id,
        name: payment.tenant.name,
        phone: payment.tenant.phone,
        unitNumber: payment.tenant.unit.unitNumber,
        propertyName: payment.tenant.unit.property.name
      }
    }))

    res.json(formattedPayments)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export async function getTenantPayments(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user

    const result = await getTenantPaymentsService(id, organizationId)

    // result is now an object with { payments, statement }
    res.json(result)
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
}

export async function getMonthlyStatus(req, res) {
  try {
    const { month, year } = req.query
    const { organizationId } = req.user

    if (!month || !year) {
      return res.status(400).json({
        message: 'month and year query parameters are required'
      })
    }

    const result = await getMonthlyStatusService(
      parseInt(month),
      parseInt(year),
      organizationId
    )

    // result already contains { summary, tenants }
    res.json(result)
  } catch (error) {
    console.error('Monthly status error:', error)
    res.status(500).json({ message: error.message })
  }
}

export async function updatePayment(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user
    const { amount, paymentDate, method, transactionRef, notes } = req.body

    const payment = await updatePaymentService(
      id,
      organizationId,
      { amount, paymentDate, method, transactionRef, notes }
    )

    res.json(payment)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export async function deletePayment(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user

    await deletePaymentService(id, organizationId)

    res.json({ message: 'Payment deleted successfully' })
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
}