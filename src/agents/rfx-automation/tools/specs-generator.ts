import { ChatOpenAI } from "@langchain/openai";
import { Calculator } from "@langchain/community/tools/calculator";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { createAgent } from "langchain";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

export class SpecsGenerator {
  private model: ChatOpenAI;
  private executor: any;

  private specsResponseSchema = z.object({
    specifications: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        category: z.enum(["technical", "functional", "performance", "quality", "compliance"]),
        description: z.string(),
        requirements: z.array(z.string()),
        acceptanceCriteria: z.array(z.string()),
        testingMethods: z.array(z.string()),
        priority: z.enum(["critical", "high", "medium", "low"]),
        measurable: z.boolean(),
        metrics: z.array(z.string()),
        references: z.array(z.string()),
      })
    ),
    deliverables: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        type: z.enum(["document", "software", "hardware", "service", "report"]),
        format: z.string(),
        deliverySchedule: z.string(),
        acceptanceCriteria: z.array(z.string()),
      })
    ),
    standards: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        organization: z.string(),
        version: z.string(),
        category: z.string(),
        applicability: z.array(z.string()),
        complianceLevel: z.enum(["mandatory", "recommended", "reference"]),
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
      model: "mistralai/devstral-2512:free",
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "SpecsGenerator",
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
      responseFormat: this.specsResponseSchema,
    });

    console.log("✓ Specs Generator agent initialized successfully");
  }

  async generateSpecifications(params: {
    projectType: string;
    industry: string;
    requirements: string[];
    complexity: "simple" | "moderate" | "complex";
    deliverableTypes: string[];
    standards?: string[];
  }) {
    if (!this.executor) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    let query = `Generate comprehensive technical specifications for ${params.projectType} project in ${params.industry} industry`;

    query += ` with ${params.complexity} complexity level`;

    if (params.requirements.length > 0) {
      query += ` to meet requirements: ${params.requirements.join(", ")}`;
    }

    if (params.deliverableTypes.length > 0) {
      query += ` with deliverables: ${params.deliverableTypes.join(", ")}`;
    }

    if (params.standards && params.standards.length > 0) {
      query += ` complying with standards: ${params.standards.join(", ")}`;
    }

    query += ". Return structured JSON that strictly matches the schema with detailed specifications, deliverables, and applicable standards.";

    const result = await this.executor.invoke({
      messages: [
        new SystemMessage(
          "You are a technical specifications expert. Always return valid JSON matching the schema. Generate comprehensive, measurable, and testable specifications."
        ),
        new HumanMessage(query),
      ],
    });

    return result.structuredResponse || { specifications: [], deliverables: [], standards: [] };
  }

  async generateFromRFXRequest(rfxRequest: any) {
    if (!this.executor) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    const query = `Generate comprehensive technical specifications for the following RFX request:
    
    Document Type: ${rfxRequest.documentType}
    Title: ${rfxRequest.title}
    Agency: ${rfxRequest.agencyName}
    Requirements: ${JSON.stringify(rfxRequest.requirements)}
    Existing Specifications: ${rfxRequest.specifications?.join(", ") || "None provided"}
    Budget: ${rfxRequest.budget ? `${rfxRequest.budget.currency} ${rfxRequest.budget.min}-${rfxRequest.budget.max}` : "Not specified"}
    Timeline: ${rfxRequest.timeline || "Not specified"}
    Location: ${rfxRequest.location || "Not specified"}
    
    Generate detailed technical specifications, functional requirements, performance criteria, quality standards, and deliverable specifications. Ensure all specifications are measurable and testable. Return structured JSON matching the schema.`;

    const result = await this.executor.invoke({
      messages: [
        new SystemMessage(
          "You are an expert technical specifier and procurement specialist. Analyze the RFX request and generate comprehensive technical specifications that clearly define requirements, acceptance criteria, and testing methods."
        ),
        new HumanMessage(query),
      ],
    });

    return result.structuredResponse || { specifications: [], deliverables: [], standards: [] };
  }

  async enhanceSpecifications(existingSpecs: string[], additionalRequirements: string[]) {
    if (!this.executor) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    const query = `Enhance and expand the following specifications:
    
    Existing Specifications: ${existingSpecs.join(", ")}
    Additional Requirements: ${additionalRequirements.join(", ")}
    
    Please:
    1. Analyze existing specifications for completeness
    2. Identify gaps based on additional requirements
    3. Add missing technical, functional, and performance specifications
    4. Ensure all specifications are measurable and testable
    5. Include relevant industry standards and best practices
    6. Provide acceptance criteria and testing methods
    
    Return structured JSON matching the schema with enhanced specifications.`;

    const result = await this.executor.invoke({
      messages: [
        new SystemMessage(
          "You are a specifications enhancement expert. Improve existing specifications by adding missing details, ensuring measurability, and incorporating best practices."
        ),
        new HumanMessage(query),
      ],
    });

    return result.structuredResponse || { specifications: [], deliverables: [], standards: [] };
  }

  async validateSpecification(spec: string, context: any) {
    if (!this.executor) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    const query = `Validate the following specification for completeness and quality:
    
    Specification: ${spec}
    Context: ${JSON.stringify(context)}
    
    Check for:
    - Clarity and specificity
    - Measurability
    - Testability
    - Completeness
    - Feasibility
    - Compliance with standards
    - Ambiguity or gaps
    - Recommended improvements
    
    Return structured JSON with validation results and recommendations.`;

    const result = await this.executor.invoke({
      messages: [
        new SystemMessage(
          "You are a specifications validation expert. Analyze specifications for quality, completeness, and compliance with best practices."
        ),
        new HumanMessage(query),
      ],
    });

    return result.structuredResponse;
  }

  async generateComplianceMatrix(specifications: string[], standards: string[]) {
    if (!this.executor) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    const query = `Generate a compliance matrix for the following specifications against standards:
    
    Specifications: ${specifications.join(", ")}
    Standards: ${standards.join(", ")}
    
    Create a detailed compliance matrix showing:
    1. Which specifications comply with which standards
    2. Gaps in compliance
    3. Required modifications for full compliance
    4. Testing requirements for compliance verification
    5. Documentation requirements
    
    Return structured JSON with compliance analysis and recommendations.`;

    const result = await this.executor.invoke({
      messages: [
        new SystemMessage(
          "You are a compliance expert. Analyze specifications against standards and create comprehensive compliance matrices."
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