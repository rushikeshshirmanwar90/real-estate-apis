import connect from "@/lib/db";
import { Equipment } from "@/lib/models/Xsite/Equipment";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import mongoose from "mongoose";

// POST - Simplified equipment creation with direct project update
export const POST = async (req: NextRequest) => {
  try {
    await connect();

    const data = await req.json();

    // Validate required fields
    const requiredFields = ['type', 'category', 'quantity', 'perUnitCost', 'projectId', 'projectName', 'projectSectionId', 'projectSectionName'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return errorResponse(`${field} is required`, 400);
      }
    }

    // Validate ObjectIds
    if (!isValidObjectId(data.projectId)) {
      return errorResponse("Invalid project ID format", 400);
    }

    console.log('🚀 Starting simplified equipment creation...');
    console.log('📋 Equipment data:', {
      type: data.type,
      quantity: data.quantity,
      perUnitCost: data.perUnitCost,
      projectId: data.projectId
    });

    // Create equipment first
    const equipment = new Equipment(data);
    await equipment.save();

    const equipmentCost = equipment.totalCost || (equipment.quantity * equipment.perUnitCost);
    
    console.log('✅ Equipment created:', {
      id: equipment._id,
      totalCost: equipment.totalCost,
      calculatedCost: equipmentCost
    });

    // Now try multiple approaches to update the project
    const projectId = data.projectId;
    
    console.log('🔄 Attempting project update with multiple methods...');

    // Method 1: Direct MongoDB collection update
    try {
      const db = mongoose.connection.db;
      const projectsCollection = db?.collection('projects');
      
      if (projectsCollection) {
        // First, get current project
        const currentProject = await projectsCollection.findOne({ 
          _id: new mongoose.Types.ObjectId(projectId) 
        });
        
        if (currentProject) {
          console.log('📊 Current project (direct):', {
            name: currentProject.name,
            spent: currentProject.spent,
            spentType: typeof currentProject.spent
          });

          const currentSpent = currentProject.spent || 0;
          const newSpent = currentSpent + equipmentCost;

          const directUpdateResult = await projectsCollection.updateOne(
            { _id: new mongoose.Types.ObjectId(projectId) },
            { $set: { spent: newSpent } }
          );

          console.log('🔄 Direct update result:', directUpdateResult);

          // Verify direct update
          const verifyProject = await projectsCollection.findOne({ 
            _id: new mongoose.Types.ObjectId(projectId) 
          });
          
          console.log('✅ Direct update verification:', {
            previousSpent: currentSpent,
            newSpent: verifyProject?.spent,
            success: verifyProject?.spent === newSpent
          });

          if (verifyProject?.spent === newSpent) {
            return successResponse(
              {
                equipment,
                projectUpdate: {
                  method: 'direct',
                  previousSpent: currentSpent,
                  newSpent: verifyProject?.spent,
                  equipmentCost
                }
              },
              "Equipment created and project updated successfully (direct method)"
            );
          }
        }
      }
    } catch (directError) {
      console.error('❌ Direct update failed:', directError);
    }

    // Method 2: Try with Projects model import
    try {
      const { Projects } = await import("@/lib/models/Project");
      
      const modelProject = await Projects.findById(projectId);
      if (modelProject) {
        console.log('📊 Current project (model):', {
          name: modelProject.name,
          spent: modelProject.spent,
          spentType: typeof modelProject.spent
        });

        const currentSpent = modelProject.spent || 0;
        const newSpent = currentSpent + equipmentCost;

        const modelUpdateResult = await Projects.findByIdAndUpdate(
          projectId,
          { $set: { spent: newSpent } },
          { new: true }
        );

        console.log('✅ Model update result:', {
          success: !!modelUpdateResult,
          previousSpent: currentSpent,
          newSpent: modelUpdateResult?.spent,
          equipmentCost
        });

        if (modelUpdateResult) {
          return successResponse(
            {
              equipment,
              projectUpdate: {
                method: 'model',
                previousSpent: currentSpent,
                newSpent: modelUpdateResult.spent,
                equipmentCost
              }
            },
            "Equipment created and project updated successfully (model method)"
          );
        }
      }
    } catch (modelError) {
      console.error('❌ Model update failed:', modelError);
    }

    // Method 3: Raw mongoose update
    try {
      const rawUpdate = await mongoose.model('Projects').findByIdAndUpdate(
        projectId,
        { $inc: { spent: equipmentCost } },
        { new: true }
      );

      console.log('🔄 Raw mongoose update:', {
        success: !!rawUpdate,
        newSpent: rawUpdate?.spent
      });

      if (rawUpdate) {
        return successResponse(
          {
            equipment,
            projectUpdate: {
              method: 'raw',
              newSpent: rawUpdate.spent,
              equipmentCost
            }
          },
          "Equipment created and project updated successfully (raw method)"
        );
      }
    } catch (rawError) {
      console.error('❌ Raw update failed:', rawError);
    }

    // If all methods failed
    return successResponse(
      equipment,
      "Equipment created successfully, but all project update methods failed"
    );

  } catch (error: unknown) {
    console.error('❌ Simplified equipment creation failed:', error);
    return errorResponse("Failed to create equipment", 500);
  }
};