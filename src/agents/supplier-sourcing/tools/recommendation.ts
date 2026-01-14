import { tool } from "@langchain/core/tools";
import { z } from "zod";

const RecommendationSchema = z.object({
  suppliers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    capabilities: z.array(z.string()),
    location: z.string(),
    rating: z.number(),
    priceRange: z.object({
      min: z.number(),
      max: z.number(),
      currency: z.string(),
    }),
    leadTime: z.string(),
    certifications: z.array(z.string()),
  })).describe("List of suppliers to recommend from"),
  projectRequirements: z.object({
    category: z.string(),
    specifications: z.array(z.string()),
    budget: z.object({
      min: z.number(),
      max: z.number(),
      currency: z.string(),
    }),
    timeline: z.string(),
    location: z.string().optional(),
    quantity: z.number(),
  }).describe("Project requirements for recommendations"),
  evaluationScores: z.array(z.object({
    supplierId: z.string(),
    score: z.number(),
    criteria: z.array(z.string()),
  })).optional().describe("Pre-computed evaluation scores"),
  topN: z.number().optional().describe("Number of top recommendations to return (default: 5)"),
  recommendationStrategy: z.enum(["balanced", "cost_focused", "quality_focused", "speed_focused"]).optional().describe("Recommendation strategy to use"),
});

export const recommendationTool = tool(
  async ({ suppliers, projectRequirements, evaluationScores, topN = 5, recommendationStrategy = "balanced" }) => {
    console.log(`Generating recommendations using ${recommendationStrategy} strategy`);
    
    // If no evaluation scores provided, calculate them
    let scores = evaluationScores;
    if (!scores) {
      scores = suppliers.map((supplier) => {
        let score = 0;
        const criteria: string[] = [];
        
        // Capability match (40%)
        const capabilityMatch = supplier.capabilities.filter((cap) =>
          projectRequirements.specifications.some((spec) =>
            cap.toLowerCase().includes(spec.toLowerCase())
          )
        ).length;
        score += (capabilityMatch / projectRequirements.specifications.length) * 40;
        if (capabilityMatch > 0) criteria.push("capability_match");
        
        // Price compatibility (25%)
        const priceCompatible =
          supplier.priceRange.min <= projectRequirements.budget.max &&
          supplier.priceRange.max >= projectRequirements.budget.min;
        if (priceCompatible) {
          score += 25;
          criteria.push("price_compatible");
        }
        
        // Rating (20%)
        score += supplier.rating * 20;
        if (supplier.rating >= 4) criteria.push("high_rating");
        
        // Location preference (15%)
        if (
          !projectRequirements.location ||
          supplier.location
            .toLowerCase()
            .includes(projectRequirements.location.toLowerCase())
        ) {
          score += 15;
          criteria.push("location_match");
        }
        
        return {
          supplierId: supplier.id,
          score: Math.min(score, 100),
          criteria,
        };
      });
    }
    
    // Apply recommendation strategy weighting
    const weightedScores = scores.map(scoreObj => {
      let adjustedScore = scoreObj.score;
      const supplier = suppliers.find(s => s.id === scoreObj.supplierId);
      
      if (!supplier) return scoreObj;
      
      switch (recommendationStrategy) {
        case "cost_focused":
          // Prioritize lower price ranges
          if (supplier.priceRange.min <= projectRequirements.budget.max * 0.7) {
            adjustedScore += 10;
          }
          break;
          
        case "quality_focused":
          // Prioritize higher ratings and certifications
          if (supplier.rating >= 4.5) {
            adjustedScore += 15;
          }
          if (supplier.certifications.length >= 3) {
            adjustedScore += 10;
          }
          break;
          
        case "speed_focused":
          // Prioritize shorter lead times (2-3 weeks is considered fast)
          if (supplier.leadTime.includes("2 weeks") || supplier.leadTime.includes("3 weeks") || 
              supplier.leadTime.includes("2-") || supplier.leadTime.includes("3-")) {
            adjustedScore += 15;
          }
          break;
          
        case "balanced":
        default:
          // Use original score
          break;
      }
      
      return {
        ...scoreObj,
        score: Math.min(adjustedScore, 100)
      };
    });
    
    // Sort by adjusted score and get top N
    const sortedScores = weightedScores.sort((a, b) => b.score - a.score);
    const topSuppliers = sortedScores.slice(0, topN);
    
    // Generate detailed recommendations
    const recommendations = topSuppliers
      .map((score, index) => {
        const supplier = suppliers.find((s) => s.id === score.supplierId);
        if (!supplier) return null;
        
        // Generate detailed reasoning
        const strengths = [];
        const considerations = [];
        
        if (score.criteria.includes("capability_match")) {
          strengths.push("Strong capability alignment");
        }
        if (score.criteria.includes("price_compatible")) {
          strengths.push("Fits within budget");
        }
        if (score.criteria.includes("high_rating")) {
          strengths.push("Excellent rating");
        }
        if (score.criteria.includes("location_match")) {
          strengths.push("Preferred location");
        }
        
        // Add strategy-specific insights
        if (recommendationStrategy === "cost_focused" && supplier.priceRange.min <= projectRequirements.budget.max * 0.7) {
          strengths.push("Cost-effective option");
        }
        if (recommendationStrategy === "quality_focused" && supplier.rating >= 4.5) {
          strengths.push("Premium quality supplier");
        }
        if (recommendationStrategy === "speed_focused" && (supplier.leadTime.includes("2 weeks") || supplier.leadTime.includes("3 weeks") || 
            supplier.leadTime.includes("2-") || supplier.leadTime.includes("3-"))) {
          strengths.push("Fast delivery capability");
        }
        
        // Add considerations
        if (supplier.priceRange.max > projectRequirements.budget.max) {
          considerations.push("May exceed budget for large orders");
        }
        if (supplier.leadTime.includes("8+") || supplier.leadTime.includes("10+")) {
          considerations.push("Longer lead time");
        }
        
        const reasoning = `Rank #${index + 1}: ${supplier.name} scored ${score.score.toFixed(1)}/100. ` +
          `Strengths: ${strengths.join(", ")}. ` +
          (considerations.length > 0 ? `Considerations: ${considerations.join(", ")}. ` : "") +
          `Lead time: ${supplier.leadTime}. ` +
          `Price range: ${supplier.priceRange.currency} ${supplier.priceRange.min}-${supplier.priceRange.max}. ` +
          `Certifications: ${supplier.certifications.join(", ")}.`;
        
        return {
          supplierId: score.supplierId,
          rank: index + 1,
          score: score.score,
          reasoning,
          strengths,
          considerations,
          strategy: recommendationStrategy,
        };
      })
      .filter(Boolean);
    
    return {
      recommendations,
      strategy: recommendationStrategy,
      totalEvaluated: suppliers.length,
      topRecommended: recommendations.length,
      summary: `Generated ${recommendations.length} recommendations using ${recommendationStrategy} strategy from ${suppliers.length} suppliers`
    };
  },
  {
    name: "recommendation",
    description: "Generate supplier recommendations based on project requirements and evaluation scores",
    schema: RecommendationSchema
  }
);

export async function generateRecommendations(params: {
  suppliers: any[];
  projectRequirements: any;
  evaluationScores?: any[];
  topN?: number;
  recommendationStrategy?: "balanced" | "cost_focused" | "quality_focused" | "speed_focused";
}) {
  return await recommendationTool.invoke(params);
}