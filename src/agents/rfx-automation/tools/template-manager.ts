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
  templateType: 'rfb';
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

    // Load only RFB template
    const rfbTemplatePath = path.join(templatesDir, "yaml", "rfb_template.yaml");
    if (fs.existsSync(rfbTemplatePath)) {
      this.loadTemplate(rfbTemplatePath);
    } else {
      console.warn("RFB template not found:", rfbTemplatePath);
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
      
      const parsedYaml = yaml.parse(fileContent) as TemplateData;

      const templateId = path.basename(filePath, path.extname(filePath));
      const placeholders = this.placeholderFiller['extractPlaceholdersFromData'](parsedYaml);
      const sections = this.extractSections(parsedYaml);

      const serializedTemplate: SerializedTemplate = {
        templateId,
        templateType: 'rfb',
        placeholders,
        metadata: {
          version: "1.0.0",
          sections,
        },
      };

      this.templates.set(templateId, serializedTemplate);
      this.templateData.set(templateId, parsedYaml);
      console.log(`Loaded template: ${templateId}`);
    } catch (error) {
      console.error(`Error loading template ${filePath}:`, error);
    }
  }

  private extractPlaceholders(data: unknown, placeholders: string[] = []): string[] {
    if (typeof data === "string") {
      // Only match valid identifiers: letters, numbers, underscores, hyphens
      const matches = data.match(/\[([A-Za-z0-9_\-]+)\]/g);
      if (matches) {
        // Extract just the key without brackets
        const keys = matches.map(match => match.slice(1, -1));
        placeholders.push(...keys);
      }
    } else if (Array.isArray(data)) {
      data.forEach((item) => this.extractPlaceholders(item, placeholders));
    } else if (typeof data === "object" && data !== null) {
      Object.values(data).forEach((value) =>
        this.extractPlaceholders(value, placeholders),
      );
    }

    return Array.from(new Set(placeholders));
  }

  private extractSections(data: any): string[] {
    return Object.keys(data).filter(
      (key) =>
        key.startsWith("section_") || key === "metadata" || key === "header",
    );
  }

  public getRFBTemplate(): SerializedTemplate | undefined {
    return this.templates.get("rfb_template");
  }

  public getRFBTemplateData(): TemplateData | undefined {
    return this.templateData.get("rfb_template");
  }

  public serializeRFBTemplate(): string | null {
    const template = this.templates.get("rfb_template");
    const data = this.templateData.get("rfb_template");
    if (!template || !data) {
      return null;
    }

    return JSON.stringify({
      template,
      data
    }, null, 2);
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
    const invalidPlaceholders = template.placeholders.filter(p => !/^[A-Za-z0-9_\-\.]+$/.test(p));
    if (invalidPlaceholders.length > 0) {
      errors.push(`Invalid placeholder format: ${invalidPlaceholders.join(', ')}`);
    }

    return { valid: errors.length === 0, errors };
  }

}
