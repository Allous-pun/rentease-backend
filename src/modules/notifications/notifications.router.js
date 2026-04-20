import { Router } from 'express'
import protect from '../../middleware/protect.js'
import {
  getConnectionStatus,
  sendTestMessageToPhone,
  sendRentReminderToTenant
} from './notifications.controller.js'

const router = Router()

// All routes require authentication
router.use(protect)

// Status endpoint
router.get('/notifications/status', getConnectionStatus)

// Test message endpoint
router.post('/notifications/test', sendTestMessageToPhone)

// Send rent reminder to specific tenant
router.post('/notifications/rent-reminder/:tenantId', sendRentReminderToTenant)

export default router