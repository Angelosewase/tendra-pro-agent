import { StateGraph, END, START } from "@langchain/langgraph";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { z } from "zod";
import { TemplateManager } from "./tools/template-manager";
import { FileGenerator } from "./tools/file-generator";
import {
  PlaceholderFiller,
  PlaceholderValues as ValuesI,
} from "./tools/fill-placeholders";
import { TemplateCompleter } from "./tools/template-completer";

export interface RFXRequest {
  documentType: "rfb" | "rfi" | "rfp" | "rfq";
  title: string;
  agencyName: string;
  agencyLogo?: string;
  issuedDate: string;
  responsesDue: string;
  requirements: Record<string, any>;
  specifications?: string[];
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  timeline?: string;
  location?: string;
  completedValuesI?: Record<string, any>;
}

export interface RFXDocument {
  documentType: string;
  title: string;
  content: any;
  filePath?: string;
  generatedAt: string;
}

export interface RFXResult {
  success: boolean;
  document?: RFXDocument;
  errors: string[];
  warnings: string[];
  validationResults?: any;
}

export const RFXAutomationStateSchema = z.object({
  messages: z.array(z.any()),
  request: z.custom<RFXRequest>(),
  document: z.custom<RFXDocument>().optional(),
  result: z.custom<RFXResult>().optional(),
});

export type RFXAutomationState = z.infer<typeof RFXAutomationStateSchema>;

export class RFXAutomationAgent {
  private graph: StateGraph<RFXAutomationState>;
  private templateManager: TemplateManager;
  private fileGenerator: FileGenerator;
  private placeholderFiller: PlaceholderFiller;
  private templateCompleter: TemplateCompleter;

  constructor() {
    this.graph = new StateGraph(RFXAutomationStateSchema);
    this.templateManager = new TemplateManager();
    this.fileGenerator = new FileGenerator();
    this.placeholderFiller = new PlaceholderFiller(this.templateManager);
    this.templateCompleter = new TemplateCompleter();

    this.setupNodes();
    this.setupEdges();
    console.log("✅ [INIT] RFXAutomationAgent initialized successfully");
  }

  private setupNodes() {
    this.graph.addNode("validate_request", this.validateRequest.bind(this));
    this.graph.addNode("complete_template", this.completeTemplate.bind(this));
    this.graph.addNode("generate_document", this.generateDocument.bind(this));
    this.graph.addNode("finalize_result", this.finalizeResult.bind(this));
    console.log("✅ [SETUP] All nodes configured");
  }

  private setupEdges() {
    this.graph.addEdge(START, "validate_request" as any);
    this.graph.addEdge("validate_request" as any, "complete_template" as any);
    this.graph.addEdge("complete_template" as any, "generate_document" as any);
    this.graph.addEdge("generate_document" as any, "finalize_result" as any);
    this.graph.addEdge("finalize_result" as any, END);
  }

