import { TemplateManager, TemplateData, SerializedTemplate } from './template-manager';

export interface PlaceholderValues {
  [key: string]: string | number | boolean | string[] | object;
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
    const templateData = this.templateManager.getRFBTemplateData();
    if (!templateData) {
      return {
        valid: false,
        errors: ["RFB template not found"],
        suggestions: []
      };
    }

    const errors: string[] = [];
    const suggestions: string[] = [];
    const templateKeyPaths = this.extractPlaceholdersFromData(templateData);
    const providedKeys = Object.keys(values);

    // Check for missing key paths
    const missing = templateKeyPaths.filter(p => !providedKeys.includes(p));
    if (missing.length > 0) {
      errors.push(`Missing values for: ${missing.join(', ')}`);
    }

    // Check for extra values
    const extra = providedKeys.filter(p => !templateKeyPaths.includes(p));
    if (extra.length > 0) {
      suggestions.push(`Extra values provided (not in template): ${extra.join(', ')}`);
    }

    // Check for empty values
    const empty = providedKeys.filter(p => {
      const value = values[p];
      if (value === null || value === undefined) return true;
      if (typeof value === 'string') return value.trim() === '';
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'object') return Object.keys(value).length === 0;
      return false;
    });
    if (empty.length > 0) {
      errors.push(`Empty values for: ${empty.join(', ')}`);
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
    const templateData = this.templateManager.getRFITemplateData();
    if (!templateData) {
      return {
        valid: false,
        errors: ["RFI template not found"],
        suggestions: []
      };
    }

    const errors: string[] = [];
    const suggestions: string[] = [];
    const templateKeyPaths = this.extractPlaceholdersFromData(templateData);
    const providedKeys = Object.keys(values);

    // Check for missing key paths
    const missing = templateKeyPaths.filter(p => !providedKeys.includes(p));
    if (missing.length > 0) {
      errors.push(`Missing values for: ${missing.join(', ')}`);
    }

    // Check for extra values
    const extra = providedKeys.filter(p => !templateKeyPaths.includes(p));
    if (extra.length > 0) {
      suggestions.push(`Extra values provided (not in template): ${extra.join(', ')}`);
    }

    // Check for empty values
    const empty = providedKeys.filter(p => {
      const value = values[p];
      if (value === null || value === undefined) return true;
      if (typeof value === 'string') return value.trim() === '';
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'object') return Object.keys(value).length === 0;
      return false;
    });
    if (empty.length > 0) {
      errors.push(`Empty values for: ${empty.join(', ')}`);
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
    const templateData = this.templateManager.getRFPTemplateData();
    if (!templateData) {
      return {
        valid: false,
        errors: ["RFP template not found"],
        suggestions: []
      };
    }

    const errors: string[] = [];
    const suggestions: string[] = [];
    const templateKeyPaths = this.extractPlaceholdersFromData(templateData);
    const providedKeys = Object.keys(values);

    // Check for missing key paths
    const missing = templateKeyPaths.filter(p => !providedKeys.includes(p));
    if (missing.length > 0) {
      errors.push(`Missing values for: ${missing.join(', ')}`);
    }

    // Check for extra values
    const extra = providedKeys.filter(p => !templateKeyPaths.includes(p));
    if (extra.length > 0) {
      suggestions.push(`Extra values provided (not in template): ${extra.join(', ')}`);
    }

    // Check for empty values
    const empty = providedKeys.filter(p => {
      const value = values[p];
      if (value === null || value === undefined) return true;
      if (typeof value === 'string') return value.trim() === '';
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'object') return Object.keys(value).length === 0;
      return false;
    });
    if (empty.length > 0) {
      errors.push(`Empty values for: ${empty.join(', ')}`);
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
    const templateData = this.templateManager.getRFQTemplateData();
    if (!templateData) {
      return {
        valid: false,
        errors: ["RFQ template not found"],
        suggestions: []
      };
    }

    const errors: string[] = [];
    const suggestions: string[] = [];
    const templateKeyPaths = this.extractPlaceholdersFromData(templateData);
    const providedKeys = Object.keys(values);

    // Check for missing key paths
    const missing = templateKeyPaths.filter(p => !providedKeys.includes(p));
    if (missing.length > 0) {
      errors.push(`Missing values for: ${missing.join(', ')}`);
    }

    // Check for extra values
    const extra = providedKeys.filter(p => !templateKeyPaths.includes(p));
    if (extra.length > 0) {
      suggestions.push(`Extra values provided (not in template): ${extra.join(', ')}`);
    }

    // Check for empty values
    const empty = providedKeys.filter(p => {
      const value = values[p];
      if (value === null || value === undefined) return true;
      if (typeof value === 'string') return value.trim() === '';
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'object') return Object.keys(value).length === 0;
      return false;
    });
    if (empty.length > 0) {
      errors.push(`Empty values for: ${empty.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      suggestions
    };
  }

  // FIXED: Path-based filling instead of placeholder content matching
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
    
    // Fill placeholders recursively with path tracking
    const fillRecursive = (obj: any, currentPath: string[] = []): any => {
      if (typeof obj === 'string') {
        const path = currentPath.join('.');
        // Check if we have a value for this exact path
        if (values.hasOwnProperty(path)) {
          // Replace the entire string with the value
          return this.convertValueToString(values[path]);
        }
        // Track unfilled placeholder if it contains placeholder syntax
        if (/\{\{.*?\}\}/.test(obj) || /\[.*?\]/.test(obj)) {
          if (!options.preserveUnknownPlaceholders) {
            unfilledPlaceholders.push(obj);
          }
        }
        return obj;
      } else if (Array.isArray(obj)) {
        return obj.map((item, index) => fillRecursive(item, [...currentPath, index.toString()]));
      } else if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        Object.entries(obj).forEach(([key, value]) => {
          result[key] = fillRecursive(value, [...currentPath, key]);
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
    return this.extractPlaceholdersFromDataRecursive(data, [], placeholders);
  }

  private extractPlaceholdersFromDataRecursive(
    data: unknown, 
    currentPath: string[], 
    placeholders: string[]
  ): string[] {
    if (typeof data === "string") {
      // Match both {{placeholder}} and [placeholder] formats
      const doubleBraceMatches = data.match(/\{\{([^}]+)\}\}/g);
      const singleBraceMatches = data.match(/\[([^\]]+)\]/g);
      
      if (doubleBraceMatches || singleBraceMatches) {
        // This string contains placeholders, add the full path to this location
        const fullPath = currentPath.join('.');
        placeholders.push(fullPath);
      }
    } else if (Array.isArray(data)) {
      data.forEach((item, index) =>
        this.extractPlaceholdersFromDataRecursive(item, [...currentPath, index.toString()], placeholders)
      );
    } else if (typeof data === "object" && data !== null) {
      Object.entries(data).forEach(([key, value]) =>
        this.extractPlaceholdersFromDataRecursive(value, [...currentPath, key], placeholders)
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
        const stringValue = this.convertValueToString(value);
        result = result.replace(fullPlaceholder, stringValue);
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
        const stringValue = this.convertValueToString(value);
        result = result.replace(fullPlaceholder, stringValue);
      } else if (!options.preserveUnknown) {
        // Only track as unfilled if we're not preserving unknown placeholders
        unfilledPlaceholders.push(fullPlaceholder);
      }
    }

    return result;
  }

  private convertValueToString(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'string') {
      return value;
    }
    
    if (typeof value === 'number' || typeof value === 'boolean') {
      return value.toString();
    }
    
    if (Array.isArray(value)) {
      return value.map(item => this.convertValueToString(item)).join(', ');
    }
    
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    
    return String(value);
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
    const empty = providedKeys.filter(p => {
      const value = values[p];
      if (value === null || value === undefined) return true;
      if (typeof value === 'string') return value.trim() === '';
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'object') return Object.keys(value).length === 0;
      return false;
    });
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
}