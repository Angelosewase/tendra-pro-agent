import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { initializeAgentExecutorWithOptions } from "@langchain/classic/agents";
import { Calculator } from "@langchain/community/tools/calculator";
import { WebBrowser } from "@langchain/classic/tools/webbrowser";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";

export class SearchAgent {
  private model: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;
  private executor: any;

  constructor(options?: { temperature?: number }) {
    // Initialize OpenRouter model
    this.model = new ChatOpenAI({
      temperature: options?.temperature ?? 0,
      openAIApiKey: process.env.OPEN_ROUTER_API_KEY,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
      },
    });

    // Initialize embeddings with OpenRouter
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPEN_ROUTER_API_KEY,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
      },
    });
  }

  async initialize() {
    const tools = [
      new DuckDuckGoSearch({ maxResults: 5 }),
      new Calculator(),
      new WebBrowser({ model: this.model, embeddings: this.embeddings }),
    ];

    this.executor = await initializeAgentExecutorWithOptions(
      tools,
      this.model,
      {
        agentType: "zero-shot-react-description",
        verbose: true,
      }
    );

    console.log("Search agent initialized.");
  }

  async search(query: string) {
    if (!this.executor) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    console.log(`Executing search with query: "${query}"...`);
    const result = await this.executor.invoke({ input: query });
    return result;
  }
}
