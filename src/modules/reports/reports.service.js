import prisma from '../../lib/prisma.js'
import {
  toNumber,
  toFixed,
  toFixedString,
  calculateBalance,
  calculateCollectionRate,
  calculateOccupancyRate,
  getDaysOverdue,
  getAgingBucket,
  formatDate
} from '../../utils/financial.utils.js'

// 1. ARREARS REPORT
export async function getArrearsReport(organizationId) {
  const today = new Date()
  
  const unpaidCharges = await prisma.rentCharge.findMany({
    where: {
      organizationId,
      status: { in: ['unpaid', 'partial'] },
      dueDate: { lt: today }
    },
    select: {
      tenantId: true,
      month: true,
      year: true,
      amount: true,
      paidAmount: true,
      dueDate: true,
      tenant: {
        select: {
          name: true,
          phone: true,
          unit: {
            select: {
              unitNumber: true,
              property: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: [{ dueDate: 'asc' }]
  })

  const tenantMap = new Map()

  for (const charge of unpaidCharges) {
    const tenantId = charge.tenantId
    const balance = calculateBalance(charge.amount, charge.paidAmount)
    
    if (!tenantMap.has(tenantId)) {
      tenantMap.set(tenantId, {
        tenantId,
        tenantName: charge.tenant.name,
        phone: charge.tenant.phone,
        unitNumber: charge.tenant.unit.unitNumber,
        propertyName: charge.tenant.unit.property.name,
        monthsOwed: 0,
        totalOwed: 0,
        oldestDebt: `${charge.month}/${charge.year}`,
        charges: []
      })
    }
    
    const tenant = tenantMap.get(tenantId)
    tenant.monthsOwed++
    tenant.totalOwed += balance
    tenant.charges.push({
      period: `${charge.month}/${charge.year}`,
      amount: toFixed(charge.amount),
      paidAmount: toFixed(charge.paidAmount),
      balance,
      dueDate: formatDate(charge.dueDate)
    })
  }

  const tenants = Array.from(tenantMap.values())
  const totalArrears = tenants.reduce((sum, t) => sum + t.totalOwed, 0)

  return {
    totalArrears: toFixed(totalArrears),
    tenants: tenants.sort((a, b) => b.totalOwed - a.totalOwed).map(t => ({
      ...t,
      totalOwed: toFixed(t.totalOwed)
    }))
  }
}

// 2. AGING ANALYSIS
export async function getAgingReport(organizationId) {
  const today = new Date()
  
  const unpaidCharges = await prisma.rentCharge.findMany({
    where: {
      organizationId,
      status: { in: ['unpaid', 'partial'] },
      dueDate: { lt: today }
    },
    select: {
      amount: true,
      paidAmount: true,
      dueDate: true
    }
  })

  const aging = {
    current: 0,
    '0_30': 0,
    '31_60': 0,
    '61_90': 0,
    '90_plus': 0
  }

  for (const charge of unpaidCharges) {
    const daysOverdue = getDaysOverdue(charge.dueDate)
    const bucket = getAgingBucket(daysOverdue)
    const balance = calculateBalance(charge.amount, charge.paidAmount)
    aging[bucket] += balance
  }

  // Convert all values to fixed decimals (2 decimal places)
  return Object.fromEntries(
    Object.entries(aging).map(([key, value]) => [key, toFixed(value)])
  )
}

// 3. DASHBOARD REPORT
export async function getDashboardReport(organizationId) {
  // Get properties with unit counts
  const properties = await prisma.property.findMany({
    where: {
      organizationId,
      isDeleted: false
    },
    select: {
      id: true,
      units: {
        where: { isDeleted: false },
        select: {
          status: true
        }
      }
    }
  })

  const totalProperties = properties.length
  const totalUnits = properties.reduce((sum, p) => sum + p.units.length, 0)
  const occupiedUnits = properties.reduce((sum, p) => 
    sum + p.units.filter(u => u.status === 'occupied').length, 0
  )
  const vacantUnits = totalUnits - occupiedUnits
  const occupancyRate = calculateOccupancyRate(occupiedUnits, totalUnits)

  // Get current month charges
  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()

  const currentCharges = await prisma.rentCharge.findMany({
    where: {
      organizationId,
      month: currentMonth,
      year: currentYear
    },
    select: {
      amount: true,
      paidAmount: true
    }
  })

  const expectedThisMonth = currentCharges.reduce((sum, c) => sum + toNumber(c.amount), 0)
  const collectedThisMonth = currentCharges.reduce((sum, c) => sum + toNumber(c.paidAmount), 0)
  const collectionRate = calculateCollectionRate(collectedThisMonth, expectedThisMonth)
  
  // Get total arrears using aggregation
  const arrearsResult = await prisma.rentCharge.aggregate({
    where: {
      organizationId,
      status: { in: ['unpaid', 'partial'] },
      dueDate: { lt: today }
    },
    _sum: {
      amount: true,
      paidAmount: true
    }
  })

  const totalArrears = calculateBalance(arrearsResult._sum.amount || 0, arrearsResult._sum.paidAmount || 0)

  return {
    totalProperties,
    totalUnits,
    occupiedUnits,
    vacantUnits,
    occupancyRate,
    expectedThisMonth: toFixed(expectedThisMonth),
    collectedThisMonth: toFixed(collectedThisMonth),
    totalArrears,
    collectionRate
  }
}

// 4. MONTHLY PERFORMANCE REPORT
export async function getMonthlyReport(month, year, organizationId) {
  const charges = await prisma.rentCharge.findMany({
    where: {
      organizationId,
      month,
      year
    },
    select: {
      amount: true,
      paidAmount: true,
      status: true,
      tenantId: true,
      tenant: {
        select: {
          name: true,
          phone: true,
          unit: {
            select: {
              unitNumber: true,
              property: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }
    }
  })

  let expected = 0
  let collected = 0
  let totalBalance = 0
  let paidCount = 0
  let partialCount = 0
  let unpaidCount = 0

  const tenantDetails = charges.map(charge => {
    const amount = toNumber(charge.amount)
    const paidAmount = toNumber(charge.paidAmount)
    const balance = amount - paidAmount
    
    expected += amount
    collected += paidAmount
    totalBalance += balance
    
    if (charge.status === 'paid') paidCount++
    else if (charge.status === 'partial') partialCount++
    else if (charge.status === 'unpaid') unpaidCount++
    
    return {
      tenantId: charge.tenantId,
      tenantName: charge.tenant.name,
      phone: charge.tenant.phone,
      unitNumber: charge.tenant.unit.unitNumber,
      propertyName: charge.tenant.unit.property.name,
      expectedAmount: toFixed(amount),
      paidAmount: toFixed(paidAmount),
      balance: toFixed(balance),
      status: charge.status
    }
  })

  const arrears = expected - collected

  return {
    month,
    year,
    expected: toFixed(expected),
    collected: toFixed(collected),
    totalBalance: toFixed(totalBalance),  // ← ADDED: Total balance for the month
    arrears: toFixed(arrears),            // Past due (subset of balance)
    collectionRate: calculateCollectionRate(collected, expected),
    paidTenants: paidCount,
    partialTenants: partialCount,
    unpaidTenants: unpaidCount,
    tenants: tenantDetails.sort((a, b) => toNumber(b.balance) - toNumber(a.balance))
  }
}

// 5. EXPENSE SUMMARY REPORT
export async function getExpenseSummaryService(organizationId, startDate, endDate) {
  const where = { organizationId }
  
  if (startDate) where.date = { ...where.date, gte: new Date(startDate) }
  if (endDate) where.date = { ...where.date, lte: new Date(endDate) }

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      property: {
        select: { name: true }
      }
    }
  })

  const totalExpenses = expenses.reduce((sum, e) => sum + toNumber(e.amount), 0)
  
  // Group by property
  const byProperty = {}
  for (const expense of expenses) {
    const propertyName = expense.property?.name || 'Unassigned'
    if (!byProperty[propertyName]) {
      byProperty[propertyName] = 0
    }
    byProperty[propertyName] += toNumber(expense.amount)
  }

  return {
    totalExpenses: toFixed(totalExpenses),
    byProperty: Object.entries(byProperty).map(([name, amount]) => ({
      propertyName: name,
      amount: toFixed(amount)
    }))
  }
}

// 6. PROFIT REPORT (FIXED)
export async function getProfitReportService(month, year, organizationId) {
  // Get monthly income from rent charges
  const charges = await prisma.rentCharge.findMany({
    where: {
      organizationId,
      month,
      year
    },
    select: {
      amount: true,
      paidAmount: true
    }
  })

  const expected = charges.reduce((sum, c) => sum + toNumber(c.amount), 0)
  const collected = charges.reduce((sum, c) => sum + toNumber(c.paidAmount), 0)

  // Get expenses for the month
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)

  const expenses = await prisma.expense.findMany({
    where: {
      organizationId,
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      amount: true
    }
  })

  const totalExpenses = expenses.reduce((sum, e) => sum + toNumber(e.amount), 0)
  const netProfit = collected - totalExpenses
  const collectionRate = expected > 0 ? (collected / expected) * 100 : 0

  return {
    month,
    year,
    expected: toFixed(expected),
    collected: toFixed(collected),
    expenses: toFixed(totalExpenses),
    netProfit: toFixed(netProfit),
    collectionRate: toFixed(collectionRate)
  }
}