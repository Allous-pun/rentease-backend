import axios from 'axios'

class TextBeeService {
  constructor() {
    this.apiUrl = 'https://api.textbee.dev/api/v1/gateway/devices'
    this.deviceId = process.env.TEXTBEE_DEVICE_ID
    this.apiKey = process.env.TEXTBEE_API_KEY
    this.isReady = true
    this.lastSendTime = 0
    this.minDelay = 3000 // 3 seconds between messages to avoid rate limiting
    this.queue = []
    this.processing = false
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async processQueue() {
    if (this.processing) return
    this.processing = true
    
    while (this.queue.length > 0) {
      const { phoneNumber, message, resolve, reject } = this.queue.shift()
      
      try {
        const result = await this.sendMessageDirect(phoneNumber, message)
        resolve(result)
      } catch (error) {
        reject(error)
      }
      
      // Wait between messages
      if (this.queue.length > 0) {
        await this.delay(this.minDelay)
      }
    }
    
    this.processing = false
  }

  async sendMessageDirect(phoneNumber, message) {
    // Rate limiting check
    const now = Date.now()
    const timeSinceLastSend = now - this.lastSendTime
    if (timeSinceLastSend < this.minDelay) {
      await this.delay(this.minDelay - timeSinceLastSend)
    }
    
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
      
      this.lastSendTime = Date.now()
      console.log(`✅ SMS sent to ${phoneNumber}`)
      return {
        success: true,
        to: phoneNumber,
        content: message,
        sentAt: new Date().toISOString()
      }
    } catch (error) {
      console.error(`❌ Failed to send SMS to ${phoneNumber}:`, error.response?.data || error.message)
      throw new Error(`SMS failed: ${error.message}`)
    }
  }

  async sendMessage(phoneNumber, message) {
    return new Promise((resolve, reject) => {
      this.queue.push({ phoneNumber, message, resolve, reject })
      this.processQueue()
    })
  }

  async sendBulkMessage(phoneNumbers, message) {
    let successCount = 0
    let failCount = 0
    
    for (let i = 0; i < phoneNumbers.length; i++) {
      try {
        await this.sendMessage(phoneNumbers[i], message)
        successCount++
      } catch (error) {
        failCount++
        console.error(`Failed to send to ${phoneNumbers[i]}:`, error.message)
      }
      
      // Add delay between sends in bulk
      if (i < phoneNumbers.length - 1) {
        await this.delay(this.minDelay)
      }
    }
    
    console.log(`✅ Bulk SMS completed: ${successCount} sent, ${failCount} failed`)
    return {
      success: true,
      sentCount: successCount,
      failedCount: failCount,
      total: phoneNumbers.length
    }
  }

  getStatus() {
    return {
      isReady: this.isReady,
      provider: 'TextBee',
      deviceId: this.deviceId,
      queueLength: this.queue.length
    }
  }
}

const textbee = new TextBeeService()
export default textbee