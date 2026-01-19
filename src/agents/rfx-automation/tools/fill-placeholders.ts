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

  public fillTemplate(
    templateId: string,
    values: PlaceholderValues,
    options: FillOptions = {}
  ): FillResult {
    const template = this.templateManager.getTemplate(templateId);
    const templateData = this.templateManager.getTemplateData(templateId);
    
    if (!template || !templateData) {
      return {
        success: false,
        errors: [`Template '${templateId}' not found`],
        warnings: [],
        unfilledPlaceholders: []
      };
    }

    const result = this.fillTemplateData(templateData, values, options);
    
    return {
      ...result,
      filledData: result.success ? result.filledData : undefined
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

  private fillStringPlaceholders(
    text: string,
    values: PlaceholderValues,
    options: { preserveUnknown?: boolean },
    unfilledPlaceholders: string[]
  ): string {
    let result = text;
    const placeholderRegex = /\[([^\]]+)\]/g;
    let match;

    while ((match = placeholderRegex.exec(text)) !== null) {
      const placeholder = match[1];
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
  public extractPlaceholders(templateId: string): string[] {
    const template = this.templateManager.getTemplate(templateId);
    return template ? template.placeholders : [];
  }

  public getTemplateStructure(templateId: string): any {
    const template = this.templateManager.getTemplate(templateId);
    const templateData = this.templateManager.getTemplateData(templateId);
    if (!template || !templateData) {
      return null;
    }

    // Return a simplified structure showing where placeholders are located
    const getStructure = (obj: any, path: string = ''): any => {
      if (typeof obj === 'string') {
        const placeholders = obj.match(/\[([^\]]+)\]/g);
        return {
          type: 'string',
          path,
          value: obj,
          placeholders: placeholders || []
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

  public validatePlaceholderValues(
    templateId: string,
    values: PlaceholderValues
  ): { valid: boolean; errors: string[]; suggestions: string[] } {
    const template = this.templateManager.getTemplate(templateId);
    if (!template) {
      return {
        valid: false,
        errors: [`Template '${templateId}' not found`],
        suggestions: []
      };
    }

    const errors: string[] = [];
    const suggestions: string[] = [];
    const templatePlaceholders = template.placeholders.map(p => p.replace(/[\[\]]/g, ''));
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

  public fillMultipleTemplates(
    templateIds: string[],
    values: PlaceholderValues,
    options: FillOptions = {}
  ): { [templateId: string]: FillResult } {
    const results: { [templateId: string]: FillResult } = {};
    
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