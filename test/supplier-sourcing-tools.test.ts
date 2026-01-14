import { describe, it, expect, beforeEach } from 'bun:test'
import { dataIngestionTool, searchSuppliers } from '../src/agents/supplier-sourcing/tools/data-ingestion'
import { profileManagerTool, getSupplierProfile, updateSupplierProfile } from '../src/agents/supplier-sourcing/tools/profile-manager'
import { recommendationTool, generateRecommendations } from '../src/agents/supplier-sourcing/tools/recommendation'

describe('Data Ingestion Tool', () => {
  describe('dataIngestionTool', () => {
    it('should return suppliers for valid category', async () => {
      const result = await dataIngestionTool.invoke({
        category: "CNC machining",
        specifications: ["metal fabrication"],
        location: "China"
      })

      expect(result.suppliers).toBeDefined()
      expect(Array.isArray(result.suppliers)).toBe(true)
      expect(result.suppliers.length).toBeGreaterThan(0)
      expect(result.searchCriteria).toBeDefined()
      expect(result.searchCriteria.category).toBe("CNC machining")
    })

    it('should filter suppliers by category', async () => {
      const result = await dataIngestionTool.invoke({
        category: "Electronics",
        specifications: ["PCB"],
        location: undefined
      })

      expect(result.suppliers.length).toBeGreaterThan(0)
      
      // Should find electronics-related suppliers
      const hasElectronicsSupplier = result.suppliers.some(supplier =>
        supplier.capabilities.some(cap =>
          cap.toLowerCase().includes("electronics") || 
          cap.toLowerCase().includes("pcb")
        )
      )
      expect(hasElectronicsSupplier).toBe(true)
    })

    it('should filter suppliers by location', async () => {
      const result = await dataIngestionTool.invoke({
        category: "Manufacturing",
        specifications: [],
        location: "China"
      })

      expect(result.suppliers.length).toBeGreaterThan(0)
      
      // Should find suppliers in China
      const hasChinaSupplier = result.suppliers.some(supplier =>
        supplier.location.toLowerCase().includes("china")
      )
      expect(hasChinaSupplier).toBe(true)
    })

    it('should filter suppliers by specifications', async () => {
      const result = await dataIngestionTool.invoke({
        category: "Manufacturing",
        specifications: ["injection molding"],
        location: undefined
      })

      expect(result.suppliers.length).toBeGreaterThan(0)
      
      // Should find suppliers with injection molding capability
      const hasMoldingSupplier = result.suppliers.some(supplier =>
        supplier.capabilities.some(cap =>
          cap.toLowerCase().includes("injection") || 
          cap.toLowerCase().includes("molding")
        )
      )
      expect(hasMoldingSupplier).toBe(true)
    })

    it('should return all suppliers as fallback when no matches', async () => {
      const result = await dataIngestionTool.invoke({
        category: "Non-existent service",
        specifications: ["impossible specification"],
        location: "Moon"
      })

      expect(result.suppliers).toBeDefined()
      expect(result.suppliers.length).toBeGreaterThan(0)
      expect(result.searchCriteria.totalFound).toBe(result.suppliers.length)
    })

    it('should handle empty specifications array', async () => {
      const result = await dataIngestionTool.invoke({
        category: "General manufacturing",
        specifications: [],
        location: undefined
      })

      expect(result.suppliers).toBeDefined()
      expect(result.suppliers.length).toBeGreaterThan(0)
    })

    it('should handle optional location parameter', async () => {
      const result = await dataIngestionTool.invoke({
        category: "Manufacturing",
        specifications: ["fabrication"]
      })

      expect(result.suppliers).toBeDefined()
      expect(result.suppliers.length).toBeGreaterThan(0)
      expect(result.searchCriteria.location).toBeUndefined()
    })
  })

  describe('searchSuppliers function', () => {
    it('should work as a wrapper function', async () => {
      const result = await searchSuppliers({
        category: "Precision",
        specifications: ["machining"],
        location: "Germany"
      })

      expect(result.suppliers).toBeDefined()
      expect(Array.isArray(result.suppliers)).toBe(true)
    })
  })
})

