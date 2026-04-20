import { Router } from 'express'
import { register, login, me } from './auth.controller.js'
import protect from '../../middleware/protect.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', protect, me)

export default router