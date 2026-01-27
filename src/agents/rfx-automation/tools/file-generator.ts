import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import { TemplateData } from "./template-manager";
import {
  PlaceholderFiller,
  PlaceholderValues,
  FillOptions,
} from "./fill-placeholders";

export interface PDFOptions {
  format?: "A4" | "Letter";
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  printBackground?: boolean;
}

export class FileGenerator {
  private outputDir: string;
  private templatesDir: string;
  private htmlTemplatesDir: string;
  private placeholderFiller: PlaceholderFiller;

  constructor(
    outputDir: string = "./output",
    templatesDir: string = path.join(__dirname, "../templates"),
    htmlTemplatesDir: string = path.join(__dirname, "../templates/html"),
  ) {
    this.outputDir = outputDir;
    this.templatesDir = templatesDir;
    this.htmlTemplatesDir = htmlTemplatesDir;
    this.placeholderFiller = new PlaceholderFiller();
    this.ensureOutputDir();
  }

  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  public async generateRFBPDF(
    placeholderValues: PlaceholderValues,
    filename: string,
    pdfOptions: PDFOptions = {},
    fillOptions: FillOptions = {}
  ): Promise<{ success: boolean; filePath?: string; fillResult: any }> {
    try {
      // Use PlaceholderFiller to fill the RFB template
      const fillResult = this.placeholderFiller.fillRFBTemplate(
        placeholderValues,
        fillOptions,
      );

      if (!fillResult.success || !fillResult.filledData) {
        return { success: false, fillResult };
      }

      // Generate PDF from filled template data
      const filePath = await this.generatePDF(
        fillResult.filledData,
        'rfb_template.html',
        filename,
        pdfOptions,
      );

      return { success: true, filePath, fillResult };
    } catch (error) {
      return {
        success: false,
        fillResult: {
          success: false,
          errors: [error instanceof Error ? error.message : "Unknown error"],
        },
      };
    }
  }

  public async generateRFIPDF(
    placeholderValues: PlaceholderValues,
    filename: string,
    pdfOptions: PDFOptions = {},
    fillOptions: FillOptions = {}
  ): Promise<{ success: boolean; filePath?: string; fillResult: any }> {
    try {
      // Use PlaceholderFiller to fill the RFI template
      const fillResult = this.placeholderFiller.fillRFITemplate(
        placeholderValues,
        fillOptions,
      );

      if (!fillResult.success || !fillResult.filledData) {
        return { success: false, fillResult };
      }

      // Generate PDF from filled template data
      const filePath = await this.generatePDF(
        fillResult.filledData,
        'rfi_template.html',
        filename,
        pdfOptions,
      );

      return { success: true, filePath, fillResult };
    } catch (error) {
      return {
        success: false,
        fillResult: {
          success: false,
          errors: [error instanceof Error ? error.message : "Unknown error"],
        },
      };
    }
  }

  public async generateRFPPDF(
    placeholderValues: PlaceholderValues,
    filename: string,
    pdfOptions: PDFOptions = {},
    fillOptions: FillOptions = {}
  ): Promise<{ success: boolean; filePath?: string; fillResult: any }> {
    try {
      // Use PlaceholderFiller to fill the RFP template
      const fillResult = this.placeholderFiller.fillRFPTemplate(
        placeholderValues,
        fillOptions,
      );

      if (!fillResult.success || !fillResult.filledData) {
        return { success: false, fillResult };
      }

      // Generate PDF from filled template data
      const filePath = await this.generatePDF(
        fillResult.filledData,
        'rfp_template.html',
        filename,
        pdfOptions,
      );

      return { success: true, filePath, fillResult };
    } catch (error) {
      return {
        success: false,
        fillResult: {
          success: false,
          errors: [error instanceof Error ? error.message : "Unknown error"],
        },
      };
    }
  }

  public async generateRFQPDF(
    placeholderValues: PlaceholderValues,
    filename: string,
    pdfOptions: PDFOptions = {},
    fillOptions: FillOptions = {}
  ): Promise<{ success: boolean; filePath?: string; fillResult: any }> {
    try {
      // Use PlaceholderFiller to fill the RFQ template
      const fillResult = this.placeholderFiller.fillRFQTemplate(
        placeholderValues,
        fillOptions,
      );

      if (!fillResult.success || !fillResult.filledData) {
        return { success: false, fillResult };
      }

      // Generate PDF from filled template data
      const filePath = await this.generatePDF(
        fillResult.filledData,
        'rfq_template.html',
        filename,
        pdfOptions,
      );

      return { success: true, filePath, fillResult };
    } catch (error) {
      return {
        success: false,
        fillResult: {
          success: false,
          errors: [error instanceof Error ? error.message : "Unknown error"],
        },
      };
    }
  }

