import prisma from '../../lib/prisma.js'
import { generateRentCharge } from '../payment/rent-allocation.service.js'

export async function addTenantService(data, organizationId) {
  // Validate rentDueDay (1-28)
  if (data.rentDueDay < 1 || data.rentDueDay > 28) {
    throw new Error('rentDueDay must be between 1 and 28')
  }

  // Check if unit exists and belongs to this organization
  const unit = await prisma.unit.findFirst({
    where: {
      id: data.unitId,
      organizationId,
      isDeleted: false
    },
    include: {
      tenants: {
        where: {
          status: 'active',
          isDeleted: false
        }
      }
    }
  })

  if (!unit) throw new Error('Unit not found or access denied')
  
  // Check if unit already has active tenant
  if (unit.tenants.length > 0) {
    throw new Error('Unit already has an active tenant')
  }

  // Check if unit is vacant
  if (unit.status !== 'vacant') {
    throw new Error('Unit is not vacant')
  }

  // Validate phone format (+254XXXXXXXXX)
  const phoneRegex = /^\+254\d{9}$/
  if (!phoneRegex.test(data.phone)) {
    throw new Error('Phone must be in +254XXXXXXXXX format')
  }

  // Create tenant and update unit status in transaction
  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: data.name,
        phone: data.phone,
        leaseStart: new Date(data.leaseStart),
        rentDueDay: data.rentDueDay,
        notes: data.notes,
        unitId: data.unitId,
        organizationId
      }
    })

    // Update unit status to occupied
    await tx.unit.update({
      where: { id: data.unitId },
      data: { status: 'occupied' }
    })

    return tenant
  })

  // Generate rent charge for current month after tenant is created
  try {
    const today = new Date()
    const currentMonth = today.getMonth() + 1
    const currentYear = today.getFullYear()
    
    await generateRentCharge(result.id, currentMonth, currentYear, organizationId)
    console.log(`✅ Rent charge generated for ${result.name} for ${currentMonth}/${currentYear}`)
  } catch (error) {
    console.error('Failed to generate rent charge:', error.message)
    // Don't throw - tenant was created successfully
  }

  return result
}

export async function getTenantsService(organizationId) {
  return prisma.tenant.findMany({
    where: {
      organizationId,
      isDeleted: false
    },
    include: {
      unit: {
        include: {
          property: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getTenantService(id, organizationId) {
  const tenant = await prisma.tenant.findFirst({
    where: {
      id,
      organizationId,
      isDeleted: false
    },
    include: {
      unit: {
        include: {
          property: true
        }
      }
    }
  })

  if (!tenant) throw new Error('Tenant not found')
  return tenant
}

export async function updateTenantService(id, organizationId, data) {
  const tenant = await getTenantService(id, organizationId)

  // Validate rentDueDay if provided
  if (data.rentDueDay !== undefined && (data.rentDueDay < 1 || data.rentDueDay > 28)) {
    throw new Error('rentDueDay must be between 1 and 28')
  }

  // Validate phone if provided
  if (data.phone !== undefined) {
    const phoneRegex = /^\+254\d{9}$/
    if (!phoneRegex.test(data.phone)) {
      throw new Error('Phone must be in +254XXXXXXXXX format')
    }
  }

  return prisma.tenant.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name : undefined,
      phone: data.phone !== undefined ? data.phone : undefined,
      rentDueDay: data.rentDueDay !== undefined ? data.rentDueDay : undefined,
      notes: data.notes !== undefined ? data.notes : undefined
    },
    include: {
      unit: {
        include: {
          property: true
        }
      }
    }
  })
}

export async function moveOutTenantService(id, organizationId) {
  const tenant = await getTenantService(id, organizationId)

  if (tenant.status === 'moved_out') {
    throw new Error('Tenant already moved out')
  }

  // Update tenant status and unit status in transaction
  const result = await prisma.$transaction(async (tx) => {
    const updatedTenant = await tx.tenant.update({
      where: { id },
      data: { status: 'moved_out' }
    })

    await tx.unit.update({
      where: { id: tenant.unitId },
      data: { status: 'vacant' }
    })

    return updatedTenant
  })

  return result
}

export async function deleteTenantService(id, organizationId) {
  const tenant = await getTenantService(id, organizationId)

  // Cannot soft delete active tenant without moving out first
  if (tenant.status === 'active') {
    throw new Error('Cannot delete active tenant. Move out first.')
  }

  return prisma.tenant.update({
    where: { id },
    data: { isDeleted: true }
  })
}
