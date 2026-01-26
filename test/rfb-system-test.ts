import { TemplateManager } from '../src/agents/rfx-automation/tools/template-manager';
import { PlaceholderFiller } from '../src/agents/rfx-automation/tools/fill-placeholders';
import { FileGenerator } from '../src/agents/rfx-automation/tools/file-generator';

// Test the refactored RFB template system
async function testRFBSystem() {
  console.log('Testing RFB Template System...\n');

  // Test TemplateManager
  console.log('1. Testing TemplateManager...');
  const templateManager = new TemplateManager();
  
  const rfbTemplate = templateManager.getRFBTemplate();
  const rfbTemplateData = templateManager.getRFBTemplateData();
  
  console.log('RFB Template found:', !!rfbTemplate);
  console.log('RFB Template Data found:', !!rfbTemplateData);
  
  if (rfbTemplate) {
    console.log('Template type:', rfbTemplate.templateType);
    console.log('Total placeholders:', rfbTemplate.placeholders.length);
    console.log('Sections:', rfbTemplate.metadata.sections);
  }

  // Test PlaceholderFiller
  console.log('\n2. Testing PlaceholderFiller...');
  const placeholderFiller = new PlaceholderFiller(templateManager);
  
  const placeholders = placeholderFiller.getRFBPlaceholders();
  console.log('Extracted placeholders:', placeholders.length);
  console.log('Sample placeholders:', placeholders.slice(0, 5));

  // Test filling with sample data
  const sampleValues = {
    'TITLE': 'Test RFB Document',
    'NUMBER': 'RFB-2024-001',
    'DATE': '2024-01-26',
    'DATE/TIME': '2024-02-15 17:00',
    'AGENCY NAME': 'Test Agency',
    'metadata.document_type': 'Request for Bid (RFB)',
    'metadata.purpose': 'For competitive bidding on test commodities',
    'header.title': 'Test RFB Document',
    'header.number': 'RFB-2024-001',
    'header.issued_date': '2024-01-26',
    'header.responses_due': '2024-02-15 17:00',
    'header.agency_name': 'Test Agency'
  };

  const validationResult = placeholderFiller.validateRFBValues(sampleValues);
  console.log('Validation result:', validationResult.valid);
  if (!validationResult.valid) {
    console.log('Validation errors:', validationResult.errors);
  }
  console.log('Validation suggestions:', validationResult.suggestions);

  const fillResult = placeholderFiller.fillRFBTemplate(sampleValues);
  console.log('Fill result success:', fillResult.success);
  if (!fillResult.success) {
    console.log('Fill errors:', fillResult.errors);
  }
  console.log('Unfilled placeholders:', fillResult.unfilledPlaceholders.length);

  // Test FileGenerator
  console.log('\n3. Testing FileGenerator...');
  const fileGenerator = new FileGenerator();
  
  const availableTemplates = fileGenerator.listAvailableTemplates();
  const yamlTemplates = fileGenerator.listYAMLTemplates();
  
  console.log('Available HTML templates:', availableTemplates);
  console.log('Available YAML templates:', yamlTemplates);
  
  const rfbPlaceholders = fileGenerator.getRFBPlaceholders();
  console.log('RFB placeholders from FileGenerator:', rfbPlaceholders.length);
  
  const fileValidation = fileGenerator.validateRFBData(sampleValues);
  console.log('FileGenerator validation:', fileValidation.valid);

  console.log('\n✅ RFB Template System Test Complete!');
  
  return {
    templateManager: !!rfbTemplate,
    placeholderFiller: fillResult.success,
    fileGenerator: fileValidation.valid
  };
}

// Run the test
testRFBSystem().then(results => {
  console.log('\nTest Results Summary:');
  console.log('TemplateManager:', results.templateManager ? '✅' : '❌');
  console.log('PlaceholderFiller:', results.placeholderFiller ? '✅' : '❌');
  console.log('FileGenerator:', results.fileGenerator ? '✅' : '❌');
}).catch(error => {
  console.error('Test failed:', error);
});