describe('Profile Manager Tool', () => {
  beforeEach(() => {
    // Clear the mock database before each test
    const supplierProfiles = new Map()
    // Note: Since the Map is defined in the module, we can't directly clear it
    // This is a limitation of the current implementation
  })

  describe('profileManagerTool', () => {
    it('should create a new supplier profile', async () => {
      const result = await profileManagerTool.invoke({
        supplierId: "test_supplier_001",
        action: "create",
        profileData: {
          name: "Test Supplier",
          capabilities: ["Testing"],
          location: "Test Location",
          rating: 4.5,
          priceRange: { min: 1000, max: 5000, currency: "USD" },
          leadTime: "2 weeks",
          certifications: ["ISO 9001"]
        }
      })

      expect(result.success).toBe(true)
      expect(result.profile).toBeDefined()
      expect(result.profile.supplierId).toBe("test_supplier_001")
      expect(result.profile.name).toBe("Test Supplier")
      expect(result.profile.capabilities).toEqual(["Testing"])
      expect(result.profile.performanceHistory).toEqual([])
      expect(result.profile.riskAssessment).toBeDefined()
      expect(result.message).toContain("Created profile")
    })

    it('should retrieve an existing supplier profile', async () => {
      // First create a profile
      await profileManagerTool.invoke({
        supplierId: "test_supplier_002",
        action: "create",
        profileData: {
          name: "Test Supplier 2",
          capabilities: ["Testing 2"],
          rating: 4.0
        }
      })

      // Then retrieve it
      const result = await profileManagerTool.invoke({
        supplierId: "test_supplier_002",
        action: "get"
      })

      expect(result.success).toBe(true)
      expect(result.profile).toBeDefined()
      expect(result.profile.supplierId).toBe("test_supplier_002")
      expect(result.profile.name).toBe("Test Supplier 2")
      expect(result.message).toContain("Retrieved profile")
    })

    it('should return failure for non-existent profile', async () => {
      const result = await profileManagerTool.invoke({
        supplierId: "non_existent_supplier",
        action: "get"
      })

      expect(result.success).toBe(false)
      expect(result.profile).toBeNull()
      expect(result.message).toContain("No profile found")
    })

    it('should update an existing supplier profile', async () => {
      // First create a profile
      await profileManagerTool.invoke({
        supplierId: "test_supplier_003",
        action: "create",
        profileData: {
          name: "Original Name",
          rating: 3.5
        }
      })

      // Then update it
      const result = await profileManagerTool.invoke({
        supplierId: "test_supplier_003",
        action: "update",
        profileData: {
          name: "Updated Name",
          rating: 4.8,
          capabilities: ["New capability"]
        }
      })

      expect(result.success).toBe(true)
      expect(result.profile.name).toBe("Updated Name")
      expect(result.profile.rating).toBe(4.8)
      expect(result.profile.capabilities).toEqual(["New capability"])
      expect(result.message).toContain("Updated profile")
    })

    it('should handle create/update without profile data', async () => {
      const result = await profileManagerTool.invoke({
        supplierId: "test_supplier_004",
        action: "create"
        // Missing profileData
      })

      expect(result.success).toBe(false)
      expect(result.message).toContain("Profile data is required")
    })

    it('should handle unknown action', async () => {
      const result = await profileManagerTool.invoke({
        supplierId: "test_supplier_005",
        action: "delete" as any, // Invalid action
        profileData: { name: "Test" }
      })

      expect(result.success).toBe(false)
      expect(result.message).toContain("Unknown action")
    })

    it('should set default risk assessment values', async () => {
      const result = await profileManagerTool.invoke({
        supplierId: "test_supplier_006",
        action: "create",
        profileData: {
          name: "Test Supplier",
          capabilities: ["Testing"]
        }
      })

      expect(result.success).toBe(true)
      expect(result.profile.riskAssessment).toBeDefined()
      expect(result.profile.riskAssessment.financialStability).toBe(3.5)
      expect(result.profile.riskAssessment.qualityConsistency).toBe(3.5)
      expect(result.profile.riskAssessment.deliveryReliability).toBe(3.5)
      expect(result.profile.riskAssessment.communicationScore).toBe(3.5)
    })
  })

  describe('getSupplierProfile function', () => {
    it('should work as a wrapper function', async () => {
      const result = await getSupplierProfile("test_supplier_007")
      
      expect(result).toBeDefined()
      expect(result.success).toBeDefined()
    })
  })

  describe('updateSupplierProfile function', () => {
    it('should work as a wrapper function', async () => {
      const result = await updateSupplierProfile("test_supplier_008", {
        name: "Test Update",
        rating: 4.2
      })
      
      expect(result).toBeDefined()
      expect(result.success).toBeDefined()
    })
  })
})

