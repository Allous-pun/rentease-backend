import prisma from '../../lib/prisma.js'
import googleMessages from '../notifications/google-messages.service.js'

// Send announcement to tenants
export async function sendAnnouncement(data) {
  const { title, message, propertyId, unitId, organizationId, userId } = data

  // Build filter for tenants
  const where = {
    organizationId,
    status: 'active',
    isDeleted: false
  }

  // Filter by unit (single tenant)
  if (unitId) {
    where.unitId = unitId
  } 
  // Filter by property (all tenants in that property)
  else if (propertyId) {
    where.unit = {
      propertyId: propertyId
    }
  }

  const tenants = await prisma.tenant.findMany({
    where,
    include: {
      unit: {
        include: {
          property: true
        }
      }
    }
  })

  if (tenants.length === 0) {
    throw new Error('No tenants found for the selected target')
  }

  // Prepare SMS message - SINGLE LINE (no line breaks)
  const propertyName = tenants[0]?.unit?.property?.name || 'RentEase'
  const smsMessage = `📢 NOTICE: ${title} - ${message} - ${propertyName} Management`

  // Send to each tenant
  let sentCount = 0
  let failedCount = 0

  for (const tenant of tenants) {
    try {
      await googleMessages.sendMessage(tenant.phone, smsMessage)
      sentCount++
    } catch (error) {
      failedCount++
    }
  }

  // Record announcement in database
  const announcement = await prisma.announcement.create({
    data: {
      title: title.trim(),
      message: message.trim(),
      organizationId,
      createdById: userId,
      propertyId: propertyId || null,
      unitId: unitId || null,
      sentAt: new Date()
    }
  })

  return {
    success: true,
    announcementId: announcement.id,
    totalTenants: tenants.length,
    sentCount,
    failedCount
  }
}

// Get announcement history
export async function getAnnouncements(organizationId, limit = 50) {
  const announcements = await prisma.announcement.findMany({
    where: { 
      organizationId
    },
    include: {
      createdBy: {
        select: {
          name: true,
          role: true
        }
      },
      property: {
        select: {
          name: true
        }
      },
      unit: {
        select: {
          unitNumber: true
        }
      }
    },
    orderBy: { sentAt: 'desc' },
    take: parseInt(limit)
  })

  return announcements
}