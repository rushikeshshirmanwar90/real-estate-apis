import { Building } from "@/lib/models/Building";
import connect from "@/lib/db";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";

// GET: Get building summary and statistics
export const GET = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get("buildingId");
    const projectId = searchParams.get("projectId");

    if (buildingId) {
      // Get summary for specific building
      if (!isValidObjectId(buildingId)) {
        return errorResponse("Invalid building ID format", 400);
      }

      const building = await Building.findById(buildingId).lean();
      if (!building) {
        return errorResponse("Building not found", 404);
      }

      // Calculate detailed statistics
      const summary = calculateBuildingSummary(building);

      return successResponse(
        {
          building: {
            id: building._id,
            name: building.name,
            projectId: building.projectId,
            buildingType: building.buildingType,
            constructionStatus: building.constructionStatus,
            totalFloors: building.totalFloors || 0,
            totalUnits: building.totalUnits || 0,
            totalBookedUnits: building.totalBookedUnits || 0,
            isActive: building.isActive
          },
          summary: summary
        },
        "Building summary retrieved successfully"
      );
    } else if (projectId) {
      // Get summary for all buildings in a project
      if (!isValidObjectId(projectId)) {
        return errorResponse("Invalid project ID format", 400);
      }

      const buildings = await Building.find({ projectId }).lean();
      
      const projectSummary = {
        totalBuildings: buildings.length,
        totalFloors: 0,
        totalUnits: 0,
        totalBookedUnits: 0,
        buildingsByType: {},
        buildingsByStatus: {},
        unitsByType: {},
        unitsByStatus: {},
        floorsByType: {},
        revenue: {
          totalValue: 0,
          bookedValue: 0,
          availableValue: 0
        },
        buildings: []
      };

      buildings.forEach(building => {
        const buildingSummary = calculateBuildingSummary(building);
        
        // Aggregate totals
        projectSummary.totalFloors += building.totalFloors || 0;
        projectSummary.totalUnits += building.totalUnits || 0;
        projectSummary.totalBookedUnits += building.totalBookedUnits || 0;

        // Building type counts
        const buildingType = building.buildingType || 'Unknown';
        projectSummary.buildingsByType[buildingType] = (projectSummary.buildingsByType[buildingType] || 0) + 1;

        // Building status counts
        const buildingStatus = building.constructionStatus || 'Unknown';
        projectSummary.buildingsByStatus[buildingStatus] = (projectSummary.buildingsByStatus[buildingStatus] || 0) + 1;

        // Aggregate unit statistics
        Object.entries(buildingSummary.unitsByType).forEach(([type, count]) => {
          projectSummary.unitsByType[type] = (projectSummary.unitsByType[type] || 0) + count;
        });

        Object.entries(buildingSummary.unitsByStatus).forEach(([status, count]) => {
          projectSummary.unitsByStatus[status] = (projectSummary.unitsByStatus[status] || 0) + count;
        });

        Object.entries(buildingSummary.floorsByType).forEach(([type, count]) => {
          projectSummary.floorsByType[type] = (projectSummary.floorsByType[type] || 0) + count;
        });

        // Aggregate revenue
        projectSummary.revenue.totalValue += buildingSummary.revenue.totalValue;
        projectSummary.revenue.bookedValue += buildingSummary.revenue.bookedValue;
        projectSummary.revenue.availableValue += buildingSummary.revenue.availableValue;

        projectSummary.buildings.push({
          id: building._id,
          name: building.name,
          buildingType: building.buildingType,
          constructionStatus: building.constructionStatus,
          totalFloors: building.totalFloors || 0,
          totalUnits: building.totalUnits || 0,
          totalBookedUnits: building.totalBookedUnits || 0,
          occupancyRate: building.totalUnits > 0 ? 
            Math.round((building.totalBookedUnits / building.totalUnits) * 100) : 0,
          summary: buildingSummary
        });
      });

      // Calculate overall occupancy rate
      projectSummary['occupancyRate'] = projectSummary.totalUnits > 0 ? 
        Math.round((projectSummary.totalBookedUnits / projectSummary.totalUnits) * 100) : 0;

      return successResponse(
        {
          projectId: projectId,
          summary: projectSummary
        },
        `Project summary retrieved for ${buildings.length} building(s)`
      );
    } else {
      return errorResponse("Building ID or Project ID is required", 400);
    }
  } catch (error: unknown) {
    logger.error("Error fetching building summary", error);
    return errorResponse("Failed to fetch building summary", 500);
  }
};

// Helper function to calculate building summary
function calculateBuildingSummary(building: any) {
  const summary = {
    floors: {
      total: building.floors?.length || 0,
      byType: {},
      byStatus: {}
    },
    units: {
      total: 0,
      booked: 0,
      available: 0
    },
    unitsByType: {},
    unitsByStatus: {},
    floorsByType: {},
    revenue: {
      totalValue: 0,
      bookedValue: 0,
      availableValue: 0
    },
    occupancyRate: 0,
    averageUnitSize: 0,
    totalArea: 0
  };

  if (!building.floors || building.floors.length === 0) {
    return summary;
  }

  let totalArea = 0;
  let unitCount = 0;

  building.floors.forEach((floor: any) => {
    // Floor type statistics
    const floorType = floor.floorType || 'Unknown';
    summary.floorsByType[floorType] = (summary.floorsByType[floorType] || 0) + 1;

    // Process units in this floor
    if (floor.units && Array.isArray(floor.units)) {
      floor.units.forEach((unit: any) => {
        unitCount++;
        summary.units.total++;

        // Unit type statistics
        const unitType = unit.type || 'Unknown';
        summary.unitsByType[unitType] = (summary.unitsByType[unitType] || 0) + 1;

        // Unit status statistics
        const unitStatus = unit.status || 'Unknown';
        summary.unitsByStatus[unitStatus] = (summary.unitsByStatus[unitStatus] || 0) + 1;

        // Count booked/available
        if (['Booked', 'Sold', 'Reserved'].includes(unitStatus)) {
          summary.units.booked++;
        } else if (unitStatus === 'Available') {
          summary.units.available++;
        }

        // Area calculations
        if (unit.area) {
          totalArea += unit.area;
        }

        // Revenue calculations
        const unitPrice = unit.price || 0;
        summary.revenue.totalValue += unitPrice;

        if (['Booked', 'Sold', 'Reserved'].includes(unitStatus)) {
          summary.revenue.bookedValue += unitPrice;
        } else {
          summary.revenue.availableValue += unitPrice;
        }
      });
    }
  });

  // Calculate derived statistics
  summary.occupancyRate = summary.units.total > 0 ? 
    Math.round((summary.units.booked / summary.units.total) * 100) : 0;
  
  summary.averageUnitSize = unitCount > 0 ? Math.round(totalArea / unitCount) : 0;
  summary.totalArea = totalArea;

  return summary;
}