describe('Recommendation Tool', () => {
  const mockSuppliers = [
    {
      id: "rec001",
      name: "Test Supplier 1",
      capabilities: ["CNC machining", "Metal fabrication"],
      location: "China",
      rating: 4.5,
      priceRange: { min: 1000, max: 10000, currency: "USD" },
      leadTime: "4 weeks",
      certifications: ["ISO 9001"]
    },
    {
      id: "rec002",
      name: "Test Supplier 2",
      capabilities: ["Injection molding", "Plastic fabrication"],
      location: "Taiwan",
      rating: 4.2,
      priceRange: { min: 500, max: 8000, currency: "USD" },
      leadTime: "3 weeks",
      certifications: ["ISO 9001", "ISO 13485"]
    }
  ]

  const mockRequirements = {
    category: "Manufacturing",
    specifications: ["CNC machining"],
    budget: { min: 1000, max: 15000, currency: "USD" },
    timeline: "4 weeks",
    location: "China",
    quantity: 1000
  }

  describe('recommendationTool', () => {
    it('should generate recommendations with balanced strategy', async () => {
      const result = await recommendationTool.invoke({
        suppliers: mockSuppliers,
        projectRequirements: mockRequirements,
        recommendationStrategy: "balanced"
      })

      expect(result.recommendations).toBeDefined()
      expect(Array.isArray(result.recommendations)).toBe(true)
      expect(result.recommendations.length).toBeGreaterThan(0)
      expect(result.strategy).toBe("balanced")
      expect(result.totalEvaluated).toBe(mockSuppliers.length)
      expect(result.summary).toBeDefined()
    })

    it('should generate recommendations with cost-focused strategy', async () => {
      const result = await recommendationTool.invoke({
        suppliers: mockSuppliers,
        projectRequirements: mockRequirements,
        recommendationStrategy: "cost_focused"
      })

      expect(result.strategy).toBe("cost_focused")
      expect(result.recommendations.length).toBeGreaterThan(0)
      
      // Should prioritize cost-effective suppliers
      const hasCostEffective = result.recommendations.some(rec =>
        rec!.reasoning.includes("Cost-effective")
      )
      expect(hasCostEffective).toBe(true)
    })

    it('should generate recommendations with quality-focused strategy', async () => {
      const result = await recommendationTool.invoke({
        suppliers: mockSuppliers,
        projectRequirements: mockRequirements,
        recommendationStrategy: "quality_focused"
      })

      expect(result.strategy).toBe("quality_focused")
      expect(result.recommendations.length).toBeGreaterThan(0)
      
      // Should prioritize high-quality suppliers
      const hasPremiumQuality = result.recommendations.some(rec =>
        rec!.reasoning.includes("Premium quality")
      )
      expect(hasPremiumQuality).toBe(true)
    })

    it('should generate recommendations with speed-focused strategy', async () => {
      const result = await recommendationTool.invoke({
        suppliers: mockSuppliers,
        projectRequirements: mockRequirements,
        recommendationStrategy: "speed_focused"
      })

      expect(result.strategy).toBe("speed_focused")
      expect(result.recommendations.length).toBeGreaterThan(0)
      
      // Should prioritize fast delivery
      const hasFastDelivery = result.recommendations.some(rec =>
        rec!.reasoning.includes("Fast delivery")
      )
      expect(hasFastDelivery).toBe(true)
    })

    it('should use provided evaluation scores', async () => {
      const mockScores = [
        { supplierId: "rec001", score: 85, criteria: ["capability_match", "price_compatible"] },
        { supplierId: "rec002", score: 75, criteria: ["capability_match"] }
      ]

      const result = await recommendationTool.invoke({
        suppliers: mockSuppliers,
        projectRequirements: mockRequirements,
        evaluationScores: mockScores
      })

      expect(result.recommendations.length).toBeGreaterThan(0)
      // Should use provided scores instead of calculating new ones
      expect(result.recommendations[0]!.supplierId).toBe("rec001") // Higher score should be first
    })

    it('should limit recommendations to topN', async () => {
      const result = await recommendationTool.invoke({
        suppliers: mockSuppliers,
        projectRequirements: mockRequirements,
        topN: 1
      })

      expect(result.recommendations.length).toBe(1)
      expect(result.topRecommended).toBe(1)
    })

    it('should calculate scores when not provided', async () => {
      const result = await recommendationTool.invoke({
        suppliers: mockSuppliers,
        projectRequirements: mockRequirements
      })

      expect(result.recommendations.length).toBeGreaterThan(0)
      
      // Each recommendation should have a score
      result.recommendations.forEach(rec => {
        expect(rec!.score).toBeDefined()
        expect(rec!.score).toBeGreaterThanOrEqual(0)
        expect(rec!.score).toBeLessThanOrEqual(100)
      })
    })

    it('should include detailed reasoning in recommendations', async () => {
      const result = await recommendationTool.invoke({
        suppliers: mockSuppliers,
        projectRequirements: mockRequirements
      })

      expect(result.recommendations.length).toBeGreaterThan(0)
      const firstRec = result.recommendations[0]
      expect(firstRec).toBeDefined()
      expect(firstRec!.reasoning).toBeDefined()
      expect(firstRec!.reasoning).toContain("Rank #1")
      expect(firstRec!.reasoning).toContain("/100")
      expect(firstRec!.reasoning).toContain("Lead time:")
      expect(firstRec!.reasoning).toContain("Price range:")
      expect(firstRec!.reasoning).toContain("Certifications:")
    })

    it('should include strengths and considerations', async () => {
      const result = await recommendationTool.invoke({
        suppliers: mockSuppliers,
        projectRequirements: mockRequirements
      })

      expect(result.recommendations.length).toBeGreaterThan(0)
      const firstRec = result.recommendations[0]
      expect(firstRec).toBeDefined()
      expect(firstRec!.strengths).toBeDefined()
      expect(Array.isArray(firstRec!.strengths)).toBe(true)
      expect(firstRec!.considerations).toBeDefined()
      expect(Array.isArray(firstRec!.considerations)).toBe(true)
    })

    it('should handle empty suppliers array', async () => {
      const result = await recommendationTool.invoke({
        suppliers: [],
        projectRequirements: mockRequirements
      })

      expect(result.recommendations).toEqual([])
      expect(result.totalEvaluated).toBe(0)
      expect(result.topRecommended).toBe(0)
    })

    it('should handle missing supplier in recommendations', async () => {
      const invalidScores = [
        { supplierId: "non_existent", score: 90, criteria: [] }
      ]

      const result = await recommendationTool.invoke({
        suppliers: mockSuppliers,
        projectRequirements: mockRequirements,
        evaluationScores: invalidScores
      })

      // Should filter out invalid suppliers
      expect(result.recommendations.length).toBe(0)
    })
  })

  describe('generateRecommendations function', () => {
    it('should work as a wrapper function', async () => {
      const result = await generateRecommendations({
        suppliers: mockSuppliers,
        projectRequirements: mockRequirements
      })

      expect(result.recommendations).toBeDefined()
      expect(Array.isArray(result.recommendations)).toBe(true)
    })
  })
})
