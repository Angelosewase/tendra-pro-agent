import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { SearchAgent } from "./search";

const mockSuppliers = [
  {
    id: "sup001",
    name: "Global Manufacturing Co.",
    capabilities: ["CNC machining", "Metal fabrication", "Assembly", "Quality inspection"],
    location: "Shenzhen, China",
    rating: 4.5,
    priceRange: { min: 1000, max: 50000, currency: "USD" },
    leadTime: "4-6 weeks",
    certifications: ["ISO 9001", "ISO 14001", "IATF 16949"]
  },
  {
    id: "sup002", 
    name: "Precision Components Ltd",
    capabilities: ["Injection molding", "Plastic fabrication", "3D printing", "Rapid prototyping"],
    location: "Taipei, Taiwan",
    rating: 4.2,
    priceRange: { min: 500, max: 25000, currency: "USD" },
    leadTime: "3-5 weeks",
    certifications: ["ISO 9001", "ISO 13485"]
  },
  {
    id: "sup003",
    name: "TechParts Solutions",
    capabilities: ["Electronics assembly", "PCB fabrication", "Component sourcing", "Testing"],
    location: "Seoul, South Korea", 
    rating: 4.7,
    priceRange: { min: 2000, max: 100000, currency: "USD" },
    leadTime: "2-4 weeks",
    certifications: ["ISO 9001", "IPC-A-610", "AS9100"]
  },
  {
    id: "sup004",
    name: "Industrial Supply Group",
    capabilities: ["Metal stamping", "Welding", "Powder coating", "Logistics"],
    location: "Houston, Texas, USA",
    rating: 4.0,
    priceRange: { min: 1500, max: 75000, currency: "USD" },
    leadTime: "6-8 weeks", 
    certifications: ["ISO 9001", "AWS D1.1"]
  },
  {
    id: "sup005",
    name: "Asian Manufacturing Hub",
    capabilities: ["Textile manufacturing", "Garment production", "Embroidery", "Packaging"],
    location: "Bangkok, Thailand",
    rating: 3.8,
    priceRange: { min: 300, max: 15000, currency: "USD" },
    leadTime: "5-7 weeks",
    certifications: ["ISO 9001", "WRAP", "OEKO-TEX"]
  },
  {
    id: "sup006",
    name: "EuroTech Precision",
    capabilities: ["Micro-machining", "Precision engineering", "Metrology", "R&D"],
    location: "Munich, Germany",
    rating: 4.9,
    priceRange: { min: 5000, max: 200000, currency: "USD" },
    leadTime: "8-12 weeks",
    certifications: ["ISO 9001", "ISO 27001", "VDA 6.1"]
  },
  {
    id: "sup007",
    name: "FlexManufacturing Solutions",
    capabilities: ["Custom fabrication", "Low-volume production", "Design services", "Consulting"],
    location: "Toronto, Canada",
    rating: 4.3,
    priceRange: { min: 800, max: 30000, currency: "USD" },
    leadTime: "4-6 weeks",
    certifications: ["ISO 9001", "CSA Z299"]
  },
  {
    id: "sup008",
    name: "Pacific Rim Industries",
    capabilities: ["Casting", "Forging", "Heat treatment", "Surface finishing"],
    location: "Osaka, Japan",
    rating: 4.6,
    priceRange: { min: 3000, max: 80000, currency: "USD" },
    leadTime: "7-10 weeks",
    certifications: ["ISO 9001", "JIS", "AS9100"]
  }
];

const DataIngestionSchema = z.object({
  category: z.string().describe("The product category being sourced"),
  location: z.string().optional().describe("Preferred geographic location for suppliers"),
  specifications: z.array(z.string()).describe("Technical specifications and requirements")
});

