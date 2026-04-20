import prisma from '../../lib/prisma.js'

// Unified create maintenance request - works for both authenticated and public
export async function createMaintenanceService(data, organizationId = null, userId = null, userRole = null) {
  let tenant = null
  let finalOrganizationId = organizationId

  // Case 1: Public request - find tenant by phone number
  if (!organizationId && data.phone) {
    tenant = await prisma.tenant.findFirst({
      where: {
        phone: data.phone,
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

    if (!tenant) {
      throw new Error('Tenant not found. Please check your phone number.')
    }
    finalOrganizationId = tenant.organizationId
  } 
  // Case 2: Authenticated request - use provided tenantId
  else if (data.tenantId && organizationId) {
    tenant = await prisma.tenant.findFirst({
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

    if (!tenant) {
      throw new Error('Tenant not found or access denied')
    }
  } 
  else {
    throw new Error('Either tenantId (for authenticated) or phone (for public) is required')
  }

  // Create the maintenance request
  const request = await prisma.maintenanceRequest.create({
    data: {
      title: data.title,
      description: data.description,
      createdBy: data.createdBy || 'tenant',
      tenantId: tenant.id,
      unitId: tenant.unitId,
      propertyId: tenant.unit.propertyId,
      organizationId: finalOrganizationId,
      status: 'pending'
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          phone: true
        }
      },
      unit: {
        select: {
          id: true,
          unitNumber: true
        }
      },
      property: {
        select: {
          id: true,
          name: true,
          location: true
        }
      }
    }
  })

  return request
}

// Get all maintenance requests (with filters)
export async function getMaintenanceService(organizationId, filters = {}, userRole, userId) {
  const where = { organizationId }
  
  // Apply filters
  if (filters.status) where.status = filters.status
  if (filters.propertyId) where.propertyId = filters.propertyId
  if (filters.assignedToMe && userRole !== 'landlord') {
    where.caretakerId = userId
  }
  
  // Tenants can only see their own requests
  if (userRole === 'tenant') {
    where.tenantId = userId
  }

  return prisma.maintenanceRequest.findMany({
    where,
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          phone: true
        }
      },
      unit: {
        select: {
          id: true,
          unitNumber: true
        }
      },
      property: {
        select: {
          id: true,
          name: true,
          location: true
        }
      },
      caretaker: {
        select: {
          id: true,
          name: true,
          phone: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

// Get single maintenance request
export async function getMaintenanceByIdService(id, organizationId, userRole, userId) {
  const request = await prisma.maintenanceRequest.findFirst({
    where: { id, organizationId },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          phone: true
        }
      },
      unit: {
        select: {
          id: true,
          unitNumber: true
        }
      },
      property: {
        select: {
          id: true,
          name: true,
          location: true
        }
      },
      caretaker: {
        select: {
          id: true,
          name: true,
          phone: true
        }
      },
      expenses: true
    }
  })

  if (!request) throw new Error('Maintenance request not found')
  
  // Check permission
  if (userRole === 'tenant' && request.tenantId !== userId) {
    throw new Error('Access denied')
  }

  return request
}

// Assign caretaker to maintenance request
export async function assignCaretakerService(id, caretakerId, organizationId) {
  // Verify caretaker exists and belongs to same organization
  const caretaker = await prisma.user.findFirst({
    where: {
      id: caretakerId,
      organizationId,
      role: 'caretaker',
      isDeleted: false
    }
  })

  if (!caretaker) throw new Error('Caretaker not found or access denied')

  const request = await prisma.maintenanceRequest.findFirst({
    where: { id, organizationId }
  })

  if (!request) throw new Error('Maintenance request not found')

  return prisma.maintenanceRequest.update({
    where: { id },
    data: { caretakerId },
    include: {
      tenant: {
        select: { name: true, phone: true }
      },
      unit: {
        select: { unitNumber: true }
      },
      property: {
        select: { name: true }
      },
      caretaker: {
        select: { name: true, phone: true }
      }
    }
  })
}

// Update maintenance status
export async function updateStatusService(id, status, organizationId, userRole) {
  const request = await prisma.maintenanceRequest.findFirst({
    where: { id, organizationId }
  })

  if (!request) throw new Error('Maintenance request not found')

  // Only landlord or assigned caretaker can update status
  if (userRole === 'tenant') {
    throw new Error('Only landlord or caretaker can update status')
  }

  return prisma.maintenanceRequest.update({
    where: { id },
    data: { status },
    include: {
      tenant: {
        select: { name: true, phone: true }
      },
      unit: {
        select: { unitNumber: true }
      },
      property: {
        select: { name: true }
      },
      caretaker: {
        select: { name: true, phone: true }
      }
    }
  })
}

// Add internal note
export async function addInternalNoteService(id, note, organizationId) {
  const request = await prisma.maintenanceRequest.findFirst({
    where: { id, organizationId }
  })

  if (!request) throw new Error('Maintenance request not found')

  const currentNotes = request.internalNotes
  const newNotes = currentNotes ? `${currentNotes}\n[${new Date().toISOString()}] ${note}` : `[${new Date().toISOString()}] ${note}`

  return prisma.maintenanceRequest.update({
    where: { id },
    data: { internalNotes: newNotes }
  })
}

// Delete maintenance request
export async function deleteMaintenanceService(id, organizationId) {
  const request = await prisma.maintenanceRequest.findFirst({
    where: { id, organizationId }
  })

  if (!request) throw new Error('Maintenance request not found')
  if (request.status === 'resolved') {
    throw new Error('Cannot delete resolved maintenance request')
  }

  return prisma.maintenanceRequest.delete({
    where: { id }
  })
}