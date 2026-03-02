import connect from "@/lib/db";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import mongoose from "mongoose";

// POST - Direct MongoDB test without using Projects model
export const POST = async (req: NextRequest) => {
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

    console.log('🔍 Direct MongoDB test starting...');
    console.log('Database connection state:', mongoose.connection.readyState);
    console.log('Database name:', mongoose.connection.name);

    // Test 1: Direct MongoDB query without model
    const db = mongoose.connection.db;
    if (!db) {
      return errorResponse("Database connection not available", 500);
    }

    // Find the project directly
    const projectsCollection = db.collection('projects');
    const project = await projectsCollection.findOne({ _id: new mongoose.Types.ObjectId(projectId) });
    
    if (!project) {
      return errorResponse("Project not found in direct query", 404);
    }

    console.log('📊 Direct query result:', {
      projectId: project._id,
      name: project.name,
      spent: project.spent,
      spentType: typeof project.spent,
      spentExists: 'spent' in project
    });

    // Test 2: Direct update without model
    const currentSpent = project.spent || 0;
    const newSpent = currentSpent + amount;

    console.log('💰 Attempting direct update:', {
      currentSpent,
      amount,
      newSpent
    });

    const updateResult = await projectsCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(projectId) },
      { $set: { spent: newSpent } }
    );

    console.log('✅ Direct update result:', {
      acknowledged: updateResult.acknowledged,
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount
    });

    // Verify the update
    const updatedProject = await projectsCollection.findOne({ _id: new mongoose.Types.ObjectId(projectId) });
    
    console.log('🔍 After update verification:', {
      previousSpent: currentSpent,
      newSpent: updatedProject?.spent,
      updateWorked: updatedProject?.spent === newSpent
    });

    // Test 3: Now try with Projects model
    try {
      const { Projects } = await import("@/lib/models/Project");
      
      console.log('📦 Projects model imported successfully');
      
      const modelProject = await Projects.findById(projectId);
      console.log('🔍 Model query result:', {
        found: !!modelProject,
        spent: modelProject?.spent,
        name: modelProject?.name
      });

      if (modelProject) {
        const modelUpdateResult = await Projects.findByIdAndUpdate(
          projectId,
          { $set: { spent: newSpent + 100 } }, // Add 100 more to test
          { new: true }
        );

        console.log('🔄 Model update result:', {
          success: !!modelUpdateResult,
          newSpent: modelUpdateResult?.spent,
          expectedSpent: newSpent + 100
        });
      }

    } catch (modelError) {
      console.error('❌ Projects model error:', modelError);
    }

    return successResponse(
      {
        directQuery: {
          found: !!project,
          spent: project.spent,
          name: project.name
        },
        directUpdate: {
          acknowledged: updateResult.acknowledged,
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount
        },
        verification: {
          previousSpent: currentSpent,
          newSpent: updatedProject?.spent,
          updateWorked: updatedProject?.spent === newSpent
        },
        database: {
          connectionState: mongoose.connection.readyState,
          databaseName: mongoose.connection.name
        }
      },
      "Direct MongoDB test completed"
    );

  } catch (error: unknown) {
    console.error('❌ Direct test failed:', error);
    return errorResponse(`Direct test failed: ${error}`, 500);
  }
};