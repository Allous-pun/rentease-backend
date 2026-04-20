import { Router } from 'express'
import protect from '../../middleware/protect.js'
import {
  createProperty,
  getProperties,
  getProperty,
  updateProperty,
  deleteProperty,
  addUnit,
  getPropertyUnits,
  updateUnit,
  deleteUnit
} from './property.controller.js'

const router = Router()

// All routes require authentication
router.use(protect)

// Property routes
router.post('/properties', createProperty)
router.get('/properties', getProperties)
router.get('/properties/:id', getProperty)
router.patch('/properties/:id', updateProperty)
router.delete('/properties/:id', deleteProperty)

// Unit routes
router.post('/units', addUnit)
router.get('/properties/:id/units', getPropertyUnits)
router.patch('/units/:id', updateUnit)
router.delete('/units/:id', deleteUnit)

export default router