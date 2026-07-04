import connect from "@/lib/db";
import { MaterialActivity } from "@/lib/models/Xsite/materials-activity";
import { errorResponse, successResponse } from "@/lib/models/utils/API";
import { NextRequest } from "next/server";

// GET: Fetch unique contractors for a client
export const GET = async (req: NextRequest | Request) => {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const projectId = searchParams.get("projectId");

  if (!clientId) {
    return errorResponse("clientId is required", 406);
  }

  try {
    await connect();

    const query: Record<string, any> = { clientId };
    if (projectId) {
      query.projectId = projectId;
    }
    
    // We want contractor_name to exist and not be empty
    query.contractor_name = { $exists: true, $ne: "" };

    // Get distinct contractor names from MaterialActivity using indexed field
    const contractors = await MaterialActivity.distinct("contractor_name", query);

    // Filter, clean and sort
    const cleanedContractors = contractors
      .filter((name: any) => typeof name === "string" && name.trim() !== "")
      .map((name: string) => name.trim())
      .sort((a: string, b: string) => a.localeCompare(b));

    // Deduplicate casing (e.g. "Chinmay" and "chinmay") by taking the first seen format
    const uniqueContractors: string[] = [];
    const seenLower = new Set<string>();

    for (const contractor of cleanedContractors) {
      const lower = contractor.toLowerCase();
      if (!seenLower.has(lower)) {
        seenLower.add(lower);
        uniqueContractors.push(contractor);
      }
    }

    return successResponse(
      uniqueContractors,
      "Contractors fetched successfully",
      200
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return errorResponse("Something went wrong", 500, error.message);
    }
    return errorResponse("Unknown error occurred", 500);
  }
};