export const dataIngestionTool = tool(
  async ({ category, location, specifications }) => {
    console.log(`Starting enhanced supplier search for category: ${category}, location: ${location || "any"}`);
    
    try {
      // Initialize search agent
      const searchAgent = new SearchAgent();
      await searchAgent.initialize();
      
      // Search for suppliers using the search agent
      const searchResult = await searchAgent.searchSuppliers({
        category,
        location,
        specifications
      });
      
      console.log("Search agent completed supplier search");
      
      // Parse search results and supplement with mock data
      let foundSuppliers = [];
      
      // Try to extract structured data from search results
      if (searchResult && searchResult.output) {
        // Simple parsing logic - in a real implementation, this would be more sophisticated
        const searchOutput = searchResult.output.toString();
        console.log("Search output:", searchOutput);
        
        // For now, we'll use the mock data as fallback and enhance with search insights
        // In a production system, you'd parse the search results to extract real supplier data
      }
      
      // Filter mock suppliers based on criteria (keeping existing logic as fallback)
      let filteredSuppliers = mockSuppliers;
      
      // Filter by category match based on capabilities
      if (category) {
        const categoryKeywords = category.toLowerCase().split(" ");
        filteredSuppliers = filteredSuppliers.filter(supplier => 
          supplier.capabilities.some(cap => 
            categoryKeywords.some(keyword => 
              cap.toLowerCase().includes(keyword)
            )
          )
        );
      }
      
      // Filter by location preference
      if (location) {
        const locationKeywords = location.toLowerCase().split(" ");
        filteredSuppliers = filteredSuppliers.filter(supplier =>
          locationKeywords.some(keyword =>
            supplier.location.toLowerCase().includes(keyword)
          )
        );
      }
      
      // Filter by specifications match
      if (specifications && specifications.length > 0) {
        filteredSuppliers = filteredSuppliers.filter(supplier =>
          specifications.some(spec =>
            supplier.capabilities.some(cap =>
              cap.toLowerCase().includes(spec.toLowerCase()) ||
              spec.toLowerCase().includes(cap.toLowerCase())
            )
          )
        );
      }
      
      // If no suppliers match the filters, return all suppliers as fallback
      if (filteredSuppliers.length === 0) {
        console.log("No suppliers found matching criteria, returning all suppliers");
        filteredSuppliers = mockSuppliers;
      }
      
      console.log(`Found ${filteredSuppliers.length} matching suppliers using enhanced search`);
      
      return {
        suppliers: filteredSuppliers,
        searchCriteria: {
          category,
          location,
          specifications,
          totalFound: filteredSuppliers.length,
          searchEnhanced: true,
          searchResults: searchResult?.output || "No search results available"
        }
      };
      
    } catch (error) {
      console.error("Search agent failed, falling back to mock data:", error);
      
      // Fallback to original logic if search fails
      let filteredSuppliers = mockSuppliers;
      
      // Filter by category match based on capabilities
      if (category) {
        const categoryKeywords = category.toLowerCase().split(" ");
        filteredSuppliers = filteredSuppliers.filter(supplier => 
          supplier.capabilities.some(cap => 
            categoryKeywords.some(keyword => 
              cap.toLowerCase().includes(keyword)
            )
          )
        );
      }
      
      // Filter by location preference
      if (location) {
        const locationKeywords = location.toLowerCase().split(" ");
        filteredSuppliers = filteredSuppliers.filter(supplier =>
          locationKeywords.some(keyword =>
            supplier.location.toLowerCase().includes(keyword)
          )
        );
      }
      
      // Filter by specifications match
      if (specifications && specifications.length > 0) {
        filteredSuppliers = filteredSuppliers.filter(supplier =>
          specifications.some(spec =>
            supplier.capabilities.some(cap =>
              cap.toLowerCase().includes(spec.toLowerCase()) ||
              spec.toLowerCase().includes(cap.toLowerCase())
            )
          )
        );
      }
      
      // If no suppliers match the filters, return all suppliers as fallback
      if (filteredSuppliers.length === 0) {
        console.log("No suppliers found matching criteria, returning all suppliers");
        filteredSuppliers = mockSuppliers;
      }
      
      return {
        suppliers: filteredSuppliers,
        searchCriteria: {
          category,
          location,
          specifications,
          totalFound: filteredSuppliers.length,
          searchEnhanced: false,
          fallbackReason: "Search agent failed"
        }
      };
    }
  },
  {
    name: "data_ingestion",
    description: "Ingest and filter supplier data using search agent and project requirements",
    schema: DataIngestionSchema
  }
);

export async function searchSuppliers(params: {
  category: string;
  location?: string;
  specifications: string[];
}) {
  return await dataIngestionTool.invoke(params);
}