  public getRFBPlaceholders(): string[] {
    return this.placeholderFiller.getRFBPlaceholders();
  }

  public getRFIPlaceholders(): string[] {
    return this.placeholderFiller.getRFIPlaceholders();
  }

  public getRFPPlaceholders(): string[] {
    return this.placeholderFiller.getRFPPlaceholders();
  }

  public getRFQPlaceholders(): string[] {
    return this.placeholderFiller.getRFQPlaceholders();
  }

  public validateRFBData(
    values: PlaceholderValues
  ): { valid: boolean; errors: string[]; suggestions: string[] } {
    return this.placeholderFiller.validateRFBValues(values);
  }

  public validateRFIData(
    values: PlaceholderValues
  ): { valid: boolean; errors: string[]; suggestions: string[] } {
    return this.placeholderFiller.validateRFIValues(values);
  }

  public validateRFPData(
    values: PlaceholderValues
  ): { valid: boolean; errors: string[]; suggestions: string[] } {
    return this.placeholderFiller.validateRFPValues(values);
  }

  public validateRFQData(
    values: PlaceholderValues
  ): { valid: boolean; errors: string[]; suggestions: string[] } {
    return this.placeholderFiller.validateRFQValues(values);
  }

  private async generatePDF(
    templateData: TemplateData,
    templateFile: string,
    filename: string,
    options: PDFOptions = {},
  ): Promise<string> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
      const html = this.loadTemplate(templateFile, templateData);
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdfOptions = {
        path: path.join(this.outputDir, filename),
        format: options.format || "A4",
        margin: {
          top: options.margin?.top || "20mm",
          right: options.margin?.right || "20mm",
          bottom: options.margin?.bottom || "20mm",
          left: options.margin?.left || "20mm",
          ...options.margin,
        },
        printBackground: options.printBackground ?? true,
      };

