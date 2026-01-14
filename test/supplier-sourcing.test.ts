import { describe, it, expect } from 'bun:test'
import app from '../src/routes/supplier-sourcing'

describe('Supplier Sourcing API', () => {
  describe('POST /project-requirements', () => {
    it('should validate and accept project requirements', async () => {
      const mockData = {
        projectName: 'Test Project',
        projectDescription: 'A test project for supplier sourcing',
        budget: {
          min: 10000,
          max: 50000,
          currency: 'USD'
        },
        timeline: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-06-01T00:00:00Z',
          urgency: 'medium' as const
        },
        requirements: {
          technical: ['React', 'Node.js'],
          business: ['E-commerce experience'],
          compliance: ['GDPR']
        },
        contactInfo: {
          name: 'Test User',
          email: 'test@example.com',
          company: 'Test Company'
        }
      }

      const res = await app.request('/project-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockData)
      })

      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.projectId).toBeDefined()
      expect(json.data.status).toBe('submitted')
    })

    it('should reject invalid data', async () => {
      const invalidData = {
        projectName: '', // Invalid: empty string
        budget: {
          min: -1000 // Invalid: negative number
        }
      }

      const res = await app.request('/project-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /project-requirements', () => {
    it('should return list of projects', async () => {
      const res = await app.request('/project-requirements')
      
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.projects).toBeDefined()
      expect(json.data.total).toBeDefined()
    })
  })

  describe('GET /project-requirements/:id', () => {
    it('should return project details for valid ID', async () => {
      const res = await app.request('/project-requirements/proj_123')
      
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.projectId).toBe('proj_123')
    })
  })
})
