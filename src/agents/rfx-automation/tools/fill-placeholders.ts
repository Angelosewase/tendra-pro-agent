import { TemplateManager, TemplateData, SerializedTemplate } from './template-manager';

export interface PlaceholderValues {
  [key: string]: string;
}

export interface FillOptions {
  preserveUnknownPlaceholders?: boolean;
  validateRequired?: boolean;
  requiredPlaceholders?: string[];
}

export interface FillResult {
  success: boolean;
  filledData?: TemplateData;
  errors: string[];
  warnings: string[];
  unfilledPlaceholders: string[];
}

export class PlaceholderFiller {
  private templateManager: TemplateManager;

  constructor(templateManager?: TemplateManager) {
    this.templateManager = templateManager || new TemplateManager();
  }

  public fillRFBTemplate(
    values: PlaceholderValues,
    options: FillOptions = {}
  ): FillResult {
    const templateData = this.templateManager.getRFBTemplateData();
    
    if (!templateData) {
      return {
        success: false,
        errors: ["RFB template not found"],
        warnings: [],
        unfilledPlaceholders: []
      };
    }

    return this.fillTemplateData(templateData, values, options);
  }

  public fillRFITemplate(
    values: PlaceholderValues,
    options: FillOptions = {}
  ): FillResult {
    const templateData = this.templateManager.getRFITemplateData();
    
    if (!templateData) {
      return {
        success: false,
        errors: ["RFI template not found"],
        warnings: [],
        unfilledPlaceholders: []
      };
    }

    return this.fillTemplateData(templateData, values, options);
  }

  public fillRFPTemplate(
    values: PlaceholderValues,
    options: FillOptions = {}
  ): FillResult {
    const templateData = this.templateManager.getRFPTemplateData();
    
    if (!templateData) {
      return {
        success: false,
        errors: ["RFP template not found"],
        warnings: [],
        unfilledPlaceholders: []
      };
    }

    return this.fillTemplateData(templateData, values, options);
  }

  public fillRFQTemplate(
    values: PlaceholderValues,
    options: FillOptions = {}
  ): FillResult {
    const templateData = this.templateManager.getRFQTemplateData();
    
    if (!templateData) {
      return {
        success: false,
        errors: ["RFQ template not found"],
        warnings: [],
        unfilledPlaceholders: []
      };
    }

    return this.fillTemplateData(templateData, values, options);
  }

  public getRFBPlaceholders(): string[] {
    const templateData = this.templateManager.getRFBTemplateData();
    return templateData ? this.extractPlaceholdersFromData(templateData) : [];
  }

  public getRFIPlaceholders(): string[] {
    const templateData = this.templateManager.getRFITemplateData();
    return templateData ? this.extractPlaceholdersFromData(templateData) : [];
  }

  public getRFPPlaceholders(): string[] {
    const templateData = this.templateManager.getRFPTemplateData();
    return templateData ? this.extractPlaceholdersFromData(templateData) : [];
  }

  public getRFQPlaceholders(): string[] {
    const templateData = this.templateManager.getRFQTemplateData();
    return templateData ? this.extractPlaceholdersFromData(templateData) : [];
  }

