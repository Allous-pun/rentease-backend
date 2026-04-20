import prisma from '../../lib/prisma.js'
import googleMessages from './google-messages.service.js'

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
  return googleMessages.getStatus()
}

// Send test message
export async function sendTestMessage(phoneNumber, message) {
  if (!phoneNumber || !message) {
    throw new Error('Phone number and message are required')
  }
  return googleMessages.sendMessage(phoneNumber, message)
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
      unit: true,
      organization: true
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
  
  // Get property name
  const propertyName = tenant.unit.property?.name || tenant.organization?.name || 'RentEase'
  
  // Get unit name
  const unitName = tenant.unit.name || tenant.unit.unitNumber
  
  // New message format - single line, professional
  const message = `Hi ${tenant.name}, this is a friendly reminder that your rent for ${monthYear} (${formattedAmount}) is due for ${propertyName} Unit ${unitName}. Pay securely via M-Pesa using this link: ${paymentLink}. Asante! — RentEase`

  const result = await googleMessages.sendMessage(tenant.phone, message)

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