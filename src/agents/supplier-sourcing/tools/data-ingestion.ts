import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { SearchAgent } from "./search";
import { Supplier, SupplierSearchResult } from "../../../types";

const DataIngestionSchema = z.object({
  category: z.string().describe("The product category being sourced"),
  location: z.string().optional().describe("Preferred geographic location for suppliers"),
  specifications: z.array(z.string()).describe("Technical specifications and requirements")
});

export const dataIngestionTool = tool(
  async ({ category, location, specifications }) => {
    console.log(`Starting enhanced supplier search for category: ${category}, location: ${location || "any"}`);
    
    try {
      const searchAgent = new SearchAgent();
      await searchAgent.initialize();
      
      // Search for suppliers using the search agent
      const searchResult = await searchAgent.searchSuppliers({
        category,
        location,
        specifications
      });
      
      console.log("Search agent completed supplier search");
      
      let foundSuppliers: Supplier[] = [];
      
      if (searchResult && searchResult.output) {
        const searchOutput = searchResult.output.toString();
        console.log("Search output:", searchOutput);
        try {
          const parsedResult = typeof searchOutput === 'string' ? JSON.parse(searchOutput) : searchOutput;
          
          if (parsedResult && parsedResult.suppliers && Array.isArray(parsedResult.suppliers)) {
            foundSuppliers = parsedResult.suppliers.map((supplier: any, index: number) => ({
              id: supplier.id || `supplier-${Date.now()}-${index}`,
              name: supplier.name || 'Unknown Supplier',
              capabilities: supplier.capabilities || [],
              location: supplier.location || 'Unknown Location',
              rating: supplier.rating || 0,
              priceRange: {
                min: supplier.priceRange?.min || 0,
                max: supplier.priceRange?.max || 0,
                currency: supplier.priceRange?.currency || 'USD'
              },
              leadTime: supplier.leadTime || 'Unknown',
              certifications: supplier.certifications || []
            }));
          } else {
            console.warn("No suppliers array found in search results, using empty array");
            foundSuppliers = [];
          }
        } catch (parseError) {
          console.error("Failed to parse search results as JSON:", parseError);
          console.warn("Search agent returned unexpected format, returning empty results");
          foundSuppliers = [];
        }
      }
      
      console.log(`Search completed with ${foundSuppliers.length} suppliers found`);
      
      return {
        suppliers: foundSuppliers,
        searchCriteria: {
          category,
          location,
          specifications,
          totalFound: foundSuppliers.length,
          searchEnhanced: true,
          searchResults: searchResult?.output || "No search results available"
        }
      };
      
    } catch (error: unknown) {
      console.error("Search agent failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        suppliers: [],
        searchCriteria: {
          category,
          location,
          specifications,
          totalFound: 0,
          searchEnhanced: false,
          fallbackReason: "Search agent failed",
          error: errorMessage
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
}): Promise<SupplierSearchResult> {
  return await dataIngestionTool.invoke(params);
}