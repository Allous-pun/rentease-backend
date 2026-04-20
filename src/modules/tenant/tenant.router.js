import { Router } from 'express'
import protect from '../../middleware/protect.js'
import {
  addTenant,
  getTenants,
  getTenant,
  updateTenant,
  moveOutTenant,
  deleteTenant
} from './tenant.controller.js'

const router = Router()

// All routes require authentication
router.use(protect)

// Tenant routes
router.post('/tenants', addTenant)
router.get('/tenants', getTenants)
router.get('/tenants/:id', getTenant)
router.patch('/tenants/:id', updateTenant)
router.patch('/tenants/:id/move-out', moveOutTenant)
router.delete('/tenants/:id', deleteTenant)

export default router