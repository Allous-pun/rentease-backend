import express from 'express'
import authRouter from './modules/auth/auth.router.js'
import propertyRouter from './modules/property/property.router.js'
import tenantRouter from './modules/tenant/tenant.router.js'
import paymentRouter from './modules/payment/payment.router.js'
import depositRouter from './modules/deposit/deposit.router.js'
import reportRouter from './modules/reports/reports.router.js'
import maintenanceRouter from './modules/maintenance/maintenance.router.js'
import expenseRouter from './modules/expense/expense.router.js'
import notificationRouter from './modules/notifications/notifications.router.js'
import announcementRoutes from './modules/announcements/announcements.routes.js'

import './jobs/index.js'

import cors from 'cors'

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.json({ message: 'RentEase KE API is running', status: 'ok' })
})

app.use('/auth', authRouter)
app.use('/api', propertyRouter)
app.use('/api', tenantRouter)
app.use('/api', paymentRouter)
app.use('/api', depositRouter)  
app.use('/api', reportRouter) 
app.use('/api', maintenanceRouter)
app.use('/api', expenseRouter) 
app.use('/api', notificationRouter)
app.use('/api', announcementRoutes)

app.use((req, res) => {
  res.status(404).json({ message: `Cannot ${req.method} ${req.originalUrl}` })
})

export default app