import prisma from '../../lib/prisma.js'
import textbee from './textbee.service.js'

// Helper function to calculate next due date
function getNextDueDate(rentDueDay) {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()
  
  let dueDate = new Date(currentYear, currentMonth, rentDueDay)
  
  if (dueDate < today) {
    dueDate = new Date(currentYear, currentMonth + 1, rentDueDay)
  }
  
  return dueDate
}

// Get connection status
export async function getStatus() {
  return textbee.getStatus()
}

// Send test message
export async function sendTestMessage(phoneNumber, message) {
  if (!phoneNumber || !message) {
    throw new Error('Phone number and message are required')
  }
  return textbee.sendMessage(phoneNumber, message)
}

// Send rent reminder to tenant
export async function sendRentReminder(tenantId, organizationId) {
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: tenantId,
      organizationId,
      isDeleted: false,
      status: 'active'
    },
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

  if (!tenant) throw new Error('Tenant not found')

  // Calculate correct due date
  const dueDate = getNextDueDate(tenant.rentDueDay)
  const monthYear = dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  
  // Payment link
  const paymentLink = 'https://rentease-kenya-home.vercel.app/pay-rent'
  
  // Format rent amount
  const formattedAmount = `KSh ${tenant.unit.rentAmount.toLocaleString()}`
  
  // Get property name and unit number
  const propertyName = tenant.unit.property?.name || 'RentEase'
  const unitNumber = tenant.unit.unitNumber
  
  // Get landlord name from organization users
  const landlord = tenant.organization?.users?.[0]
  const landlordName = landlord?.name || tenant.organization?.name || 'RentEase'
  
  // Shortened message - under 160 characters (1 SMS)
  const message = `Hi ${tenant.name}, rent for ${monthYear} :${formattedAmount} for ${propertyName} Unit ${unitNumber} due. Pay: ${paymentLink} Asante! — ${landlordName}`

  const result = await textbee.sendMessage(tenant.phone, message)

  // Record in database
  await prisma.reminder.create({
    data: {
      type: 'rent_reminder',
      channel: 'sms',
      sentAt: new Date(),
      tenantId,
      organizationId
    }
  })

  return result
}