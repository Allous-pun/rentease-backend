import prisma from '../../lib/prisma.js'

// Property Services
export async function createPropertyService(data, organizationId, landlordId) {
  return prisma.property.create({
    data: {
      name: data.name,
      location: data.location,
      organizationId,
      landlordId
    }
  })
}

export async function getPropertiesService(organizationId) {
  return prisma.property.findMany({
    where: {
      organizationId,
      isDeleted: false
    },
    include: {
      units: {
        where: { isDeleted: false },
        select: {
          id: true,
          unitNumber: true,
          rentAmount: true,
          depositAmount: true,      // ← ADD THIS
          status: true,
          notes: true,
          rentDueDay: true,
          gracePeriodDays: true,
          createdAt: true,
          updatedAt: true,
          organizationId: true,
          propertyId: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getPropertyService(id, organizationId) {
  const property = await prisma.property.findFirst({
    where: {
      id,
      organizationId,
      isDeleted: false
    },
    include: {
      units: {
        where: { isDeleted: false },
        select: {
          id: true,
          unitNumber: true,
          rentAmount: true,
          depositAmount: true,      // ← ADD THIS
          status: true,
          notes: true,
          rentDueDay: true,
          gracePeriodDays: true,
          createdAt: true,
          updatedAt: true,
          organizationId: true,
          propertyId: true
        }
      }
    }
  })
  
  if (!property) throw new Error('Property not found')
  return property
}

export async function updatePropertyService(id, organizationId, data) {
  await getPropertyService(id, organizationId)
  
  return prisma.property.update({
    where: { id },
    data: {
      name: data.name,
      location: data.location
    }
  })
}

export async function deletePropertyService(id, organizationId) {
  await getPropertyService(id, organizationId)
  
  const units = await prisma.unit.findMany({
    where: { propertyId: id, isDeleted: false }
  })
  
  if (units.length > 0) {
    throw new Error('Cannot delete property with existing units. Delete units first.')
  }
  
  return prisma.property.update({
    where: { id },
    data: { isDeleted: true }
  })
}

// Unit Services
export async function addUnitService(data, organizationId) {
  const property = await prisma.property.findFirst({
    where: {
      id: data.propertyId,
      organizationId,
      isDeleted: false
    }
  })
  
  if (!property) throw new Error('Property not found or access denied')
  
  return prisma.unit.create({
    data: {
      unitNumber: data.unitNumber,
      rentAmount: data.rentAmount,
      depositAmount: data.depositAmount || null,
      notes: data.notes,
      rentDueDay: data.rentDueDay || 1,
      gracePeriodDays: data.gracePeriodDays || 5,
      propertyId: data.propertyId,
      organizationId
    }
  })
}

export async function getPropertyUnitsService(propertyId, organizationId) {
  await getPropertyService(propertyId, organizationId)
  
  return prisma.unit.findMany({
    where: {
      propertyId,
      organizationId,
      isDeleted: false
    },
    select: {
      id: true,
      unitNumber: true,
      rentAmount: true,
      depositAmount: true,      // ← ADD THIS
      status: true,
      notes: true,
      rentDueDay: true,
      gracePeriodDays: true,
      createdAt: true,
      updatedAt: true,
      organizationId: true,
      propertyId: true
    },
    orderBy: { unitNumber: 'asc' }
  })
}

export async function updateUnitService(id, organizationId, data) {
  const unit = await prisma.unit.findFirst({
    where: {
      id,
      organizationId,
      isDeleted: false
    }
  })
  
  if (!unit) throw new Error('Unit not found')
  
  return prisma.unit.update({
    where: { id },
    data: {
      rentAmount: data.rentAmount !== undefined ? data.rentAmount : unit.rentAmount,
      depositAmount: data.depositAmount !== undefined ? data.depositAmount : unit.depositAmount,
      notes: data.notes !== undefined ? data.notes : unit.notes,
      status: data.status !== undefined ? data.status : unit.status,
      rentDueDay: data.rentDueDay !== undefined ? data.rentDueDay : unit.rentDueDay,
      gracePeriodDays: data.gracePeriodDays !== undefined ? data.gracePeriodDays : unit.gracePeriodDays
    },
    select: {
      id: true,
      unitNumber: true,
      rentAmount: true,
      depositAmount: true,      // ← ADD THIS
      status: true,
      notes: true,
      rentDueDay: true,
      gracePeriodDays: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
      organizationId: true,
      propertyId: true
    }
  })
}

export async function deleteUnitService(id, organizationId) {
  const unit = await prisma.unit.findFirst({
    where: {
      id,
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
  
  if (!unit) throw new Error('Unit not found')
  
  if (unit.tenants.length > 0) {
    throw new Error('Cannot delete unit with active tenants')
  }
  
  return prisma.unit.update({
    where: { id },
    data: { isDeleted: true }
  })
}