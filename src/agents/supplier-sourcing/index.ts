import { StateGraph, END, START } from "@langchain/langgraph";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { z } from "zod";
import { dataIngestionTool } from "./tools/data-ingestion";
import { profileManagerTool } from "./tools/profile-manager";
import { recommendationTool } from "./tools/recommendation";
import { SearchAgent } from "./tools/search";

export const SupplierSourcingStateSchema = z.object({
  messages: z.array(z.any()),
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
  }),
  suppliers: z.array(
    z.object({
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
    })
  ),
  evaluation: z
    .object({
      scores: z.array(
        z.object({
          supplierId: z.string(),
          score: z.number(),
          criteria: z.array(z.string()),
        })
      ),
      recommendations: z.array(
        z.object({
          supplierId: z.string(),
          rank: z.number(),
          reasoning: z.string(),
        })
      ),
    })
    .optional(),
});

export type SupplierSourcingState = z.infer<typeof SupplierSourcingStateSchema>;

export class SupplierSourcingAgent {
  private graph: StateGraph<SupplierSourcingState>;

  constructor() {
    this.graph = new StateGraph(SupplierSourcingStateSchema);

    this.setupNodes();
    this.setupEdges();
  }

  private setupNodes() {
    this.graph.addNode("ingest_data", this.ingestData.bind(this));
    this.graph.addNode("evaluate_suppliers", this.evaluateSuppliers.bind(this));
    this.graph.addNode(
      "generate_recommendations",
      this.generateRecommendations.bind(this)
    );
  }

  private setupEdges() {
    // this.graph.setEntryPoint("__start__");
    this.graph.addEdge(START, "ingest_data" as any);
    this.graph.addEdge("ingest_data" as any, "evaluate_suppliers" as any);
    this.graph.addEdge(
      "evaluate_suppliers" as any,
      "generate_recommendations" as any
    );
    this.graph.addEdge("generate_recommendations" as any, END);
  }

  private async ingestData(
    state: SupplierSourcingState
  ): Promise<Partial<SupplierSourcingState>> {
    const { projectRequirements } = state;

    try {
      const response = await dataIngestionTool.invoke({
        category: projectRequirements.category,
        location: projectRequirements.location,
        specifications: projectRequirements.specifications,
      });

      const searchEnhanced = response.searchCriteria?.searchEnhanced || false;
      const message = searchEnhanced 
        ? `Found ${response.suppliers.length} potential suppliers for ${projectRequirements.category} using enhanced search`
        : `Found ${response.suppliers.length} potential suppliers for ${projectRequirements.category}`;

      return {
        suppliers: response.suppliers,
        messages: [
          ...state.messages,
          new SystemMessage(message),
        ],
      };
    } catch (error) {
      return {
        messages: [
          ...state.messages,
          new SystemMessage(`Error ingesting supplier data: ${error}`),
        ],
      };
    }
  }

