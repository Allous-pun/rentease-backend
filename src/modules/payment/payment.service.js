import prisma from '../../lib/prisma.js'
import {
  allocatePayment,
  generateRentCharge,
  getOrCreateTenantCredit,
  getTenantStatement
} from './rent-allocation.service.js'

// Helper to get due date based on rentDueDay
function getDueDate(rentDueDay, paymentDate) {
  const date = new Date(paymentDate)
  const dueDate = new Date(date.getFullYear(), date.getMonth(), rentDueDay)
  
  // If due date is in the future relative to payment date, use previous month
  if (dueDate > date) {
    dueDate.setMonth(dueDate.getMonth() - 1)
  }
  
  return dueDate
}

export async function recordPaymentService(data, organizationId) {
  // Verify tenant belongs to this organization
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: data.tenantId,
      organizationId,
      isDeleted: false,
      status: 'active'
    },
    include: {
      unit: {
        include: {
          property: true
        }
      }
    }
  })

  if (!tenant) throw new Error('Active tenant not found or access denied')

  const paymentDate = new Date(data.paymentDate)
  const month = paymentDate.getMonth() + 1
  const year = paymentDate.getFullYear()

  // Ensure rent charge exists for current month
  await generateRentCharge(tenant.id, month, year, organizationId)

  // Allocate payment to charges (oldest first)
  const allocation = await allocatePayment(tenant.id, data.amount, organizationId)

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      amount: data.amount,
      expectedAmount: tenant.unit.rentAmount,
      paymentDate,
      dueDate: getDueDate(tenant.rentDueDay, paymentDate),
      month,
      year,
      status: allocation.remainingCredit > 0 ? 'paid' : (allocation.allocatedCharges.length > 0 ? 'partial' : 'paid'),
      method: data.method,
      transactionRef: data.transactionRef,
      notes: data.notes ? `${data.notes}\nAllocated to: ${allocation.allocatedCharges.map(c => `${c.month}/${c.year}`).join(', ')}${allocation.remainingCredit > 0 ? ` | Credit: ${allocation.remainingCredit}` : ''}` : `Allocated to: ${allocation.allocatedCharges.map(c => `${c.month}/${c.year}`).join(', ')}`,
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

  return {
    payment,
    allocation: {
      allocatedToMonths: allocation.allocatedCharges.map(c => `${c.month}/${c.year}`),
      creditRemaining: allocation.remainingCredit
    }
  }
}

export async function getPaymentsService(organizationId) {
  return prisma.payment.findMany({
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

export async function getTenantPaymentsService(tenantId, organizationId) {
  // Verify tenant belongs to this organization
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: tenantId,
      organizationId,
      isDeleted: false
    }
  })

  if (!tenant) throw new Error('Tenant not found or access denied')

  // Get payments
  const payments = await prisma.payment.findMany({
    where: { tenantId, organizationId },
    include: {
      unit: {
        include: {
          property: true
        }
      }
    },
    orderBy: [
      { year: 'desc' },
      { month: 'desc' }
    ]
  })

  // Get rent charges
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

  // Format charges for response
  const formattedCharges = charges.map(charge => ({
    period: `${charge.month}/${charge.year}`,
    amount: charge.amount,
    paidAmount: charge.paidAmount,
    balance: Number(charge.amount) - Number(charge.paidAmount),
    status: charge.status
  }))

  // Get credit balance
  const credit = await getOrCreateTenantCredit(tenantId, organizationId)

  // Return as object with payments and statement
  return {
    payments: payments.map(payment => ({
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
      unitNumber: payment.unit.unitNumber,
      propertyName: payment.unit.property.name
    })),
    statement: {
      tenantId,
      charges: formattedCharges,
      creditBalance: credit.balance
    }
  }
}

