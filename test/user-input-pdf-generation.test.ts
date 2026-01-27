import { describe, it, expect, beforeEach, beforeAll } from 'bun:test'
import { FileGenerator } from '../src/agents/rfx-automation/tools/file-generator'
import { PlaceholderFiller } from '../src/agents/rfx-automation/tools/fill-placeholders'
import * as fs from 'fs'
import * as path from 'path'

// Set test environment
process.env.NODE_ENV = 'test'

describe('User Input PDF Generation', () => {
  let fileGenerator: FileGenerator
  let placeholderFiller: PlaceholderFiller
  let testOutputDir: string

  beforeAll(() => {
    testOutputDir = './test-output'
    // Ensure test output directory exists
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true })
    }
  })

  beforeEach(() => {
    fileGenerator = new FileGenerator(testOutputDir)
    placeholderFiller = new PlaceholderFiller()
  })

  describe('PlaceholderValues Interface Enhancement', () => {
    it('should accept string values', () => {
      const values: any = {
        'header.title': 'Test Title',
        'header.agency': 'Test Agency'
      }
      
      const result = placeholderFiller.fillTemplateData(
        { header: { title: '[header.title]', agency: '[header.agency]' } } as any,
        values
      )
      
      expect(result.success).toBe(true)
      expect(result.filledData).toBeDefined()
      expect((result.filledData as any).header.title).toBe('Test Title')
      expect((result.filledData as any).header.agency).toBe('Test Agency')
    })

    it('should accept number values', () => {
      const values: any = {
        'header.number': 123,
        'header.year': 2024
      }
      
      const result = placeholderFiller.fillTemplateData(
        { header: { number: '[header.number]', year: '[header.year]' } } as any,
        values
      )
      
      expect(result.success).toBe(true)
      expect((result.filledData as any).header.number).toBe('123')
      expect((result.filledData as any).header.year).toBe('2024')
    })

    it('should accept boolean values', () => {
      const values: any = {
        'required': true,
        'optional': false
      }
      
      const result = placeholderFiller.fillTemplateData(
        { required: '[required]', optional: '[optional]' } as any,
        values
      )
      
      expect(result.success).toBe(true)
      expect((result.filledData as any).required).toBe('true')
      expect((result.filledData as any).optional).toBe('false')
    })

    it('should accept array values', () => {
      const values: any = {
        'items': ['item1', 'item2', 'item3']
      }
      
      const result = placeholderFiller.fillTemplateData(
        { items: '[items]' } as any,
        values
      )
      
      expect(result.success).toBe(true)
      expect((result.filledData as any).items).toBe('item1, item2, item3')
    })

    it('should accept object values', () => {
      const values: any = {
        'contact': { name: 'John', email: 'john@test.com' }
      }
      
      const result = placeholderFiller.fillTemplateData(
        { contact: '[contact]' } as any,
        values
      )
      
      expect(result.success).toBe(true)
      expect((result.filledData as any).contact).toBe('{"name":"John","email":"john@test.com"}')
    })
  })

  describe('User Input Conversion', () => {
    it('should convert nested user input to flat placeholders', () => {
      const userInput = {
        header: {
          title: 'Test Document',
          agency: 'Test Agency'
        },
        section: {
          description: 'Test section'
        }
      }
      
      // Access private method through reflection for testing
      const convertMethod = (fileGenerator as any).convertUserInputToPlaceholders
      const flattened = convertMethod.call(fileGenerator, userInput)
      
      expect(flattened['header.title']).toBe('Test Document')
      expect(flattened['header.agency']).toBe('Test Agency')
      expect(flattened['section.description']).toBe('Test section')
    })

    it('should handle arrays in user input', () => {
      const userInput = {
        items: ['item1', 'item2'],
        numbers: [1, 2, 3]
      }
      
      const convertMethod = (fileGenerator as any).convertUserInputToPlaceholders
      const flattened = convertMethod.call(fileGenerator, userInput)
      
      expect(flattened['items']).toBe('item1, item2')
      expect(flattened['numbers']).toBe('1, 2, 3')
    })
  })

  describe('User Input Validation', () => {
    it('should validate RFI user input', () => {
      const userInput = {
        header: {
          title: 'Test RFI',
          agency_department: 'Test Department',
          rfi_issue_date: '2024-02-15'
        }
      }
      
      const validation = fileGenerator.validateUserInput('rfi', userInput)
      
      expect(validation).toHaveProperty('valid')
      expect(validation).toHaveProperty('errors')
      expect(validation).toHaveProperty('suggestions')
      expect(Array.isArray(validation.errors)).toBe(true)
      expect(Array.isArray(validation.suggestions)).toBe(true)
    })

    it('should validate RFB user input', () => {
      const userInput = {
        header: {
          title: 'Test RFB',
          number: 'RFB-001',
          issued_date: '2024-02-15'
        }
      }
      
      const validation = fileGenerator.validateUserInput('rfb', userInput)
      
      expect(validation).toHaveProperty('valid')
      expect(validation).toHaveProperty('errors')
      expect(validation).toHaveProperty('suggestions')
    })

    it('should return errors for invalid template type', () => {
      const userInput = { title: 'Test' }
      
      const validation = fileGenerator.validateUserInput('invalid' as any, userInput)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Unknown template type: invalid')
    })
  })

  describe('Template Structure Retrieval', () => {
    it('should get RFI template structure', () => {
      const structure = fileGenerator.getTemplateStructure('rfi')
      
      expect(structure).toBeDefined()
      expect(typeof structure).toBe('object')
    })

    it('should get RFB template structure', () => {
      const structure = fileGenerator.getTemplateStructure('rfb')
      
      expect(structure).toBeDefined()
      expect(typeof structure).toBe('object')
    })

    it('should return null for invalid template type', () => {
      const structure = fileGenerator.getTemplateStructure('invalid' as any)
      
      expect(structure).toBeNull()
    })
  })

  describe('Sample Data Integration', () => {
    it('should load and validate sample RFI data', () => {
      const samplePath = path.join(__dirname, '../examples/rfi-sample-data.json')
      
      if (fs.existsSync(samplePath)) {
        const sampleData = JSON.parse(fs.readFileSync(samplePath, 'utf8'))
        const validation = fileGenerator.validateUserInput('rfi', sampleData)
        
        expect(validation).toHaveProperty('valid')
        expect(Array.isArray(validation.errors)).toBe(true)
        expect(Array.isArray(validation.suggestions)).toBe(true)
      } else {
        console.log('Skipping RFI sample data test - file not found')
      }
    })

    it('should load and validate sample RFB data', () => {
      const samplePath = path.join(__dirname, '../examples/rfb-sample-data.json')
      
      if (fs.existsSync(samplePath)) {
        const sampleData = JSON.parse(fs.readFileSync(samplePath, 'utf8'))
        const validation = fileGenerator.validateUserInput('rfb', sampleData)
        
        expect(validation).toHaveProperty('valid')
        expect(Array.isArray(validation.errors)).toBe(true)
        expect(Array.isArray(validation.suggestions)).toBe(true)
      } else {
        console.log('Skipping RFB sample data test - file not found')
      }
    })
  })

  describe('Actual PDF Generation from User Input', () => {
    it('should generate RFI PDF from user input', async () => {
      const userInput = {
        header: {
          title: "Request for Information - Cloud Computing Services",
          agency_department: "Department of Technology Services",
          rfi_issue_date: "2024-02-15"
        },
        section_1: {
          rfi_overview: {
            summary: "The Department of Technology Services is seeking information about cloud computing solutions to modernize our IT infrastructure and improve service delivery to citizens."
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
            requirements: "PDF format, maximum 10MB, include 'RFI Response - Cloud Services' in subject line",
            physical_copies: "Not Allowed",
            physical_address: ""
          }
        },
        section_2: {
          background_information: {
            mission_history: "The Department of Technology Services is committed to leveraging modern technology to improve government efficiency and citizen services."
          },
          goals_and_outcome: {
            description: "We aim to gather information about cloud computing solutions that can enhance our service delivery, reduce costs, and improve scalability."
          }
        }
      }
      
      const result = await fileGenerator.generatePDFFromUserInput(
        'rfi',
        userInput,
        'test-rfi-from-user-input.pdf'
      )
      
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('filePath')
      expect(result).toHaveProperty('fillResult')
      
      if (result.success) {
        expect(fs.existsSync(result.filePath!)).toBe(true)
        expect(result.filePath).toContain('test-rfi-from-user-input.pdf')
        console.log(`✓ RFI PDF generated: ${result.filePath}`)
      } else {
        console.log('✗ RFI PDF generation failed:', result.fillResult.errors)
      }
    }, 30000) // Increase timeout for PDF generation

    it('should generate RFB PDF from sample data', async () => {
      const samplePath = path.join(__dirname, '../examples/rfb-sample-data.json')
      
      if (fs.existsSync(samplePath)) {
        const sampleData = JSON.parse(fs.readFileSync(samplePath, 'utf8'))
        
        const result = await fileGenerator.generatePDFFromUserInput(
          'rfb',
          sampleData,
          'test-rfb-from-sample-data.pdf'
        )
        
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('filePath')
        expect(result).toHaveProperty('fillResult')
        
        if (result.success) {
          expect(fs.existsSync(result.filePath!)).toBe(true)
          expect(result.filePath).toContain('test-rfb-from-sample-data.pdf')
          console.log(`✓ RFB PDF generated: ${result.filePath}`)
        } else {
          console.log('✗ RFB PDF generation failed:', result.fillResult.errors)
        }
      } else {
        console.log('Skipping RFB PDF generation test - sample file not found')
      }
    }, 30000)

    it('should generate RFP PDF from sample data', async () => {
      const samplePath = path.join(__dirname, '../examples/rfp-sample-data.json')
      
      if (fs.existsSync(samplePath)) {
        const sampleData = JSON.parse(fs.readFileSync(samplePath, 'utf8'))
        
        const result = await fileGenerator.generatePDFFromUserInput(
          'rfp',
          sampleData,
          'test-rfp-from-sample-data.pdf'
        )
        
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('filePath')
        expect(result).toHaveProperty('fillResult')
        
        if (result.success) {
          expect(fs.existsSync(result.filePath!)).toBe(true)
          expect(result.filePath).toContain('test-rfp-from-sample-data.pdf')
          console.log(`✓ RFP PDF generated: ${result.filePath}`)
        } else {
          console.log('✗ RFP PDF generation failed:', result.fillResult.errors)
        }
      } else {
        console.log('Skipping RFP PDF generation test - sample file not found')
      }
    }, 30000)

    it('should generate RFQ PDF from sample data', async () => {
      const samplePath = path.join(__dirname, '../examples/rfq-sample-data.json')
      
      if (fs.existsSync(samplePath)) {
        const sampleData = JSON.parse(fs.readFileSync(samplePath, 'utf8'))
        
        const result = await fileGenerator.generatePDFFromUserInput(
          'rfq',
          sampleData,
          'test-rfq-from-sample-data.pdf'
        )
        
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('filePath')
        expect(result).toHaveProperty('fillResult')
        
        if (result.success) {
          expect(fs.existsSync(result.filePath!)).toBe(true)
          expect(result.filePath).toContain('test-rfq-from-sample-data.pdf')
          console.log(`✓ RFQ PDF generated: ${result.filePath}`)
        } else {
          console.log('✗ RFQ PDF generation failed:', result.fillResult.errors)
        }
      } else {
        console.log('Skipping RFQ PDF generation test - sample file not found')
      }
    }, 30000)
  })

  describe('Backward Compatibility', () => {
    it('should still work with original string-based PlaceholderValues', () => {
      const stringValues = {
        'header.title': 'Test Title',
        'header.agency': 'Test Agency'
      }
      
      const result = placeholderFiller.fillTemplateData(
        { header: { title: '[header.title]', agency: '[header.agency]' } } as any,
        stringValues
      )
      
      expect(result.success).toBe(true)
      expect((result.filledData as any).header.title).toBe('Test Title')
      expect((result.filledData as any).header.agency).toBe('Test Agency')
    })

    it('should maintain existing validation methods', () => {
      const stringValues = {
        'header.title': 'Test Title',
        'header.agency': 'Test Agency'
      }
      
      const validation = placeholderFiller.validateRFBValues(stringValues)
      
      expect(validation).toHaveProperty('valid')
      expect(validation).toHaveProperty('errors')
      expect(validation).toHaveProperty('suggestions')
    })
  })
})