  private async evaluateSuppliers(
    state: SupplierSourcingState
  ): Promise<Partial<SupplierSourcingState>> {
    const { suppliers, projectRequirements } = state;

    try {
      // Get or create profiles for all suppliers
      const supplierProfiles = await Promise.all(
        suppliers.map(async (supplier) => {
          const profileResult = await profileManagerTool.invoke({
            supplierId: supplier.id,
            action: "get",
          });

          // If profile doesn't exist, create one
          if (!profileResult.success) {
            await profileManagerTool.invoke({
              supplierId: supplier.id,
              action: "create",
              profileData: {
                name: supplier.name,
                capabilities: supplier.capabilities,
                location: supplier.location,
                rating: supplier.rating,
                priceRange: supplier.priceRange,
                leadTime: supplier.leadTime,
                certifications: supplier.certifications,
              },
            });
          }

          return {
            supplier,
            profile: profileResult.success ? profileResult.profile : null,
          };
        })
      );

      const scores = supplierProfiles.map(({ supplier, profile }) => {
        let score = 0;
        const criteria: string[] = [];

        // Capability match (35%)
        const capabilityMatch = supplier.capabilities.filter((cap) =>
          projectRequirements.specifications.some((spec) =>
            cap.toLowerCase().includes(spec.toLowerCase())
          )
        ).length;
        score +=
          (capabilityMatch / projectRequirements.specifications.length) * 35;
        if (capabilityMatch > 0) criteria.push("capability_match");

        // Price compatibility (25%)
        const priceCompatible =
          supplier.priceRange.min <= projectRequirements.budget.max &&
          supplier.priceRange.max >= projectRequirements.budget.min;
        if (priceCompatible) {
          score += 25;
          criteria.push("price_compatible");
        }

        // Rating and profile performance (20%)
        let ratingScore = supplier.rating * 15;
        if (profile && profile.riskAssessment) {
          // Include risk assessment in scoring
          const avgRiskScore =
            (profile.riskAssessment.financialStability +
              profile.riskAssessment.qualityConsistency +
              profile.riskAssessment.deliveryReliability +
              profile.riskAssessment.communicationScore) /
            4;
          ratingScore += avgRiskScore * 1.25; // 5% of total score
        }
        score += ratingScore;
        if (supplier.rating >= 4) criteria.push("high_rating");
        if (profile && profile.riskAssessment) criteria.push("risk_assessed");

        // Location preference (10%)
        if (
          !projectRequirements.location ||
          supplier.location
            .toLowerCase()
            .includes(projectRequirements.location.toLowerCase())
        ) {
          score += 10;
          criteria.push("location_match");
        }

        // Historical performance (10%)
        if (
          profile &&
          profile.performanceHistory &&
          profile.performanceHistory.length > 0
        ) {
          const avgPerformance =
            profile.performanceHistory.reduce(
              (sum: number, perf: { score: number }) => sum + perf.score,
              0
            ) / profile.performanceHistory.length;
          score += (avgPerformance / 5) * 10; // Normalize to 10% of total score
          criteria.push("historical_performance");
        } else {
          // Give neutral score if no history
          score += 5;
        }

        return {
          supplierId: supplier.id,
          score: Math.min(score, 100),
          criteria,
        };
      });

      return {
        evaluation: {
          scores,
          recommendations: [],
        },
        messages: [
          ...state.messages,
          new SystemMessage(
            `Evaluated ${suppliers.length} suppliers using profile manager for enhanced scoring`
          ),
        ],
      };
    } catch (error) {
      return {
        messages: [
          ...state.messages,
          new SystemMessage(`Error evaluating suppliers: ${error}`)
        ],
      };
    }
  }

  private async generateRecommendations(
    state: SupplierSourcingState
  ): Promise<Partial<SupplierSourcingState>> {
    const { suppliers, evaluation, projectRequirements } = state;

    if (!evaluation) return state;

    try {
      // Use the recommendation tool to generate recommendations
      const recommendationResult = await recommendationTool.invoke({
        suppliers,
        projectRequirements,
        evaluationScores: evaluation.scores,
        topN: 5,
        recommendationStrategy: "balanced",
      });

      return {
        evaluation: {
          ...evaluation,
          recommendations: recommendationResult.recommendations.map((rec) => ({
            supplierId: rec?.supplierId || "",
            rank: rec?.rank || 0,
            reasoning: rec?.reasoning || "",
          })),
        },
        messages: [
          ...state.messages,
          new SystemMessage(
            recommendationResult.summary ||
              `Generated ${recommendationResult.recommendations.length} supplier recommendations using recommendation tool`
          ),
        ],
      };
    } catch (error) {
      // Fallback to original logic if tool fails
      console.warn("Recommendation tool failed, using fallback logic:", error);

      const sortedScores = [...evaluation.scores].sort(
        (a, b) => b.score - a.score
      );
      const topSuppliers = sortedScores.slice(0, 5);

      const recommendations = topSuppliers
        .map((score, index) => {
          const supplier = suppliers.find((s) => s.id === score.supplierId);
          if (!supplier) return null;

          const reasoning =
            `Rank #${index + 1}: ${supplier.name} scored ${score.score.toFixed(
              1
            )}/100. ` +
            `Strengths: ${score.criteria.join(", ")}. ` +
            `Lead time: ${supplier.leadTime}. ` +
            `Price range: ${supplier.priceRange.currency} ${supplier.priceRange.min}-${supplier.priceRange.max}.`;

          return {
            supplierId: score.supplierId,
            rank: index + 1,
            reasoning,
          };
        })
        .filter(Boolean) as any[];

      return {
        evaluation: {
          ...evaluation,
          recommendations,
        },
        messages: [
          ...state.messages,
          new SystemMessage(
            `Generated ${recommendations.length} supplier recommendations (fallback mode)`
          ),
        ],
      };
    }
  }

  public async run(input: {
    projectRequirements: SupplierSourcingState["projectRequirements"];
    messages?: BaseMessage[];
  }): Promise<SupplierSourcingState> {
    const compiledGraph = this.graph.compile();

    const initialState: SupplierSourcingState = {
      messages: input.messages || [
        new SystemMessage("Starting supplier sourcing process..."),
      ],
      projectRequirements: input.projectRequirements,
      suppliers: [],
      evaluation: undefined,
    };

    const result = await compiledGraph.invoke(initialState);
    return result as SupplierSourcingState;
  }
}

export const supplierSourcingAgent = new SupplierSourcingAgent();
