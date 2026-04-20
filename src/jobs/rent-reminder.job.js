import prisma from '../lib/prisma.js'
import googleMessages from '../modules/notifications/google-messages.service.js'

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

// Send pre-due reminder (3 days before)
async function sendPreDueReminder(tenant) {
  const dueDate = getNextDueDate(tenant.rentDueDay)
  const daysUntilDue = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24))
  
  if (daysUntilDue !== 3) return false // Only send exactly 3 days before
  
  const paymentLink = 'https://rentease-kenya-home.vercel.app/pay-rent'
  const propertyName = tenant.unit?.property?.name || 'RentEase'
  
  const message = `🔔 RENT REMINDER: ${propertyName}. Hello ${tenant.name}, your rent of KES ${tenant.unit?.rentAmount?.toLocaleString()} for ${tenant.unit?.unitNumber} is due in ${daysUntilDue} days. Pay here: ${paymentLink}`
  
  await googleMessages.sendMessage(tenant.phone, message)
  
  // Record reminder
  await prisma.reminder.create({
    data: {
      type: 'rent_reminder',
      channel: 'sms',
      tenantId: tenant.id,
      organizationId: tenant.organizationId
    }
  })
  
  return true
}

// Send post-due reminder (1 day after)
async function sendPostDueReminder(tenant) {
  const dueDate = getNextDueDate(tenant.rentDueDay)
  const today = new Date()
  const daysAfterDue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24))
  
  if (daysAfterDue !== 1) return false // Only send exactly 1 day after
  
  // Check if tenant has paid for this month
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()
  
  const existingPayment = await prisma.payment.findFirst({
    where: {
      tenantId: tenant.id,
      month: currentMonth,
      year: currentYear,
      status: { in: ['paid', 'partial'] }
    }
  })
  
  if (existingPayment) return false // Already paid
  
  const paymentLink = 'https://rentease-kenya-home.vercel.app/pay-rent'
  const propertyName = tenant.unit?.property?.name || 'RentEase'
  
  const message = `⚠️ LATE RENT NOTICE: ${propertyName}. Hello ${tenant.name}, your rent of KES ${tenant.unit?.rentAmount?.toLocaleString()} for ${tenant.unit?.unitNumber} was due yesterday. Please pay immediately to avoid late fees. Pay here: ${paymentLink}`
  
  await googleMessages.sendMessage(tenant.phone, message)
  
  // Record reminder
  await prisma.reminder.create({
    data: {
      type: 'late_notice',
      channel: 'sms',
      tenantId: tenant.id,
      organizationId: tenant.organizationId
    }
  })
  
  return true
}

// Main job function
export async function sendDailyRentReminders() {
  console.log('🔄 Running daily rent reminder check...', new Date().toISOString())
  
  // Get all active tenants
  const tenants = await prisma.tenant.findMany({
    where: {
      status: 'active',
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
  
  let preRemindersSent = 0
  let postRemindersSent = 0
  
  for (const tenant of tenants) {
    // Send pre-due reminder (3 days before)
    const preSent = await sendPreDueReminder(tenant)
    if (preSent) preRemindersSent++
    
    // Send post-due reminder (1 day after)
    const postSent = await sendPostDueReminder(tenant)
    if (postSent) postRemindersSent++
  }
  
  console.log(`📨 Pre-due reminders sent: ${preRemindersSent}`)
  console.log(`📨 Post-due reminders sent: ${postRemindersSent}`)
  
  return { preRemindersSent, postRemindersSent }
}