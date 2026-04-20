import {
  getStatus,
  sendTestMessage,
  sendRentReminder
} from './notifications.service.js'

// Get connection status
export async function getConnectionStatus(req, res) {
  try {
    const status = await getStatus()
    res.json(status)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Send test message
export async function sendTestMessageToPhone(req, res) {
  try {
    const { phoneNumber, message, includePaymentLink } = req.body

    if (!phoneNumber || !message) {
      return res.status(400).json({
        message: 'phoneNumber and message are required'
      })
    }

    let finalMessage = message
    
    // Optionally include payment link in test messages
    if (includePaymentLink) {
      const paymentLink = 'https://rentease-kenya-home.vercel.app/pay-rent'
      finalMessage = `${message}\n\nPay here: ${paymentLink}`
    }

    const result = await sendTestMessage(phoneNumber, finalMessage)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Send rent reminder to tenant
export async function sendRentReminderToTenant(req, res) {
  try {
    const { tenantId } = req.params
    const { organizationId } = req.user

    const result = await sendRentReminder(tenantId, organizationId)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}