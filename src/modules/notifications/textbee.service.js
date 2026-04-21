import axios from 'axios'

class TextBeeService {
  constructor() {
    this.apiUrl = 'https://api.textbee.dev/api/v1/gateway/devices'
    this.deviceId = process.env.TEXTBEE_DEVICE_ID
    this.apiKey = process.env.TEXTBEE_API_KEY
    this.isReady = true
  }

  async sendMessage(phoneNumber, message) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.deviceId}/send-sms`,
        {
          recipients: [phoneNumber],
          message: message
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
          }
        }
      )
      
      console.log(`✅ SMS sent to ${phoneNumber}`)
      return {
        success: true,
        to: phoneNumber,
        content: message,
        sentAt: new Date().toISOString()
      }
    } catch (error) {
      console.error(`❌ Failed to send SMS:`, error.response?.data || error.message)
      throw new Error(`SMS failed: ${error.message}`)
    }
  }

  async sendBulkMessage(phoneNumbers, message) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.deviceId}/send-sms`,
        {
          recipients: phoneNumbers,
          message: message
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
          }
        }
      )
      
      console.log(`✅ Bulk SMS sent to ${phoneNumbers.length} recipients`)
      return {
        success: true,
        recipients: phoneNumbers.length,
        content: message,
        sentAt: new Date().toISOString()
      }
    } catch (error) {
      console.error(`❌ Failed to send bulk SMS:`, error.response?.data || error.message)
      throw new Error(`Bulk SMS failed: ${error.message}`)
    }
  }

  getStatus() {
    return {
      isReady: this.isReady,
      provider: 'TextBee',
      deviceId: this.deviceId
    }
  }
}

const textbee = new TextBeeService()
export default textbee