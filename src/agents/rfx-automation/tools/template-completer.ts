import { ChatOpenAI } from "@langchain/openai";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { createAgent } from "langchain";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { TemplateManager, TemplateData } from "./template-manager";
import { PlaceholderValues as ValuesI } from "./fill-placeholders";

export class TemplateCompleter {
  private model: ChatOpenAI;
  private executor: any;
  private templateManager: TemplateManager;

  private templateResponseSchema = z.object({
    completedFields: z.record(z.string(), z.string()),
    missingFields: z.array(z.string()),
  });

  constructor(options?: { temperature?: number }) {
    const apiKey = process.env.OPEN_ROUTER_API_KEY;

    if (apiKey) {
      process.env.OPENAI_API_KEY = apiKey;
    }

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

    this.templateManager = new TemplateManager();
  }

  async initialize() {
    if (!process.env.OPEN_ROUTER_API_KEY) {
      throw new Error("OPEN_ROUTER_API_KEY environment variable is required");
    }

    const tools = [
      new DuckDuckGoSearch({ maxResults: 1000 }),
    ];

    this.executor = createAgent({
      tools,
      model: this.model,
      responseFormat: this.templateResponseSchema,
    });
  }

  async completeTemplate(partialData: ValuesI, rfxType: string): Promise<{
    completedFields: Record<string, string>;
    missingFields: string[];
  }> {
    if (!this.executor) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    // Get template structure to understand expected fields
    const templateData = this.getTemplateData(rfxType);
    if (!templateData) {
      throw new Error(`Template not found for type: ${rfxType}`);
    }

    const expectedPlaceholders = this.extractPlaceholdersFromTemplate(templateData);
    
    const query = `Complete missing template data for this ${rfxType.toUpperCase()} document:

    CURRENT DATA:
    ${JSON.stringify(partialData, null, 2)}

    EXPECTED FIELDS (from template):
    ${expectedPlaceholders.join('\n')}

    INSTRUCTIONS:
    1. Analyze the provided data and identify missing fields
    2. Fill missing fields with realistic, professional values based on:
       - Context from existing data
       - Industry standards for ${rfxType.toUpperCase()} documents
       - Best practices for government/procurement documents
    3. Use appropriate formats:
       - Dates: YYYY-MM-DD format
       - Currency: Use appropriate currency symbols
       - Contact info: Professional format
       - Addresses: Complete, realistic addresses
       - Descriptions: Professional, detailed text
    4. Return ONLY the completed missing fields as key-value pairs
    5. List any fields that cannot be reasonably inferred
    6. Provide suggestions for improving the data quality

    Focus on creating professional, procurement-ready content that would be acceptable in a real RFX process.`;

    const result = await this.executor.invoke({
      messages: [
        new SystemMessage(
          "You are an expert in procurement and RFX document completion. Generate realistic, professional values for missing template fields based on context and industry standards."
        ),
        new HumanMessage(query),
      ],
    });

    return result.structuredResponse || {
      completedFields: {},
      missingFields: [],
    };
  }

  private getTemplateData(rfxType: string): TemplateData | undefined {
    switch (rfxType.toLowerCase()) {
      case 'rfb':
        return this.templateManager.getRFBTemplateData();
      case 'rfi':
        return this.templateManager.getRFITemplateData();
      case 'rfp':
        return this.templateManager.getRFPTemplateData();
      case 'rfq':
        return this.templateManager.getRFQTemplateData();
      default:
        return undefined;
    }
  }

  private extractPlaceholdersFromTemplate(templateData: TemplateData): string[] {
    const placeholders: string[] = [];
    
    const extractFromObject = (obj: any, prefix: string = '') => {
      if (typeof obj === 'string') {
        const doubleBracePlaceholders = obj.match(/\{\{([^}]+)\}\}/g) || [];
        const singleBracePlaceholders = obj.match(/\[([^\]]+)\]/g) || [];
        
        [...doubleBracePlaceholders, ...singleBracePlaceholders].forEach(placeholder => {
          const cleanName = placeholder.replace(/[{}[\]]/g, '');
          placeholders.push(prefix ? `${prefix}.${cleanName}` : cleanName);
        });
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          extractFromObject(item, prefix ? `${prefix}[${index}]` : `[${index}]`);
        });
      } else if (typeof obj === 'object' && obj !== null) {
        Object.entries(obj).forEach(([key, value]) => {
          extractFromObject(value, prefix ? `${prefix}.${key}` : key);
        });
      }
    };

    extractFromObject(templateData);
    return placeholders;
  }

  async healthCheck(): Promise<boolean> {
    const res = await this.model.invoke("Say OK");
    return res.content.toString().includes("OK");
  }
}