  public validateRFBValues(
    values: PlaceholderValues
  ): { valid: boolean; errors: string[]; suggestions: string[] } {
    const template = this.templateManager.getRFBTemplate();
    if (!template) {
      return {
        valid: false,
        errors: ["RFB template not found"],
        suggestions: []
      };
    }

    const errors: string[] = [];
    const suggestions: string[] = [];
    const templatePlaceholders = template.placeholders.map(p => p.replace(/[\[\]\{\}]/g, '').trim());
    const providedKeys = Object.keys(values);

    // Check for missing placeholders
    const missing = templatePlaceholders.filter(p => !providedKeys.includes(p));
    if (missing.length > 0) {
      errors.push(`Missing values for placeholders: ${missing.join(', ')}`);
    }

    // Check for extra values
    const extra = providedKeys.filter(p => !templatePlaceholders.includes(p));
    if (extra.length > 0) {
      suggestions.push(`Extra values provided (not in template): ${extra.join(', ')}`);
    }

    // Check for empty values
    const empty = providedKeys.filter(p => !values[p] || values[p].trim() === '');
    if (empty.length > 0) {
      errors.push(`Empty values for placeholders: ${empty.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      suggestions
    };
  }

  public validateRFIValues(
    values: PlaceholderValues
  ): { valid: boolean; errors: string[]; suggestions: string[] } {
    const template = this.templateManager.getRFITemplate();
    if (!template) {
      return {
        valid: false,
        errors: ["RFI template not found"],
        suggestions: []
      };
    }

    const errors: string[] = [];
    const suggestions: string[] = [];
    const templatePlaceholders = template.placeholders.map(p => p.replace(/[\[\]\{\}]/g, '').trim());
    const providedKeys = Object.keys(values);

    // Check for missing placeholders
    const missing = templatePlaceholders.filter(p => !providedKeys.includes(p));
    if (missing.length > 0) {
      errors.push(`Missing values for placeholders: ${missing.join(', ')}`);
    }

    // Check for extra values
    const extra = providedKeys.filter(p => !templatePlaceholders.includes(p));
    if (extra.length > 0) {
      suggestions.push(`Extra values provided (not in template): ${extra.join(', ')}`);
    }

    // Check for empty values
    const empty = providedKeys.filter(p => !values[p] || values[p].trim() === '');
    if (empty.length > 0) {
      errors.push(`Empty values for placeholders: ${empty.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      suggestions
    };
  }

  public validateRFPValues(
    values: PlaceholderValues
  ): { valid: boolean; errors: string[]; suggestions: string[] } {
    const template = this.templateManager.getRFPTemplate();
    if (!template) {
      return {
        valid: false,
        errors: ["RFP template not found"],
        suggestions: []
      };
    }

    const errors: string[] = [];
    const suggestions: string[] = [];
    const templatePlaceholders = template.placeholders.map(p => p.replace(/[\[\]\{\}]/g, '').trim());
    const providedKeys = Object.keys(values);

    // Check for missing placeholders
    const missing = templatePlaceholders.filter(p => !providedKeys.includes(p));
    if (missing.length > 0) {
      errors.push(`Missing values for placeholders: ${missing.join(', ')}`);
    }

    // Check for extra values
    const extra = providedKeys.filter(p => !templatePlaceholders.includes(p));
    if (extra.length > 0) {
      suggestions.push(`Extra values provided (not in template): ${extra.join(', ')}`);
    }

    // Check for empty values
    const empty = providedKeys.filter(p => !values[p] || values[p].trim() === '');
    if (empty.length > 0) {
      errors.push(`Empty values for placeholders: ${empty.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      suggestions
    };
  }

  public validateRFQValues(
    values: PlaceholderValues
  ): { valid: boolean; errors: string[]; suggestions: string[] } {
    const template = this.templateManager.getRFQTemplate();
    if (!template) {
      return {
        valid: false,
        errors: ["RFQ template not found"],
        suggestions: []
      };
    }

    const errors: string[] = [];
    const suggestions: string[] = [];
    const templatePlaceholders = template.placeholders.map(p => p.replace(/[\[\]\{\}]/g, '').trim());
    const providedKeys = Object.keys(values);

    // Check for missing placeholders
    const missing = templatePlaceholders.filter(p => !providedKeys.includes(p));
    if (missing.length > 0) {
      errors.push(`Missing values for placeholders: ${missing.join(', ')}`);
    }

    // Check for extra values
    const extra = providedKeys.filter(p => !templatePlaceholders.includes(p));
    if (extra.length > 0) {
      suggestions.push(`Extra values provided (not in template): ${extra.join(', ')}`);
    }

    // Check for empty values
    const empty = providedKeys.filter(p => !values[p] || values[p].trim() === '');
    if (empty.length > 0) {
      errors.push(`Empty values for placeholders: ${empty.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      suggestions
    };
  }

  public getRFBStructure(): any {
    const templateData = this.templateManager.getRFBTemplateData();
    if (!templateData) {
      return null;
    }

    // Return a simplified structure showing where placeholders are located
    const getStructure = (obj: any, path: string = ''): any => {
      if (typeof obj === 'string') {
        const doubleBracePlaceholders = obj.match(/\{\{([^}]+)\}\}/g) || [];
        const singleBracePlaceholders = obj.match(/\[([^\]]+)\]/g) || [];
        const allPlaceholders = [...doubleBracePlaceholders, ...singleBracePlaceholders];
        
        return {
          type: 'string',
          path,
          value: obj,
          placeholders: allPlaceholders
        };
      } else if (Array.isArray(obj)) {
        return obj.map((item, index) => 
          getStructure(item, path ? `${path}[${index}]` : `[${index}]`)
        );
      } else if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        Object.entries(obj).forEach(([key, value]) => {
          result[key] = getStructure(value, path ? `${path}.${key}` : key);
        });
        return result;
      }
      return { type: typeof obj, path, value: obj };
    };

    return getStructure(templateData);
  }

  public getRFIStructure(): any {
    const templateData = this.templateManager.getRFITemplateData();
    if (!templateData) {
      return null;
    }

    // Return a simplified structure showing where placeholders are located
    const getStructure = (obj: any, path: string = ''): any => {
      if (typeof obj === 'string') {
        const doubleBracePlaceholders = obj.match(/\{\{([^}]+)\}\}/g) || [];
        const singleBracePlaceholders = obj.match(/\[([^\]]+)\]/g) || [];
        const allPlaceholders = [...doubleBracePlaceholders, ...singleBracePlaceholders];
        
        return {
          type: 'string',
          path,
          value: obj,
          placeholders: allPlaceholders
        };
      } else if (Array.isArray(obj)) {
        return obj.map((item, index) => 
          getStructure(item, path ? `${path}[${index}]` : `[${index}]`)
        );
      } else if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        Object.entries(obj).forEach(([key, value]) => {
          result[key] = getStructure(value, path ? `${path}.${key}` : key);
        });
        return result;
      }
      return { type: typeof obj, path, value: obj };
    };

    return getStructure(templateData);
  }

  public getRFPStructure(): any {
    const templateData = this.templateManager.getRFPTemplateData();
    if (!templateData) {
      return null;
    }

    // Return a simplified structure showing where placeholders are located
    const getStructure = (obj: any, path: string = ''): any => {
      if (typeof obj === 'string') {
        const doubleBracePlaceholders = obj.match(/\{\{([^}]+)\}\}/g) || [];
        const singleBracePlaceholders = obj.match(/\[([^\]]+)\]/g) || [];
        const allPlaceholders = [...doubleBracePlaceholders, ...singleBracePlaceholders];
        
        return {
          type: 'string',
          path,
          value: obj,
          placeholders: allPlaceholders
        };
      } else if (Array.isArray(obj)) {
        return obj.map((item, index) => 
          getStructure(item, path ? `${path}[${index}]` : `[${index}]`)
        );
      } else if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        Object.entries(obj).forEach(([key, value]) => {
          result[key] = getStructure(value, path ? `${path}.${key}` : key);
        });
        return result;
      }
      return { type: typeof obj, path, value: obj };
    };

    return getStructure(templateData);
  }

  public getRFQStructure(): any {
    const templateData = this.templateManager.getRFQTemplateData();
    if (!templateData) {
      return null;
    }

    // Return a simplified structure showing where placeholders are located
    const getStructure = (obj: any, path: string = ''): any => {
      if (typeof obj === 'string') {
        const doubleBracePlaceholders = obj.match(/\{\{([^}]+)\}\}/g) || [];
        const singleBracePlaceholders = obj.match(/\[([^\]]+)\]/g) || [];
        const allPlaceholders = [...doubleBracePlaceholders, ...singleBracePlaceholders];
        
        return {
          type: 'string',
          path,
          value: obj,
          placeholders: allPlaceholders
        };
      } else if (Array.isArray(obj)) {
        return obj.map((item, index) => 
          getStructure(item, path ? `${path}[${index}]` : `[${index}]`)
        );
      } else if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        Object.entries(obj).forEach(([key, value]) => {
          result[key] = getStructure(value, path ? `${path}.${key}` : key);
        });
        return result;
      }
      return { type: typeof obj, path, value: obj };
    };

    return getStructure(templateData);
  }

  public createRFBFillReport(values: PlaceholderValues): {
    templateInfo: any;
    validation: any;
    fillResult: FillResult;
  } {
    const template = this.templateManager.getRFBTemplate();
    const validation = this.validateRFBValues(values);
    const fillResult = this.fillRFBTemplate(values);

    return {
      templateInfo: template ? {
        id: template.templateId,
        type: template.templateType,
        sections: template.metadata.sections,
        totalPlaceholders: template.placeholders.length
      } : null,
      validation,
      fillResult
    };
  }

  public createRFIFillReport(values: PlaceholderValues): {
    templateInfo: any;
    validation: any;
    fillResult: FillResult;
  } {
    const template = this.templateManager.getRFITemplate();
    const validation = this.validateRFIValues(values);
    const fillResult = this.fillRFITemplate(values);

    return {
      templateInfo: template ? {
        id: template.templateId,
        type: template.templateType,
        sections: template.metadata.sections,
        totalPlaceholders: template.placeholders.length
      } : null,
      validation,
      fillResult
    };
  }

  public createRFPFillReport(values: PlaceholderValues): {
    templateInfo: any;
    validation: any;
    fillResult: FillResult;
  } {
    const template = this.templateManager.getRFPTemplate();
    const validation = this.validateRFPValues(values);
    const fillResult = this.fillRFPTemplate(values);

    return {
      templateInfo: template ? {
        id: template.templateId,
        type: template.templateType,
        sections: template.metadata.sections,
        totalPlaceholders: template.placeholders.length
      } : null,
      validation,
      fillResult
    };
  }

  public createRFQFillReport(values: PlaceholderValues): {
    templateInfo: any;
    validation: any;
    fillResult: FillResult;
  } {
    const template = this.templateManager.getRFQTemplate();
    const validation = this.validateRFQValues(values);
    const fillResult = this.fillRFQTemplate(values);

    return {
      templateInfo: template ? {
        id: template.templateId,
        type: template.templateType,
        sections: template.metadata.sections,
        totalPlaceholders: template.placeholders.length
      } : null,
      validation,
      fillResult
    };
  }

  public fillTemplateData(
    templateData: TemplateData,
    values: PlaceholderValues,
    options: FillOptions = {}
  ): FillResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const unfilledPlaceholders: string[] = [];

    // Validate required placeholders if specified
    if (options.validateRequired && options.requiredPlaceholders) {
      const missing = options.requiredPlaceholders.filter(
        placeholder => !values.hasOwnProperty(placeholder)
      );
      if (missing.length > 0) {
        errors.push(`Missing required placeholders: ${missing.join(', ')}`);
      }
    }

    // Create a deep copy of the template data
    const filledData = JSON.parse(JSON.stringify(templateData));
    
    // Fill placeholders recursively
    const fillRecursive = (obj: any): any => {
      if (typeof obj === 'string') {
        return this.fillStringPlaceholders(
          obj, 
          values, 
          { preserveUnknown: options.preserveUnknownPlaceholders },
          unfilledPlaceholders
        );
      } else if (Array.isArray(obj)) {
        return obj.map(item => fillRecursive(item));
      } else if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        Object.entries(obj).forEach(([key, value]) => {
          result[key] = fillRecursive(value);
        });
        return result;
      }
      return obj;
    };

    const processedData = fillRecursive(filledData);

    // Add warnings for unfilled placeholders
    if (unfilledPlaceholders.length > 0) {
      warnings.push(`Unfilled placeholders: ${Array.from(new Set(unfilledPlaceholders)).join(', ')}`);
    }

    return {
      success: errors.length === 0,
      filledData: processedData,
      errors,
      warnings,
      unfilledPlaceholders: Array.from(new Set(unfilledPlaceholders))
    };
  }

  private extractPlaceholdersFromData(data: unknown, placeholders: string[] = []): string[] {
    if (typeof data === "string") {
      // Match both {{placeholder}} and [placeholder] formats
      const doubleBraceMatches = data.match(/\{\{([^}]+)\}\}/g);
      const singleBraceMatches = data.match(/\[([^\]]+)\]/g);
      
      if (doubleBraceMatches) {
        // Extract just the key without braces
        const keys = doubleBraceMatches.map(match => match.slice(2, -2).trim());
        placeholders.push(...keys);
      }
      
      if (singleBraceMatches) {
        // Extract just the key without brackets
        const keys = singleBraceMatches.map(match => match.slice(1, -1).trim());
        placeholders.push(...keys);
      }
    } else if (Array.isArray(data)) {
      data.forEach((item) => this.extractPlaceholdersFromData(item, placeholders));
    } else if (typeof data === "object" && data !== null) {
      Object.values(data).forEach((value) =>
        this.extractPlaceholdersFromData(value, placeholders),
      );
    }

    return Array.from(new Set(placeholders));
  }

  private fillStringPlaceholders(
    text: string,
    values: PlaceholderValues,
    options: { preserveUnknown?: boolean },
    unfilledPlaceholders: string[]
  ): string {
    let result = text;
    
    // Handle {{placeholder}} format
    const doubleBraceRegex = /\{\{([^}]+)\}\}/g;
    let match;
    
    // Reset regex lastIndex
    doubleBraceRegex.lastIndex = 0;
    
    while ((match = doubleBraceRegex.exec(text)) !== null) {
      const placeholder = match[1].trim();
      const fullPlaceholder = match[0];
      
      if (values.hasOwnProperty(placeholder)) {
        const value = values[placeholder];
        result = result.replace(fullPlaceholder, value);
      } else if (!options.preserveUnknown) {
        // Only track as unfilled if we're not preserving unknown placeholders
        unfilledPlaceholders.push(fullPlaceholder);
      }
    }
    
    // Handle [placeholder] format
    const singleBraceRegex = /\[([^\]]+)\]/g;
    singleBraceRegex.lastIndex = 0;
    
    while ((match = singleBraceRegex.exec(text)) !== null) {
      const placeholder = match[1].trim();
      const fullPlaceholder = match[0];
      
      if (values.hasOwnProperty(placeholder)) {
        const value = values[placeholder];
        result = result.replace(fullPlaceholder, value);
      } else if (!options.preserveUnknown) {
        // Only track as unfilled if we're not preserving unknown placeholders
        unfilledPlaceholders.push(fullPlaceholder);
      }
    }

    return result;
  }

  // Generic methods that work with any template ID
  public extractPlaceholders(templateId: string): string[] {
    const templateData = this.templateManager.getTemplateData(templateId);
    return templateData ? this.extractPlaceholdersFromData(templateData) : [];
  }

  public fillTemplate(templateId: string, values: PlaceholderValues, options: FillOptions = {}): FillResult {
    const templateData = this.templateManager.getTemplateData(templateId);
    
    if (!templateData) {
      return {
        success: false,
        errors: [`${templateId} template not found`],
        warnings: [],
        unfilledPlaceholders: []
      };
    }

    return this.fillTemplateData(templateData, values, options);
  }

  public validatePlaceholderValues(templateId: string, values: PlaceholderValues): { valid: boolean; errors: string[]; suggestions: string[] } {
    const template = this.templateManager.getTemplate(templateId);
    if (!template) {
      return {
        valid: false,
        errors: [`${templateId} template not found`],
        suggestions: []
      };
    }

    const errors: string[] = [];
    const suggestions: string[] = [];
    const templatePlaceholders = template.placeholders.map(p => p.replace(/[\[\]\{\}]/g, '').trim());
    const providedKeys = Object.keys(values);

    // Check for missing placeholders
    const missing = templatePlaceholders.filter(p => !providedKeys.includes(p));
    if (missing.length > 0) {
      errors.push(`Missing values for placeholders: ${missing.join(', ')}`);
    }

    // Check for extra values
    const extra = providedKeys.filter(p => !templatePlaceholders.includes(p));
    if (extra.length > 0) {
      suggestions.push(`Extra values provided (not in template): ${extra.join(', ')}`);
    }

    // Check for empty values
    const empty = providedKeys.filter(p => !values[p] || values[p].trim() === '');
    if (empty.length > 0) {
      errors.push(`Empty values for placeholders: ${empty.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      suggestions
    };
  }

  public fillMultipleTemplates(templateIds: string[], values: PlaceholderValues, options: FillOptions = {}): Record<string, FillResult> {
    const results: Record<string, FillResult> = {};
    
    templateIds.forEach(templateId => {
      results[templateId] = this.fillTemplate(templateId, values, options);
    });
    
    return results;
  }

  public createFillReport(templateId: string, values: PlaceholderValues): {
    templateInfo: any;
    validation: any;
    fillResult: FillResult;
  } {
    const template = this.templateManager.getTemplate(templateId);
    const validation = this.validatePlaceholderValues(templateId, values);
    const fillResult = this.fillTemplate(templateId, values);

    return {
      templateInfo: template ? {
        id: template.templateId,
        type: template.templateType,
        sections: template.metadata.sections,
        totalPlaceholders: template.placeholders.length
      } : null,
      validation,
      fillResult
    };
  }
}