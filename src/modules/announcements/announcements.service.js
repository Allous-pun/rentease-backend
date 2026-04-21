import prisma from '../../lib/prisma.js'
import textbee from '../notifications/textbee.service.js'

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
      },
      organization: {
        include: {
          users: {
            where: {
              role: 'landlord',
              isDeleted: false
            },
            take: 1
          }
        }
      }
    }
  })

  if (tenants.length === 0) {
    throw new Error('No tenants found for the selected target')
  }

  // Get landlord name
  const landlord = tenants[0]?.organization?.users?.[0]
  const landlordName = landlord?.name || 'RentEase'
  
  // Get property name
  const propertyName = tenants[0]?.unit?.property?.name || 'RentEase'

  // Prepare SMS message with proper format
  const smsMessage = `📢 NOTICE: ${title} - ${message} - ${propertyName} Management. Asante! — ${landlordName} via RentEase`

  // Send to each tenant (bulk)
  const phoneNumbers = tenants.map(t => t.phone)
  
  let sentCount = 0
  let failedCount = 0

  try {
    // Use bulk send for multiple recipients
    if (phoneNumbers.length > 1) {
      await textbee.sendBulkMessage(phoneNumbers, smsMessage)
      sentCount = phoneNumbers.length
    } else if (phoneNumbers.length === 1) {
      await textbee.sendMessage(phoneNumbers[0], smsMessage)
      sentCount = 1
    }
  } catch (error) {
    failedCount = phoneNumbers.length
    console.error('Bulk send failed:', error.message)
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