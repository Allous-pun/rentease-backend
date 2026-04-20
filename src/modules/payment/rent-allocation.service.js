import prisma from '../../lib/prisma.js'
import { toNumber, toFixed, normalizeDate, calculateBalance } from '../../utils/financial.utils.js'

// Generate rent charges for a tenant for a specific month
export async function generateRentCharge(tenantId, month, year, organizationId) {
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: tenantId,
      organizationId,
      isDeleted: false,
      status: 'active'
    },
    include: {
      unit: true
    }
  })

  if (!tenant) throw new Error('Tenant not found')

  const existingCharge = await prisma.rentCharge.findUnique({
    where: {
      tenantId_month_year: {
        tenantId,
        month,
        year
      }
    }
  })

  if (existingCharge) return existingCharge

  // Calculate due date at UTC midnight to avoid timezone issues
  const dueDate = normalizeDate(year, month, tenant.rentDueDay)

  return prisma.rentCharge.create({
    data: {
      tenantId,
      unitId: tenant.unitId,
      organizationId,
      month,
      year,
      amount: toFixed(toNumber(tenant.unit.rentAmount)),
      paidAmount: 0,
      dueDate,
      status: 'unpaid'
    }
  })
}

// Generate rent charges for future months
export async function generateFutureRentCharges(tenantId, startMonth, startYear, months, organizationId) {
  const charges = []
  for (let i = 0; i < months; i++) {
    let month = startMonth + i
    let year = startYear
    if (month > 12) {
      month = month - 12
      year++
    }
    const charge = await generateRentCharge(tenantId, month, year, organizationId)
    charges.push(charge)
  }
  return charges
}

// Get unpaid charges for a tenant (oldest first)
export async function getUnpaidCharges(tenantId, organizationId) {
  return prisma.rentCharge.findMany({
    where: {
      tenantId,
      organizationId,
      status: { in: ['unpaid', 'partial'] }
    },
    orderBy: [
      { year: 'asc' },
      { month: 'asc' }
    ]
  })
}

// Get or create tenant credit balance
export async function getOrCreateTenantCredit(tenantId, organizationId) {
  let credit = await prisma.tenantCredit.findUnique({
    where: { tenantId }
  })

  if (!credit) {
    credit = await prisma.tenantCredit.create({
      data: {
        tenantId,
        organizationId,
        balance: 0
      }
    })
  }

  return credit
}

// Allocate payment to charges (oldest first)
export async function allocatePayment(tenantId, paymentAmount, organizationId) {
  let remaining = toNumber(paymentAmount)
  let allocatedCharges = []
  let creditBalance = 0

  // Get unpaid charges (oldest first)
  const unpaidCharges = await getUnpaidCharges(tenantId, organizationId)

  // Apply to existing unpaid charges only
  for (const charge of unpaidCharges) {
    if (remaining <= 0) break

    const currentPaid = toNumber(charge.paidAmount)
    const chargeAmount = toNumber(charge.amount)
    const balance = chargeAmount - currentPaid
    const applied = Math.min(balance, remaining)

    const newPaidAmount = toFixed(currentPaid + applied)
    remaining = toFixed(remaining - applied)

    let status = 'unpaid'
    if (newPaidAmount >= chargeAmount) {
      status = 'paid'
    } else if (newPaidAmount > 0) {
      status = 'partial'
    }

    const updatedCharge = await prisma.rentCharge.update({
      where: { id: charge.id },
      data: {
        paidAmount: newPaidAmount,
        status
      }
    })

    allocatedCharges.push(updatedCharge)
  }

  // If there's remaining payment, store as credit
  if (remaining > 0) {
    const credit = await getOrCreateTenantCredit(tenantId, organizationId)
    const newBalance = toFixed(toNumber(credit.balance) + remaining)
    await prisma.tenantCredit.update({
      where: { id: credit.id },
      data: { balance: newBalance }
    })
    creditBalance = newBalance
  }

  return {
    allocatedCharges,
    remainingCredit: creditBalance
  }
}

// Apply credit to future charges
export async function applyCreditToFutureCharges(tenantId, organizationId) {
  const credit = await getOrCreateTenantCredit(tenantId, organizationId)
  let remainingCredit = toNumber(credit.balance)

  if (remainingCredit <= 0) return { appliedCharges: [], remainingCredit: 0 }

  const unpaidCharges = await getUnpaidCharges(tenantId, organizationId)

  for (const charge of unpaidCharges) {
    if (remainingCredit <= 0) break

    const currentPaid = toNumber(charge.paidAmount)
    const chargeAmount = toNumber(charge.amount)
    const balance = chargeAmount - currentPaid
    const applied = Math.min(balance, remainingCredit)

    const newPaidAmount = toFixed(currentPaid + applied)
    remainingCredit = toFixed(remainingCredit - applied)

    let status = 'unpaid'
    if (newPaidAmount >= chargeAmount) {
      status = 'paid'
    } else if (newPaidAmount > 0) {
      status = 'partial'
    }

    await prisma.rentCharge.update({
      where: { id: charge.id },
      data: {
        paidAmount: newPaidAmount,
        status
      }
    })
  }

  await prisma.tenantCredit.update({
    where: { id: credit.id },
    data: { balance: remainingCredit }
  })

  return {
    appliedCharges: unpaidCharges,
    remainingCredit
  }
}

// Get tenant statement
export async function getTenantStatement(tenantId, organizationId) {
  const charges = await prisma.rentCharge.findMany({
    where: {
      tenantId,
      organizationId
    },
    orderBy: [
      { year: 'asc' },
      { month: 'asc' }
    ]
  })

  const credit = await getOrCreateTenantCredit(tenantId, organizationId)

  return {
    tenantId,
    charges: charges.map(c => ({
      period: `${c.month}/${c.year}`,
      amount: toFixed(c.amount),
      paidAmount: toFixed(c.paidAmount),
      balance: calculateBalance(c.amount, c.paidAmount),
      status: c.status,
      dueDate: c.dueDate
    })),
    creditBalance: toFixed(credit.balance)
  }
}