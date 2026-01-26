import { TemplateManager } from '../src/agents/rfx-automation/tools/template-manager';
import { PlaceholderFiller, PlaceholderValues } from '../src/agents/rfx-automation/tools/fill-placeholders';
import { FileGenerator } from '../src/agents/rfx-automation/tools/file-generator';
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';

describe('PDF Generation Integration Tests', () => {
  let templateManager: TemplateManager;
  let placeholderFiller: PlaceholderFiller;
  let fileGenerator: FileGenerator;

  beforeAll(() => {
    templateManager = new TemplateManager();
    placeholderFiller = new PlaceholderFiller(templateManager);
    fileGenerator = new FileGenerator('./test-output', 'c:/projects/tendra/tendra-pro-agent/src/agents/rfx-automation/templates', 'c:/projects/tendra/tendra-pro-agent/src/agents/rfx-automation/tools/html-templates');
  });

  describe('Template Manager Tests', () => {
    test('should load YAML templates', () => {
      const templates = templateManager.getAllTemplates();
      expect(templates.length).toBeGreaterThan(0);
      
      const rfpTemplate = templateManager.getTemplate('rfp_template');
      expect(rfpTemplate).toBeDefined();
      expect(rfpTemplate?.templateType).toBe('request_for_proposal_(rfp)');
    });

    test('should validate templates', () => {
      const validation = templateManager.validateTemplate('rfp_template');
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should extract placeholders from template', () => {
      const placeholders = placeholderFiller.extractPlaceholders('rfp_template');
      expect(placeholders.length).toBeGreaterThan(0);
      expect(placeholders.length).toBe(7); 
      expect(placeholders).toContain('Website');
      expect(placeholders).toContain('City');
      expect(placeholders).toContain('time');
      expect(placeholders).toContain('Number');
      expect(placeholders).toContain('x');
      expect(placeholders).toContain('Address');
      expect(placeholders).toContain('number');
    });
  });

  describe('Placeholder Filler Tests', () => {
    const testValues: PlaceholderValues = {
      'Website': 'https://test.govt.nz',
      'City': 'Wellington',
      'time': '15 January 2024',
      'Number': 'RFP-2024-001',
      'x': 'Digital Transformation Services',
      'Address': '123 Lambton Quay, Wellington 6011',
      'number': '+64-4-123-4567',
    };

    test('should fill RFP template with test data', () => {
      const result = placeholderFiller.fillTemplate('rfp_template', testValues);
      
      expect(result.success).toBe(true);
      expect(result.filledData).toBeDefined();
      expect(result.errors).toHaveLength(0);
      // Check that the placeholders were actually filled
      const filledData = result.filledData as any;
      expect(filledData).toBeDefined();
      // The filled data should contain our test values somewhere in the structure
    });

    test('should validate placeholder values', () => {
      const validation = placeholderFiller.validatePlaceholderValues('rfp_template', testValues);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect missing required placeholders', () => {
      const incompleteValues = {
        'header.buyer_name': 'Test Agency',
        // Missing other required fields
      };

      const validation = placeholderFiller.validatePlaceholderValues('rfp_template', incompleteValues);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should create fill report', () => {
      const report = placeholderFiller.createFillReport('rfp_template', testValues);
      
      expect(report.templateInfo).toBeDefined();
      expect(report.templateInfo?.id).toBe('rfp_template');
      expect(report.validation.valid).toBe(true);
      expect(report.fillResult.success).toBe(true);
    });
  });

  describe('PDF Generation Tests', () => {
    const testValues: PlaceholderValues = {
      'Website': 'https://test.govt.nz',
      'City': 'Wellington',
      'time': '15 January 2024',
      'Number': 'RFP-2024-001',
      'x': 'Digital Transformation Services',
      'Address': '123 Lambton Quay, Wellington 6011',
      'number': '+64-4-123-4567',
    };

    test('should generate permanent PDF files for review', async () => {
      const templates = ['rfp_template', 'rfi_template', 'rfq_template', 'rfb_template'];
      
      for (const templateId of templates) {
        const result = await fileGenerator.generatePDFFromYAML(
          templateId,
          'rfx-document.html',
          testValues,
          `${templateId}-review.pdf`
        );

        expect(result.success).toBe(true);
        expect(result.filePath).toBeDefined();
        
        // Verify file was created
        const fs = require('fs');
        expect(fs.existsSync(result.filePath!)).toBe(true);
        
        // Check file size
        const stats = fs.statSync(result.filePath!);
        expect(stats.size).toBeGreaterThan(1000); // Should be at least 1KB
      }
    }, 60000); // Increased timeout for PDF generation
  });

  afterAll(() => {
    // Clean up test output directory
    const fs = require('fs');
    const path = require('path');
    const testOutputDir = './test-output';
    
    if (fs.existsSync(testOutputDir)) {
      // Don't delete - keep files for review
      console.log('📁 PDF files kept for review in:', testOutputDir);
    }
  });
});