  private async validateRequest(
    state: RFXAutomationState,
  ): Promise<Partial<RFXAutomationState>> {
    console.log("\n" + "=".repeat(60));
    console.log("📋 [VALIDATE] Starting request validation");
    console.log("=".repeat(60));

    const { request } = state;

    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate document type
      const validTypes = ["rfb", "rfi", "rfp", "rfq"];
      if (!validTypes.includes(request.documentType)) {
        const error = `Invalid document type. Must be one of: ${validTypes.join(", ")}`;
        console.log(`❌ [VALIDATE] ${error}`);
        errors.push(error);
      } else {
        console.log(`✅ [VALIDATE] Document type is valid`);
      }

      const templateExists = this.checkTemplateExists(request.documentType);

      if (!templateExists) {
        const error = `Template not found for document type: ${request.documentType}`;
        console.log(`❌ [VALIDATE] ${error}`);
        errors.push(error);
      } else {
        console.log(`✅ [VALIDATE] Template found for ${request.documentType}`);
      }

      // Use existing template validation logic
      if (templateExists) {
        const keyValuePairs = this.convertRequestToKeyobjectValue(request);
        console.log(
          `📊 [VALIDATE] request object values count: ${Object.keys(keyValuePairs).length}`,
        );

        const validation = this.validateValues(
          request.documentType,
          keyValuePairs,
        );

        console.log(
          `📊 [VALIDATE] Validation errors: ${validation.errors.length}`,
        );
        console.log(
          `📊 [VALIDATE] Validation suggestions: ${validation.suggestions.length}`,
        );

        errors.push(...validation.errors);
        warnings.push(...validation.suggestions);
      }

      const isValid = errors.length === 0;
      const message = isValid
        ? `Request validation passed for ${request.documentType.toUpperCase()} document`
        : `Request validation failed with ${errors.length} error(s)`;

      return {
        result: {
          success: isValid,
          errors,
          warnings,
          validationResults: { isValid, errors, warnings },
        },
        messages: [...state.messages, new SystemMessage(message)],
      };
    } catch (error) {
      console.log(`❌ [VALIDATE] Exception occurred: ${error}`);
      console.log("=".repeat(60) + "\n");

      return {
        result: {
          success: false,
          errors: [`Validation error: ${error}`],
          warnings: [],
        },
        messages: [
          ...state.messages,
          new SystemMessage(`Error validating request: ${error}`),
        ],
      };
    }
  }

  private async completeTemplate(
    state: RFXAutomationState,
  ): Promise<Partial<RFXAutomationState>> {
    console.log("\n" + "=".repeat(60));
    console.log("🤖 [TEMPLATE-AI] Starting AI template completion");
    console.log("=".repeat(60));

    const { request } = state;

    try {
      await this.templateCompleter.initialize();

      const keyValuePairs = this.convertRequestToKeyobjectValue(request);
      const completionResult = await this.templateCompleter.completeTemplate(
        keyValuePairs,
        request.documentType,
      );

      // Merge completed fields with original data
      const completedKeyValuePairs = {
        ...keyValuePairs,
        ...completionResult.completedFields,
      };

      const message = `Completed template with ${Object.keys(completionResult.completedFields).length} filled fields using AI`;

      return {
        request: {
          ...request,
          completedValuesI: completedKeyValuePairs,
        },
        messages: [...state.messages, new SystemMessage(message)],
      };
    } catch (error) {
      console.log(
        `❌ [TEMPLATE-AI] Error during template completion: ${error}`,
      );
      console.log("=".repeat(60) + "\n");

      return {
        result: {
          success: false,
          errors: [`Template completion error: ${error}`],
          warnings: [],
        },
        messages: [
          ...state.messages,
          new SystemMessage(`Error completing template: ${error}`),
        ],
      };
    }
  }

  private async generateDocument(
    state: RFXAutomationState,
  ): Promise<Partial<RFXAutomationState>> {
    console.log("\n" + "=".repeat(60));
    console.log("📄 [DOCUMENT] Starting document generation");
    console.log("=".repeat(60));

    const { request } = state;

    try {
      // Use completed key-value pairs from template completion step
      const keyValuePairs =
        (request as any).completedValuesI ||
        this.convertRequestToKeyobjectValue(request);

      console.log(
        `📊 [DOCUMENT] Key-value count: ${Object.keys(keyValuePairs).length}`,
      );

      console.log(`📝 [DOCUMENT] Generating filename`);
      const filename = `${request.documentType}_${request.title.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      console.log(`📝 [DOCUMENT] Filename: ${filename}`);

      console.log(`🔨 [DOCUMENT] Calling file generator to create PDF`);
      console.log(`   📄 Document type: ${request.documentType}`);
      console.log(
        `   📊 Key-value count: ${Object.keys(keyValuePairs).length}`,
      );

      const generationResult =
        await this.fileGenerator.generatePDFFromUserInput(
          request.documentType,
          keyValuePairs,
          filename,
        );

      console.log(`📊 [DOCUMENT] Generation result received:`);
      console.log(`   ✅ Success: ${generationResult.success}`);
      console.log(`   📁 File path: ${generationResult.filePath || "N/A"}`);
      console.log(
        `   ❌ Errors: ${generationResult.fillResult?.errors?.length || 0}`,
      );
      console.log(
        `   ⚠️  Warnings: ${generationResult.fillResult?.warnings?.length || 0}`,
      );

      if (
        generationResult.fillResult?.errors &&
        generationResult.fillResult.errors.length > 0
      ) {
        console.log(`❌ [DOCUMENT] Generation errors:`);
        generationResult.fillResult.errors.forEach((err: Error) =>
          console.log(`   ❌ ${err}`),
        );
      }

      if (
        generationResult.fillResult?.warnings &&
        generationResult.fillResult.warnings.length > 0
      ) {
        console.log(`⚠️  [DOCUMENT] Generation warnings:`);
        generationResult.fillResult.warnings.forEach((warn: any) =>
          console.log(`   ⚠️  ${warn}`),
        );
      }

      const document: RFXDocument = {
        documentType: request.documentType,
        title: request.title,
        content: generationResult.fillResult?.filledData || {},
        filePath: generationResult.filePath,
        generatedAt: new Date().toISOString(),
      };

      const message = generationResult.success
        ? `${request.documentType.toUpperCase()} document generated successfully: ${filename}`
        : `Failed to generate ${request.documentType.toUpperCase()} document`;

      console.log(`📋 [DOCUMENT] ${message}`);
      console.log("=".repeat(60) + "\n");

      return {
        document,
        result: {
          success: generationResult.success,
          document,
          errors: generationResult.fillResult?.errors || [],
          warnings: generationResult.fillResult?.warnings || [],
        },
        messages: [...state.messages, new SystemMessage(message)],
      };
    } catch (error) {
      console.log(
        `❌ [DOCUMENT] Exception during document generation: ${error}`,
      );
      console.log("=".repeat(60) + "\n");

      return {
        result: {
          success: false,
          errors: [`Document generation error: ${error}`],
          warnings: [],
        },
        messages: [
          ...state.messages,
          new SystemMessage(`Error generating document: ${error}`),
        ],
      };
    }
  }

  private async finalizeResult(
    state: RFXAutomationState,
  ): Promise<Partial<RFXAutomationState>> {
    console.log("\n" + "=".repeat(60));
    console.log("🏁 [FINALIZE] Finalizing automation results");
    console.log("=".repeat(60));

    const { result, document } = state;

    const summaryMessage = result?.success
      ? `RFX automation completed successfully. Generated ${document?.documentType?.toUpperCase()} document: ${document?.title}`
      : `RFX automation completed with errors`;

    console.log(
      `📊 [FINALIZE] Final status: ${result?.success ? "SUCCESS" : "FAILED"}`,
    );

    if (document) {
      console.log(`📄 [FINALIZE] Document type: ${document.documentType}`);
      console.log(`📄 [FINALIZE] Document title: ${document.title}`);
      console.log(`📁 [FINALIZE] File path: ${document.filePath || "N/A"}`);
      console.log(`📅 [FINALIZE] Generated at: ${document.generatedAt}`);
    }

    if (result?.errors && result.errors.length > 0) {
      console.log(`❌ [FINALIZE] Total errors: ${result.errors.length}`);
      result.errors.forEach((err) => console.log(`   ❌ ${err}`));
    }

    if (result?.warnings && result.warnings.length > 0) {
      console.log(`⚠️  [FINALIZE] Total warnings: ${result.warnings.length}`);
      result.warnings.forEach((warn) => console.log(`   ⚠️  ${warn}`));
    }

    console.log(`\n📋 [FINALIZE] ${summaryMessage}`);
    console.log("=".repeat(60) + "\n");

    return {
      messages: [...state.messages, new SystemMessage(summaryMessage)],
    };
  }

  private checkTemplateExists(documentType: string): boolean {
    console.log(`🔍 [CHECK] Checking template existence for: ${documentType}`);
    let exists = false;

    switch (documentType) {
      case "rfb":
        exists = !!this.templateManager.getRFBTemplate();
        break;
      case "rfi":
        exists = !!this.templateManager.getRFITemplate();
        break;
      case "rfp":
        exists = !!this.templateManager.getRFPTemplate();
        break;
      case "rfq":
        exists = !!this.templateManager.getRFQTemplate();
        break;
      default:
        exists = false;
    }

    console.log(
      `${exists ? "✅" : "❌"} [CHECK] Template ${exists ? "found" : "not found"} for ${documentType}`,
    );
    return exists;
  }

  private convertRequestToKeyobjectValue(request: RFXRequest): ValuesI {
    console.log(`🔄 [CONVERT] Converting request to key-value pairs`);
    const keyValuePairs: ValuesI = {};

    const flattenObject = (obj: any, prefix: string = "") => {
      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (value && typeof value === "object" && !Array.isArray(value)) {
          flattenObject(value, fullKey);
        } else if (Array.isArray(value)) {
          keyValuePairs[fullKey] = value.join(", ");
          console.log(
            `   📝 [CONVERT] Array ${fullKey}: ${value.length} items`,
          );
        } else if (value !== null && value !== undefined) {
          keyValuePairs[fullKey] = value;
          console.log(`   📝 [CONVERT] ${fullKey}: ${typeof value}`);
        }
      });
    };

    flattenObject(request);

    console.log(
      `✅ [CONVERT] Converted ${Object.keys(keyValuePairs).length} key-value pairs`,
    );
    return keyValuePairs;
  }

  private validateValues(
    documentType: string,
    values: ValuesI,
  ): { valid: boolean; errors: string[]; suggestions: string[] } {
    console.log(`🔍 [VALIDATE-PH] Validating values for ${documentType}`);

    let result;
    switch (documentType) {
      case "rfb":
        result = this.placeholderFiller.validateRFBValues(values);
        break;
      case "rfi":
        result = this.placeholderFiller.validateRFIValues(values);
        break;
      case "rfp":
        result = this.placeholderFiller.validateRFPValues(values);
        break;
      case "rfq":
        result = this.placeholderFiller.validateRFQValues(values);
        break;
      default:
        result = {
          valid: false,
          errors: [`Unknown document type: ${documentType}`],
          suggestions: [],
        };
    }

    console.log(
      `${result.valid ? "✅" : "❌"} [VALIDATE-PH] Validation ${result.valid ? "passed" : "failed"}`,
    );
    return result;
  }

  public async run(input: {
    request: RFXRequest;
    messages?: BaseMessage[];
  }): Promise<RFXAutomationState> {
    console.log("\n" + "=".repeat(80));
    console.log("🚀 [RUN] STARTING RFX AUTOMATION WORKFLOW");
    console.log("=".repeat(80));

    const compiledGraph = this.graph.compile();

    const initialState: RFXAutomationState = {
      messages: input.messages || [
        new SystemMessage("Starting RFX automation process..."),
      ],
      request: input.request,
      document: undefined,
      result: undefined,
    };

    const result = await compiledGraph.invoke(initialState);

    console.log("\n" + "=".repeat(80));
    console.log("🏁 [RUN] RFX AUTOMATION WORKFLOW COMPLETED");
    console.log("=".repeat(80));
    console.log(`✅ [RUN] Success: ${(result as any).result?.success}`);
    console.log(
      `📄 [RUN] Document Generated: ${result.document ? "YES" : "NO"}`,
    );
    console.log(
      `❌ [RUN] Errors: ${(result as any).result?.errors?.length || 0}`,
    );
    console.log(
      `⚠️  [RUN] Warnings: ${(result as any).result?.warnings?.length || 0}`,
    );
    console.log("=".repeat(80) + "\n");

    return result as RFXAutomationState;
  }

  public async healthCheck(): Promise<{ template: boolean }> {
    const templateHealth = await this.templateCompleter.healthCheck();

    return {
      template: templateHealth,
    };
  }
}

export const rfxAutomationAgent = new RFXAutomationAgent();