      await page.pdf(pdfOptions);
      return path.join(this.outputDir, filename);
    } finally {
      await browser.close();
    }
  }

  private loadTemplate(templateFile: string, data: TemplateData): string {
    const templatePath = path.join(this.htmlTemplatesDir, templateFile);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`HTML template file not found: ${templatePath}`);
    }

    let html = fs.readFileSync(templatePath, "utf8");

    // Use PlaceholderFiller to replace placeholders
    const flatData = this.flattenTemplateData(data);
    
    // Create a simple template structure for the HTML content
    const htmlTemplateData = {
      content: html,
      metadata: { document_type: "", purpose: "", usage_notes: [] },
      header: { title: "", number: "", issued_date: "", responses_due: "", agency_logo: "", agency_name: "" }
    } as unknown as TemplateData;
    
    const fillResult = this.placeholderFiller.fillTemplateData(
      htmlTemplateData,
      flatData,
      { preserveUnknownPlaceholders: true },
    );

    return (fillResult.filledData?.content as string) || html;
  }

  private flattenTemplateData(data: TemplateData): PlaceholderValues {
    const flattened: PlaceholderValues = {};

    const flatten = (obj: any, prefix: string = "") => {
      Object.entries(obj).forEach(([key, value]) => {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === "string") {
          flattened[newKey] = value;
        } else if (Array.isArray(value)) {
          flattened[newKey] = value
            .map((item) =>
              typeof item === "string" ? item : JSON.stringify(item),
            )
            .join(", ");
        } else if (typeof value === "object" && value !== null) {
          flatten(value, newKey);
        }
      });
    };

    flatten(data);
    return flattened;
  }

  public listAvailableTemplates(): string[] {
    if (!fs.existsSync(this.htmlTemplatesDir)) {
      return [];
    }

    return fs
      .readdirSync(this.htmlTemplatesDir)
      .filter((file) => file.endsWith(".html") || file.endsWith(".htm"));
  }

  public listYAMLTemplates(): string[] {
    if (!fs.existsSync(this.templatesDir)) {
      return [];
    }

    return fs
      .readdirSync(this.templatesDir)
      .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"));
  }

  public async generatePDFFromUserInput(
    templateType: 'rfb' | 'rfi' | 'rfp' | 'rfq',
    userInputValues: any,
    filename: string,
    pdfOptions: PDFOptions = {},
    fillOptions: FillOptions = {}
  ): Promise<{ success: boolean; filePath?: string; fillResult: any }> {
    try {
      // Convert user input to flat placeholder values
      const placeholderValues = this.convertUserInputToPlaceholders(userInputValues);
      
      // Use the appropriate generation method based on template type
      switch (templateType) {
        case 'rfb':
          return this.generateRFBPDF(placeholderValues, filename, pdfOptions, fillOptions);
        case 'rfi':
          return this.generateRFIPDF(placeholderValues, filename, pdfOptions, fillOptions);
        case 'rfp':
          return this.generateRFPPDF(placeholderValues, filename, pdfOptions, fillOptions);
        case 'rfq':
          return this.generateRFQPDF(placeholderValues, filename, pdfOptions, fillOptions);
        default:
          return {
            success: false,
            fillResult: {
              success: false,
              errors: [`Unknown template type: ${templateType}`],
            },
          };
      }
    } catch (error) {
      return {
        success: false,
        fillResult: {
          success: false,
          errors: [error instanceof Error ? error.message : "Unknown error"],
        },
      };
    }
  }

  private convertUserInputToPlaceholders(userInput: any): PlaceholderValues {
    const flattened: PlaceholderValues = {};

    const flatten = (obj: any, prefix: string = "") => {
      Object.entries(obj).forEach(([key, value]) => {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          flattened[newKey] = value;
        } else if (Array.isArray(value)) {
          flattened[newKey] = value
            .map((item) =>
              typeof item === "string" ? item : JSON.stringify(item),
            )
            .join(", ");
        } else if (typeof value === "object" && value !== null) {
          flatten(value, newKey);
        }
      });
    };

    flatten(userInput);
    return flattened;
  }

  public validateUserInput(
    templateType: 'rfb' | 'rfi' | 'rfp' | 'rfq',
    userInputValues: any
  ): { valid: boolean; errors: string[]; suggestions: string[] } {
    const placeholderValues = this.convertUserInputToPlaceholders(userInputValues);
    
    switch (templateType) {
      case 'rfb':
        return this.validateRFBData(placeholderValues);
      case 'rfi':
        return this.validateRFIData(placeholderValues);
      case 'rfp':
        return this.validateRFPData(placeholderValues);
      case 'rfq':
        return this.validateRFQData(placeholderValues);
      default:
        return {
          valid: false,
          errors: [`Unknown template type: ${templateType}`],
          suggestions: []
        };
    }
  }

  public getTemplateStructure(templateType: 'rfb' | 'rfi' | 'rfp' | 'rfq'): any {
    switch (templateType) {
      case 'rfb':
        return this.placeholderFiller.getRFBStructure();
      case 'rfi':
        return this.placeholderFiller.getRFIStructure();
      case 'rfp':
        return this.placeholderFiller.getRFPStructure();
      case 'rfq':
        return this.placeholderFiller.getRFQStructure();
      default:
        return null;
    }
  }

  public async generatePDFFromYAML(
    templateId: string,
    htmlTemplate: string,
    values: PlaceholderValues,
    filename: string,
    pdfOptions: PDFOptions = {},
    fillOptions: FillOptions = {}
  ): Promise<{ success: boolean; filePath?: string; fillResult: any }> {
    try {
      // Use PlaceholderFiller to fill the template
      const fillResult = this.placeholderFiller.fillTemplate(templateId, values, fillOptions);

      if (!fillResult.success || !fillResult.filledData) {
        return { success: false, fillResult };
      }

      // Generate PDF from filled template data
      const filePath = await this.generatePDF(
        fillResult.filledData,
        htmlTemplate,
        filename,
        pdfOptions,
      );

      return { success: true, filePath, fillResult };
    } catch (error) {
      return {
        success: false,
        fillResult: {
          success: false,
          errors: [error instanceof Error ? error.message : "Unknown error"],
        },
      };
    }
  }
}
