import { ChatOpenAI } from "@langchain/openai";
import { Calculator } from "@langchain/community/tools/calculator";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { createAgent } from "langchain";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

export class SearchAgent {
  private model: ChatOpenAI;
  private executor: any;

  private supplierResponseSchema = z.object({
    suppliers: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        capabilities: z.array(z.string()),
        location: z.string(),
        rating: z.number().min(0).max(5),
        priceRange: z.object({
          min: z.number(),
          max: z.number(),
          currency: z.string(),
        }),
        leadTime: z.string(),
        certifications: z.array(z.string()),
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
          "X-Title": "SearchAgent",
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
      responseFormat: this.supplierResponseSchema,
    });

    console.log("✓ Search agent initialized successfully");
  }

  async search(query: string) {
    if (!this.executor) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    const result = await this.executor.invoke({
      messages: [new HumanMessage(query)],
    });

    return result;
  }

  async searchSuppliers(params: {
    category: string;
    location?: string;
    specifications: string[];
  }) {
    if (!this.executor) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    let searchQuery = `Find suppliers for ${params.category}`;

    if (params.location) {
      searchQuery += ` in ${params.location}`;
    }

    if (params.specifications.length > 0) {
      searchQuery += ` with capabilities: ${params.specifications.join(", ")}`;
    }

    searchQuery +=
      ". Return structured JSON that strictly matches the schema.";

    const result = await this.executor.invoke({
      messages: [
        new SystemMessage(
          "You are a supplier discovery agent. Always return valid JSON matching the schema."
        ),
        new HumanMessage(searchQuery),
      ],
    });

    return result.structuredResponse?.suppliers || [];
  }

  async healthCheck(): Promise<boolean> {
    const res = await this.model.invoke("Say OK");
    return res.content.toString().includes("OK");
  }
}
