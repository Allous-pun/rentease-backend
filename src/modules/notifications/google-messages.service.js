import pkg from 'messages-web'
const { MessagesClient } = pkg
import qrcode from 'qrcode-terminal'
import path from 'path'
import fs from 'fs'

class GoogleMessagesService {
  constructor() {
    this.client = null
    this.isReady = false
    this.qrCode = null
    this.page = null
    this.sessionPath = path.join(process.cwd(), 'sessions')
    
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true })
    }
  }

  initialize() {
    console.log('🚀 Initializing Google Messages SMS Gateway...')
    
    this.client = new MessagesClient({
      sessionPath: this.sessionPath,
      headless: false,
      args: ['--no-sandbox']
    })

    this.client.on('qr', (qr) => {
      console.log('📱 SCAN THIS QR CODE WITH GOOGLE MESSAGES:')
      qrcode.generate(qr, { small: true })
      this.qrCode = qr
    })

    this.client.on('ready', () => {
      console.log('✅ Google Messages SMS Gateway is READY!')
      this.isReady = true
      this.getPage()
    })

    this.client.on('authenticated', () => {
      console.log('✅ Authenticated!')
      this.isReady = true
      this.getPage()
    })

    this.client.on('auth_failure', (msg) => {
      console.error('❌ Auth failed:', msg)
    })

    this.client.on('message', (message) => {
      console.log('📨 Received SMS:', message.body)
    })
  }

  async getPage() {
    let retries = 0
    while (!this.page && retries < 10) {
      try {
        if (this.client.pupPage) {
          this.page = this.client.pupPage
          console.log('✅ Got page from client.pupPage')
        } else if (this.client.page) {
          this.page = this.client.page
          console.log('✅ Got page from client.page')
        } else if (this.client.browser && this.client.browser.pages) {
          const pages = await this.client.browser.pages()
          this.page = pages[0]
          console.log('✅ Got page from browser.pages()')
        } else if (this.client._page) {
          this.page = this.client._page
          console.log('✅ Got page from client._page')
        }
        
        if (this.page) break
        
        await new Promise(resolve => setTimeout(resolve, 1000))
        retries++
      } catch (error) {
        console.log(`⚠️ Attempt ${retries + 1} to get page failed:`, error.message)
        await new Promise(resolve => setTimeout(resolve, 1000))
        retries++
      }
    }
    
    if (this.page) {
      console.log('✅ Page is ready for sending messages!')
    } else {
      console.error('❌ Could not access Puppeteer page')
    }
  }

  async sendMessage(phoneNumber, message) {
  // Wait for client to be ready (max 30 seconds)
  let retries = 0
  while ((!this.isReady || !this.page) && retries < 30) {
    console.log(`⏳ Waiting for connection... (${retries + 1}/30)`)
    await new Promise(resolve => setTimeout(resolve, 1000))
    retries++
    if (!this.page && this.isReady) {
      await this.getPage()
    }
  }
  
  if (!this.isReady) {
    throw new Error('SMS Gateway not ready. Please scan QR code first.')
  }
  
  if (!this.page) {
    throw new Error('Puppeteer page not available. Please restart the server and ensure QR code is scanned.')
  }

  const formattedNumber = phoneNumber.includes('+') ? phoneNumber : `+${phoneNumber}`
  
  console.log(`📤 Sending SMS to ${formattedNumber}: ${message.substring(0, 50)}...`)
  
  try {
    // Go directly to new conversation page (most reliable)
    console.log('🔍 Navigating to new conversation...')
    await this.page.goto('https://messages.google.com/web/conversations/new', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    })
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Find recipient input field
    console.log('🔍 Looking for recipient input...')
    
    let recipientInput = null
    
    const recipientSelectors = [
      'input[aria-label="Recipient"]',
      'input[aria-label="Phone number"]', 
      'input[placeholder="Name, phone number or email"]',
      'input[placeholder*="phone"]',
      'input[placeholder*="name"]',
      'input[type="text"]'
    ]
    
    for (const selector of recipientSelectors) {
      try {
        recipientInput = await this.page.$(selector)
        if (recipientInput && await recipientInput.isVisible()) {
          console.log(`✅ Found recipient input with selector: ${selector}`)
          break
        } else {
          recipientInput = null
        }
      } catch (e) {
        continue
      }
    }
    
    if (!recipientInput) {
      const inputs = await this.page.$$('input')
      for (let i = 0; i < inputs.length; i++) {
        const isVisible = await inputs[i].isVisible()
        if (isVisible) {
          recipientInput = inputs[i]
          console.log('✅ Found visible input as recipient field')
          break
        }
      }
    }
    
    if (!recipientInput) {
      await this.page.screenshot({ path: 'debug-no-recipient.png' })
      console.log('📸 Screenshot saved as debug-no-recipient.png')
      throw new Error('Could not find recipient input field')
    }
    
    // Clear and type phone number
    await recipientInput.click({ clickCount: 3 })
    await recipientInput.press('Backspace')
    await recipientInput.type(formattedNumber)
    console.log(`✅ Typed phone number: ${formattedNumber}`)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Press Enter to select the contact
    await this.page.keyboard.press('Enter')
    console.log('✅ Pressed Enter to select contact')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Find message input field - UPDATED SELECTORS
    console.log('🔍 Looking for message input field...')
    
    let messageInput = null
    
    // More comprehensive selectors for Google Messages
    const messageSelectors = [
      'div[contenteditable="true"][aria-label*="Message"]',
      'div[contenteditable="true"][aria-label*="message"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="message"]',
      'div[aria-label*="Type a message"]',
      'div[aria-label*="message"]',
      '[contenteditable="true"]',
      '.input-area',
      '.message-input',
      'div[role="textbox"]'
    ]
    
    for (const selector of messageSelectors) {
      try {
        const elements = await this.page.$$(selector)
        for (const element of elements) {
          const isVisible = await element.isVisible()
          const isEnabled = await element.isEnabled()
          if (isVisible && isEnabled) {
            messageInput = element
            console.log(`✅ Found message input with selector: ${selector}`)
            break
          }
        }
        if (messageInput) break
      } catch (e) {
        continue
      }
    }
    
    if (!messageInput) {
      // Try to find by evaluating in the browser context
      console.log('🔍 Trying to find message input via browser evaluation...')
      
      const inputFound = await this.page.evaluate(() => {
        // Try to find the message input by various methods
        const selectors = [
          'div[contenteditable="true"]',
          '[contenteditable="true"]',
          'div[role="textbox"]',
          'textarea'
        ]
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector)
          for (const el of elements) {
            if (el.offsetParent !== null && !el.disabled) {
              el.focus()
              return true
            }
          }
        }
        return false
      })
      
      if (inputFound) {
        // Get the active element (the one we just focused)
        messageInput = await this.page.evaluateHandle(() => document.activeElement)
        console.log('✅ Found and focused message input via evaluation')
      }
    }
    
    if (!messageInput) {
      await this.page.screenshot({ path: 'debug-no-message-input.png' })
      console.log('📸 Screenshot saved as debug-no-message-input.png')
      
      const currentUrl = this.page.url()
      const title = await this.page.title()
      console.log(`📍 Current URL: ${currentUrl}`)
      console.log(`📄 Page title: ${title}`)
      
      // Try to get the page HTML for debugging (limited)
      const html = await this.page.evaluate(() => {
        const editableDivs = document.querySelectorAll('div[contenteditable="true"]')
        return Array.from(editableDivs).map(div => ({
          ariaLabel: div.getAttribute('aria-label'),
          role: div.getAttribute('role'),
          className: div.className
        }))
      })
      console.log('🔍 Found contenteditable divs:', JSON.stringify(html, null, 2))
      
      throw new Error('Could not find message input field')
    }
    
    // Type the message
    await messageInput.type(message)
    console.log(`✅ Typed message: ${message.substring(0, 50)}...`)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Press Enter to send
    await this.page.keyboard.press('Enter')
    console.log('✅ Pressed Enter to send')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log(`✅ SMS sent successfully to ${formattedNumber}`)
    
    return {
      success: true,
      to: formattedNumber,
      content: message,
      sentAt: new Date().toISOString()
    }
    
  } catch (error) {
    console.error(`❌ Failed to send SMS:`, error.message)
    throw new Error(`Failed to send SMS: ${error.message}`)
  }
}

  getStatus() {
    return {
      isReady: this.isReady,
      hasQrCode: !!this.qrCode,
      hasPage: !!this.page
    }
  }
}

const googleMessages = new GoogleMessagesService()
googleMessages.initialize()

export default googleMessages