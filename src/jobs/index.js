import cron from 'node-cron'
import { sendDailyRentReminders } from './rent-reminder.job.js'

// Schedule job to run every day at 8:00 AM
cron.schedule('0 8 * * *', async () => {
  console.log('⏰ Cron job triggered at 8:00 AM')
  await sendDailyRentReminders()
})

console.log('✅ Cron job scheduled: Daily rent reminders at 8:00 AM')