import { ChatOpenAI } from "@langchain/openai";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { createAgent } from "langchain";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { TemplateManager, TemplateData } from "./template-manager";
import { PlaceholderValues as ValuesI } from "./fill-placeholders";

export interface ChunkOptions {
  maxFieldsPerChunk?: number;
}

export interface CompletionResult {
  completedFields: Record<string, string>;
  missingFields: string[];
}

export class TemplateCompleter {
  private model: ChatOpenAI;
  private executor: any;
  private templateManager = new TemplateManager();

  private defaultChunkOptions: ChunkOptions = {
    maxFieldsPerChunk: 20,
  };

  private responseSchema = z.object({
    completedFields: z.record(z.string(), z.string()),
    missingFields: z.array(z.string()),
  });

  constructor(options?: { temperature?: number }) {
    const apiKey = process.env.OPEN_ROUTER_API_KEY;
    if (apiKey) process.env.OPENAI_API_KEY = apiKey;

    this.model = new ChatOpenAI({
      temperature: options?.temperature ?? 0.3,
      model: "openai/gpt-oss-120b:free",
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "TemplateCompleter",
        },
      },
    });
  }

  /* =======================
     Init
  ======================= */

  async initialize(): Promise<void> {
    if (!process.env.OPEN_ROUTER_API_KEY) {
      throw new Error("OPEN_ROUTER_API_KEY is required");
    }

    this.executor = createAgent({
      model: this.model,
      tools: [new DuckDuckGoSearch({ maxResults: 1000 })],
      responseFormat: this.responseSchema,
    });
  }

  private ensureInitialized() {
    if (!this.executor) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }
  }

  /* =======================
     Public API
  ======================= */

  async completeTemplate(
    partialData: ValuesI,
    rfxType: string,
    options?: { chunkOptions?: ChunkOptions },
  ): Promise<CompletionResult> {
    this.ensureInitialized();

    const template = this.getTemplateOrThrow(rfxType);
    const placeholders = this.extractPlaceholdersFromTemplate(template);

    const missingFields = placeholders.filter((p) => !(p in partialData));
    if (missingFields.length === 0) {
      console.log(`✅ [TEMPLATE] No missing fields for ${rfxType.toUpperCase()} template`);
      return { completedFields: {}, missingFields: [] };
    }

    console.log(`🔄 [TEMPLATE] Starting template completion for ${rfxType.toUpperCase()}`);
    console.log(`📊 [TEMPLATE] Total placeholders: ${placeholders.length}`);
    console.log(`🔍 [TEMPLATE] Missing fields: ${missingFields.length}`);
    console.log(`📝 [TEMPLATE] Missing: ${missingFields.join(', ')}`);

    const chunkOptions = {
      ...this.defaultChunkOptions,
      ...options?.chunkOptions,
    };
    const chunks = this.chunkFields(missingFields, chunkOptions);

    console.log(`🔧 [TEMPLATE] Created ${chunks.length} chunks (max ${chunkOptions.maxFieldsPerChunk} fields per chunk)`);

    let completed: Record<string, string> = {};
    let unresolved = new Set<string>();

    for (let i = 0; i < chunks.length; i++) {
      const fields = chunks[i];
      console.log(`🚀 [CHUNK] Processing chunk ${i + 1}/${chunks.length} with ${fields.length} fields`);
      
      const result = await this.runChunk({
        rfxType,
        fields,
        baseData: partialData,
        context: completed,
      });

      Object.assign(completed, result.completedFields);
      result.missingFields.forEach((f) => unresolved.add(f));
    }

    console.log(`✅ [TEMPLATE] Completed template processing for ${rfxType.toUpperCase()}`);
    console.log(`📊 [TEMPLATE] Total completed fields: ${Object.keys(completed).length}`);
    console.log(`❌ [TEMPLATE] Total missing fields: ${unresolved.size}`);
    
    if (Object.keys(completed).length > 0) {
      console.log(`🔧 [TEMPLATE] All completed: ${Object.keys(completed).join(', ')}`);
    }
    
    if (unresolved.size > 0) {
      console.log(`⚠️ [TEMPLATE] All missing: ${Array.from(unresolved).join(', ')}`);
    }

    return {
      completedFields: completed,
      missingFields: Array.from(unresolved),
    };
  }

  /* =======================
     Chunk execution
  ======================= */

  private async runChunk(params: {
    rfxType: string;
    fields: string[];
    baseData: ValuesI;
    context: Record<string, string>;
  }): Promise<CompletionResult> {
    const prompt = this.buildPrompt(params);

    const result = await this.executor.invoke({
      messages: [
        new SystemMessage(
          "You are an expert in procurement and RFX document completion.",
        ),
        new HumanMessage(prompt),
      ],
    });

    const completionResult = (
      result.structuredResponse ?? {
        completedFields: {},
        missingFields: [],
      }
    );

    // Log chunk completion
    console.log(`✅ [CHUNK] Completed chunk processing for ${params.rfxType.toUpperCase()}`);
    console.log(`📊 [CHUNK] Fields processed: ${params.fields.length}`);
    console.log(`📝 [CHUNK] Completed fields: ${Object.keys(completionResult.completedFields).length}`);
    console.log(`❌ [CHUNK] Missing fields: ${completionResult.missingFields.length}`);
    
    if (Object.keys(completionResult.completedFields).length > 0) {
      console.log(`🔧 [CHUNK] Completed: ${Object.keys(completionResult.completedFields).join(', ')}`);
    }
    
    if (completionResult.missingFields.length > 0) {
      console.log(`⚠️ [CHUNK] Missing: ${completionResult.missingFields.join(', ')}`);
    }

    return completionResult;
  }

  private buildPrompt({
    rfxType,
    fields,
    baseData,
    context,
  }: {
    rfxType: string;
    fields: string[];
    baseData: ValuesI;
    context: Record<string, string>;
  }): string {
    return `
Complete missing fields for a ${rfxType.toUpperCase()} procurement document.

KNOWN DATA:
${JSON.stringify({ ...baseData, ...context }, null, 2)}

FIELDS TO COMPLETE:
${fields.join("\n")}

RULES:
- Only return values for the listed fields
- Use professional procurement language
- Dates: YYYY-MM-DD
- Currency: realistic, explicit
- If a field cannot be inferred, list it as missing

Return JSON only.
`;
  }

  /* =======================
     Chunking
  ======================= */

  private chunkFields(fields: string[], options: ChunkOptions): string[][] {
    const max = options.maxFieldsPerChunk ?? fields.length;
    const chunks: string[][] = [];

    for (let i = 0; i < fields.length; i += max) {
      chunks.push(fields.slice(i, i + max));
    }

    return chunks;
  }

  /* =======================
     Template helpers
  ======================= */

  private getTemplateOrThrow(type: string): TemplateData {
    const map: Record<string, () => TemplateData | undefined> = {
      rfb: () => this.templateManager.getRFBTemplateData(),
      rfi: () => this.templateManager.getRFITemplateData(),
      rfp: () => this.templateManager.getRFPTemplateData(),
      rfq: () => this.templateManager.getRFQTemplateData(),
    };

    const fn = map[type.toLowerCase()];
    if (!fn) throw new Error(`Unknown RFX type: ${type}`);
    return fn() as TemplateData;
  }

  private extractPlaceholdersFromTemplate(template: TemplateData): string[] {
    const found = new Set<string>();

    const walk = (value: any) => {
      if (typeof value === "string") {
        const matches = value.match(/\{\{([^}]+)\}\}|\[([^\]]+)\]/g) ?? [];
        matches.forEach((m) => found.add(m.replace(/[{}\[\]]/g, "")));
      } else if (Array.isArray(value)) {
        value.forEach(walk);
      } else if (value && typeof value === "object") {
        Object.values(value).forEach(walk);
      }
    };

    walk(template);
    return Array.from(found);
  }

  /* =======================
     Utilities
  ======================= */

  async healthCheck(): Promise<boolean> {
    const res = await this.model.invoke("Say OK");
    return res.content.toString().includes("OK");
  }

  updateDefaultChunkOptions(options: Partial<ChunkOptions>) {
    this.defaultChunkOptions = { ...this.defaultChunkOptions, ...options };
  }

  getDefaultChunkOptions(): ChunkOptions {
    return { ...this.defaultChunkOptions };
  }
}
