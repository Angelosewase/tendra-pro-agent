import * as yaml from "yaml";
import * as fs from "fs";
import * as path from "path";
import { PlaceholderFiller } from "./fill-placeholders";

export interface TemplateData {
  metadata: {
    document_type: string;
    purpose: string;
    usage_notes: string[];
  };
  header: {
    title: string;
    number: string;
    issued_date: string;
    responses_due: string;
    agency_logo: string;
    agency_name: string;
  };
  [key: string]: unknown;
}

export interface SerializedTemplate {
  templateId: string;
  templateType: "rfb" | "rfi" | "rfp" | "rfq";
  placeholders: string[];
  metadata: {
    version: string;
    sections: string[];
  };
}

export class TemplateManager {
  private templates: Map<string, SerializedTemplate> = new Map();
  private templateData: Map<string, TemplateData> = new Map();
  private placeholderFiller: PlaceholderFiller;

  constructor() {
    this.placeholderFiller = new PlaceholderFiller(this);
    this.loadTemplates();
  }

  private loadTemplates(): void {
    const templatesDir = path.join(__dirname, "../templates");

    if (!fs.existsSync(templatesDir)) {
      console.warn("Templates directory not found:", templatesDir);
      return;
    }

    // Load RFB template
    const rfbTemplatePath = path.join(
      templatesDir,
      "yaml",
      "rfb_template.yaml",
    );
    if (fs.existsSync(rfbTemplatePath)) {
      this.loadTemplate(rfbTemplatePath);
    } else {
      console.warn("RFB template not found:", rfbTemplatePath);
    }

    // Load RFI template
    const rfiTemplatePath = path.join(
      templatesDir,
      "yaml",
      "rfi_template.yaml",
    );
    if (fs.existsSync(rfiTemplatePath)) {
      this.loadTemplate(rfiTemplatePath);
    } else {
      console.warn("RFI template not found:", rfiTemplatePath);
    }

    // Load RFP template
    const rfpTemplatePath = path.join(
      templatesDir,
      "yaml",
      "rfp_template.yaml",
    );
    if (fs.existsSync(rfpTemplatePath)) {
      this.loadTemplate(rfpTemplatePath);
    } else {
      console.warn("RFP template not found:", rfpTemplatePath);
    }

    // Load RFQ template
    const rfqTemplatePath = path.join(
      templatesDir,
      "yaml",
      "rfq_template.yaml",
    );
    if (fs.existsSync(rfqTemplatePath)) {
      this.loadTemplate(rfqTemplatePath);
    } else {
      console.warn("RFQ template not found:", rfqTemplatePath);
    }
  }

