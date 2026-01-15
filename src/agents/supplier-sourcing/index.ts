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
import { 
  Supplier, 
  ProjectRequirements, 
  SupplierEvaluation, 
  EvaluationScore, 
  Recommendation 
} from "../../types";

export const SupplierSourcingStateSchema = z.object({
  messages: z.array(z.any()),
  projectRequirements: z.custom<ProjectRequirements>(),
  suppliers: z.array(z.custom<Supplier>()),
  evaluation: z.custom<SupplierEvaluation>().optional(),
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
    return {
      evaluation: {
        scores: [
          { supplierId: "supplier-1", score: 85, criteria: ["capability_match", "price_compatible"] },
          { supplierId: "supplier-2", score: 75, criteria: ["high_rating", "location_match"] },
        ],
        recommendations: [],
      },
      messages: [
        ...state.messages,
        new SystemMessage("Static supplier evaluation completed"),
      ],
    };
  }

  private async generateRecommendations(
    state: SupplierSourcingState
  ): Promise<Partial<SupplierSourcingState>> {
    const { evaluation } = state;

    if (!evaluation) return state;

    return {
      evaluation: {
        ...evaluation,
        recommendations: [
          {
            supplierId: "supplier-1",
            rank: 1,
            reasoning: "Top recommendation based on static evaluation",
          },
          {
            supplierId: "supplier-2",
            rank: 2,
            reasoning: "Second recommendation based on static evaluation",
          },
        ],
      },
      messages: [
        ...state.messages,
        new SystemMessage("Static recommendations generated"),
      ],
    };
  }

  public async run(input: {
    projectRequirements: ProjectRequirements;
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
