import { Router } from 'express'
import protect from '../../middleware/protect.js'
import {
  createMaintenance,
  getMaintenance,
  getMaintenanceById,
  assignCaretaker,
  updateStatus,
  addInternalNote,
  deleteMaintenance
} from './maintenance.controller.js'

const router = Router()

// All routes go through protect middleware
// protect middleware will skip auth for POST /maintenance
router.use(protect)

router.post('/maintenance', createMaintenance)
router.get('/maintenance', getMaintenance)
router.get('/maintenance/:id', getMaintenanceById)
router.patch('/maintenance/:id/assign', assignCaretaker)
router.patch('/maintenance/:id/status', updateStatus)
router.post('/maintenance/:id/notes', addInternalNote)
router.delete('/maintenance/:id', deleteMaintenance)

export default router