// POST: Generate detailed report
export const POST = async (req: NextRequest) => {
  try {
    await connect();
    const body = await req.json();
    const { buildingIds, projectId, reportType = 'summary' } = body;

    let buildings = [];

    if (buildingIds && Array.isArray(buildingIds)) {
      // Validate building IDs
      for (const id of buildingIds) {
        if (!isValidObjectId(id)) {
          return errorResponse(`Invalid building ID format: ${id}`, 400);
        }
      }
      buildings = await Building.find({ _id: { $in: buildingIds } }).lean();
    } else if (projectId) {
      if (!isValidObjectId(projectId)) {
        return errorResponse("Invalid project ID format", 400);
      }
      buildings = await Building.find({ projectId }).lean();
    } else {
      return errorResponse("Building IDs or Project ID is required", 400);
    }

    if (buildings.length === 0) {
      return errorResponse("No buildings found", 404);
    }

    const report = {
      generatedAt: new Date(),
      reportType: reportType,
      totalBuildings: buildings.length,
      buildings: [],
      aggregatedSummary: {
        totalFloors: 0,
        totalUnits: 0,
        totalBookedUnits: 0,
        totalArea: 0,
        totalRevenue: 0,
        bookedRevenue: 0,
        availableRevenue: 0,
        overallOccupancyRate: 0,
        unitsByType: {},
        unitsByStatus: {},
        floorsByType: {},
        buildingsByType: {},
        buildingsByStatus: {}
      }
    };

    buildings.forEach(building => {
      const buildingSummary = calculateBuildingSummary(building);
      
      // Add to report
      report.buildings.push({
        id: building._id,
        name: building.name,
        buildingType: building.buildingType,
        constructionStatus: building.constructionStatus,
        location: building.location,
        totalFloors: building.totalFloors || 0,
        totalUnits: building.totalUnits || 0,
        totalBookedUnits: building.totalBookedUnits || 0,
        occupancyRate: buildingSummary.occupancyRate,
        totalArea: buildingSummary.totalArea,
        averageUnitSize: buildingSummary.averageUnitSize,
        revenue: buildingSummary.revenue,
        summary: reportType === 'detailed' ? buildingSummary : undefined
      });

      // Aggregate totals
      report.aggregatedSummary.totalFloors += building.totalFloors || 0;
      report.aggregatedSummary.totalUnits += building.totalUnits || 0;
      report.aggregatedSummary.totalBookedUnits += building.totalBookedUnits || 0;
      report.aggregatedSummary.totalArea += buildingSummary.totalArea;
      report.aggregatedSummary.totalRevenue += buildingSummary.revenue.totalValue;
      report.aggregatedSummary.bookedRevenue += buildingSummary.revenue.bookedValue;
      report.aggregatedSummary.availableRevenue += buildingSummary.revenue.availableValue;

      // Aggregate by categories
      const buildingType = building.buildingType || 'Unknown';
      report.aggregatedSummary.buildingsByType[buildingType] = 
        (report.aggregatedSummary.buildingsByType[buildingType] || 0) + 1;

      const buildingStatus = building.constructionStatus || 'Unknown';
      report.aggregatedSummary.buildingsByStatus[buildingStatus] = 
        (report.aggregatedSummary.buildingsByStatus[buildingStatus] || 0) + 1;

      Object.entries(buildingSummary.unitsByType).forEach(([type, count]) => {
        report.aggregatedSummary.unitsByType[type] = 
          (report.aggregatedSummary.unitsByType[type] || 0) + count;
      });

      Object.entries(buildingSummary.unitsByStatus).forEach(([status, count]) => {
        report.aggregatedSummary.unitsByStatus[status] = 
          (report.aggregatedSummary.unitsByStatus[status] || 0) + count;
      });

      Object.entries(buildingSummary.floorsByType).forEach(([type, count]) => {
        report.aggregatedSummary.floorsByType[type] = 
          (report.aggregatedSummary.floorsByType[type] || 0) + count;
      });
    });

    // Calculate overall occupancy rate
    report.aggregatedSummary.overallOccupancyRate = report.aggregatedSummary.totalUnits > 0 ? 
      Math.round((report.aggregatedSummary.totalBookedUnits / report.aggregatedSummary.totalUnits) * 100) : 0;

    return successResponse(
      report,
      `Generated ${reportType} report for ${buildings.length} building(s)`,
      201
    );
  } catch (error: unknown) {
    logger.error("Error generating building report", error);
    return errorResponse("Failed to generate building report", 500);
  }
};