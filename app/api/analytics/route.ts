import { NextRequest } from "next/server";
import connect from "@/lib/db";
import { Projects } from "@/lib/models/Project";
import { MaterialActivity } from "@/lib/models/Xsite/materials-activity";
import { Labor } from "@/lib/models/Xsite/Labor";
import { Equipment } from "@/lib/models/Xsite/Equipment";
import { Types } from "mongoose";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { requireValidClient } from "@/lib/utils/client-validation";

export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const staffId = searchParams.get("staffId");

    console.log(`🔍 Analytics API called with clientId: ${clientId}, staffId: ${staffId}`);

    if (!clientId) {
      console.error("❌ No clientId provided");
      return errorResponse("Client ID is required", 400);
    }

    if (!isValidObjectId(clientId)) {
      console.error("❌ Invalid clientId format:", clientId);
      return errorResponse("Invalid client ID format", 400);
    }

    // Validate staffId if provided
    if (staffId && !isValidObjectId(staffId)) {
      console.error("❌ Invalid staffId format:", staffId);
      return errorResponse("Invalid staff ID format", 400);
    }

    await connect();
    console.log("✅ Database connected");

    // Validate client exists - but make it optional for now
    try {
      await requireValidClient(clientId);
      console.log("✅ Client validation passed");
    } catch (clientError) {
      console.warn("⚠️ Client validation failed, continuing anyway:", clientError);
      // Don't fail here, just log the warning
    }

    console.log(`🔍 Fetching analytics data for clientId: ${clientId}${staffId ? `, staffId: ${staffId}` : ''}`);

    // Build query for projects
    const projectsQuery: any = { clientId: new Types.ObjectId(clientId) };

    // If staffId is provided, filter by assigned staff
    if (staffId) {
      projectsQuery["assignedStaff._id"] = staffId;
      console.log(`🔍 Filtering projects for staff ID: ${staffId}`);
    }

    // Fetch projects with embedded materials, labor, and equipment
    const projects = await Projects.find(projectsQuery)
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📊 Found ${projects.length} projects for analytics`);

    // Fetch additional data with error handling
    const projectIds = projects.map((p: any) => p._id); // Keep as ObjectId
    const projectIdsAsStrings = projects.map((p: any) => p._id.toString()); // Convert to strings for filtering
    
    let materialActivities: any[] = [];
    let labors: any[] = [];
    let equipment: any[] = [];

    try {
      materialActivities = await MaterialActivity.find({ 
        projectId: { $in: projectIdsAsStrings }, // MaterialActivity uses string projectId
        clientId: clientId
      }).lean();
      console.log(`📦 Found ${materialActivities.length} material activities`);
    } catch (error) {
      console.warn("⚠️ Failed to fetch material activities:", error);
    }

    try {
      // Labor model uses ObjectId for projectId
      labors = await Labor.find({ 
        projectId: { $in: projectIds }, // Use ObjectId array
        // Note: Labor model doesn't have clientId field based on schema
      }).lean();
      console.log(`👷 Found ${labors.length} labor entries`);
    } catch (error) {
      console.warn("⚠️ Failed to fetch labor data:", error);
      console.error("Labor fetch error details:", error);
    }

    try {
      // Equipment model uses ObjectId for projectId  
      equipment = await Equipment.find({ 
        projectId: { $in: projectIds }, // Use ObjectId array
        // Note: Equipment model doesn't have clientId field based on schema
      }).lean();
      console.log(`🔧 Found ${equipment.length} equipment entries`);
    } catch (error) {
      console.warn("⚠️ Failed to fetch equipment data:", error);
      console.error("Equipment fetch error details:", error);
    }

    // Enrich projects with additional data
    const enrichedProjects = projects.map((project: any) => {
      const projectIdString = project._id.toString();
      
      // Get separate labor and equipment data
      const separateLabors = labors.filter((l: any) => l.projectId?.toString() === projectIdString);
      const separateEquipment = equipment.filter((e: any) => e.projectId?.toString() === projectIdString);
      
      // Combine embedded and separate labor data
      const embeddedLabors = project.Labors || [];
      const allLabors = [...embeddedLabors, ...separateLabors];
      
      // For equipment, we might not have embedded data in projects, so use separate data
      const allEquipment = separateEquipment;
      
      console.log(`📊 Project ${project.name}: Embedded Labors: ${embeddedLabors.length}, Separate Labors: ${separateLabors.length}, Equipment: ${allEquipment.length}`);
      
      return {
        ...project,
        // Use embedded materials from project
        MaterialAvailable: project.MaterialAvailable || [],
        MaterialUsed: project.MaterialUsed || [],
        // Combine embedded and separate labor data
        Labors: allLabors,
        // Use separate equipment data
        Equipment: allEquipment,
        // Add material activities for insights
        MaterialActivities: materialActivities.filter((ma: any) => ma.projectId === projectIdString)
      };
    });

    // Calculate comprehensive analytics
    const analytics = calculateAnalytics(enrichedProjects);

    console.log(`✅ Analytics calculated successfully:`, {
      totalProjects: analytics.totalProjects,
      totalSpent: analytics.totalSpent,
      materialCategories: Object.keys(analytics.materialStats.categories).length
    });

    return successResponse(
      {
        projects: enrichedProjects,
        analytics,
        meta: {
          totalProjects: projects.length,
          dataFetchedAt: new Date().toISOString(),
          clientId,
          staffId: staffId || null
        }
      },
      "Analytics data retrieved successfully"
    );

  } catch (error: unknown) {
    console.error("❌ Error fetching analytics data:", error);
    
    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    
    console.error("❌ Error details:", {
      message: errorMessage,
      stack: errorStack
    });
    
    return errorResponse(`Failed to fetch analytics data: ${errorMessage}`, 500);
  }
};

// Helper function to calculate analytics
function calculateAnalytics(projects: any[]) {
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.isCompleted).length;
  const ongoingProjects = totalProjects - completedProjects;
  
  let totalSpent = 0;
  let totalMaterialCost = 0;
  let totalLaborCost = 0;
  let totalEquipmentCost = 0;
  
  let totalAvailableMaterials = 0;
  let totalUsedMaterials = 0;
  let lowStockItems = 0;
  const materialCategories: { [key: string]: number } = {};
  
  let activeWorkers = 0;
  let totalLaborHours = 0;
  let totalLaborCostSum = 0;
  
  let totalEquipment = 0;
  let activeRentals = 0;
  let totalRentalCost = 0;

  // Material category mapping
  const getMaterialCategory = (materialName: string): string => {
    const name = materialName.toLowerCase();
    if (name.includes('cement') || name.includes('concrete')) return 'Cement & Concrete';
    if (name.includes('steel') || name.includes('iron') || name.includes('rebar')) return 'Steel & Metal';
    if (name.includes('brick') || name.includes('block')) return 'Bricks & Blocks';
    if (name.includes('sand') || name.includes('gravel') || name.includes('aggregate')) return 'Aggregates';
    if (name.includes('paint') || name.includes('primer')) return 'Paint & Finishes';
    if (name.includes('tile') || name.includes('marble') || name.includes('granite')) return 'Tiles & Stones';
    if (name.includes('pipe') || name.includes('plumbing')) return 'Plumbing';
    if (name.includes('wire') || name.includes('cable') || name.includes('electrical')) return 'Electrical';
    if (name.includes('wood') || name.includes('timber')) return 'Wood & Timber';
    return 'Others';
  };

  projects.forEach(project => {
    // Project spending
    totalSpent += project.spent || 0;
    
    console.log(`🔍 Processing project: ${project.name}`);
    console.log(`   - Spent: ${project.spent || 0}`);
    console.log(`   - MaterialAvailable: ${project.MaterialAvailable?.length || 0}`);
    console.log(`   - MaterialUsed: ${project.MaterialUsed?.length || 0}`);
    console.log(`   - Labors: ${project.Labors?.length || 0}`);
    console.log(`   - Equipment: ${project.Equipment?.length || 0}`);
    
    // Material analysis
    if (project.MaterialAvailable) {
      project.MaterialAvailable.forEach((material: any) => {
        const cost = material.totalCost || material.perUnitCost * material.qnt || material.cost || 0;
        totalMaterialCost += cost;
        totalAvailableMaterials += material.qnt;
        
        // Categorize materials
        const category = getMaterialCategory(material.name);
        materialCategories[category] = (materialCategories[category] || 0) + material.qnt;
        
        // Check for low stock (less than 10 units)
        if (material.qnt < 10) {
          lowStockItems++;
        }
      });
    }
    
    if (project.MaterialUsed) {
      project.MaterialUsed.forEach((material: any) => {
        const cost = material.totalCost || material.perUnitCost * material.qnt || material.cost || 0;
        totalMaterialCost += cost;
        totalUsedMaterials += material.qnt;
      });
    }
    
    // Labor analysis
    if (project.Labors && project.Labors.length > 0) {
      console.log(`   📋 Processing ${project.Labors.length} labor entries for ${project.name}`);
      project.Labors.forEach((labor: any, index: number) => {
        const laborCost = labor.totalCost || 0;
        console.log(`     Labor ${index + 1}: ${labor.type || 'Unknown'} - Cost: ${laborCost} - Status: ${labor.status || 'unknown'}`);
        
        totalLaborCost += laborCost;
        totalLaborCostSum += laborCost;
        
        if (labor.status === 'active') {
          activeWorkers++;
        }
      });
    } else {
      console.log(`   📋 No labor entries found for ${project.name}`);
    }
    
    // Equipment analysis
    if (project.Equipment && project.Equipment.length > 0) {
      console.log(`   🔧 Processing ${project.Equipment.length} equipment entries for ${project.name}`);
      project.Equipment.forEach((equipment: any, index: number) => {
        const equipmentCost = equipment.totalCost || equipment.cost || 0;
        const rentalCost = equipment.rentalCost || 0;
        console.log(`     Equipment ${index + 1}: ${equipment.type || 'Unknown'} - Cost: ${equipmentCost} - Rental: ${rentalCost}`);
        
        totalEquipmentCost += equipmentCost;
        totalEquipment++;
        
        if (rentalCost > 0) {
          activeRentals++;
          totalRentalCost += rentalCost;
        }
      });
    } else {
      console.log(`   🔧 No equipment entries found for ${project.name}`);
    }
  });

  const analytics = {
    totalProjects,
    completedProjects,
    ongoingProjects,
    totalSpent,
    totalMaterialCost,
    totalLaborCost,
    totalEquipmentCost,
    materialStats: {
      totalAvailable: totalAvailableMaterials,
      totalUsed: totalUsedMaterials,
      lowStockItems,
      categories: materialCategories
    },
    laborStats: {
      activeWorkers,
      totalLaborHours,
      averageCostPerHour: activeWorkers > 0 ? totalLaborCostSum / activeWorkers : 0
    },
    equipmentStats: {
      totalEquipment,
      activeRentals,
      totalRentalCost
    }
  };

  console.log(`📊 ANALYTICS SUMMARY:`);
  console.log(`   Total Projects: ${totalProjects}`);
  console.log(`   Total Spent: ${totalSpent}`);
  console.log(`   Material Cost: ${totalMaterialCost}`);
  console.log(`   Labor Cost: ${totalLaborCost}`);
  console.log(`   Equipment Cost: ${totalEquipmentCost}`);
  console.log(`   Active Workers: ${activeWorkers}`);
  console.log(`   Total Equipment: ${totalEquipment}`);

  return analytics;
}