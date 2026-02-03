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
      tools: [new DuckDuckGoSearch({ maxResults: 5 })],
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

    console.log("sample placeholder --> ", placeholders[0]);
    console.log("sample partial data --> ", partialData);

    // FIX #1: Extract field path before checking against partialData
    const missingFields = placeholders.filter((p) => {
      const fieldPath = p.split(":")[0]; // Extract "bidder.name" from "bidder.name:{{company_name}}"
      return !(fieldPath in partialData);
    });

    if (missingFields.length === 0) {
      console.log(
        `✅ [TEMPLATE] No missing fields for ${rfxType.toUpperCase()} template`,
      );
      return { completedFields: {}, missingFields: [] };
    }

    console.log(
      `🔄 [TEMPLATE] Starting template completion for ${rfxType.toUpperCase()}`,
    );
    console.log(`📊 [TEMPLATE] Total placeholders: ${placeholders.length}`);
    console.log(`🔍 [TEMPLATE] Missing fields: ${missingFields.length}`);
    console.log(
      `📝 [TEMPLATE] Missing: ${missingFields.map((f) => f.split(":")[0]).join(", ")}`,
    );

    const chunkOptions = {
      ...this.defaultChunkOptions,
      ...options?.chunkOptions,
    };
    const chunks = this.chunkFields(missingFields, chunkOptions);

    console.log(
      `🔧 [TEMPLATE] Created ${chunks.length} chunks (max ${chunkOptions.maxFieldsPerChunk} fields per chunk)`,
    );

    let completed: Record<string, string> = {};
    let unresolved = new Set<string>();

    for (let i = 0; i < chunks.length; i++) {
      const fields = chunks[i];
      console.log(
        `🚀 [CHUNK] Processing chunk ${i + 1}/${chunks.length} with ${fields.length} fields`,
      );

      const result = await this.runChunk({
        rfxType,
        fields,
        baseData: partialData,
        context: completed,
      });

      Object.assign(completed, result.completedFields);
      result.missingFields.forEach((f) => unresolved.add(f));
    }

    console.log(
      `✅ [TEMPLATE] Completed template processing for ${rfxType.toUpperCase()}`,
    );
    console.log(
      `📊 [TEMPLATE] Total completed fields: ${Object.keys(completed).length}`,
    );
    console.log(`❌ [TEMPLATE] Total missing fields: ${unresolved.size}`);

    if (Object.keys(completed).length > 0) {
      console.log(
        `🔧 [TEMPLATE] All completed: ${Object.keys(completed).join(", ")}`,
      );
    }

    if (unresolved.size > 0) {
      console.log(
        `⚠️ [TEMPLATE] All missing: ${Array.from(unresolved).join(", ")}`,
      );
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

    const rawResult = result.structuredResponse ?? {
      completedFields: {},
      missingFields: [],
    };

    // FIX #4: Validate and normalize the AI response
    const completionResult = this.validateAndNormalizeResponse(
      rawResult,
      params.fields,
    );

    // Log chunk completion
    console.log(
      `✅ [CHUNK] Completed chunk processing for ${params.rfxType.toUpperCase()}`,
    );
    console.log(`📊 [CHUNK] Fields processed: ${params.fields.length}`);
    console.log(
      `📝 [CHUNK] Completed fields: ${Object.keys(completionResult.completedFields).length}`,
    );
    console.log(
      `❌ [CHUNK] Missing fields: ${completionResult.missingFields.length}`,
    );

    if (Object.keys(completionResult.completedFields).length > 0) {
      console.log(
        `🔧 [CHUNK] Completed: ${Object.keys(completionResult.completedFields).join(", ")}`,
      );
    }

    if (completionResult.missingFields.length > 0) {
      console.log(
        `⚠️ [CHUNK] Missing: ${completionResult.missingFields.join(", ")}`,
      );
    }

    return completionResult;
  }

  // FIX #4: Validate that AI returns correct field paths as keys
  private validateAndNormalizeResponse(
    rawResult: {
      completedFields: Record<string, string>;
      missingFields: string[];
    },
    expectedFields: string[],
  ): CompletionResult {
    const expectedPaths = new Set(expectedFields.map((f) => f.split(":")[0]));
    const normalized: Record<string, string> = {};
    const missing: string[] = [];

    // Validate completed fields have correct keys
    for (const [key, value] of Object.entries(rawResult.completedFields)) {
      // If the AI returned the full template string as key, extract the path
      const fieldPath = key.includes(":") ? key.split(":")[0] : key;

      if (expectedPaths.has(fieldPath)) {
        normalized[fieldPath] = value;
      } else {
        console.warn(`⚠️ [VALIDATION] AI returned unexpected key: ${key}`);
      }
    }

    // Validate missing fields
    for (const field of rawResult.missingFields) {
      const fieldPath = field.includes(":") ? field.split(":")[0] : field;
      if (expectedPaths.has(fieldPath)) {
        missing.push(fieldPath);
      }
    }

    // Check if any expected fields are neither completed nor marked as missing
    for (const expectedField of expectedFields) {
      const fieldPath = expectedField.split(":")[0];
      if (!normalized[fieldPath] && !missing.includes(fieldPath)) {
        missing.push(fieldPath);
      }
    }

    return {
      completedFields: normalized,
      missingFields: missing,
    };
  }

  // FIX #2: Improved prompt with clearer instructions
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

KNOWN DATA (already provided):
${JSON.stringify({ ...baseData, ...context }, null, 2)}

FIELDS TO COMPLETE (format is "fieldPath:templateContext"):
${fields.join("\n")}

IMPORTANT INSTRUCTIONS:
- Each field above shows the path (before colon) and context (after colon)
- Return an object where keys are the FIELD PATHS ONLY (the part before the colon)
- Example: For "bidder.name:Company is {{company_name}}", return {"bidder.name": "Acme Corporation"}
- Use the template context to understand what value is needed
- Use the KNOWN DATA to infer values when possible
- Only complete fields that you can reasonably infer or generate
- If a field cannot be completed, add its field path to the missingFields array

RULES:
- Use professional procurement language
- Dates: YYYY-MM-DD format
- Currency: Use realistic values with currency symbols (e.g., "$50,000")
- Be specific and concrete, avoid placeholders or generic text
- Keys in completedFields must match the field paths exactly

Return a JSON object with this structure:
{
  "completedFields": { "field.path": "actual value", ... },
  "missingFields": ["field.path", ...]
}
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

  private extractPlaceholdersFromTemplate(template: any): string[] {
    const results: string[] = [];

    const walk = (value: any, path: string[] = []) => {
      if (typeof value === "string") {
        results.push(`${path.join(".")}:${value}`);
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item, index) => walk(item, [...path, index.toString()]));
        return;
      }

      if (value && typeof value === "object") {
        Object.entries(value).forEach(([key, val]) => {
          walk(val, [...path, key]);
        });
      }
    };

    walk(template);
    return results;
  }

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
