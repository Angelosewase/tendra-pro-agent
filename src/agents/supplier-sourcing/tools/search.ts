import { ChatOpenAI } from "@langchain/openai";
import { Calculator } from "@langchain/community/tools/calculator";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { createAgent } from "langchain";
import { z } from "zod";

export class SearchAgent {
  private model: ChatOpenAI;
  private executor: any;

  private supplierResponseSchema = z.object({
    suppliers: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().describe("Supplier company name"),
          capabilities: z
            .array(z.string())
            .describe("List of manufacturing capabilities and services"),
          location: z.string().describe("Geographic location of the supplier"),
          rating: z.number().optional().describe("Supplier rating score (0-5)"),
          priceRange: z
            .object({
              min: z.number().optional(),
              max: z.number().optional(),
              currency: z.string().optional(),
            })
            .optional()
            .describe("Price range for services"),
          leadTime: z
            .string()
            .optional()
            .describe("Typical lead time for orders"),
          certifications: z
            .array(z.string())
            .optional()
            .describe("Industry certifications"),
        })
      )
      .describe("List of matching suppliers"),
    searchCriteria: z
      .object({
        category: z.string(),
        location: z.string().optional(),
        specifications: z.array(z.string()),
        totalFound: z.number(),
        searchEnhanced: z.boolean(),
      })
      .describe("Search parameters and results summary"),
  });

  constructor(options?: { temperature?: number }) {
    const apiKey = process.env.OPEN_ROUTER_API_KEY;

    if (!apiKey) {
      console.warn(
        "⚠️  OPEN_ROUTER_API_KEY is not set in environment variables"
      );
    }

    // FIX: LangChain needs OPENAI_API_KEY environment variable
    if (apiKey) {
      process.env.OPENAI_API_KEY = apiKey;
    }

    this.model = new ChatOpenAI({
      temperature: options?.temperature ?? 0,
      model: "xiaomi/mimo-v2-flash:free",
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

    const tools = [new DuckDuckGoSearch({ maxResults: 5 }), new Calculator()];

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

    if (!query || query.trim().length === 0) {
      throw new Error("Search query cannot be empty");
    }

    console.log(`\n🔍 Executing search with query: "${query}"...`);
    const result = await this.executor.invoke({ input: query });
    console.log("✓ Search completed successfully");
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

    // Build a comprehensive search query
    let searchQuery = `Find suppliers for ${params.category}`;

    if (params.location) {
      searchQuery += ` in ${params.location}`;
    }

    if (params.specifications && params.specifications.length > 0) {
      searchQuery += ` with capabilities: ${params.specifications.join(", ")}`;
    }

    searchQuery +=
      ". Please provide supplier names, locations, capabilities, and contact information if available.";

    console.log(`\n🔍 Searching for suppliers with query: "${searchQuery}"...`);

    try {
      const result = await this.executor.invoke({ input: searchQuery });
      console.log("✓ Supplier search completed successfully");
      return result;
    } catch (error) {
      console.error("Supplier search failed:", error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const testResponse = await this.model.invoke("Say 'OK'");
      return testResponse.content.toString().includes("OK");
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  }
}
