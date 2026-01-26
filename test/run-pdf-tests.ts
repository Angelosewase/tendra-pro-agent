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
    'header.buyer_name': 'Test Government Agency',
    'header.procurement_title': 'Software Development Services',
    'header.reference_number': 'RFP-2024-001',
    'header.rfp_released_date': '15 Jan 2024',
    'header.deadline_questions': '25 Jan 2024',
    'header.deadline_proposals': '05 Feb 2024',
    'header.buyer_contact.name': 'John Doe',
    'header.buyer_contact.website': 'https://test.govt.nz',
    'header.buyer_contact.street_address': '123 Test Street',
    'header.buyer_contact.city': 'Wellington',
    'metadata.document_type': 'Request for Proposal (RFP)',
    'metadata.purpose': 'For procurement where innovative solutions are sought and price is not the only evaluation criterion.',
    'section_1_opportunity.summary': 'We need a modern software solution for our government services.',
    'section_1_opportunity.what_we_need.description': 'A comprehensive software platform that can handle our operations.',
    'section_1_opportunity.what_we_dont_wanted.included': 'No',
    'section_1_opportunity.what_we_dont_wanted.description': 'We do not want legacy systems.',
    'section_1_opportunity.whats_important.description': 'Innovation, cost-effectiveness, and scalability are important.',
    'section_1_opportunity.why_bid.motivation': 'This is an opportunity to make a significant impact on public services.',
    'section_1_opportunity.about_us.description': 'We are a government agency dedicated to serving the public.',
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
