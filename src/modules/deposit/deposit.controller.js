import {
  recordDepositService,
  getDepositsService,
  getTenantDepositsService,
  refundDepositService,
  getDepositStatsService
} from './deposit.service.js'

export async function recordDeposit(req, res) {
  try {
    const { tenantId, amount, paymentDate, paymentMethod, transactionRef, notes } = req.body
    const { organizationId } = req.user

    if (!tenantId || !amount || !paymentDate || !paymentMethod) {
      return res.status(400).json({
        message: 'tenantId, amount, paymentDate, and paymentMethod are required'
      })
    }

    if (paymentMethod === 'mpesa' && !transactionRef) {
      return res.status(400).json({
        message: 'transactionRef is required for M-Pesa payments'
      })
    }

    const deposit = await recordDepositService(
      { tenantId, amount, paymentDate, paymentMethod, transactionRef, notes },
      organizationId
    )

    res.status(201).json(deposit)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export async function getDeposits(req, res) {
  try {
    const { organizationId } = req.user
    const deposits = await getDepositsService(organizationId)
    res.json(deposits)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export async function getTenantDeposits(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user
    const deposits = await getTenantDepositsService(id, organizationId)
    res.json(deposits)
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
}

export async function refundDeposit(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user
    const { refundAmount, notes } = req.body

    const deposit = await refundDepositService(id, organizationId, { refundAmount, notes })
    res.json(deposit)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export async function getDepositStats(req, res) {
  try {
    const { organizationId } = req.user
    const stats = await getDepositStatsService(organizationId)
    res.json(stats)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}