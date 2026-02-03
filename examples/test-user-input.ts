import { FileGenerator } from '../src/agents/rfx-automation/tools/file-generator';
import * as fs from 'fs';

// Sample user input data that would come from a form or API
const sampleUserInput = {
  header: {
    title: "Cloud Computing Services RFI",
    agency_department: "Department of Technology Services",
    rfi_issue_date: "2024-02-15"
  },
  section_1: {
    rfi_overview: {
      summary: "Seeking information about cloud computing solutions to modernize IT infrastructure"
    },
    rfi_contact: {
      point_of_contact: {
        name: "Jane Smith",
        title: "IT Procurement Manager",
        department_agency: "Department of Technology Services",
        email: "jane.smith@agency.gov",
        phone: "555-0123"
      },
      instructions: "Department of Technology Services"
    },
    submission_details: {
      method: "email to the RFI point of contact",
      requirements: "PDF format, maximum 10MB",
      physical_copies: "Not Allowed",
      physical_address: ""
    }
  },
  section_2: {
    background_information: {
      mission_history: "Committed to leveraging modern technology to improve government efficiency"
    },
    goals_and_outcome: {
      description: "Gather information about cloud computing solutions to enhance service delivery"
    }
  }
};

async function testUserInputFlow() {
  const fileGenerator = new FileGenerator();
  
  try {
    // Validate user input
    const validation = fileGenerator.validateUserInput('rfi', sampleUserInput);
    console.log('Validation results:', validation);
    
    if (validation.valid) {
      // Get template structure for UI guidance
      const structure = fileGenerator.getTemplateStructure('rfi');
      console.log('Template structure loaded');
      
      // Generate PDF from user input
      const result = await fileGenerator.generatePDFFromUserInput(
        'rfi',
        sampleUserInput,
        'test-rfi-from-user-input.pdf'
      );
      
      if (result.success) {
        console.log('PDF generated successfully:', result.filePath);
      } else {
        console.error('PDF generation failed:', result.fillResult.errors);
      }
    } else {
      console.error('Validation failed:', validation.errors);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Test with sample JSON data files
async function testWithSampleData() {
  const fileGenerator = new FileGenerator();
  
  try {
    // Load sample RFI data
    const rfiData = JSON.parse(fs.readFileSync('./examples/rfi-sample-data.json', 'utf8'));
    
    const result = await fileGenerator.generatePDFFromUserInput(
      'rfi',
      rfiData,
      'rfi-from-sample-data.pdf'
    );
    
    if (result.success) {
      console.log('RFI PDF generated from sample data:', result.filePath);
    }
    
    // Load sample RFB data
    const rfbData = JSON.parse(fs.readFileSync('./examples/rfb-sample-data.json', 'utf8'));
    
    const rfbResult = await fileGenerator.generatePDFFromUserInput(
      'rfb',
      rfbData,
      'rfb-from-sample-data.pdf'
    );
    
    if (rfbResult.success) {
      console.log('RFB PDF generated from sample data:', rfbResult.filePath);
    }
    
  } catch (error) {
    console.error('Error testing with sample data:', error);
  }
}

// Run tests
if (require.main === module) {
  testUserInputFlow();
  testWithSampleData();
}

export { testUserInputFlow, testWithSampleData };
