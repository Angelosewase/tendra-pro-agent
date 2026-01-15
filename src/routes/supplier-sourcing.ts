import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as z from 'zod'

const app = new Hono()

// Schema for project input requirements
const projectRequirementsSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  projectDescription: z.string().min(1, 'Project description is required'),
  budget: z.object({
    min: z.number().positive('Minimum budget must be positive'),
    max: z.number().positive('Maximum budget must be positive'),
    currency: z.string().default('USD')
  }),
  timeline: z.object({
    startDate: z.string().datetime('Invalid start date format'),
    endDate: z.string().datetime('Invalid end date format'),
    urgency: z.enum(['low', 'medium', 'high']).default('medium')
  }),
  requirements: z.object({
    technical: z.array(z.string()).default([]),
    business: z.array(z.string()).default([]),
    compliance: z.array(z.string()).default([])
  }),
  supplierPreferences: z.object({
    location: z.array(z.string()).default([]),
    companySize: z.enum(['small', 'medium', 'large', 'enterprise']).optional(),
    experience: z.object({
      minYears: z.number().min(0).default(0),
      industries: z.array(z.string()).default([])
    }).optional(),
    certifications: z.array(z.string()).default([])
  }).optional(),
  contactInfo: z.object({
    name: z.string().min(1, 'Contact name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().optional(),
    company: z.string().min(1, 'Company name is required')
  })
})

// POST /api/supplier-sourcing/project-requirements
app.post('/project-requirements', zValidator('json', projectRequirementsSchema), async (c) => {
  try {
    const data = c.req.valid('json')
    
    // TODO: Store project requirements in database
    // TODO: Trigger supplier matching algorithm
    // TODO: Send confirmation email
    
    return c.json({
      success: true,
      message: 'Project requirements submitted successfully',
      data: {
        projectId: `proj_${Date.now()}`, // Temporary ID generation
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        requirements: data
      }
    }, 201)
    
  } catch (error) {
    console.error('Error submitting project requirements:', error)
    return c.json({
      success: false,
      message: 'Failed to submit project requirements',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// GET /api/supplier-sourcing/project-requirements/:id
app.get('/project-requirements/:id', async (c) => {
  try {
    const projectId = c.req.param('id')
    
    // TODO: Retrieve project requirements from database
    
    return c.json({
      success: true,
      data: {
        projectId,
        status: 'found',
        // Mock data - replace with actual database query
        requirements: {
          projectName: 'Sample Project',
          projectDescription: 'This is a sample project',
          budget: { min: 10000, max: 50000, currency: 'USD' },
          timeline: { 
            startDate: '2024-01-01T00:00:00Z', 
            endDate: '2024-06-01T00:00:00Z', 
            urgency: 'medium' 
          }
        }
      }
    })
    
  } catch (error) {
    console.error('Error retrieving project requirements:', error)
    return c.json({
      success: false,
      message: 'Failed to retrieve project requirements',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// GET /api/supplier-sourcing/project-requirements
app.get('/project-requirements', async (c) => {
  try {
    // TODO: Retrieve all project requirements from database
    
    return c.json({
      success: true,
      data: {
        projects: [], // Mock empty array - replace with actual database query
        total: 0
      }
    })
    
  } catch (error) {
    console.error('Error retrieving project requirements:', error)
    return c.json({
      success: false,
      message: 'Failed to retrieve project requirements',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

export default app
