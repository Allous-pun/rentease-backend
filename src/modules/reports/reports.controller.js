import {
  getArrearsReport,
  getAgingReport,
  getDashboardReport,
  getMonthlyReport,
  getExpenseSummaryService,
  getProfitReportService
} from './reports.service.js'

// GET /api/reports/arrears
export async function arrears(req, res) {
  try {
    const { organizationId } = req.user
    const report = await getArrearsReport(organizationId)
    res.json(report)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/reports/arrears-aging
export async function aging(req, res) {
  try {
    const { organizationId } = req.user
    const report = await getAgingReport(organizationId)
    res.json(report)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/reports/dashboard
export async function dashboard(req, res) {
  try {
    const { organizationId } = req.user
    const report = await getDashboardReport(organizationId)
    res.json(report)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/reports/monthly?month=4&year=2026
export async function monthly(req, res) {
  try {
    const { month, year } = req.query
    const { organizationId } = req.user

    if (!month || !year) {
      return res.status(400).json({
        message: 'month and year query parameters are required'
      })
    }

    const report = await getMonthlyReport(
      parseInt(month),
      parseInt(year),
      organizationId
    )
    res.json(report)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/reports/expenses
export async function expenseSummary(req, res) {
  try {
    const { organizationId } = req.user
    const { startDate, endDate } = req.query

    const report = await getExpenseSummaryService(organizationId, startDate, endDate)
    res.json(report)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/reports/profit?month=4&year=2026
export async function profitReport(req, res) {
  try {
    const { month, year } = req.query
    const { organizationId } = req.user

    if (!month || !year) {
      return res.status(400).json({
        message: 'month and year query parameters are required'
      })
    }

    const report = await getProfitReportService(
      parseInt(month),
      parseInt(year),
      organizationId
    )
    res.json(report)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}