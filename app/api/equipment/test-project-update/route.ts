import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { checkValidClient } from "@/lib/auth";

// POST - Test project spent amount update
export const POST = async (req: NextRequest) => {
  // Bearer token authentication
  try {
    await checkValidClient(req);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await connect();

    const { projectId, amount } = await req.json();

    if (!projectId) {
      return errorResponse("Project ID is required", 400);
    }

    if (!isValidObjectId(projectId)) {
      return errorResponse("Invalid project ID format", 400);
    }

    if (typeof amount !== 'number') {
      return errorResponse("Amount must be a number", 400);
    }

    // Get current project
    const currentProject = await Projects.findById(projectId);
    if (!currentProject) {
      return errorResponse("Project not found", 404);
    }

    console.log('🧪 Testing project update:', {
      projectId,
      currentSpent: currentProject.spent,
      spentType: typeof currentProject.spent,
      spentIsNull: currentProject.spent === null,
      spentIsUndefined: currentProject.spent === undefined,
      amountToAdd: amount
    });

    // Handle null/undefined spent field
    const currentSpent = currentProject.spent || 0;
    const newSpentAmount = currentSpent + amount;

    // Use $set instead of $inc for more reliable updates
    const updatedProject = await Projects.findByIdAndUpdate(
      projectId,
      { $set: { spent: newSpentAmount } },
      { new: true }
    );

    console.log('✅ Project update test result:', {
      projectId,
      previousSpent: currentSpent,
      newSpent: updatedProject?.spent,
      amountAdded: amount,
      actualDifference: (updatedProject?.spent || 0) - currentSpent,
      updateMethod: '$set'
    });

    // Also test with $inc method
    const testIncProject = await Projects.findByIdAndUpdate(
      projectId,
      { $inc: { spent: 1 } },
      { new: true }
    );

    console.log('🧪 $inc method test:', {
      spentAfterInc: testIncProject?.spent,
      incWorked: testIncProject?.spent === (updatedProject?.spent || 0) + 1
    });

    // Reset to original value
    await Projects.findByIdAndUpdate(
      projectId,
      { $set: { spent: newSpentAmount } },
      { new: true }
    );

    return successResponse(
      {
        projectId,
        previousSpent: currentSpent,
        newSpent: updatedProject?.spent,
        amountAdded: amount,
        actualDifference: (updatedProject?.spent || 0) - currentSpent,
        tests: {
          setMethod: {
            worked: (updatedProject?.spent || 0) === newSpentAmount,
            result: updatedProject?.spent
          },
          incMethod: {
            worked: testIncProject?.spent === (updatedProject?.spent || 0) + 1,
            result: testIncProject?.spent
          }
        },
        success: true
      },
      "Project spent amount test completed successfully"
    );
  } catch (error: unknown) {
    console.error('❌ Project update test failed:', error);
    return errorResponse("Failed to test project update", 500);
  }
};