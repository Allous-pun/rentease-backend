import { Router } from 'express'
import protect from '../../middleware/protect.js'
import {
  sendAnnouncementHandler,
  getAnnouncementsHandler
} from './announcements.controller.js'

const router = Router()

// All routes require authentication
router.use(protect)

// Send announcement
router.post('/announcements/send', sendAnnouncementHandler)

// Get announcement history
router.get('/announcements', getAnnouncementsHandler)

export default router