import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as z from 'zod'
import { supplierSourcingAgent } from '../agents/supplier-sourcing'
import { ProjectRequirements } from '../types/supplier'

const app = new Hono()

// Explicit schema for project requirements - no assumptions
const projectRequirementsSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  specifications: z.array(z.string()).min(1, 'At least one specification is required'),
  budget: z.object({
    min: z.number().positive('Minimum budget must be positive'),
    max: z.number().positive('Maximum budget must be positive'),
    currency: z.string().default('USD')
  }),
  timeline: z.string().min(1, 'Timeline is required'),
  location: z.string().optional(),
  quantity: z.number().positive('Quantity must be positive').default(1)
})

app.post('/analyze', zValidator('json', projectRequirementsSchema), async (c) => {
  try {
    const projectRequirements = c.req.valid('json')
    
    const result = await supplierSourcingAgent.run({
      projectRequirements
    })
    
    return c.json({
      success: true,
      message: 'Supplier analysis completed successfully',
      data: {
        projectRequirements,
        suppliers: result.suppliers,
        evaluation: result.evaluation,
        summary: {
          totalSuppliers: result.suppliers.length,
          topRecommendations: result.evaluation?.recommendations?.slice(0, 3) || [],
          processingMessages: result.messages.map(msg => ({
            type: msg.constructor.name,
            content: msg.content
          }))
        }
      }
    })
    
  } catch (error) {
    console.error('Error running supplier sourcing agent:', error)
    return c.json({
      success: false,
      message: 'Failed to analyze suppliers',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

export default app
