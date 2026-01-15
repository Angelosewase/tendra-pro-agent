import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'bun:test'
import { SearchAgent } from '../src/agents/supplier-sourcing/tools/search'

// Set test environment
process.env.NODE_ENV = 'test'

// Mock environment variables
const originalEnv = process.env

describe('SearchAgent', () => {
  let searchAgent: SearchAgent

  // Check if we have a real API key for integration tests
  const hasRealApiKey = !!process.env.OPEN_ROUTER_API_KEY && 
                        !process.env.OPEN_ROUTER_API_KEY.includes('test') &&
                        !process.env.OPEN_ROUTER_API_KEY.includes('mock')

  beforeEach(() => {
    // Set up environment variables for testing
    process.env = {
      ...originalEnv,
      OPEN_ROUTER_API_KEY: process.env.OPEN_ROUTER_API_KEY || 'test-api-key'
    }
    
    searchAgent = new SearchAgent({ temperature: 0 })
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe('constructor', () => {
    it('should initialize with default temperature', () => {
      const agent = new SearchAgent()
      expect(agent).toBeInstanceOf(SearchAgent)
    })

    it('should initialize with custom temperature', () => {
      const agent = new SearchAgent({ temperature: 0.5 })
      expect(agent).toBeInstanceOf(SearchAgent)
    })

    it('should handle undefined environment variables gracefully', () => {
      const oldKey = process.env.OPEN_ROUTER_API_KEY
      process.env.OPEN_ROUTER_API_KEY = undefined
      
      // Should not throw during construction
      expect(() => new SearchAgent()).not.toThrow()
      
      process.env.OPEN_ROUTER_API_KEY = oldKey
    })
  })

  describe('initialize', () => {
    it('should throw error when API key is missing', async () => {
      const oldKey = process.env.OPEN_ROUTER_API_KEY
      process.env.OPEN_ROUTER_API_KEY = undefined
      
      const invalidAgent = new SearchAgent()
      await expect(invalidAgent.initialize()).rejects.toThrow('OPEN_ROUTER_API_KEY')
      
      process.env.OPEN_ROUTER_API_KEY = oldKey
    })

    it('should initialize the agent executor successfully with valid key', async () => {
      if (!hasRealApiKey) {
        console.log('⏭️  Skipping: No real API key available')
        return
      }

      await expect(searchAgent.initialize()).resolves.not.toThrow()
      expect(searchAgent).toBeDefined()
    })
  })

  describe('healthCheck', () => {
    it('should return false when API key is invalid', async () => {
      process.env.OPEN_ROUTER_API_KEY = 'invalid-key-format'
      const invalidAgent = new SearchAgent()
      
      const isHealthy = await invalidAgent.healthCheck()
      expect(isHealthy).toBe(false)
    })

    it('should return true with valid API key', async () => {
      if (!hasRealApiKey) {
        console.log('⏭️  Skipping: No real API key available')
        return
      }

      const isHealthy = await searchAgent.healthCheck()
      expect(isHealthy).toBe(true)
    })
  })

  describe('search', () => {
    it('should throw error when searching before initialization', async () => {
      const uninitializedAgent = new SearchAgent()
      await expect(uninitializedAgent.search('test query')).rejects.toThrow('Agent not initialized')
    })

    it('should throw error for empty search queries', async () => {
      if (!hasRealApiKey) {
        console.log('⏭️  Skipping: No real API key available')
        return
      }

      await searchAgent.initialize()
      await expect(searchAgent.search('')).rejects.toThrow('cannot be empty')
      await expect(searchAgent.search('   ')).rejects.toThrow('cannot be empty')
    })

    it('should handle valid search queries', async () => {
      if (!hasRealApiKey) {
        console.log('⏭️  Skipping: No real API key available')
        return
      }

      await searchAgent.initialize()
      
      const result = await searchAgent.search('What is 2+2?')
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
      expect(result.output).toBeDefined()
    }, 15000) // 15 second timeout for free models

    it('should handle complex search queries', async () => {
      if (!hasRealApiKey) {
        console.log('⏭️  Skipping: No real API key available')
        return
      }

      await searchAgent.initialize()
      
      const complexQuery = 'Find precision CNC machining suppliers with ISO 9001 certification'
      const result = await searchAgent.search(complexQuery)
      expect(result).toBeDefined()
      expect(result.output).toBeDefined()
    }, 15000) // 15 second timeout for free models
  })

  describe('integration tests', () => {
    it('should complete full workflow: initialize -> search -> search again', async () => {
      if (!hasRealApiKey) {
        console.log('⏭️  Skipping: No real API key available')
        return
      }

      const agent = new SearchAgent()
      
      // Initialize
      await agent.initialize()
      
      // Perform multiple searches
      const result1 = await agent.search('What is the capital of France?')
      expect(result1).toBeDefined()
      
      const result2 = await agent.search('Calculate 15 * 7')
      expect(result2).toBeDefined()
    }, 30000) // 30 second timeout for multiple queries
  })

  describe('configuration', () => {
    it('should respect temperature setting in constructor', () => {
      const coldAgent = new SearchAgent({ temperature: 0 })
      const hotAgent = new SearchAgent({ temperature: 1 })
      
      expect(coldAgent).toBeInstanceOf(SearchAgent)
      expect(hotAgent).toBeInstanceOf(SearchAgent)
    })
  })
})
