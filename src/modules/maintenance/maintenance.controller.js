import prisma from '../../lib/prisma.js'

// PUBLIC - Create maintenance request (tenants by unit number)
export async function createMaintenance(req, res) {
  try {
    const { unitNumber, title, description } = req.body

    if (!unitNumber || !title) {
      return res.status(400).json({
        message: 'unitNumber and title are required'
      })
    }

    // Find active tenant in this unit
    const tenant = await prisma.tenant.findFirst({
      where: {
        unit: {
          unitNumber: unitNumber
        },
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
      return res.status(404).json({
        message: 'No active tenant found for unit ' + unitNumber
      })
    }

    // Create maintenance request
    const request = await prisma.maintenanceRequest.create({
      data: {
        title: title,
        description: description || null,
        createdBy: 'tenant',
        tenantId: tenant.id,
        unitId: tenant.unitId,
        propertyId: tenant.unit.propertyId,
        organizationId: tenant.organizationId,
        status: 'pending'
      },
      include: {
        tenant: {
          select: {
            name: true,
            phone: true
          }
        },
        unit: {
          select: {
            unitNumber: true
          }
        },
        property: {
          select: {
            name: true,
            location: true
          }
        }
      }
    })

    res.status(201).json({
      message: 'Maintenance request submitted successfully',
      request: {
        id: request.id,
        title: request.title,
        description: request.description,
        status: request.status,
        unitNumber: request.unit?.unitNumber,
        propertyName: request.property?.name,
        createdAt: request.createdAt
      }
    })
  } catch (error) {
    console.error('Create maintenance error:', error)
    res.status(500).json({ message: error.message })
  }
}

// PROTECTED - Get all maintenance requests
export async function getMaintenance(req, res) {
  try {
    const { organizationId, role, userId } = req.user
    const { status, propertyId, assignedToMe } = req.query

    const where = { organizationId }

    if (status) where.status = status
    if (propertyId) where.propertyId = propertyId
    if (assignedToMe === 'true' && role !== 'landlord') {
      where.caretakerId = userId
    }

    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        tenant: {
          select: {
            name: true,
            phone: true
          }
        },
        unit: {
          select: {
            unitNumber: true
          }
        },
        property: {
          select: {
            name: true,
            location: true
          }
        },
        caretaker: {
          select: {
            name: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(requests)
  } catch (error) {
    console.error('Get maintenance error:', error)
    res.status(500).json({ message: error.message })
  }
}

// PROTECTED - Get single maintenance request
export async function getMaintenanceById(req, res) {
  try {
    const { id } = req.params
    const { organizationId } = req.user

    const request = await prisma.maintenanceRequest.findFirst({
      where: { id, organizationId },
      include: {
        tenant: {
          select: {
            name: true,
            phone: true
          }
        },
        unit: {
          select: {
            unitNumber: true
          }
        },
        property: {
          select: {
            name: true,
            location: true
          }
        },
        caretaker: {
          select: {
            name: true,
            phone: true
          }
        },
        expenses: true
      }
    })

    if (!request) {
      return res.status(404).json({ message: 'Maintenance request not found' })
    }

    res.json(request)
  } catch (error) {
    console.error('Get maintenance by id error:', error)
    res.status(500).json({ message: error.message })
  }
}

// PROTECTED - Assign caretaker
export async function assignCaretaker(req, res) {
  try {
    const { id } = req.params
    const { caretakerId } = req.body
    const { organizationId, role } = req.user

    if (role === 'tenant') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    if (!caretakerId) {
      return res.status(400).json({ message: 'caretakerId is required' })
    }

    const caretaker = await prisma.user.findFirst({
      where: {
        id: caretakerId,
        organizationId,
        role: 'caretaker',
        isDeleted: false
      }
    })

    if (!caretaker) {
      return res.status(404).json({ message: 'Caretaker not found' })
    }

    const request = await prisma.maintenanceRequest.findFirst({
      where: { id, organizationId }
    })

    if (!request) {
      return res.status(404).json({ message: 'Maintenance request not found' })
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: { caretakerId },
      include: {
        tenant: { select: { name: true, phone: true } },
        unit: { select: { unitNumber: true } },
        property: { select: { name: true } },
        caretaker: { select: { name: true, phone: true } }
      }
    })

    res.json(updated)
  } catch (error) {
    console.error('Assign caretaker error:', error)
    res.status(500).json({ message: error.message })
  }
}

// PROTECTED - Update status
export async function updateStatus(req, res) {
  try {
    const { id } = req.params
    const { status } = req.body
    const { organizationId, role } = req.user

    if (role === 'tenant') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    if (!status) {
      return res.status(400).json({ message: 'status is required' })
    }

    const validStatuses = ['pending', 'in_progress', 'resolved']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    const request = await prisma.maintenanceRequest.findFirst({
      where: { id, organizationId }
    })

    if (!request) {
      return res.status(404).json({ message: 'Maintenance request not found' })
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: { status },
      include: {
        tenant: { select: { name: true, phone: true } },
        unit: { select: { unitNumber: true } },
        property: { select: { name: true } },
        caretaker: { select: { name: true, phone: true } }
      }
    })

    res.json(updated)
  } catch (error) {
    console.error('Update status error:', error)
    res.status(500).json({ message: error.message })
  }
}

// PROTECTED - Add internal note
export async function addInternalNote(req, res) {
  try {
    const { id } = req.params
    const { note } = req.body
    const { organizationId, role } = req.user

    if (role === 'tenant') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    if (!note) {
      return res.status(400).json({ message: 'note is required' })
    }

    const request = await prisma.maintenanceRequest.findFirst({
      where: { id, organizationId }
    })

    if (!request) {
      return res.status(404).json({ message: 'Maintenance request not found' })
    }

    const currentNotes = request.internalNotes
    const newNotes = currentNotes 
      ? `${currentNotes}\n[${new Date().toISOString()}] ${note}` 
      : `[${new Date().toISOString()}] ${note}`

    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: { internalNotes: newNotes }
    })

    res.json({ message: 'Note added successfully', request: updated })
  } catch (error) {
    console.error('Add internal note error:', error)
    res.status(500).json({ message: error.message })
  }
}

// PROTECTED - Delete maintenance request
export async function deleteMaintenance(req, res) {
  try {
    const { id } = req.params
    const { organizationId, role } = req.user

    if (role === 'tenant') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const request = await prisma.maintenanceRequest.findFirst({
      where: { id, organizationId }
    })

    if (!request) {
      return res.status(404).json({ message: 'Maintenance request not found' })
    }

    if (request.status === 'resolved') {
      return res.status(400).json({ message: 'Cannot delete resolved maintenance request' })
    }

    await prisma.maintenanceRequest.delete({ where: { id } })

    res.json({ message: 'Maintenance request deleted successfully' })
  } catch (error) {
    console.error('Delete maintenance error:', error)
    res.status(500).json({ message: error.message })
  }
}