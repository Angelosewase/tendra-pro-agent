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
    this.graph = new StateGraph(RFXAutomationStateSchema);
    this.templateManager = new TemplateManager();
    this.fileGenerator = new FileGenerator();
    this.placeholderFiller = new PlaceholderFiller(this.templateManager);
    this.clausePolicyGenerator = new ClausePolicyGenerator();
    this.specsGenerator = new SpecsGenerator();

    this.setupNodes();
    this.setupEdges();
  }

  private setupNodes() {
    this.graph.addNode("validate_request", this.validateRequest.bind(this));
    this.graph.addNode("generate_specifications", this.generateSpecifications.bind(this));
    this.graph.addNode("generate_clauses", this.generateClauses.bind(this));
    this.graph.addNode("prepare_template", this.prepareTemplate.bind(this));
    this.graph.addNode("generate_document", this.generateDocument.bind(this));
    this.graph.addNode("finalize_result", this.finalizeResult.bind(this));
  }

  private setupEdges() {
    this.graph.addEdge(START, "validate_request" as any);
    this.graph.addEdge("validate_request" as any, "generate_specifications" as any);
    this.graph.addEdge("generate_specifications" as any, "generate_clauses" as any);
    this.graph.addEdge("generate_clauses" as any, "prepare_template" as any);
    this.graph.addEdge("prepare_template" as any, "generate_document" as any);
    this.graph.addEdge("generate_document" as any, "finalize_result" as any);
    this.graph.addEdge("finalize_result" as any, END);
  }

  private async validateRequest(
    state: RFXAutomationState,
  ): Promise<Partial<RFXAutomationState>> {
    const { request } = state;

    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate document type
      const validTypes = ["rfb", "rfi", "rfp", "rfq"];
      if (!validTypes.includes(request.documentType)) {
        errors.push(
          `Invalid document type. Must be one of: ${validTypes.join(", ")}`,
        );
      }

      // Check if template exists for the document type
      const templateExists = this.checkTemplateExists(request.documentType);
      if (!templateExists) {
        errors.push(
          `Template not found for document type: ${request.documentType}`,
        );
      }

      // Use existing template validation logic
      if (templateExists) {
        const placeholderValues = this.convertRequestToPlaceholders(request);
        const validation = this.validatePlaceholderValues(
          request.documentType,
          placeholderValues,
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
    const { request } = state;

    try {
      // Initialize the specs generator if not already done
      await this.specsGenerator.initialize();

      // Generate specifications based on the RFX request
      const specsResult = await this.specsGenerator.generateFromRFXRequest(request);

      // Update the request with generated specifications
      const updatedRequest = {
        ...request,
        generatedSpecifications: specsResult.specifications,
        generatedDeliverables: specsResult.deliverables,
        applicableStandards: specsResult.standards,
      };

      const message = `Generated ${specsResult.specifications.length} specifications, ${specsResult.deliverables.length} deliverables, and ${specsResult.standards.length} standards`;

      return {
        request: updatedRequest,
        messages: [...state.messages, new SystemMessage(message)],
      };
    } catch (error) {
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
    const { request } = state;

    try {
      // Initialize the clause generator if not already done
      await this.clausePolicyGenerator.initialize();

      // Generate clauses based on the RFX request
      const clausesResult = await this.clausePolicyGenerator.generateFromRFXRequest(request);

      // Update the request with generated clauses and policies
      const updatedRequest = {
        ...request,
        generatedClauses: clausesResult.clauses,
        generatedPolicies: clausesResult.policies,
      };

      const message = `Generated ${clausesResult.clauses.length} clauses and ${clausesResult.policies.length} policies`;

      return {
        request: updatedRequest,
        messages: [...state.messages, new SystemMessage(message)],
      };
    } catch (error) {
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
    const { request } = state;

    try {
      // Convert request to placeholder values
      const placeholderValues = this.convertRequestToPlaceholders(request);

      // Validate placeholder values against template
      const validation = this.validatePlaceholderValues(
        request.documentType,
        placeholderValues,
      );

      const message = validation.valid
        ? `Template preparation completed for ${request.documentType.toUpperCase()}`
        : `Template preparation has validation issues`;

      return {
        messages: [...state.messages, new SystemMessage(message)],
      };
    } catch (error) {
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
    const { request } = state;

    try {
      // Convert request to placeholder values
      const placeholderValues = this.convertRequestToPlaceholders(request);

      // Generate filename
      const filename = `${request.documentType}_${request.title.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;

      // Generate PDF using file generator
      const generationResult =
        await this.fileGenerator.generatePDFFromUserInput(
          request.documentType,
          placeholderValues,
          filename,
        );

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
    const { result, document } = state;

    const summaryMessage = result?.success
      ? `RFX automation completed successfully. Generated ${document?.documentType?.toUpperCase()} document: ${document?.title}`
      : `RFX automation completed with errors`;

    return {
      messages: [...state.messages, new SystemMessage(summaryMessage)],
    };
  }

  private checkTemplateExists(documentType: string): boolean {
    switch (documentType) {
      case "rfb":
        return !!this.templateManager.getRFBTemplate();
      case "rfi":
        return !!this.templateManager.getRFITemplate();
      case "rfp":
        return !!this.templateManager.getRFPTemplate();
      case "rfq":
        return !!this.templateManager.getRFQTemplate();
      default:
        return false;
    }
  }

  private convertRequestToPlaceholders(request: RFXRequest): PlaceholderValues {
    const placeholders: PlaceholderValues = {};

    const flattenObject = (obj: any, prefix: string = "") => {
      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (value && typeof value === "object" && !Array.isArray(value)) {

          flattenObject(value, fullKey);
        } else if (Array.isArray(value)) {
          placeholders[fullKey] = value.join(", ");
        } else if (value !== null && value !== undefined) {
          placeholders[fullKey] = value;
        }
      });
    };

    // Flatten the entire request object
    flattenObject(request);

    return placeholders;
  }

  private validatePlaceholderValues(
    documentType: string,
    values: PlaceholderValues,
  ): { valid: boolean; errors: string[]; suggestions: string[] } {
    switch (documentType) {
      case "rfb":
        return this.placeholderFiller.validateRFBValues(values);
      case "rfi":
        return this.placeholderFiller.validateRFIValues(values);
      case "rfp":
        return this.placeholderFiller.validateRFPValues(values);
      case "rfq":
        return this.placeholderFiller.validateRFQValues(values);
      default:
        return {
          valid: false,
          errors: [`Unknown document type: ${documentType}`],
          suggestions: [],
        };
    }
  }

  public async run(input: {
    request: RFXRequest;
    messages?: BaseMessage[];
  }): Promise<RFXAutomationState> {
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
    return result as RFXAutomationState;
  }

  // Utility methods for external access
  public getAvailableTemplates(): string[] {
    return this.templateManager.getAllTemplates().map((t) => t.templateId);
  }

  public getTemplatePlaceholders(documentType: string): string[] {
    switch (documentType) {
      case "rfb":
        return this.placeholderFiller.getRFBPlaceholders();
      case "rfi":
        return this.placeholderFiller.getRFIPlaceholders();
      case "rfp":
        return this.placeholderFiller.getRFPPlaceholders();
      case "rfq":
        return this.placeholderFiller.getRFQPlaceholders();
      default:
        return [];
    }
  }

  public validateRFXRequest(request: RFXRequest): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
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

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Public methods to access the AI agents
  public async generateSpecificationsForRequest(request: RFXRequest) {
    await this.specsGenerator.initialize();
    return await this.specsGenerator.generateFromRFXRequest(request);
  }

  public async generateClausesForRequest(request: RFXRequest) {
    await this.clausePolicyGenerator.initialize();
    return await this.clausePolicyGenerator.generateFromRFXRequest(request);
  }

  public async validateClause(clauseContent: string, context: any) {
    await this.clausePolicyGenerator.initialize();
    return await this.clausePolicyGenerator.validateClause(clauseContent, context);
  }

  public async validateSpecification(spec: string, context: any) {
    await this.specsGenerator.initialize();
    return await this.specsGenerator.validateSpecification(spec, context);
  }

  public async healthCheck(): Promise<{ specs: boolean; clauses: boolean }> {
    const [specsHealth, clausesHealth] = await Promise.all([
      this.specsGenerator.healthCheck(),
      this.clausePolicyGenerator.healthCheck(),
    ]);

    return {
      specs: specsHealth,
      clauses: clausesHealth,
    };
  }
}

export const rfxAutomationAgent = new RFXAutomationAgent();
