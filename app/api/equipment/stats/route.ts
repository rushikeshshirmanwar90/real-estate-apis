import connect from "@/lib/db";
import { Equipment } from "@/lib/models/Xsite/Equipment";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidObjectId } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";

// GET - Equipment statistics
export const GET = async (req: NextRequest) => {
  try {
    await connect();
    const { searchParams } = new URL(req.url);
    
    const projectId = searchParams.get("projectId");
    const projectSectionId = searchParams.get("projectSectionId");
    const statsType = searchParams.get("type") || "summary";

    // Validate required parameters
    if (!projectId) {
      return errorResponse("projectId is required", 400);
    }

    if (!isValidObjectId(projectId)) {
      return errorResponse("Invalid project ID format", 400);
    }

    let query: any = { projectId };
    
    if (projectSectionId) {
      if (!isValidObjectId(projectSectionId)) {
        return errorResponse("Invalid project section ID format", 400);
      }
      query.projectSectionId = projectSectionId;
    }

    switch (statsType) {
      case "summary":
        // Overall summary statistics
        const totalStats = await (Equipment as any).getTotalCostByProject(projectId);
        const categoryStats = await (Equipment as any).getCategoryStats(projectId, projectSectionId);
        const rentalStats = await (Equipment as any).getRentalStats(projectId, projectSectionId);
        
        // Status breakdown
        const statusBreakdown = await Equipment.aggregate([
          { $match: query },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalCost: { $sum: '$totalCost' },
              totalQuantity: { $sum: '$quantity' }
            }
          }
        ]);

        // Cost type breakdown
        const costTypeBreakdown = await Equipment.aggregate([
          { $match: query },
          {
            $group: {
              _id: '$costType',
              count: { $sum: 1 },
              totalCost: { $sum: '$totalCost' },
              totalQuantity: { $sum: '$quantity' }
            }
          }
        ]);

        return successResponse({
          totalStats,
          categoryStats,
          rentalStats,
          statusBreakdown,
          costTypeBreakdown
        }, "Equipment summary statistics retrieved successfully");

      case "category":
        // Detailed category statistics
        const categoryDetails = await (Equipment as any).getCategoryStats(projectId, projectSectionId);
        return successResponse(categoryDetails, "Equipment category statistics retrieved successfully");

      case "rental":
        // Rental-specific statistics
        const rentalDetails = await (Equipment as any).getRentalStats(projectId, projectSectionId);
        
        // Additional rental insights
        const rentalInsights = await Equipment.aggregate([
          { $match: { ...query, costType: 'rental' } },
          {
            $group: {
              _id: {
                category: '$category',
                rentalPeriod: '$rentalPeriod'
              },
              totalCost: { $sum: '$totalCost' },
              avgDuration: { $avg: '$rentalDuration' },
              count: { $sum: 1 }
            }
          },
          { $sort: { totalCost: -1 } }
        ]);

        return successResponse({
          rentalDetails,
          rentalInsights
        }, "Equipment rental statistics retrieved successfully");

      case "timeline":
        // Equipment usage over time
        const timelineStats = await Equipment.aggregate([
          { $match: query },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
              },
              totalCost: { $sum: '$totalCost' },
              totalQuantity: { $sum: '$quantity' },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);

        return successResponse(timelineStats, "Equipment timeline statistics retrieved successfully");

      case "efficiency":
        // Equipment efficiency and utilization stats
        const efficiencyStats = await Equipment.aggregate([
          { $match: query },
          {
            $group: {
              _id: '$type',
              totalCost: { $sum: '$totalCost' },
              totalQuantity: { $sum: '$quantity' },
              avgCostPerUnit: { $avg: '$perUnitCost' },
              usageCount: { $sum: 1 },
              categories: { $addToSet: '$category' }
            }
          },
          {
            $addFields: {
              costEfficiency: { $divide: ['$totalCost', '$usageCount'] },
              utilizationRate: { $divide: ['$usageCount', '$totalQuantity'] }
            }
          },
          { $sort: { totalCost: -1 } }
        ]);

        return successResponse(efficiencyStats, "Equipment efficiency statistics retrieved successfully");

      default:
        return errorResponse("Invalid stats type. Use: summary, category, rental, timeline, or efficiency", 400);
    }

  } catch (error: unknown) {
    logger.error("GET /equipment/stats error", error);
    return errorResponse("Failed to fetch equipment statistics", 500);
  }
};