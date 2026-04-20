import { z } from 'zod'

// Create announcement validation
export const createAnnouncementSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must not exceed 100 characters'),
  
  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(500, 'Message must not exceed 500 characters'),
  
  priority: z.enum(['low', 'normal', 'high', 'urgent'])
    .optional()
    .default('normal'),
  
  scheduledFor: z.string()
    .datetime()
    .optional()
    .nullable(),
  
  expiresAt: z.string()
    .datetime()
    .optional()
    .nullable(),
  
  propertyId: z.string()
    .cuid()
    .optional()
    .nullable(),
  
  unitId: z.string()
    .cuid()
    .optional()
    .nullable()
}).refine(data => {
  // Cannot specify both propertyId and unitId
  if (data.propertyId && data.unitId) {
    return false
  }
  return true
}, {
  message: 'Cannot specify both propertyId and unitId. Choose either all tenants, a property, or a specific unit.'
})

// Update announcement validation (for cancel/delete - just ID)
export const announcementIdSchema = z.object({
  id: z.string().cuid('Invalid announcement ID')
})

// Query params validation
export const getAnnouncementsQuerySchema = z.object({
  status: z.enum(['draft', 'sent', 'scheduled', 'failed', 'cancelled'])
    .optional(),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional(),
  offset: z.string()
    .regex(/^\d+$/, 'Offset must be a number')
    .transform(Number)
    .pipe(z.number().min(0))
    .optional()
})

// Validation middleware wrapper
export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body)
    next()
  } catch (error) {
    res.status(400).json({
      message: 'Validation failed',
      errors: error.errors?.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    })
  }
}

// Validate query params middleware
export const validateQuery = (schema) => (req, res, next) => {
  try {
    schema.parse(req.query)
    next()
  } catch (error) {
    res.status(400).json({
      message: 'Invalid query parameters',
      errors: error.errors?.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    })
  }
}