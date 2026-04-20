import prisma from '../../lib/prisma.js'

export async function recordDepositService(data, organizationId) {
  // Verify tenant belongs to this organization and unit
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: data.tenantId,
      organizationId,
      isDeleted: false,
      status: 'active'
    },
    include: {
      unit: true
    }
  })

  if (!tenant) throw new Error('Active tenant not found or access denied')

  // Convert to numbers for comparison
  const depositAmount = tenant.unit.depositAmount ? Number(tenant.unit.depositAmount) : null
  const paymentAmount = Number(data.amount)

  // Verify deposit amount matches unit deposit requirement
  if (depositAmount && paymentAmount !== depositAmount) {
    throw new Error(`Deposit amount should be ${depositAmount}`)
  }

  // Check if deposit already recorded for this tenant
  const existingDeposit = await prisma.deposit.findFirst({
    where: {
      tenantId: data.tenantId,
      status: { in: ['held', 'deducted'] }
    }
  })

  if (existingDeposit) {
    throw new Error('Deposit already recorded for this tenant')
  }

  return prisma.deposit.create({
    data: {
      amount: paymentAmount,
      paymentDate: new Date(data.paymentDate),
      paymentMethod: data.paymentMethod,
      transactionRef: data.transactionRef,
      notes: data.notes,
      tenantId: data.tenantId,
      unitId: tenant.unitId,
      organizationId
    },
    include: {
      tenant: {
        include: {
          unit: {
            include: {
              property: true
            }
          }
        }
      }
    }
  })
}

export async function getDepositsService(organizationId) {
  return prisma.deposit.findMany({
    where: { organizationId },
    include: {
      tenant: {
        include: {
          unit: {
            include: {
              property: true
            }
          }
        }
      }
    },
    orderBy: { paymentDate: 'desc' }
  })
}

export async function getTenantDepositsService(tenantId, organizationId) {
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: tenantId,
      organizationId
    }
  })

  if (!tenant) throw new Error('Tenant not found or access denied')

  return prisma.deposit.findMany({
    where: { tenantId, organizationId },
    include: {
      unit: {
        include: {
          property: true
        }
      }
    },
    orderBy: { paymentDate: 'desc' }
  })
}

export async function refundDepositService(id, organizationId, data) {
  const deposit = await prisma.deposit.findFirst({
    where: {
      id,
      organizationId
    },
    include: {
      tenant: true
    }
  })

  if (!deposit) throw new Error('Deposit not found or access denied')
  if (deposit.status !== 'held') {
    throw new Error(`Deposit already ${deposit.status}`)
  }

  const refundAmount = data.refundAmount || deposit.amount
  const isFullRefund = refundAmount === deposit.amount
  const deductedAmount = deposit.amount - refundAmount

  return prisma.deposit.update({
    where: { id },
    data: {
      status: isFullRefund ? 'refunded' : 'deducted',  // ← FIX: Use 'refunded' for full refund
      refundAmount,
      refundDate: new Date(),
      refundNotes: data.notes || (deductedAmount > 0 ? `Damages deducted: ${deductedAmount}` : null)
    },
    include: {
      tenant: {
        include: {
          unit: {
            include: {
              property: true
            }
          }
        }
      }
    }
  })
}

export async function getDepositStatsService(organizationId) {
  const deposits = await prisma.deposit.findMany({
    where: { organizationId }
  })

  // Handle empty array
  if (!deposits || deposits.length === 0) {
    return {
      totalDepositsCollected: 0,
      totalHeld: 0,
      totalRefunded: 0,
      totalDeducted: 0,
      activeDeposits: 0,
      refundedDeposits: 0,
      deductedDeposits: 0
    }
  }

  const totalHeld = deposits
    .filter(d => d.status === 'held')
    .reduce((sum, d) => sum + Number(d.amount), 0)

  const totalRefunded = deposits
    .filter(d => d.status === 'refunded')
    .reduce((sum, d) => sum + Number(d.refundAmount || d.amount), 0)

  const totalDeducted = deposits
    .filter(d => d.status === 'deducted')
    .reduce((sum, d) => sum + (Number(d.amount) - Number(d.refundAmount || 0)), 0)

  return {
    totalDepositsCollected: deposits.reduce((sum, d) => sum + Number(d.amount), 0),
    totalHeld,
    totalRefunded,
    totalDeducted,
    activeDeposits: deposits.filter(d => d.status === 'held').length,
    refundedDeposits: deposits.filter(d => d.status === 'refunded').length,
    deductedDeposits: deposits.filter(d => d.status === 'deducted').length
  }
}