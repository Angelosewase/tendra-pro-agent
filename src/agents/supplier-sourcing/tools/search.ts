import { ChatOpenAI } from "@langchain/openai";
import { initializeAgentExecutorWithOptions } from "@langchain/classic/agents";
import { Calculator } from "@langchain/community/tools/calculator";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";

export class SearchAgent {
  private model: ChatOpenAI;
  private executor: any;

  constructor(options?: { temperature?: number }) {
    const apiKey = process.env.OPEN_ROUTER_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  OPEN_ROUTER_API_KEY is not set in environment variables');
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
      throw new Error('OPEN_ROUTER_API_KEY environment variable is required');
    }

    const tools = [
      new DuckDuckGoSearch({ maxResults: 5 }),
      new Calculator(),
    ];

    this.executor = await initializeAgentExecutorWithOptions(
      tools,
      this.model,
      {
        agentType: "zero-shot-react-description",
        verbose: true,
        maxIterations: 3,
      }
    );

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