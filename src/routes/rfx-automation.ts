import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { rfxAutomationAgent, RFXRequest } from '../agents/rfx-automation'

const rfxRoutes = new Hono()

// Validation schema for RFX request
const RFXRequestSchema = z.object({
  documentType: z.enum(['rfb', 'rfi', 'rfp', 'rfq']),
  title: z.string().min(1, 'Title is required'),
  agencyName: z.string().min(1, 'Agency name is required'),
  agencyLogo: z.string().optional(),
  issuedDate: z.string().min(1, 'Issued date is required'),
  responsesDue: z.string().min(1, 'Responses due date is required'),
  requirements: z.record(z.string(), z.any()).refine(data => Object.keys(data).length > 0, 'Requirements are required'),
  specifications: z.array(z.string()).optional(),
  budget: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.string()
  }).optional(),
  timeline: z.string().optional(),
  location: z.string().optional()
})

// Get available templates
rfxRoutes.get('/templates', async (c) => {
  try {
    const templates = rfxAutomationAgent.getAvailableTemplates()
    return c.json({
      success: true,
      data: {
        templates,
        count: templates.length
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch templates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get placeholders for a specific document type
rfxRoutes.get('/placeholders/:documentType', async (c) => {
  const documentType = c.req.param('documentType')
  
  try {
    const placeholders = rfxAutomationAgent.getTemplatePlaceholders(documentType)
    return c.json({
      success: true,
      data: {
        documentType,
        placeholders,
        count: placeholders.length
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch placeholders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Validate RFX request
rfxRoutes.post('/validate', zValidator('json', RFXRequestSchema), async (c) => {
  const request = c.req.valid('json') as RFXRequest
  
  try {
    const validation = rfxAutomationAgent.validateRFXRequest(request)
    return c.json({
      success: true,
      data: validation
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Generate RFX document
rfxRoutes.post('/generate', zValidator('json', RFXRequestSchema), async (c) => {
  const request = c.req.valid('json') as RFXRequest
  
  try {
    const result = await rfxAutomationAgent.run({ request })
    
    return c.json({
      success: result.result?.success || false,
      data: {
        document: result.document,
        result: result.result,
        messages: result.messages.map(msg => ({
          type: msg.constructor.name,
          content: msg.content
        }))
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Document generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Health check for RFX automation
rfxRoutes.get('/health', async (c) => {
  try {
    const templates = rfxAutomationAgent.getAvailableTemplates()
    return c.json({
      success: true,
      status: 'healthy',
      data: {
        availableTemplates: templates.length,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      status: 'unhealthy',
      error: 'RFX automation service unavailable',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 503)
  }
})

export default rfxRoutes
