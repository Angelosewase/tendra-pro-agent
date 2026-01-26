import { TemplateManager } from '../src/agents/rfx-automation/tools/template-manager';
import { PlaceholderFiller, PlaceholderValues } from '../src/agents/rfx-automation/tools/fill-placeholders';
import { FileGenerator } from '../src/agents/rfx-automation/tools/file-generator';

async function runPDFTests() {
  console.log('🚀 Starting PDF Generation Tests...\n');

  // Initialize tools
  const templateManager = new TemplateManager();
  const placeholderFiller = new PlaceholderFiller(templateManager);
  const fileGenerator = new FileGenerator('./test-output', 'c:/projects/tendra/tendra-pro-agent/src/agents/rfx-automation/templates', 'c:/projects/tendra/tendra-pro-agent/src/agents/rfx-automation/tools/html-templates');

  // Test data
  const testValues: PlaceholderValues = {
    'Insert name of the Buyer': 'Test Government Agency',
    'Insert name of procurement': 'Software Development Services',
    'Procurement reference number': 'RFP-2024-001',
    'DD MM YY': '15 Jan 2024',
    'TIME DD MM YY': '25 Jan 2024',
    'Name of Buyer': 'John Doe',
    'Website': 'https://test.govt.nz',
    'Street address': '123 Test Street',
    'City': 'Wellington',
  };

  try {
    // Test 1: Template Manager
    console.log('📋 Test 1: Template Manager');
    const templates = templateManager.getAllTemplates();
    console.log(`   ✅ Found ${templates.length} templates`);
    
    const rfpTemplate = templateManager.getTemplate('rfp_template');
    console.log(`   ✅ RFP Template: ${rfpTemplate ? 'Found' : 'Not found'}`);
    
    const validation = templateManager.validateTemplate('rfp_template');
    console.log(`   ✅ Template validation: ${validation.valid ? 'Valid' : 'Invalid'}`);
    
    const placeholders = placeholderFiller.extractPlaceholders('rfp_template');
    console.log(`   ✅ Extracted ${placeholders.length} placeholders`);

    // Test 2: Placeholder Filler
    console.log('\n🔧 Test 2: Placeholder Filler');
    const fillResult = placeholderFiller.fillTemplate('rfp_template', testValues);
    console.log(`   ✅ Template fill: ${fillResult.success ? 'Success' : 'Failed'}`);
    console.log(`   ✅ Errors: ${fillResult.errors.length}`);
    console.log(`   ✅ Warnings: ${fillResult.warnings.length}`);
    
    if (fillResult.filledData) {
      const header = fillResult.filledData.header as any;
      console.log(`   ✅ Buyer name: ${header?.buyer_name || 'N/A'}`);
      console.log(`   ✅ Procurement title: ${header?.procurement_title || 'N/A'}`);
    }

    const validation2 = placeholderFiller.validatePlaceholderValues('rfp_template', testValues);
    console.log(`   ✅ Value validation: ${validation2.valid ? 'Valid' : 'Invalid'}`);

    // Test 3: File Generator
    console.log('\n📄 Test 3: File Generator');
    const yamlTemplates = fileGenerator.listYAMLTemplates();
    const htmlTemplates = fileGenerator.listAvailableTemplates();
    console.log(`   ✅ YAML templates: ${yamlTemplates.length}`);
    console.log(`   ✅ HTML templates: ${htmlTemplates.length}`);

    // Test 4: PDF Generation
    console.log('\n🖨️  Test 4: PDF Generation');
    const pdfResult = await fileGenerator.generatePDFFromYAML(
      'rfp_template',
      'rfx-document.html',
      testValues,
      'test-rfp-output.pdf'
    );
    
    console.log(`   ✅ PDF generation: ${pdfResult.success ? 'Success' : 'Failed'}`);
    if (pdfResult.success) {
      console.log(`   ✅ File path: ${pdfResult.filePath}`);
      console.log(`   ✅ Fill result: ${pdfResult.fillResult.success ? 'Success' : 'Failed'}`);
    }

    // Test 5: Multiple Templates
    console.log('\n📚 Test 5: Multiple Templates');
    const simpleValues: PlaceholderValues = {
      'header.buyer_name': 'Multi Test Agency',
      'header.procurement_title': 'Multiple Template Test',
      'metadata.document_type': 'Test Document',
      'metadata.purpose': 'Testing multiple templates',
    };

    const templateIds = ['rfp_template', 'rfi_template', 'rfq_template'];
    const multiResults = placeholderFiller.fillMultipleTemplates(templateIds, simpleValues);
    
    console.log(`   ✅ Multiple templates filled: ${Object.keys(multiResults).length}`);
    Object.entries(multiResults).forEach(([id, result]) => {
      console.log(`   ✅ ${id}: ${result.success ? 'Success' : 'Failed'}`);
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('📁 Check the ./test-output directory for generated PDF files');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
runPDFTests().catch(console.error);
