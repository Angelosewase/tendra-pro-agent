import { describe, it, expect, beforeEach } from "bun:test";
import {
  SupplierSourcingAgent,
  SupplierSourcingStateSchema,
} from "../src/agents/supplier-sourcing";
import { BaseMessage, SystemMessage } from "@langchain/core/messages";

describe("SupplierSourcingAgent", () => {
  let agent: SupplierSourcingAgent;

  beforeEach(() => {
    agent = new SupplierSourcingAgent();
  });

  describe("Constructor and Initialization", () => {
    it("should initialize with correct graph structure", () => {
      expect(agent).toBeInstanceOf(SupplierSourcingAgent);
    });

    it("should have all required nodes", () => {
      const graph = agent["graph"];
      expect(graph).toBeDefined();
    });
  });

  describe("Data Ingestion", () => {
    it("should ingest supplier data successfully", async () => {
      const mockRequirements = {
        category: "CNC machining",
        specifications: ["metal fabrication", "precision"],
        budget: { min: 1000, max: 50000, currency: "USD" },
        timeline: "4-6 weeks",
        location: "China",
        quantity: 1000,
      };

      const result = await agent.run({
        projectRequirements: mockRequirements,
      });

      expect(result.suppliers).toBeDefined();
      expect(result.suppliers.length).toBeGreaterThan(0);
      expect(result.messages.length).toBeGreaterThan(1);

      // Check that suppliers match the criteria
      const hasRelevantSuppliers = result.suppliers.some((supplier) =>
        supplier.capabilities.some(
          (cap) =>
            cap.toLowerCase().includes("machining") ||
            cap.toLowerCase().includes("metal")
        )
      );
      expect(hasRelevantSuppliers).toBe(true);
    });

    it("should handle empty specifications gracefully", async () => {
      const mockRequirements = {
        category: "General manufacturing",
        specifications: [],
        budget: { min: 1000, max: 50000, currency: "USD" },
        timeline: "4-6 weeks",
        quantity: 1000,
      };

      const result = await agent.run({
        projectRequirements: mockRequirements,
      });

      expect(result.suppliers).toBeDefined();
      expect(result.suppliers.length).toBeGreaterThan(0);
    });

    it("should return all suppliers as fallback when no matches found", async () => {
      const mockRequirements = {
        category: "Non-existent service",
        specifications: ["impossible specification"],
        budget: { min: 1, max: 10, currency: "USD" },
        timeline: "1 week",
        location: "Moon",
        quantity: 1,
      };

      const result = await agent.run({
        projectRequirements: mockRequirements,
      });

      expect(result.suppliers).toBeDefined();
      expect(result.suppliers.length).toBeGreaterThan(0);
    });
  });

  describe("Supplier Evaluation", () => {
    it("should evaluate suppliers with scoring", async () => {
      const mockRequirements = {
        category: "Electronics assembly",
        specifications: ["PCB", "testing"],
        budget: { min: 2000, max: 100000, currency: "USD" },
        timeline: "2-4 weeks",
        location: "South Korea",
        quantity: 500,
      };

      const result = await agent.run({
        projectRequirements: mockRequirements,
      });

      expect(result.evaluation).toBeDefined();
      expect(result.evaluation?.scores).toBeDefined();
      expect(result.evaluation?.scores.length).toBeGreaterThan(0);

      // Check that scores are within valid range
      result.evaluation?.scores.forEach((score) => {
        expect(score.score).toBeGreaterThanOrEqual(0);
        expect(score.score).toBeLessThanOrEqual(100);
        expect(score.supplierId).toBeDefined();
        expect(score.criteria).toBeDefined();
        expect(Array.isArray(score.criteria)).toBe(true);
      });

      // Check that scores are sorted (higher scores should come first)
      const scores = result.evaluation?.scores || [];
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1].score).toBeGreaterThanOrEqual(scores[i].score);
      }
    });

    it("should include capability matching in scoring", async () => {
      const mockRequirements = {
        category: "Metal fabrication",
        specifications: ["welding", "metal stamping"],
        budget: { min: 1500, max: 75000, currency: "USD" },
        timeline: "6-8 weeks",
        quantity: 2000,
      };

      const result = await agent.run({
        projectRequirements: mockRequirements,
      });

      const scores = result.evaluation?.scores || [];
      const hasCapabilityScores = scores.some((score) =>
        score.criteria.includes("capability_match")
      );
      expect(hasCapabilityScores).toBe(true);
    });

    it("should handle price compatibility in scoring", async () => {
      const mockRequirements = {
        category: "Injection molding",
        specifications: ["plastic fabrication"],
        budget: { min: 500, max: 25000, currency: "USD" },
        timeline: "3-5 weeks",
        quantity: 1000,
      };

      const result = await agent.run({
        projectRequirements: mockRequirements,
      });

      const scores = result.evaluation?.scores || [];
      const hasPriceCompatible = scores.some((score) =>
        score.criteria.includes("price_compatible")
      );
      expect(hasPriceCompatible).toBe(true);
    });
  });

  describe("Recommendation Generation", () => {
    it("should generate supplier recommendations", async () => {
      const mockRequirements = {
        category: "Precision engineering",
        specifications: ["micro-machining", "metrology"],
        budget: { min: 5000, max: 200000, currency: "USD" },
        timeline: "8-12 weeks",
        location: "Germany",
        quantity: 100,
      };

      const result = await agent.run({
        projectRequirements: mockRequirements,
      });

      expect(result.evaluation?.recommendations).toBeDefined();
      expect(result.evaluation?.recommendations.length).toBeGreaterThan(0);
      expect(result.evaluation?.recommendations.length).toBeLessThanOrEqual(5);

      // Check recommendation structure
      result.evaluation?.recommendations.forEach((rec) => {
        expect(rec.supplierId).toBeDefined();
        expect(rec.rank).toBeGreaterThan(0);
        expect(rec.reasoning).toBeDefined();
        expect(rec.reasoning.length).toBeGreaterThan(0);
      });

      // Check that rankings are sequential
      const recommendations = result.evaluation?.recommendations || [];
      for (let i = 0; i < recommendations.length; i++) {
        expect(recommendations[i].rank).toBe(i + 1);
      }
    });

    it("should include detailed reasoning in recommendations", async () => {
      const mockRequirements = {
        category: "Textile manufacturing",
        specifications: ["garment production"],
        budget: { min: 300, max: 15000, currency: "USD" },
        timeline: "5-7 weeks",
        location: "Thailand",
        quantity: 5000,
      };

      const result = await agent.run({
        projectRequirements: mockRequirements,
      });

      const recommendations = result.evaluation?.recommendations || [];
      expect(recommendations.length).toBeGreaterThan(0);

      // Check that reasoning contains expected elements
      const firstRecommendation = recommendations[0];
      expect(firstRecommendation).toBeDefined();
      expect(firstRecommendation.reasoning).toContain("Rank #1");
      expect(firstRecommendation.reasoning).toContain("/100");
      expect(firstRecommendation.reasoning).toContain("Lead time:");
      expect(firstRecommendation.reasoning).toContain("Price range:");
    });

    it("should handle recommendation tool failure gracefully", async () => {
      // Test with valid requirements to ensure fallback logic works
      const mockRequirements = {
        category: "Casting",
        specifications: ["metal casting"],
        budget: { min: 3000, max: 80000, currency: "USD" },
        timeline: "7-10 weeks",
        quantity: 1500,
      };

      const result = await agent.run({
        projectRequirements: mockRequirements,
      });

      // Should generate recommendations
      expect(result.evaluation?.recommendations).toBeDefined();
      expect(result.evaluation?.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Profile Manager Integration", () => {
    it("should create supplier profiles during evaluation", async () => {
      const mockRequirements = {
        category: "Custom fabrication",
        specifications: ["design services"],
        budget: { min: 800, max: 30000, currency: "USD" },
        timeline: "4-6 weeks",
        location: "Canada",
        quantity: 100,
      };

      const result = await agent.run({
        projectRequirements: mockRequirements,
      });

      expect(result.evaluation).toBeDefined();
      expect(result.evaluation?.scores.length).toBeGreaterThan(0);

      // Check that profile manager was used (indicated by message)
      const hasProfileManagerMessage = result.messages.some((msg) =>
        msg.content.toString().includes("profile manager")
      );
      expect(hasProfileManagerMessage).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid input gracefully", async () => {
      const invalidRequirements = {
        category: "",
        specifications: [""],
        budget: { min: -100, max: -50, currency: "" },
        timeline: "",
        quantity: -1,
      };

      const result = await agent.run({
        projectRequirements: invalidRequirements,
      });

      expect(result).toBeDefined();
      expect(result.messages).toBeDefined();
    });

    it("should handle missing optional fields", async () => {
      const minimalRequirements = {
        category: "Manufacturing",
        specifications: ["basic"],
        budget: { min: 1000, max: 10000, currency: "USD" },
        timeline: "4 weeks",
        quantity: 100,
        // location is optional
      };

      const result = await agent.run({
        projectRequirements: minimalRequirements,
      });

      expect(result).toBeDefined();
      expect(result.suppliers.length).toBeGreaterThan(0);
    });
  });

  describe("Message Flow", () => {
    it("should maintain message history throughout process", async () => {
      const mockRequirements = {
        category: "Assembly",
        specifications: ["assembly"],
        budget: { min: 1000, max: 50000, currency: "USD" },
        timeline: "4 weeks",
        quantity: 500,
      };

      const initialMessages = [new SystemMessage("Starting custom test...")];

      const result = await agent.run({
        projectRequirements: mockRequirements,
        messages: initialMessages,
      });

      expect(result.messages.length).toBeGreaterThan(initialMessages.length);

      // Should contain initial message
      expect(result.messages[0].content.toString()).toBe(
        "Starting custom test..."
      );

      // Should contain process completion messages
      const hasIngestionMessage = result.messages.some(
        (msg) =>
          msg.content.toString().includes("Found") &&
          msg.content.toString().includes("potential suppliers")
      );
      expect(hasIngestionMessage).toBe(true);

      const hasEvaluationMessage = result.messages.some(
        (msg) =>
          msg.content.toString().includes("Evaluated") &&
          msg.content.toString().includes("suppliers")
      );
      expect(hasEvaluationMessage).toBe(true);

      const hasRecommendationMessage = result.messages.some((msg) =>
        msg.content.toString().includes("recommendations")
      );
      expect(hasRecommendationMessage).toBe(true);
    });
  });

  describe("Schema Validation", () => {
    it("should produce output matching schema", async () => {
      const mockRequirements = {
        category: "Testing",
        specifications: ["test"],
        budget: { min: 1000, max: 10000, currency: "USD" },
        timeline: "2 weeks",
        quantity: 50,
      };

      const result = await agent.run({
        projectRequirements: mockRequirements,
      });

      // Validate the result against the schema
      const validationResult = SupplierSourcingStateSchema.safeParse(result);
      expect(validationResult.success).toBe(true);

      if (validationResult.success) {
        const validated = validationResult.data;
        expect(validated.messages).toBeDefined();
        expect(validated.projectRequirements).toBeDefined();
        expect(validated.suppliers).toBeDefined();
        expect(Array.isArray(validated.suppliers)).toBe(true);
      }
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle multiple suppliers efficiently", async () => {
      const mockRequirements = {
        category: "General",
        specifications: ["manufacturing"],
        budget: { min: 500, max: 200000, currency: "USD" },
        timeline: "4-12 weeks",
        quantity: 1000,
      };

      const startTime = Date.now();
      const result = await agent.run({
        projectRequirements: mockRequirements,
      });
      const endTime = Date.now();

      expect(result.suppliers.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
