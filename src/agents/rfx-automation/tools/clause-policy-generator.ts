import { ChatOpenAI } from "@langchain/openai";
import { Calculator } from "@langchain/community/tools/calculator";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { createAgent } from "langchain";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

export class ClausePolicyGenerator {
  private model: ChatOpenAI;
  private executor: any;

  private clauseResponseSchema = z.object({
    clauses: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        type: z.enum(["legal", "technical", "commercial", "compliance"]),
        content: z.string(),
        applicability: z.array(z.string()),
        priority: z.enum(["high", "medium", "low"]),
        references: z.array(z.string()),
        lastUpdated: z.string(),
      })
    ),
    policies: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        category: z.string(),
        requirements: z.array(z.string()),
        enforcementLevel: z.enum(["mandatory", "recommended", "optional"]),
      })
    ),
  });

  constructor(options?: { temperature?: number }) {
    const apiKey = process.env.OPEN_ROUTER_API_KEY;

    if (apiKey) {
      process.env.OPENAI_API_KEY = apiKey;
    }

    this.model = new ChatOpenAI({
      temperature: options?.temperature ?? 0,
      model: "openai/gpt-oss-120b:free",
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "ClausePolicyGenerator",
        },
      },
    });
  }

  async initialize() {
    if (!process.env.OPEN_ROUTER_API_KEY) {
      throw new Error("OPEN_ROUTER_API_KEY environment variable is required");
    }

    const tools = [
      new DuckDuckGoSearch({ maxResults: 1000 }),
      new Calculator(),
    ];

    this.executor = createAgent({
      tools,
      model: this.model,
      responseFormat: this.clauseResponseSchema,
    });

    console.log("✓ Clause Policy Generator agent initialized successfully");
  }

  async generateClauses(params: {
    documentType: string;
    category: string;
    requirements: string[];
    industry?: string;
    jurisdiction?: string;
  }) {
    if (!this.executor) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    let query = `Generate legal clauses and policies for ${params.documentType} document in ${params.category} category`;

    if (params.industry) {
      query += ` for ${params.industry} industry`;
    }

    if (params.jurisdiction) {
      query += ` under ${params.jurisdiction} jurisdiction`;
    }

    if (params.requirements.length > 0) {
      query += ` with requirements: ${params.requirements.join(", ")}`;
    }

    query += ". Return structured JSON that strictly matches the schema with comprehensive clauses and policies.";

    const result = await this.executor.invoke({
      messages: [
        new SystemMessage(
          "You are a legal clause and policy generation expert. Always return valid JSON matching the schema. Generate comprehensive, legally-sound clauses and policies."
        ),
        new HumanMessage(query),
      ],
    });

    return result.structuredResponse || { clauses: [], policies: [] };
  }

  async generateFromRFXRequest(rfxRequest: any) {
    if (!this.executor) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    const query = `Generate comprehensive clauses and policies for the following RFX request:
    
    Document Type: ${rfxRequest.documentType}
    Title: ${rfxRequest.title}
    Agency: ${rfxRequest.agencyName}
    Requirements: ${JSON.stringify(rfxRequest.requirements)}
    Specifications: ${rfxRequest.specifications?.join(", ") || "None specified"}
    Budget: ${rfxRequest.budget ? `${rfxRequest.budget.currency} ${rfxRequest.budget.min}-${rfxRequest.budget.max}` : "Not specified"}
    Timeline: ${rfxRequest.timeline || "Not specified"}
    Location: ${rfxRequest.location || "Not specified"}
    
    Generate appropriate legal clauses, compliance policies, technical requirements, and commercial terms. Return structured JSON matching the schema.`;

    const result = await this.executor.invoke({
      messages: [
        new SystemMessage(
          "You are an expert in procurement law and policy generation. Analyze the RFX request and generate comprehensive clauses and policies that protect the agency's interests while ensuring fair competition."
        ),
        new HumanMessage(query),
      ],
    });

    return result.structuredResponse || { clauses: [], policies: [] };
  }

  async validateClause(clauseContent: string, context: any) {
    if (!this.executor) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    const query = `Validate the following clause for legal compliance and effectiveness:
    
    Clause: ${clauseContent}
    Context: ${JSON.stringify(context)}
    
    Check for:
    - Legal compliance
    - Clarity and ambiguity
    - Enforceability
    - Risk factors
    - Recommended improvements
    
    Return structured JSON with validation results.`;

    const result = await this.executor.invoke({
      messages: [
        new SystemMessage(
          "You are a legal validation expert. Analyze clauses for compliance, clarity, and risk factors."
        ),
        new HumanMessage(query),
      ],
    });

    return result.structuredResponse;
  }

  async healthCheck(): Promise<boolean> {
    const res = await this.model.invoke("Say OK");
    return res.content.toString().includes("OK");
  }
}