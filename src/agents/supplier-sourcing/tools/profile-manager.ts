import { tool } from "@langchain/core/tools";
import { z } from "zod";

const ProfileManagerSchema = z.object({
  supplierId: z.string().describe("The ID of the supplier to profile"),
  action: z.enum(["get", "update", "create", "delete", "remove", "archive"]).describe("The action to perform on the profile"),
  profileData: z.object({
    name: z.string().optional(),
    capabilities: z.array(z.string()).optional(),
    location: z.string().optional(),
    rating: z.number().optional(),
    priceRange: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      currency: z.string().optional(),
    }).optional(),
    leadTime: z.string().optional(),
    certifications: z.array(z.string()).optional(),
    performanceHistory: z.array(z.object({
      date: z.string(),
      project: z.string(),
      score: z.number(),
      notes: z.string(),
    })).optional(),
    riskAssessment: z.object({
      financialStability: z.number().optional(),
      qualityConsistency: z.number().optional(),
      deliveryReliability: z.number().optional(),
      communicationScore: z.number().optional(),
    }).optional(),
  }).optional(),
});

// Mock supplier profiles database
const supplierProfiles = new Map();

export const profileManagerTool = tool(
  async ({ supplierId, action, profileData }) => {
    console.log(`Profile manager: ${action} profile for supplier ${supplierId}`);
    
    switch (action) {
      case "get":
        if (supplierProfiles.has(supplierId)) {
          return {
            success: true,
            profile: supplierProfiles.get(supplierId),
            message: `Retrieved profile for supplier ${supplierId}`
          };
        } else {
          return {
            success: false,
            message: `No profile found for supplier ${supplierId}`,
            profile: null
          };
        }
        
      case "create":
      case "update":
        if (!profileData) {
          return {
            success: false,
            message: "Profile data is required for create/update operations"
          };
        }
        
        const existingProfile = supplierProfiles.get(supplierId) || {};
        const updatedProfile = { ...existingProfile, ...profileData, supplierId };
        
        // Add default values if not provided
        if (!updatedProfile.performanceHistory) {
          updatedProfile.performanceHistory = [];
        }
        
        if (!updatedProfile.riskAssessment) {
          updatedProfile.riskAssessment = {
            financialStability: 3.5,
            qualityConsistency: 3.5,
            deliveryReliability: 3.5,
            communicationScore: 3.5,
          };
        }
        
        supplierProfiles.set(supplierId, updatedProfile);
        
        return {
          success: true,
          profile: updatedProfile,
          message: `${action === "create" ? "Created" : "Updated"} profile for supplier ${supplierId}`
        };
        
      default:
        return {
          success: false,
          message: `Unknown action: ${action}`
        };
    }
  },
  {
    name: "profile_manager",
    description: "Manage supplier profiles including creation, retrieval, and updates",
    schema: ProfileManagerSchema
  }
);

export async function getSupplierProfile(supplierId: string) {
  return await profileManagerTool.invoke({
    supplierId,
    action: "get"
  });
}

export async function updateSupplierProfile(supplierId: string, profileData: any) {
  return await profileManagerTool.invoke({
    supplierId,
    action: "update",
    profileData
  });
}