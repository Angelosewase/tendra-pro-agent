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
  PlaceholderValues,
} from "./tools/fill-placeholders";
import { ClausePolicyGenerator } from "./tools/clause-policy-generator";
import { SpecsGenerator } from "./tools/specs-generator";

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
  generatedSpecifications?: any[];
  generatedDeliverables?: any[];
  applicableStandards?: any[];
  generatedClauses?: any[];
  generatedPolicies?: any[];
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
  private clausePolicyGenerator: ClausePolicyGenerator;
  private specsGenerator: SpecsGenerator;

  constructor() {
    console.log("🚀 [INIT] Initializing RFXAutomationAgent");
    this.graph = new StateGraph(RFXAutomationStateSchema);
    this.templateManager = new TemplateManager();
    this.fileGenerator = new FileGenerator();
    this.placeholderFiller = new PlaceholderFiller(this.templateManager);
    this.clausePolicyGenerator = new ClausePolicyGenerator();
    this.specsGenerator = new SpecsGenerator();

    this.setupNodes();
    this.setupEdges();
    console.log("✅ [INIT] RFXAutomationAgent initialized successfully");
  }

  private setupNodes() {
    console.log("🔧 [SETUP] Setting up graph nodes");
    this.graph.addNode("validate_request", this.validateRequest.bind(this));
    this.graph.addNode(
      "generate_specifications",
      this.generateSpecifications.bind(this),
    );
    this.graph.addNode("generate_clauses", this.generateClauses.bind(this));
    this.graph.addNode("prepare_template", this.prepareTemplate.bind(this));
    this.graph.addNode("generate_document", this.generateDocument.bind(this));
    this.graph.addNode("finalize_result", this.finalizeResult.bind(this));
    console.log("✅ [SETUP] All nodes configured");
  }

  private setupEdges() {
    console.log("🔧 [SETUP] Setting up graph edges");
    this.graph.addEdge(START, "validate_request" as any);
    this.graph.addEdge(
      "validate_request" as any,
      "generate_specifications" as any,
    );
    this.graph.addEdge(
      "generate_specifications" as any,
      "generate_clauses" as any,
    );
    this.graph.addEdge("generate_clauses" as any, "prepare_template" as any);
    this.graph.addEdge("prepare_template" as any, "generate_document" as any);
    this.graph.addEdge("generate_document" as any, "finalize_result" as any);
    this.graph.addEdge("finalize_result" as any, END);
    console.log("✅ [SETUP] All edges configured");
  }

  private async validateRequest(
    state: RFXAutomationState,
  ): Promise<Partial<RFXAutomationState>> {
    console.log("\n" + "=".repeat(60));
    console.log("📋 [VALIDATE] Starting request validation");
    console.log("=".repeat(60));

    const { request } = state;
    console.log(`📄 [VALIDATE] Document Type: ${request.documentType}`);
    console.log(`📄 [VALIDATE] Title: ${request.title}`);
    console.log(`📄 [VALIDATE] Agency: ${request.agencyName}`);

    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate document type
      const validTypes = ["rfb", "rfi", "rfp", "rfq"];
      console.log(
        `🔍 [VALIDATE] Checking document type against valid types: ${validTypes.join(", ")}`,
      );

      if (!validTypes.includes(request.documentType)) {
        const error = `Invalid document type. Must be one of: ${validTypes.join(", ")}`;
        console.log(`❌ [VALIDATE] ${error}`);
        errors.push(error);
      } else {
        console.log(`✅ [VALIDATE] Document type is valid`);
      }

      // Check if template exists for the document type
      console.log(
        `🔍 [VALIDATE] Checking if template exists for: ${request.documentType}`,
      );
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
        console.log(`🔍 [VALIDATE] Converting request to placeholders`);
        const placeholderValues = this.convertRequestToPlaceholders(request);
        console.log(
          `📊 [VALIDATE] Placeholder count: ${Object.keys(placeholderValues).length}`,
        );

        console.log(`🔍 [VALIDATE] Validating placeholder values`);
        const validation = this.validatePlaceholderValues(
          request.documentType,
          placeholderValues,
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

      if (isValid) {
        console.log(`✅ [VALIDATE] ${message}`);
      } else {
        console.log(`❌ [VALIDATE] ${message}`);
        errors.forEach((err) => console.log(`   ❌ ${err}`));
      }

      if (warnings.length > 0) {
        console.log(`⚠️  [VALIDATE] Warnings: ${warnings.length}`);
        warnings.forEach((warn) => console.log(`   ⚠️  ${warn}`));
      }

      console.log("=".repeat(60) + "\n");

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

  private async generateSpecifications(
    state: RFXAutomationState,
  ): Promise<Partial<RFXAutomationState>> {
    console.log("\n" + "=".repeat(60));
    console.log("🤖 [SPECS-AI] Starting AI specification generation");
    console.log("=".repeat(60));

    const { request } = state;

    try {
      console.log(`🔧 [SPECS-AI] Initializing specs generator`);
      await this.specsGenerator.initialize();
      console.log(`✅ [SPECS-AI] Specs generator initialized`);

      console.log(`🤖 [SPECS-AI] Calling AI to generate specifications...`);
      console.log(`📄 [SPECS-AI] Request type: ${request.documentType}`);
      console.log(
        `📄 [SPECS-AI] Requirements provided: ${JSON.stringify(request.requirements).substring(0, 100)}...`,
      );

      const specsResult =
        await this.specsGenerator.generateFromRFXRequest(request);

      console.log(`✅ [SPECS-AI] AI generation completed`);
      console.log(
        `📊 [SPECS-AI] Generated ${specsResult.specifications.length} specifications`,
      );
      console.log(
        `📊 [SPECS-AI] Generated ${specsResult.deliverables.length} deliverables`,
      );
      console.log(
        `📊 [SPECS-AI] Generated ${specsResult.standards.length} standards`,
      );

      // Log first few items for verification
      if (specsResult.specifications.length > 0) {
        console.log(
          `📝 [SPECS-AI] Sample specification:`,
          specsResult.specifications[0],
        );
      }

      const updatedRequest = {
        ...request,
        generatedSpecifications: specsResult.specifications,
        generatedDeliverables: specsResult.deliverables,
        applicableStandards: specsResult.standards,
      };

      console.log(`✅ [SPECS-AI] Request updated with generated content`);

      const message = `Generated ${specsResult.specifications.length} specifications, ${specsResult.deliverables.length} deliverables, and ${specsResult.standards.length} standards`;
      console.log(`📋 [SPECS-AI] ${message}`);
      console.log("=".repeat(60) + "\n");

      return {
        request: updatedRequest,
        messages: [...state.messages, new SystemMessage(message)],
      };
    } catch (error) {
      console.log(
        `❌ [SPECS-AI] Error during specification generation: ${error}`,
      );
      console.log("=".repeat(60) + "\n");

      return {
        result: {
          success: false,
          errors: [`Specifications generation error: ${error}`],
          warnings: [],
        },
        messages: [
          ...state.messages,
          new SystemMessage(`Error generating specifications: ${error}`),
        ],
      };
    }
  }

  private async generateClauses(
    state: RFXAutomationState,
  ): Promise<Partial<RFXAutomationState>> {
    console.log("\n" + "=".repeat(60));
    console.log("🤖 [CLAUSES-AI] Starting AI clause generation");
    console.log("=".repeat(60));

    const { request } = state;

    try {
      console.log(`🔧 [CLAUSES-AI] Initializing clause generator`);
      await this.clausePolicyGenerator.initialize();
      console.log(`✅ [CLAUSES-AI] Clause generator initialized`);

      console.log(
        `🤖 [CLAUSES-AI] Calling AI to generate clauses and policies...`,
      );
      console.log(`📄 [CLAUSES-AI] Request type: ${request.documentType}`);

      const clausesResult =
        await this.clausePolicyGenerator.generateFromRFXRequest(request);

      console.log(`✅ [CLAUSES-AI] AI generation completed`);
      console.log(
        `📊 [CLAUSES-AI] Generated ${clausesResult.clauses.length} clauses`,
      );
      console.log(
        `📊 [CLAUSES-AI] Generated ${clausesResult.policies.length} policies`,
      );

      // Log first few items for verification
      if (clausesResult.clauses.length > 0) {
        console.log(`📝 [CLAUSES-AI] Sample clause:`, clausesResult.clauses[0]);
      }

      const updatedRequest = {
        ...request,
        generatedClauses: clausesResult.clauses,
        generatedPolicies: clausesResult.policies,
      };

      console.log(`✅ [CLAUSES-AI] Request updated with generated content`);

      const message = `Generated ${clausesResult.clauses.length} clauses and ${clausesResult.policies.length} policies`;
      console.log(`📋 [CLAUSES-AI] ${message}`);
      console.log("=".repeat(60) + "\n");

      return {
        request: updatedRequest,
        messages: [...state.messages, new SystemMessage(message)],
      };
    } catch (error) {
      console.log(`❌ [CLAUSES-AI] Error during clause generation: ${error}`);
      console.log("=".repeat(60) + "\n");

      return {
        result: {
          success: false,
          errors: [`Clause generation error: ${error}`],
          warnings: [],
        },
        messages: [
          ...state.messages,
          new SystemMessage(`Error generating clauses: ${error}`),
        ],
      };
    }
  }

  private async prepareTemplate(
    state: RFXAutomationState,
  ): Promise<Partial<RFXAutomationState>> {
    console.log("\n" + "=".repeat(60));
    console.log("📝 [TEMPLATE] Starting template preparation");
    console.log("=".repeat(60));

    const { request } = state;

    try {
      console.log(`🔍 [TEMPLATE] Converting request to placeholder values`);
      const placeholderValues = this.convertRequestToPlaceholders(request);

      console.log(
        `📊 [TEMPLATE] Total placeholders: ${Object.keys(placeholderValues).length}`,
      );
      console.log(
        `📊 [TEMPLATE] Placeholder keys:`,
        Object.keys(placeholderValues).slice(0, 10).join(", "),
        "...",
      );

      console.log(`🔍 [TEMPLATE] Validating placeholder values`);
      const validation = this.validatePlaceholderValues(
        request.documentType,
        placeholderValues,
      );

      console.log(
        `📊 [TEMPLATE] Validation result: ${validation.valid ? "VALID" : "INVALID"}`,
      );
      console.log(`📊 [TEMPLATE] Errors: ${validation.errors.length}`);
      console.log(
        `📊 [TEMPLATE] Suggestions: ${validation.suggestions.length}`,
      );

      if (!validation.valid) {
        validation.errors.forEach((err) => console.log(`   ❌ ${err}`));
      }

      if (validation.suggestions.length > 0) {
        validation.suggestions.forEach((sug) => console.log(`   ⚠️  ${sug}`));
      }

      const message = validation.valid
        ? `Template preparation completed for ${request.documentType.toUpperCase()}`
        : `Template preparation has validation issues`;

      console.log(`📋 [TEMPLATE] ${message}`);
      console.log("=".repeat(60) + "\n");

      return {
        messages: [...state.messages, new SystemMessage(message)],
      };
    } catch (error) {
      console.log(`❌ [TEMPLATE] Error during template preparation: ${error}`);
      console.log("=".repeat(60) + "\n");

      return {
        result: {
          success: false,
          errors: [`Template preparation error: ${error}`],
          warnings: [],
        },
        messages: [
          ...state.messages,
          new SystemMessage(`Error preparing template: ${error}`),
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
      console.log(`🔍 [DOCUMENT] Converting request to placeholders`);
      const placeholderValues = this.convertRequestToPlaceholders(request);
      console.log(
        `📊 [DOCUMENT] Base placeholder count: ${Object.keys(placeholderValues).length}`,
      );

      // Log AI-generated content status
      console.log(`\n🤖 [DOCUMENT] Checking AI-generated content:`);
      console.log(
        `   📊 Generated Specifications: ${request.generatedSpecifications?.length || 0}`,
      );
      console.log(
        `   📊 Generated Deliverables: ${request.generatedDeliverables?.length || 0}`,
      );
      console.log(
        `   📊 Applicable Standards: ${request.applicableStandards?.length || 0}`,
      );
      console.log(
        `   📊 Generated Clauses: ${request.generatedClauses?.length || 0}`,
      );
      console.log(
        `   📊 Generated Policies: ${request.generatedPolicies?.length || 0}`,
      );

      // Check if AI content exists in placeholders
      console.log(`\n🔍 [DOCUMENT] Checking placeholder keys for AI content:`);
      const aiKeys = Object.keys(placeholderValues).filter(
        (key) => key.includes("generated") || key.includes("applicable"),
      );
      console.log(`   📊 AI-related keys found: ${aiKeys.length}`);
      if (aiKeys.length > 0) {
        console.log(`   🔑 Keys:`, aiKeys.join(", "));
      }

      console.log(`\n📝 [DOCUMENT] Generating filename`);
      const filename = `${request.documentType}_${request.title.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      console.log(`📝 [DOCUMENT] Filename: ${filename}`);

      console.log(`\n🔨 [DOCUMENT] Calling file generator to create PDF`);
      console.log(`   📄 Document type: ${request.documentType}`);
      console.log(
        `   📊 Placeholder count: ${Object.keys(placeholderValues).length}`,
      );

      const generationResult =
        await this.fileGenerator.generatePDFFromUserInput(
          request.documentType,
          placeholderValues,
          filename,
        );

      console.log(`\n📊 [DOCUMENT] Generation result received:`);
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
        console.log(`\n❌ [DOCUMENT] Generation errors:`);
        generationResult.fillResult.errors.forEach((err: Error) =>
          console.log(`   ❌ ${err}`),
        );
      }

      if (
        generationResult.fillResult?.warnings &&
        generationResult.fillResult.warnings.length > 0
      ) {
        console.log(`\n⚠️  [DOCUMENT] Generation warnings:`);
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

      console.log(`\n📋 [DOCUMENT] ${message}`);
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

  private convertRequestToPlaceholders(request: RFXRequest): PlaceholderValues {
    console.log(`🔄 [CONVERT] Converting request to placeholders`);
    const placeholders: PlaceholderValues = {};

    const flattenObject = (obj: any, prefix: string = "") => {
      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (value && typeof value === "object" && !Array.isArray(value)) {
          flattenObject(value, fullKey);
        } else if (Array.isArray(value)) {
          placeholders[fullKey] = value.join(", ");
          console.log(
            `   📝 [CONVERT] Array ${fullKey}: ${value.length} items`,
          );
        } else if (value !== null && value !== undefined) {
          placeholders[fullKey] = value;
          console.log(`   📝 [CONVERT] ${fullKey}: ${typeof value}`);
        }
      });
    };

    flattenObject(request);

    console.log(
      `✅ [CONVERT] Converted ${Object.keys(placeholders).length} placeholders`,
    );
    return placeholders;
  }

  private validatePlaceholderValues(
    documentType: string,
    values: PlaceholderValues,
  ): { valid: boolean; errors: string[]; suggestions: string[] } {
    console.log(`🔍 [VALIDATE-PH] Validating placeholders for ${documentType}`);

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
    console.log(`📄 [RUN] Document Type: ${input.request.documentType}`);
    console.log(`📄 [RUN] Title: ${input.request.title}`);
    console.log(`📄 [RUN] Agency: ${input.request.agencyName}`);
    console.log("=".repeat(80) + "\n");

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

  // Utility methods for external access
  public getAvailableTemplates(): string[] {
    console.log(`📋 [UTILS] Getting available templates`);
    const templates = this.templateManager
      .getAllTemplates()
      .map((t) => t.templateId);
    console.log(
      `📋 [UTILS] Found ${templates.length} templates: ${templates.join(", ")}`,
    );
    return templates;
  }

  public getTemplatePlaceholders(documentType: string): string[] {
    console.log(`📋 [UTILS] Getting placeholders for ${documentType}`);
    let placeholders: string[] = [];

    switch (documentType) {
      case "rfb":
        placeholders = this.placeholderFiller.getRFBPlaceholders();
        break;
      case "rfi":
        placeholders = this.placeholderFiller.getRFIPlaceholders();
        break;
      case "rfp":
        placeholders = this.placeholderFiller.getRFPPlaceholders();
        break;
      case "rfq":
        placeholders = this.placeholderFiller.getRFQPlaceholders();
        break;
      default:
        placeholders = [];
    }

    console.log(`📋 [UTILS] Found ${placeholders.length} placeholders`);
    return placeholders;
  }

  public validateRFXRequest(request: RFXRequest): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    console.log(`🔍 [VALIDATE-REQ] Validating RFX request`);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!request.documentType) {
      errors.push("Document type is required");
    }
    if (!request.title) {
      errors.push("Title is required");
    }
    if (!request.agencyName) {
      errors.push("Agency name is required");
    }
    if (!request.issuedDate) {
      errors.push("Issued date is required");
    }
    if (!request.responsesDue) {
      errors.push("Responses due date is required");
    }

    const validTypes = ["rfb", "rfi", "rfp", "rfq"];
    if (request.documentType && !validTypes.includes(request.documentType)) {
      errors.push(
        `Invalid document type. Must be one of: ${validTypes.join(", ")}`,
      );
    }

    console.log(
      `${errors.length === 0 ? "✅" : "❌"} [VALIDATE-REQ] Validation ${errors.length === 0 ? "passed" : "failed"} (${errors.length} errors)`,
    );

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Public methods to access the AI agents
  public async generateSpecificationsForRequest(request: RFXRequest) {
    console.log(`🤖 [API] Generating specifications for request`);
    await this.specsGenerator.initialize();
    const result = await this.specsGenerator.generateFromRFXRequest(request);
    console.log(
      `✅ [API] Generated ${result.specifications.length} specifications`,
    );
    return result;
  }

  public async generateClausesForRequest(request: RFXRequest) {
    console.log(`🤖 [API] Generating clauses for request`);
    await this.clausePolicyGenerator.initialize();
    const result =
      await this.clausePolicyGenerator.generateFromRFXRequest(request);
    console.log(`✅ [API] Generated ${result.clauses.length} clauses`);
    return result;
  }

  public async validateClause(clauseContent: string, context: any) {
    console.log(`🔍 [API] Validating clause`);
    await this.clausePolicyGenerator.initialize();
    return await this.clausePolicyGenerator.validateClause(
      clauseContent,
      context,
    );
  }

  public async validateSpecification(spec: string, context: any) {
    console.log(`🔍 [API] Validating specification`);
    await this.specsGenerator.initialize();
    return await this.specsGenerator.validateSpecification(spec, context);
  }

  public async healthCheck(): Promise<{ specs: boolean; clauses: boolean }> {
    console.log(`🏥 [HEALTH] Running health check`);
    const [specsHealth, clausesHealth] = await Promise.all([
      this.specsGenerator.healthCheck(),
      this.clausePolicyGenerator.healthCheck(),
    ]);

    console.log(
      `📊 [HEALTH] Specs generator: ${specsHealth ? "✅ OK" : "❌ FAILED"}`,
    );
    console.log(
      `📊 [HEALTH] Clauses generator: ${clausesHealth ? "✅ OK" : "❌ FAILED"}`,
    );

    return {
      specs: specsHealth,
      clauses: clausesHealth,
    };
  }
}

export const rfxAutomationAgent = new RFXAutomationAgent();
