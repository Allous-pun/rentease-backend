import { sendAnnouncement, getAnnouncements } from './announcements.service.js'

// Send announcement
export async function sendAnnouncementHandler(req, res) {
  try {
    const { title, message, propertyId, unitId } = req.body
    const { organizationId, userId } = req.user

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' })
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' })
    }

    const result = await sendAnnouncement({
      title: title.trim(),
      message: message.trim(),
      propertyId,
      unitId,
      organizationId,
      userId
    })

    res.json({
      message: 'Announcement sent successfully',
      ...result
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Get announcement history
export async function getAnnouncementsHandler(req, res) {
  try {
    const { organizationId } = req.user
    const { limit } = req.query

    const announcements = await getAnnouncements(organizationId, limit ? parseInt(limit) : 50)

    res.json({ announcements })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}