import prisma from '../../lib/prisma.js'
import { toNumber, toFixed } from '../../utils/financial.utils.js'

// Record expense
export async function createExpenseService(data, organizationId, userId) {
  // Verify property belongs to organization if provided
  if (data.propertyId) {
    const property = await prisma.property.findFirst({
      where: {
        id: data.propertyId,
        organizationId,
        isDeleted: false
      }
    })
    if (!property) throw new Error('Property not found or access denied')
  }

  // Verify unit belongs to organization if provided
  if (data.unitId) {
    const unit = await prisma.unit.findFirst({
      where: {
        id: data.unitId,
        organizationId,
        isDeleted: false
      }
    })
    if (!unit) throw new Error('Unit not found or access denied')
  }

  // Verify maintenance belongs to organization if provided
  if (data.maintenanceId) {
    const maintenance = await prisma.maintenanceRequest.findFirst({
      where: {
        id: data.maintenanceId,
        organizationId
      }
    })
    if (!maintenance) throw new Error('Maintenance request not found or access denied')
  }

  return prisma.expense.create({
    data: {
      amount: toFixed(data.amount),
      description: data.description,
      date: new Date(data.date),
      category: data.category || 'maintenance',
      notes: data.notes,
      recordedById: userId,
      propertyId: data.propertyId || null,
      unitId: data.unitId || null,
      maintenanceId: data.maintenanceId || null,
      organizationId
    },
    include: {
      recordedBy: {
        select: {
          id: true,
          name: true
        }
      },
      property: {
        select: {
          id: true,
          name: true
        }
      },
      unit: {
        select: {
          id: true,
          unitNumber: true
        }
      },
      maintenance: {
        select: {
          id: true,
          title: true,
          status: true
        }
      }
    }
  })
}

// Get expenses with filters
export async function getExpensesService(organizationId, filters = {}) {
  const where = { organizationId }
  
  if (filters.propertyId) where.propertyId = filters.propertyId
  if (filters.unitId) where.unitId = filters.unitId
  if (filters.maintenanceId) where.maintenanceId = filters.maintenanceId
  if (filters.category) where.category = filters.category
  if (filters.startDate) where.date = { ...where.date, gte: new Date(filters.startDate) }
  if (filters.endDate) where.date = { ...where.date, lte: new Date(filters.endDate) }

  return prisma.expense.findMany({
    where,
    include: {
      recordedBy: {
        select: { id: true, name: true }
      },
      property: {
        select: { id: true, name: true }
      },
      unit: {
        select: { id: true, unitNumber: true }
      },
      maintenance: {
        select: { id: true, title: true, status: true }
      }
    },
    orderBy: { date: 'desc' }
  })
}

// Get single expense
export async function getExpenseByIdService(id, organizationId) {
  const expense = await prisma.expense.findFirst({
    where: { id, organizationId },
    include: {
      recordedBy: {
        select: { id: true, name: true }
      },
      property: {
        select: { id: true, name: true }
      },
      unit: {
        select: { id: true, unitNumber: true }
      },
      maintenance: {
        select: { id: true, title: true, status: true }
      }
    }
  })

  if (!expense) throw new Error('Expense not found')
  return expense
}

// Update expense
export async function updateExpenseService(id, organizationId, data) {
  const expense = await prisma.expense.findFirst({
    where: { id, organizationId }
  })

  if (!expense) throw new Error('Expense not found')

  return prisma.expense.update({
    where: { id },
    data: {
      amount: data.amount !== undefined ? toFixed(data.amount) : undefined,
      description: data.description !== undefined ? data.description : undefined,
      date: data.date !== undefined ? new Date(data.date) : undefined,
      category: data.category !== undefined ? data.category : undefined,
      notes: data.notes !== undefined ? data.notes : undefined
    },
    include: {
      recordedBy: {
        select: { id: true, name: true }
      },
      property: {
        select: { id: true, name: true }
      },
      unit: {
        select: { id: true, unitNumber: true }
      }
    }
  })
}

// Delete expense
export async function deleteExpenseService(id, organizationId) {
  const expense = await prisma.expense.findFirst({
    where: { id, organizationId }
  })

  if (!expense) throw new Error('Expense not found')

  return prisma.expense.delete({ where: { id } })
}