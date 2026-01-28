import { Hono } from 'hono'
import { logger } from './middleware/logger'
import { errorHandler } from './middleware/errorHandler'
import supplierSourcingRoutes from './routes/supplier-sourcing'
import rfxAutomationRoutes from './routes/rfx-automation'

const app = new Hono()

// Middleware
app.use('*', logger)
app.onError(errorHandler)

// Routes
app.get('/', (c) => {
  return c.json({
    message: 'Welcome to Tendra Pro Agent!',
    version: '1.0.0',
    status: 'running'
  })
})

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
})

// API Routes
app.route('/api/supplier-sourcing', supplierSourcingRoutes)
app.route('/api/rfx-automation', rfxAutomationRoutes)

export default app
