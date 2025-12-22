import connect from "@/lib/db";
import { MaterialActivity } from "@/lib/models/Xsite/materials-activity";
import { Projects } from "@/lib/models/Project";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
    try {
        await connect();
        
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('clientId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const activity = searchParams.get('activity'); // 'imported', 'used', or 'all'
        const projectId = searchParams.get('projectId'); // optional project filter

        console.log('\n========================================');
        console.log('📊 MATERIAL ACTIVITY REPORT API');
        console.log('========================================');
        console.log('Request Parameters:');
        console.log('  - Client ID:', clientId);
        console.log('  - Start Date:', startDate);
        console.log('  - End Date:', endDate);
        console.log('  - Activity Filter:', activity);
        console.log('  - Project ID Filter:', projectId);

        // Validation
        if (!clientId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "clientId is required",
                },
                { status: 400 }
            );
        }

        // Build query
        const query: any = { clientId };

        // Add project filter
        if (projectId && projectId !== 'all') {
            query.projectId = projectId;
            console.log('  - Filtering by project ID:', projectId);
        }

        // Add activity filter
        if (activity && activity !== 'all') {
            if (activity === 'imported' || activity === 'used') {
                query.activity = activity;
            } else {
                return NextResponse.json(
                    {
                        success: false,
                        error: "activity must be 'imported', 'used', or 'all'",
                    },
                    { status: 400 }
                );
            }
        }

        // Add date range filter
        if (startDate || endDate) {
            query.date = {};
            
            if (startDate) {
                // Parse start date and set to beginning of day in UTC
                const start = new Date(startDate + 'T00:00:00.000Z');
                query.date.$gte = start.toISOString();
                console.log('  - Date filter (>=):', start.toISOString());
            }
            
            if (endDate) {
                // Parse end date and set to end of day in UTC
                const end = new Date(endDate + 'T23:59:59.999Z');
                query.date.$lte = end.toISOString();
                console.log('  - Date filter (<=):', end.toISOString());
            }
        }

        console.log('📋 MongoDB Query:', JSON.stringify(query, null, 2));

        // Fetch material activities
        const activities = await MaterialActivity.find(query)
            .sort({ date: -1 }) // Latest first
            .lean();

        console.log('✅ Found Activities:', activities.length);
        
        // Debug: Show sample activity dates if any found
        if (activities.length > 0) {
            console.log('📅 Sample activity dates:');
            activities.slice(0, 3).forEach((activity, index) => {
                console.log(`  ${index + 1}. ${activity.date} (${activity.activity})`);
            });
        } else if (startDate || endDate) {
            console.log('⚠️ No activities found in date range. Checking recent activities...');
            
            // Check if there are any activities at all for this client
            const recentActivities = await MaterialActivity.find({ clientId })
                .sort({ date: -1 })
                .limit(5)
                .lean();
                
            if (recentActivities.length > 0) {
                console.log('📅 Recent activities (any date):');
                recentActivities.forEach((activity, index) => {
                    console.log(`  ${index + 1}. ${activity.date} (${activity.activity})`);
                });
            } else {
                console.log('❌ No activities found for this client at all');
            }
        }

        // Get unique project IDs and filter out invalid ObjectIds
        const projectIds = [...new Set(activities.map((a: any) => a.projectId))]
            .filter((id: string) => {
                // Check if it's a valid MongoDB ObjectId (24 character hex string)
                if (!id || typeof id !== 'string' || id.length !== 24) {
                    console.warn(`⚠️ Skipping invalid project ID: ${id}`);
                    return false;
                }
                // Check if it's a valid hex string
                if (!/^[0-9a-fA-F]{24}$/.test(id)) {
                    console.warn(`⚠️ Skipping non-hex project ID: ${id}`);
                    return false;
                }
                return true;
            });
            
        console.log('📋 Valid Project IDs:', projectIds);
        console.log('📋 Total valid project IDs:', projectIds.length);

        // Fetch project details for valid project IDs only
        let projects: any[] = [];
        if (projectIds.length > 0) {
            try {
                projects = await Projects.find({ 
                    _id: { $in: projectIds } 
                }).lean();
                console.log('📋 Found Projects:', projects.length);
            } catch (projectError: any) {
                console.error('❌ Error fetching projects:', projectError?.message || projectError);
                // Continue without project details if there's an error
                projects = [];
            }
        } else {
            console.log('📋 No valid project IDs found, skipping project lookup');
        }

        // Create a map of project details for quick lookup
        const projectMap = new Map();
        projects.forEach((project: any) => {
            projectMap.set(project._id.toString(), {
                name: project.name || project.title || 'Unknown Project',
                sections: project.sections || []
            });
        });

        // Log activity breakdown with corrected cost calculation
        const importedCount = activities.filter((a: any) => a.activity === 'imported').length;
        const usedCount = activities.filter((a: any) => a.activity === 'used').length;
        const totalMaterials = activities.reduce((sum: number, activity: any) => 
            sum + (activity.materials?.length || 0), 0
        );
        
        // ✅ FIXED: Only include IMPORTED materials in total cost calculation
        // Business Logic: We only spend money when importing materials, not when using them
        const totalCost = activities.reduce((sum: number, activity: any) => {
            try {
                // ✅ CRITICAL: Only count imported materials, skip used materials
                if (activity.activity !== 'imported') {
                    console.log(`  Activity ${activity._id}: ${activity.activity} - SKIPPED (not imported)`);
                    return sum; // Skip used materials - they don't add to total cost
                }
                
                const activityCost = (activity.materials || []).reduce((matSum: number, material: any) => {
                    try {
                        // ✅ NEW: Use perUnitCost and totalCost if available
                        if (material.totalCost !== undefined) {
                            const materialTotalCost = Number(material.totalCost) || 0;
                            console.log(`    Material: ${material.name}, Total Cost: ₹${materialTotalCost} (from totalCost field)`);
                            return matSum + materialTotalCost;
                        } else if (material.perUnitCost !== undefined) {
                            const perUnitCost = Number(material.perUnitCost) || 0;
                            const quantity = Number(material.qnt) || 0;
                            const materialTotalCost = perUnitCost * quantity;
                            console.log(`    Material: ${material.name}, Qty: ${quantity}, Per-Unit: ₹${perUnitCost}, Total: ₹${materialTotalCost} (calculated from perUnitCost)`);
                            return matSum + materialTotalCost;
                        } else if (material.cost !== undefined) {
                            // ✅ LEGACY: For imported materials, cost field contains PER-UNIT cost
                            const costValue = Number(material.cost) || 0;
                            const quantity = Number(material.qnt) || 0;
                            const materialTotalCost = costValue * quantity;
                            console.log(`    Material: ${material.name}, Qty: ${quantity}, Per-Unit: ₹${costValue}, Total: ₹${materialTotalCost} (legacy imported)`);
                            return matSum + materialTotalCost;
                        }
                        
                        console.log(`    Material: ${material.name} - No cost information available`);
                        return matSum;
                    } catch (materialError: any) {
                        console.error(`    Error processing material ${material.name}:`, materialError?.message || materialError);
                        return matSum; // Skip this material but continue
                    }
                }, 0);
                
                console.log(`  Activity ${activity._id}: ${activity.activity} - ${activity.materials?.length || 0} materials - Total: ₹${activityCost} (IMPORTED - COUNTED)`);
                return sum + activityCost;
            } catch (activityError: any) {
                console.error(`  Error processing activity ${activity._id}:`, activityError?.message || activityError);
                return sum; // Skip this activity but continue
            }
        }, 0);

        console.log('📊 Activity Breakdown:');
        console.log(`  - Imported: ${importedCount}`);
        console.log(`  - Used: ${usedCount}`);
        console.log(`  - Total Materials: ${totalMaterials}`);
        console.log(`  - Total Cost: ₹${totalCost.toLocaleString('en-IN')}`);

        // Process activities to ensure proper data structure
        const processedActivities = activities.map((activity: any) => {
            // Get project details (handle invalid project IDs gracefully)
            let projectDetails = { name: 'Unknown Project', sections: [] };
            
            // Only try to get project details if projectId is valid
            if (activity.projectId && typeof activity.projectId === 'string' && activity.projectId.length === 24) {
                const foundProject = projectMap.get(activity.projectId);
                if (foundProject) {
                    projectDetails = foundProject;
                } else {
                    console.warn(`⚠️ Project not found for ID: ${activity.projectId}`);
                }
            } else {
                console.warn(`⚠️ Invalid project ID in activity: ${activity.projectId}`);
            }
            
            // Extract section/mini-section info from message if available
            let sectionName = activity.sectionName || '';
            let miniSectionName = activity.miniSectionName || '';
            
            // Try to parse section info from message
            if (activity.message && !sectionName && !miniSectionName) {
                // Message format: "Used X materials in mini-section (₹Y)" or "Used in ProjectName - SectionName"
                const messageStr = activity.message;
                
                // Check for "mini-section" pattern
                if (messageStr.includes('mini-section')) {
                    miniSectionName = 'Mini-section'; // Generic since we don't have specific name
                }
                
                // Check for "Used in ProjectName - SectionName" pattern
                const sectionMatch = messageStr.match(/Used in .+ - (.+)$/);
                if (sectionMatch) {
                    sectionName = sectionMatch[1];
                }
            }
            
            return {
                _id: activity._id,
                user: {
                    userId: activity.user?.userId || 'unknown',
                    fullName: activity.user?.fullName || 'Unknown User'
                },
                projectId: activity.projectId,
                projectName: projectDetails.name,
                sectionName: sectionName,
                miniSectionName: miniSectionName,
                materials: (activity.materials || []).map((material: any) => {
                    // ✅ UPDATED: Return new cost structure with fallback to legacy
                    const quantity = Number(material.qnt) || 0;
                    
                    // Prepare material data with new cost structure
                    const materialData: any = {
                        name: material.name || 'Unknown Material',
                        unit: material.unit || 'units',
                        specs: material.specs || {},
                        qnt: quantity,
                    };
                    
                    // Add cost fields based on what's available
                    if (material.perUnitCost !== undefined) {
                        materialData.perUnitCost = Number(material.perUnitCost) || 0;
                    }
                    
                    if (material.totalCost !== undefined) {
                        materialData.totalCost = Number(material.totalCost) || 0;
                    }
                    
                    // ✅ LEGACY: Keep cost field for backward compatibility
                    if (material.cost !== undefined) {
                        materialData.cost = Number(material.cost) || 0;
                    }
                    
                    return materialData;
                }),
                message: activity.message || '',
                activity: activity.activity,
                date: activity.date || activity.createdAt || new Date().toISOString()
            };
        });

        console.log('========================================\n');

        return NextResponse.json(
            {
                success: true,
                data: {
                    activities: processedActivities,
                    summary: {
                        totalActivities: activities.length,
                        importedCount,
                        usedCount,
                        totalMaterials,
                        totalCost,
                        dateRange: {
                            start: startDate,
                            end: endDate
                        },
                        activityFilter: activity || 'all',
                        projectFilter: projectId || 'all'
                    }
                },
                message: `Found ${activities.length} material activities`
            },
            { status: 200 }
        );

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("❌ Error in material-activity-report API:", msg);
        console.error("Stack trace:", error);
        
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch material activity report",
                details: msg
            },
            { status: 500 }
        );
    }
};