  private loadTemplate(filePath: string): void {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");

      // Skip empty files
      if (!fileContent.trim()) {
        console.warn(`Skipping empty template file: ${filePath}`);
        return;
      }

      const data = yaml.parse(fileContent) as TemplateData;
      const templateId = path.basename(filePath, ".yaml");

      // Determine template type based on file name
      const templateType = this.determineTemplateTypeFromFileName(templateId);

      // Extract placeholders from the loaded data
      const placeholders =
        this.placeholderFiller["extractPlaceholdersFromData"](data);
      const sections = this.extractSections(data);

      const serializedTemplate: SerializedTemplate = {
        templateId,
        templateType,
        placeholders,
        metadata: {
          version: "1.0",
          sections,
        },
      };

      this.templates.set(templateId, serializedTemplate);
      this.templateData.set(templateId, data);
    } catch (error) {
      console.error(`Error loading template ${filePath}:`, error);
    }
  }

  private determineTemplateTypeFromFileName(
    templateId: string,
  ): "rfb" | "rfi" | "rfp" | "rfq" {
    if (templateId.includes("rfi")) return "rfi";
    if (templateId.includes("rfp")) return "rfp";
    if (templateId.includes("rfq")) return "rfq";
    return "rfb"; // default
  }

  private extractSections(data: any): string[] {
    return Object.keys(data).filter(
      (key) =>
        key.startsWith("section_") ||
        key === "metadata" ||
        key === "header" ||
        key === "appendix",
    );
  }

  public getRFBTemplate(): SerializedTemplate | undefined {
    return this.templates.get("rfb_template");
  }

  public getRFBTemplateData(): TemplateData | undefined {
    return this.templateData.get("rfb_template");
  }

  public getRFITemplate(): SerializedTemplate | undefined {
    return this.templates.get("rfi_template");
  }

  public getRFITemplateData(): TemplateData | undefined {
    return this.templateData.get("rfi_template");
  }

  public getRFPTemplate(): SerializedTemplate | undefined {
    return this.templates.get("rfp_template");
  }

  public getRFPTemplateData(): TemplateData | undefined {
    return this.templateData.get("rfp_template");
  }

  public getRFQTemplate(): SerializedTemplate | undefined {
    return this.templates.get("rfq_template");
  }

  public getRFQTemplateData(): TemplateData | undefined {
    return this.templateData.get("rfq_template");
  }

  public serializeRFBTemplate(): string | null {
    const template = this.templates.get("rfb_template");
    const data = this.templateData.get("rfb_template");
    if (!template || !data) {
      return null;
    }

    return JSON.stringify(
      {
        template,
        data,
      },
      null,
      2,
    );
  }

  public serializeRFITemplate(): string | null {
    const template = this.templates.get("rfi_template");
    const data = this.templateData.get("rfi_template");
    if (!template || !data) {
      return null;
    }

    return JSON.stringify(
      {
        template,
        data,
      },
      null,
      2,
    );
  }

  public serializeRFPTemplate(): string | null {
    const template = this.templates.get("rfp_template");
    const data = this.templateData.get("rfp_template");
    if (!template || !data) {
      return null;
    }

    return JSON.stringify(
      {
        template,
        data,
      },
      null,
      2,
    );
  }

  public serializeRFQTemplate(): string | null {
    const template = this.templates.get("rfq_template");
    const data = this.templateData.get("rfq_template");
    if (!template || !data) {
      return null;
    }

    return JSON.stringify(
      {
        template,
        data,
      },
      null,
      2,
    );
  }

  public validateRFBTemplate(): {
    valid: boolean;
    errors: string[];
  } {
    const template = this.templates.get("rfb_template");
    const data = this.templateData.get("rfb_template");
    if (!template || !data) {
      return { valid: false, errors: ["RFB template not found"] };
    }

    const errors: string[] = [];

    if (!data.metadata) {
      errors.push("Missing metadata section");
    }

    if (!data.header) {
      errors.push("Missing header section");
    }

    // Validate placeholder format
    const invalidPlaceholders = template.placeholders.filter(
      (p) => !/^[A-Za-z0-9_\-\.]+$/.test(p),
    );
    if (invalidPlaceholders.length > 0) {
      errors.push(
        `Invalid placeholder format: ${invalidPlaceholders.join(", ")}`,
      );
    }

    return { valid: errors.length === 0, errors };
  }

  public validateRFITemplate(): {
    valid: boolean;
    errors: string[];
  } {
    const template = this.templates.get("rfi_template");
    const data = this.templateData.get("rfi_template");
    if (!template || !data) {
      return { valid: false, errors: ["RFI template not found"] };
    }

    const errors: string[] = [];

    if (!data.header) {
      errors.push("Missing header section");
    }

    if (!data.section_1) {
      errors.push("Missing section_1");
    }

    if (!data.section_2) {
      errors.push("Missing section_2");
    }

    if (!data.section_3) {
      errors.push("Missing section_3");
    }

    // Validate placeholder format
    const invalidPlaceholders = template.placeholders.filter(
      (p) => !/^[A-Za-z0-9_\-\.]+$/.test(p),
    );
    if (invalidPlaceholders.length > 0) {
      errors.push(
        `Invalid placeholder format: ${invalidPlaceholders.join(", ")}`,
      );
    }

    return { valid: errors.length === 0, errors };
  }

  public validateRFPTemplate(): {
    valid: boolean;
    errors: string[];
  } {
    const template = this.templates.get("rfp_template");
    const data = this.templateData.get("rfp_template");
    if (!template || !data) {
      return { valid: false, errors: ["RFP template not found"] };
    }

    const errors: string[] = [];

    if (!data.header) {
      errors.push("Missing header section");
    }

    if (!data.section_1_opportunity) {
      errors.push("Missing section_1_opportunity");
    }

    if (!data.section_2_key_information) {
      errors.push("Missing section_2_key_information");
    }

    // Validate placeholder format
    const invalidPlaceholders = template.placeholders.filter(
      (p) => !/^[A-Za-z0-9_\-\.]+$/.test(p),
    );
    if (invalidPlaceholders.length > 0) {
      errors.push(
        `Invalid placeholder format: ${invalidPlaceholders.join(", ")}`,
      );
    }

    return { valid: errors.length === 0, errors };
  }

  public validateRFQTemplate(): {
    valid: boolean;
    errors: string[];
  } {
    const template = this.templates.get("rfq_template");
    const data = this.templateData.get("rfq_template");
    if (!template || !data) {
      return { valid: false, errors: ["RFQ template not found"] };
    }

    const errors: string[] = [];

    if (!data.header) {
      errors.push("Missing header section");
    }

    if (!data.section_1_opportunity) {
      errors.push("Missing section_1_opportunity");
    }

    if (!data.section_2_key_information) {
      errors.push("Missing section_2_key_information");
    }

    // Validate placeholder format
    const invalidPlaceholders = template.placeholders.filter(
      (p) => !/^[A-Za-z0-9_\-\.]+$/.test(p),
    );
    if (invalidPlaceholders.length > 0) {
      errors.push(
        `Invalid placeholder format: ${invalidPlaceholders.join(", ")}`,
      );
    }

    return { valid: errors.length === 0, errors };
  }

  // Generic methods that work with any template ID
  public getAllTemplates(): SerializedTemplate[] {
    return Array.from(this.templates.values());
  }

  public getTemplate(templateId: string): SerializedTemplate | undefined {
    return this.templates.get(templateId);
  }

  public getTemplateData(templateId: string): TemplateData | undefined {
    return this.templateData.get(templateId);
  }

  public validateTemplate(templateId: string): { valid: boolean; errors: string[] } {
    const template = this.templates.get(templateId);
    const data = this.templateData.get(templateId);
    
    if (!template || !data) {
      return { valid: false, errors: [`${templateId} template not found`] };
    }

    const errors: string[] = [];

    // Basic validation - check for required sections
    if (!data.header) {
      errors.push("Missing header section");
    }

    if (!data.metadata) {
      errors.push("Missing metadata section");
    }

    // Validate placeholder format
    const invalidPlaceholders = template.placeholders.filter(
      (p) => !/^[A-Za-z0-9_\-\.]+$/.test(p),
    );
    if (invalidPlaceholders.length > 0) {
      errors.push(
        `Invalid placeholder format: ${invalidPlaceholders.join(", ")}`,
      );
    }

    return { valid: errors.length === 0, errors };
  }
}
