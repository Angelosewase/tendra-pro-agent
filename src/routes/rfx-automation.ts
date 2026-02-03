import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { rfxAutomationAgent, RFXRequest } from "../agents/rfx-automation";
import { SpecsGenerator } from "../agents/rfx-automation/tools/specs-generator";
import { ClausePolicyGenerator } from "../agents/rfx-automation/tools/clause-policy-generator";
import * as fs from "fs";
import * as path from "path";

const rfxRoutes = new Hono();

// Validation schema for RFX request
const RFXRequestSchema = z.object({
  documentType: z.enum(["rfb", "rfi", "rfp", "rfq"]),
  title: z.string().min(1, "Title is required"),
  agencyName: z.string().min(1, "Agency name is required"),
  agencyLogo: z.string().optional(),
  issuedDate: z.string().min(1, "Issued date is required"),
  responsesDue: z.string().min(1, "Responses due date is required"),
  requirements: z
    .record(z.string(), z.any())
    .refine(
      (data) => Object.keys(data).length > 0,
      "Requirements are required",
    ),
  specifications: z.array(z.string()).optional(),
  budget: z
    .object({
      min: z.number(),
      max: z.number(),
      currency: z.string(),
    })
    .optional(),
  timeline: z.string().optional(),
  location: z.string().optional(),
});

rfxRoutes.post("/generate", zValidator("json", RFXRequestSchema), async (c) => {
  const request = c.req.valid("json") as RFXRequest;

  try {
    const result = await rfxAutomationAgent.run({ request });

    // Generate PDF URL if document was created successfully
    let pdfUrl = null;
    if (result.result?.success && result.document?.filePath) {
      const filename = path.basename(result.document.filePath);
      pdfUrl = `/rfx-automation/pdf/${filename}`;
    }

    return c.json({
      success: result.result?.success || false,
      data: {
        document: result.document,
        result: result.result,
        pdfUrl,
        messages: result.messages.map((msg) => ({
          type: msg.constructor.name,
          content: msg.content,
        })),
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Document generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// Serve generated PDF files
rfxRoutes.get("/pdf/:filename", async (c) => {
  const filename = c.req.param("filename");
  const outputDir = "./output";
  const filePath = path.join(outputDir, filename);

  try {
    // Validate that the file exists and is a PDF
    if (!fs.existsSync(filePath)) {
      return c.json(
        {
          success: false,
          error: "PDF file not found",
          details: `File ${filename} does not exist`,
        },
        404,
      );
    }

    if (!filename.toLowerCase().endsWith(".pdf")) {
      return c.json(
        {
          success: false,
          error: "Invalid file type",
          details: "Only PDF files are allowed",
        },
        400,
      );
    }

    // Read the file and serve it
    const fileBuffer = fs.readFileSync(filePath);

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to serve PDF file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// Simple AI test - just check if AI responds with basic JSON
rfxRoutes.get("/test-ai", async (c) => {
  console.log("🧪 [TEST] Testing basic AI response");

  try {
    const specsGenerator = new SpecsGenerator();
    await specsGenerator.initialize();

    // Test with simple model call
    const responseText = await specsGenerator.testBasicResponse();

    // Check if response contains our expected JSON
    const hasExpectedJson = responseText.includes("Hello world");

    console.log(` [TEST] AI response: ${hasExpectedJson ? "OK" : "FAIL"}`);

    return c.json({
      status: hasExpectedJson ? "working" : "failed",
      aiResponse: responseText,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ [TEST] AI test failed:", error);
    return c.json(
      {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

export default rfxRoutes;
