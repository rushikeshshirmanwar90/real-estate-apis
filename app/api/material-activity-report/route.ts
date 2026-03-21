import connect from "@/lib/db";
import { MaterialActivity } from "@/lib/models/Xsite/materials-activity";
import { Projects } from "@/lib/models/Project";
import { MiniSection } from "@/lib/models/MiniSection";
import { Section } from "@/lib/models/Section";
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
                    error: 'Client ID is required'
                },
                { status: 400 }
            );
        }

        // Build query
        const query: any = { clientId };
        
        // Add date range filter
        if (startDate && endDate) {
            query.date = {
                $gte: startDate,
                $lte: endDate
            };
        }
        
        // Add activity filter
        if (activity && activity !== 'all') {
            if (['imported', 'used', 'transferred'].includes(activity)) {
                query.activity = activity;
            } else {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Invalid activity filter. Must be: imported, used, transferred, or all'
                    },
                    { status: 400 }
                );
            }
        }
        
        // Add project filter
        if (projectId) {
            query.projectId = projectId;
        }

        console.log('📋 Database Query:', JSON.stringify(query, null, 2));

        // Fetch activities
        const activities = await MaterialActivity.find(query)
            .sort({ date: -1 })
            .lean();

        console.log(`✅ Found Activities: ${activities.length}`);
        
        // Log sample activity dates for debugging
        if (activities.length > 0) {
            console.log('📅 Sample activity dates:');
            activities.slice(0, 3).forEach((activity, index) => {
                console.log(`${index + 1}. ${activity.date} (${activity.activity})`);
            });
        }

        // Get unique project IDs from activities
        const projectIds = [...new Set(activities.map(activity => activity.projectId))].filter(id => id);
        console.log('📋 Valid Project IDs:', projectIds);
        console.log('📋 Total valid project IDs:', projectIds.length);

        // Fetch project details for all unique project IDs
        const projects = await Projects.find({ 
            _id: { $in: projectIds } 
        }).select('name').lean();
        
        console.log('📋 Found Projects:', projects.length);

        // Create a map for quick project lookup
        const projectMap = new Map();
        projects.forEach(project => {
            projectMap.set((project._id as any).toString(), project);
        });

        // Calculate summary statistics
        let importedCount = 0;
        let usedCount = 0;
        let totalMaterials = 0;
        let totalCost = 0;

        activities.forEach(activity => {
            if (activity.activity === 'imported') {
                importedCount++;
                // Only count imported materials in total cost
                activity.materials?.forEach((material: any) => {
                    totalMaterials++;
                    const materialCost = Number(material.totalCost) || 0;
                    totalCost += materialCost;
                    console.log(`Material: ${material.name}, Total Cost: ₹${materialCost} (from totalCost field)`);
                });
                console.log(`Activity ${activity._id}: ${activity.activity} - ${activity.materials?.length || 0} materials - Total: ₹${activity.materials?.reduce((sum: number, m: any) => sum + (Number(m.totalCost) || 0), 0)} (IMPORTED - COUNTED)`);
            } else if (activity.activity === 'used') {
                usedCount++;
                console.log(`Activity ${activity._id}: ${activity.activity} - SKIPPED (not imported)`);
                // Don't count used materials in total cost - they're already counted when imported
            }
        });

        console.log('📊 Activity Breakdown:');
        console.log(`  - Imported: ${importedCount}`);
        console.log(`  - Used: ${usedCount}`);
        console.log(`  - Total Materials: ${totalMaterials}`);
        console.log(`  - Total Cost: ₹${totalCost.toLocaleString('en-IN')}`);

        // Process activities to match the expected format
        const processedActivities = await Promise.all(activities.map(async (activity: any) => {
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
            
            // Extract section/mini-section info from database fields first (for new activities)
            let sectionName = activity.sectionName || '';
            let miniSectionName = activity.miniSectionName || '';
            
            console.log(`🔍 Activity ${activity._id} initial names:`);
            console.log(`  - Section Name: "${sectionName}"`);
            console.log(`  - Mini-Section Name: "${miniSectionName}"`);
            console.log(`  - Has miniSectionId: ${!!activity.miniSectionId}`);
            console.log(`  - Has sectionId: ${!!activity.sectionId}`);
            
            // ✅ NEW: If we don't have miniSectionName but have miniSectionId, fetch from database
            if ((!miniSectionName || miniSectionName === 'Mini-section') && activity.miniSectionId) {
                console.log(`  - 🔍 Fetching mini-section name from database for ID: ${activity.miniSectionId}`);
                try {
                    const miniSectionDoc = await MiniSection.findById(activity.miniSectionId).select('name');
                    if (miniSectionDoc && miniSectionDoc.name) {
                        miniSectionName = miniSectionDoc.name;
                        console.log(`  - ✅ Found mini-section name from DB: "${miniSectionName}"`);
                    } else {
                        console.log(`  - ❌ Mini-section not found in DB for ID: ${activity.miniSectionId}`);
                    }
                } catch (error) {
                    console.error(`  - ❌ Error fetching mini-section from DB:`, error);
                }
            }
            
            // ✅ NEW: If we don't have sectionName but have sectionId, fetch from database
            if ((!sectionName || sectionName === 'Section') && activity.sectionId) {
                console.log(`  - 🔍 Fetching section name from database for ID: ${activity.sectionId}`);
                try {
                    const sectionDoc = await Section.findById(activity.sectionId).select('name');
                    if (sectionDoc && sectionDoc.name) {
                        sectionName = sectionDoc.name;
                        console.log(`  - ✅ Found section name from DB: "${sectionName}"`);
                    } else {
                        console.log(`  - ❌ Section not found in DB for ID: ${activity.sectionId}`);
                    }
                } catch (error) {
                    console.error(`  - ❌ Error fetching section from DB:`, error);
                }
            }
            
            // ✅ ONLY parse message if we still don't have meaningful names (for old activities)
            if (activity.message && (!miniSectionName || miniSectionName === 'Mini-section') && activity.activity === 'used') {
                const messageStr = activity.message.trim();
                console.log(`  - 🔍 Parsing message as fallback: "${messageStr}"`);
                
                // Look for actual mini-section names in the message (not generic terms)
                const specificPatterns = [
                    // Specific slab patterns
                    /(?:used|in)\s+(?:\d+\s+)?(?:materials?\s+)?(?:in\s+)?(first[-\s]?slab|second[-\s]?slab|third[-\s]?slab|fourth[-\s]?slab|ground[-\s]?slab|top[-\s]?slab)/i,
                    // Floor patterns
                    /(?:used|in)\s+(?:\d+\s+)?(?:materials?\s+)?(?:in\s+)?(ground[-\s]?floor|first[-\s]?floor|second[-\s]?floor|third[-\s]?floor|basement[-\s]?floor)/i,
                    // Construction areas
                    /(?:used|in)\s+(?:\d+\s+)?(?:materials?\s+)?(?:in\s+)?(foundation|basement|terrace|roof|balcony|staircase|entrance|parking)/i,
                    // Room patterns
                    /(?:used|in)\s+(?:\d+\s+)?(?:materials?\s+)?(?:in\s+)?(living[-\s]?room|dining[-\s]?room|bed[-\s]?room|bath[-\s]?room|kitchen|hall|lobby)/i
                ];
                
                let foundSpecificName = false;
                for (const pattern of specificPatterns) {
                    const match = messageStr.match(pattern);
                    if (match && match[1]) {
                        const candidate = match[1].trim();
                        console.log(`    - Specific pattern match: "${candidate}"`);
                        
                        // Clean up the name
                        miniSectionName = candidate.replace(/[-\s]+/g, '-').toLowerCase();
                        miniSectionName = miniSectionName.charAt(0).toUpperCase() + miniSectionName.slice(1);
                        foundSpecificName = true;
                        console.log(`    - ✅ Using specific name: "${miniSectionName}"`);
                        break;
                    }
                }
                
                if (!foundSpecificName) {
                    console.log(`    - ❌ No specific mini-section name found in message`);
                    miniSectionName = ''; // Reset so we don't use generic terms
                }
            }
            
            // ✅ FINAL: Only provide fallback if this is a USED activity and we have no meaningful name
            if (activity.activity === 'used' && (!miniSectionName || miniSectionName === 'Mini-section' || miniSectionName === '')) {
                console.log(`  - 🔍 No meaningful mini-section name found, using descriptive fallback`);
                miniSectionName = 'Construction Area';
                console.log(`  - ✅ Final fallback: "${miniSectionName}"`);
            }
            
            console.log(`  - 🎯 Final names for activity ${activity._id}:`);
            console.log(`    - Section: "${sectionName || 'None'}"`);
            console.log(`    - Mini-Section: "${miniSectionName || 'None'}"`);
            console.log(`    - Activity: ${activity.activity}`);
            console.log(`    - Message: "${activity.message || 'No message'}"`);
            console.log('');
            
            
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
                    
                    // Handle cost structure (new vs legacy)
                    if (material.perUnitCost !== undefined && material.totalCost !== undefined) {
                        // New structure: both fields available
                        materialData.perUnitCost = Number(material.perUnitCost);
                        materialData.totalCost = Number(material.totalCost);
                    } else if (material.perUnitCost !== undefined) {
                        // Only perUnitCost available: calculate totalCost
                        materialData.perUnitCost = Number(material.perUnitCost);
                        materialData.totalCost = materialData.perUnitCost * quantity;
                    } else if (material.totalCost !== undefined) {
                        // Only totalCost available: calculate perUnitCost
                        materialData.totalCost = Number(material.totalCost);
                        materialData.perUnitCost = quantity > 0 ? materialData.totalCost / quantity : 0;
                    } else if (material.cost !== undefined) {
                        // ✅ LEGACY: Handle old cost field
                        const costValue = Number(material.cost) || 0;
                        
                        if (activity.activity === 'imported') {
                            // For IMPORTED: cost field contains per-unit cost
                            materialData.perUnitCost = costValue;
                            materialData.totalCost = costValue * quantity;
                        } else {
                            // For USED: cost field contains total cost
                            materialData.totalCost = costValue;
                            materialData.perUnitCost = quantity > 0 ? costValue / quantity : 0;
                        }
                    } else {
                        // No cost information available
                        materialData.perUnitCost = 0;
                        materialData.totalCost = 0;
                    }
                    
                    // Ensure costs are valid numbers
                    materialData.perUnitCost = Number(materialData.perUnitCost) || 0;
                    materialData.totalCost = Number(materialData.totalCost) || 0;
                    
                    return materialData;
                }),
                message: activity.message,
                activity: activity.activity,
                transferDetails: activity.transferDetails,
                date: activity.date || activity.createdAt || new Date().toISOString()
            };
        }));

        console.log('========================================\n');
        
        console.log(`✅ API Response prepared with ${processedActivities.length} activities`);
        console.log('📊 USED Activities with mini-section info:');
        processedActivities.forEach((activity, index) => {
            if (activity.activity === 'used') {
                console.log(`  ${index + 1}. USED - Mini-section: "${activity.miniSectionName || 'Not found'}" - Message: "${activity.message || 'No message'}"`);
            }
        });

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
                        filters: {
                            activity,
                            projectId
                        }
                    }
                }
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error("❌ Material Activity Report API Error:", error);
        console.error("Error message:", error.message);
        console.error("Stack trace:", error);
        
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
};