import { Router } from 'express'
import protect from '../../middleware/protect.js'
import {
  sendAnnouncementHandler,
  getAnnouncementsHandler
} from './announcements.controller.js'
import { validate, createAnnouncementSchema } from './announcements.validation.js'

const router = Router()

// All routes require authentication
router.use(protect)

// Send announcement (bulk or single - determined by propertyId/unitId)
router.post('/announcements/send', validate(createAnnouncementSchema), sendAnnouncementHandler)

// Get announcement history
router.get('/announcements', getAnnouncementsHandler)

export default router