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
      // This now returns the suppliers array directly thanks to our fix
      const suppliers = await searchAgent.searchSuppliers({
        category,
        location,
        specifications
      });
      
      console.log("Search agent completed supplier search");
      console.log(`Raw suppliers data:`, suppliers);
      
      let foundSuppliers: Supplier[] = [];
      
      if (Array.isArray(suppliers) && suppliers.length > 0) {
        foundSuppliers = suppliers.map((supplier: any, index: number) => ({
          id: supplier.id || `supplier-${Date.now()}-${index}`,
          name: supplier.name || 'Unknown Supplier',
          capabilities: Array.isArray(supplier.capabilities) ? supplier.capabilities : [],
          location: supplier.location || 'Unknown Location',
          rating: typeof supplier.rating === 'number' ? Math.min(5, Math.max(0, supplier.rating)) : 0,
          priceRange: {
            min: typeof supplier.priceRange?.min === 'number' ? supplier.priceRange.min : 0,
            max: typeof supplier.priceRange?.max === 'number' ? supplier.priceRange.max : 0,
            currency: supplier.priceRange?.currency || 'USD'
          },
          leadTime: supplier.leadTime || 'Unknown',
          certifications: Array.isArray(supplier.certifications) ? supplier.certifications : []
        }));
      } else {
        console.warn("No suppliers found or invalid format");
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