export async function getMonthlyStatusService(month, year, organizationId) {
  // Get rent charges for the specified month
  let charges = await prisma.rentCharge.findMany({
    where: {
      organizationId,
      month,
      year
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

  // If no charges exist yet, generate for active tenants
  if (charges.length === 0) {
    const activeTenants = await prisma.tenant.findMany({
      where: {
        organizationId,
        isDeleted: false,
        status: 'active'
      },
      include: {
        unit: true
      }
    })

    for (const tenant of activeTenants) {
      // Check if tenant has credit before creating charge
      const credit = await getOrCreateTenantCredit(tenant.id, organizationId)
      
      // Create the charge
      const charge = await generateRentCharge(tenant.id, month, year, organizationId)
      
      // If tenant has credit, apply it to this charge
      if (Number(credit.balance) > 0 && charge.status === 'unpaid') {
        const creditBalance = Number(credit.balance)
        const chargeAmount = Number(charge.amount)
        const currentPaid = Number(charge.paidAmount)
        const balance = chargeAmount - currentPaid
        const applied = Math.min(creditBalance, balance)
        
        if (applied > 0) {
          const newPaidAmount = currentPaid + applied
          const newCreditBalance = creditBalance - applied
          
          await prisma.rentCharge.update({
            where: { id: charge.id },
            data: {
              paidAmount: newPaidAmount,
              status: newPaidAmount >= chargeAmount ? 'paid' : 'partial'
            }
          })
          
          await prisma.tenantCredit.update({
            where: { id: credit.id },
            data: { balance: newCreditBalance }
          })
        }
      }
    }

    // Fetch charges again after generation and credit application
    charges = await prisma.rentCharge.findMany({
      where: {
        organizationId,
        month,
        year
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

  return calculateMonthlyStatus(charges, month, year)
}

function calculateMonthlyStatus(charges, month, year) {
  const monthlyStatus = charges.map(charge => {
    const expectedAmount = Number(charge.amount)
    const paidAmount = Number(charge.paidAmount)
    const balance = expectedAmount - paidAmount
    
    let status = 'unpaid'
    if (paidAmount >= expectedAmount) status = 'paid'
    else if (paidAmount > 0) status = 'partial'
    
    // Check if overdue
    const dueDate = getDueDate(charge.tenant.rentDueDay, new Date(year, month - 1, 1))
    const today = new Date()
    const isOverdue = today > dueDate && status !== 'paid'

    return {
      tenantId: charge.tenant.id,
      tenantName: charge.tenant.name,
      phone: charge.tenant.phone,
      unitNumber: charge.tenant.unit.unitNumber,
      propertyName: charge.tenant.unit.property.name,
      expectedAmount,
      paidAmount,
      balance,
      status,
      isOverdue,
      dueDate
    }
  })

  const summary = {
    totalTenants: monthlyStatus.length,
    totalExpected: monthlyStatus.reduce((sum, t) => sum + t.expectedAmount, 0),
    totalPaid: monthlyStatus.reduce((sum, t) => sum + t.paidAmount, 0),
    totalBalance: monthlyStatus.reduce((sum, t) => sum + t.balance, 0),
    paidCount: monthlyStatus.filter(t => t.status === 'paid').length,
    partialCount: monthlyStatus.filter(t => t.status === 'partial').length,
    unpaidCount: monthlyStatus.filter(t => t.status === 'unpaid').length,
    overdueCount: monthlyStatus.filter(t => t.isOverdue).length
  }

  // Sort: overdue first, then unpaid, then partial, then paid
  const sortedTenants = monthlyStatus.sort((a, b) => {
    const order = { overdue: 0, unpaid: 1, partial: 2, paid: 3 }
    const aKey = a.isOverdue ? 'overdue' : a.status
    const bKey = b.isOverdue ? 'overdue' : b.status
    return order[aKey] - order[bKey]
  })

  return { summary, tenants: sortedTenants }
}

export async function updatePaymentService(id, organizationId, data) {
  // Verify payment belongs to this organization
  const payment = await prisma.payment.findFirst({
    where: {
      id,
      organizationId
    },
    include: {
      tenant: {
        include: {
          unit: true
        }
      }
    }
  })

  if (!payment) throw new Error('Payment not found or access denied')

  // Get the difference
  const oldAmount = Number(payment.amount)
  const newAmount = data.amount !== undefined ? Number(data.amount) : oldAmount
  const amountDiff = newAmount - oldAmount

  if (amountDiff !== 0) {
    // Reallocate the difference
    if (amountDiff > 0) {
      // Additional payment - allocate to charges
      await allocatePayment(payment.tenantId, amountDiff, organizationId)
    } else {
      // Refund/negative - this is complex, handle by reversing
      // For MVP, suggest manual adjustment
      throw new Error('Reducing payment amount is complex. Please delete and recreate.')
    }
  }

  const status = getPaymentStatus(newAmount, Number(payment.expectedAmount))

  return prisma.payment.update({
    where: { id },
    data: {
      amount: data.amount !== undefined ? data.amount : undefined,
      paymentDate: data.paymentDate !== undefined ? new Date(data.paymentDate) : undefined,
      status,
      method: data.method !== undefined ? data.method : undefined,
      transactionRef: data.transactionRef !== undefined ? data.transactionRef : undefined,
      notes: data.notes !== undefined ? data.notes : undefined
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

// Helper to determine payment status (kept for update function)
function getPaymentStatus(amount, expectedAmount) {
  if (amount >= expectedAmount) return 'paid'
  if (amount > 0 && amount < expectedAmount) return 'partial'
  return 'unpaid'
}

export async function deletePaymentService(id, organizationId) {
  // Verify payment belongs to this organization
  const payment = await prisma.payment.findFirst({
    where: {
      id,
      organizationId
    },
    include: {
      tenant: true
    }
  })

  if (!payment) throw new Error('Payment not found or access denied')

  // Reverse the payment allocation
  const amountToReverse = Number(payment.amount)
  
  // Get unpaid charges and reverse from newest to oldest (simplified)
  // For MVP, mark for manual adjustment
  throw new Error('Deleting payments is complex. Please adjust via rent charges directly or contact support.')

  // return prisma.payment.delete({
  //   where: { id }
  // })
}

// Export new functions for external use
export { getOrCreateTenantCredit, getTenantStatement }