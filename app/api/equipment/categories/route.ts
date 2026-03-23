import { NextRequest } from "next/server";
import { successResponse } from "@/lib/utils/api-response";
import { client } from "@/lib/redis";

// Equipment categories and types data
const equipmentCategories = {
  "Earthmoving & Excavation Equipment": {
    description: "Before you can build up, you have to dig down. These machines are the workhorses of the site preparation phase.",
    icon: "construct-outline",
    color: "#8B5CF6",
    equipment: [
      {
        type: "Excavator",
        description: "The versatile giants with a bucket, boom, and cab on a rotating platform. Used for digging foundations and trenches.",
        icon: "construct",
        defaultCost: 2500,
        unit: "day"
      },
      {
        type: "Backhoe Loader",
        description: "A jack-of-all-trades featuring a loader bucket on the front and a backhoe for digging on the rear.",
        icon: "construct",
        defaultCost: 2000,
        unit: "day"
      },
      {
        type: "Bulldozer",
        description: "Massive, tracked machines with a front blade used to push large quantities of soil, sand, or rubble.",
        icon: "construct",
        defaultCost: 3000,
        unit: "day"
      },
      {
        type: "Skid-Steer Loader",
        description: "Small, maneuverable machines used for internal demolition, loading material, and clearing debris in tight spaces.",
        icon: "construct",
        defaultCost: 1500,
        unit: "day"
      },
      {
        type: "Mini Excavator",
        description: "Compact excavators for tight spaces and precision work.",
        icon: "construct",
        defaultCost: 1800,
        unit: "day"
      },
      {
        type: "Track Loader",
        description: "Tracked loader for heavy material handling.",
        icon: "construct",
        defaultCost: 2200,
        unit: "day"
      },
      {
        type: "Wheel Loader",
        description: "Wheeled loader for versatile material handling.",
        icon: "construct",
        defaultCost: 2100,
        unit: "day"
      },
      {
        type: "Grader",
        description: "Motor grader for fine grading and leveling.",
        icon: "construct",
        defaultCost: 2800,
        unit: "day"
      }
    ]
  },
  "Material Handling & Lifting": {
    description: "Once the foundation is set, you need to move heavy materials like steel beams and concrete blocks high into the air.",
    icon: "arrow-up-outline",
    color: "#10B981",
    equipment: [
      {
        type: "Tower Crane",
        description: "Fixed to the ground (or the building itself), these provide the height and lifting capacity for skyscrapers.",
        icon: "arrow-up",
        defaultCost: 8000,
        unit: "month"
      },
      {
        type: "Mobile Crane",
        description: "Mounted on trucks or tracks, these can be moved around the site for flexible lifting.",
        icon: "arrow-up",
        defaultCost: 4000,
        unit: "day"
      },
      {
        type: "Telehandler",
        description: "Essentially a forklift with a telescopic boom, allowing it to reach into the upper floors of a structure.",
        icon: "arrow-up",
        defaultCost: 1800,
        unit: "day"
      },
      {
        type: "Forklift",
        description: "Used primarily at ground level to move pallets of bricks, cement, and other supplies.",
        icon: "arrow-up",
        defaultCost: 1200,
        unit: "day"
      },
      {
        type: "Rough Terrain Crane",
        description: "All-terrain crane for rough construction sites.",
        icon: "arrow-up",
        defaultCost: 3500,
        unit: "day"
      },
      {
        type: "All Terrain Crane",
        description: "Versatile crane for various terrains.",
        icon: "arrow-up",
        defaultCost: 4500,
        unit: "day"
      },
      {
        type: "Crawler Crane",
        description: "Heavy-duty tracked crane for maximum stability.",
        icon: "arrow-up",
        defaultCost: 5000,
        unit: "day"
      },
      {
        type: "Overhead Crane",
        description: "Fixed overhead crane for warehouse operations.",
        icon: "arrow-up",
        defaultCost: 6000,
        unit: "month"
      },
      {
        type: "Gantry Crane",
        description: "Portable gantry crane for material handling.",
        icon: "arrow-up",
        defaultCost: 3000,
        unit: "week"
      }
    ]
  },
  "Concrete & Paving Equipment": {
    description: "Since concrete is the backbone of most modern buildings, specialized vehicles are needed to mix and transport it.",
    icon: "cube-outline",
    color: "#F59E0B",
    equipment: [
      {
        type: "Concrete Mixer Truck",
        description: "The iconic rotating drums that keep concrete liquid during transit.",
        icon: "cube",
        defaultCost: 2000,
        unit: "day"
      },
      {
        type: "Concrete Pump",
        description: "Vehicles with long, robotic arms (booms) that shoot liquid concrete to the exact spot where it needs to be poured.",
        icon: "cube",
        defaultCost: 3500,
        unit: "day"
      },
      {
        type: "Concrete Pump Truck",
        description: "Mobile concrete pump with boom for high-rise construction.",
        icon: "cube",
        defaultCost: 4000,
        unit: "day"
      },
      {
        type: "Stationary Concrete Pump",
        description: "Fixed concrete pump for continuous operations.",
        icon: "cube",
        defaultCost: 2500,
        unit: "day"
      },
      {
        type: "Compactor/Roller",
        description: "Used to flatten and densify the ground or asphalt to create a stable base for floors and parking lots.",
        icon: "cube",
        defaultCost: 1500,
        unit: "day"
      },
      {
        type: "Plate Compactor",
        description: "Small compactor for tight spaces and finishing work.",
        icon: "cube",
        defaultCost: 800,
        unit: "day"
      },
      {
        type: "Vibratory Roller",
        description: "Heavy roller for soil and asphalt compaction.",
        icon: "cube",
        defaultCost: 2200,
        unit: "day"
      },
      {
        type: "Pneumatic Roller",
        description: "Rubber-tired roller for asphalt finishing.",
        icon: "cube",
        defaultCost: 2000,
        unit: "day"
      },
      {
        type: "Concrete Vibrator",
        description: "Equipment for concrete consolidation.",
        icon: "cube",
        defaultCost: 500,
        unit: "day"
      },
      {
        type: "Concrete Screed",
        description: "Equipment for concrete surface finishing.",
        icon: "cube",
        defaultCost: 800,
        unit: "day"
      }
    ]
  },
  "Hauling & Transport Vehicles": {
    description: "You can't have a clean site without moving spoils (dirt) out and bringing raw materials in.",
    icon: "car-outline",
    color: "#EF4444",
    equipment: [
      {
        type: "Dump Truck",
        description: "The standard vehicle for hauling away excavated earth or bringing in gravel and sand.",
        icon: "car",
        defaultCost: 1800,
        unit: "day"
      },
      {
        type: "Articulated Hauler",
        description: "Heavy-duty dump trucks with a hinge between the cab and the bed, designed for off-road or muddy terrain.",
        icon: "car",
        defaultCost: 2500,
        unit: "day"
      },
      {
        type: "Flatbed Truck",
        description: "Used to deliver large pre-fabricated components, steel rebar, and heavy machinery.",
        icon: "car",
        defaultCost: 1500,
        unit: "day"
      },
      {
        type: "Water Truck",
        description: "For dust control and site maintenance.",
        icon: "car",
        defaultCost: 1200,
        unit: "day"
      },
      {
        type: "Fuel Truck",
        description: "Mobile fuel supply for equipment.",
        icon: "car",
        defaultCost: 1000,
        unit: "day"
      },
      {
        type: "Low Loader Trailer",
        description: "For transporting heavy equipment.",
        icon: "car",
        defaultCost: 2000,
        unit: "day"
      },
      {
        type: "Tipper Truck",
        description: "Standard tipping truck for material transport.",
        icon: "car",
        defaultCost: 1600,
        unit: "day"
      },
      {
        type: "Transit Mixer",
        description: "Mobile concrete mixing truck.",
        icon: "car",
        defaultCost: 2200,
        unit: "day"
      }
    ]
  },
  "Specialty & Finishing Equipment": {
    description: "Specialized equipment for finishing work and specific construction tasks.",
    icon: "settings-outline",
    color: "#6366F1",
    equipment: [
      {
        type: "Aerial Lift (Scissor Lift)",
        description: "Provide a stable platform for workers to perform electrical, plumbing, or painting tasks at height.",
        icon: "settings",
        defaultCost: 1200,
        unit: "day"
      },
      {
        type: "Boom Lift",
        description: "Articulating boom lift for reaching difficult areas.",
        icon: "settings",
        defaultCost: 1500,
        unit: "day"
      },
      {
        type: "Cherry Picker",
        description: "Mobile elevated work platform.",
        icon: "settings",
        defaultCost: 1000,
        unit: "day"
      },
      {
        type: "Paver",
        description: "Used if the building project includes parking lots or intricate walkways.",
        icon: "settings",
        defaultCost: 3000,
        unit: "day"
      },
      {
        type: "Trencher",
        description: "Specifically designed for digging narrow paths for underground piping and electrical conduits.",
        icon: "settings",
        defaultCost: 1800,
        unit: "day"
      },
      {
        type: "Compressor",
        description: "Air compressor for pneumatic tools.",
        icon: "settings",
        defaultCost: 600,
        unit: "day"
      },
      {
        type: "Generator",
        description: "Portable power generation.",
        icon: "settings",
        defaultCost: 800,
        unit: "day"
      },
      {
        type: "Welding Machine",
        description: "Equipment for metal fabrication and repair.",
        icon: "settings",
        defaultCost: 500,
        unit: "day"
      },
      {
        type: "Cutting Machine",
        description: "For cutting various materials.",
        icon: "settings",
        defaultCost: 400,
        unit: "day"
      },
      {
        type: "Drilling Machine",
        description: "For drilling holes and core sampling.",
        icon: "settings",
        defaultCost: 700,
        unit: "day"
      },
      {
        type: "Hoist",
        description: "Material hoist for vertical transport.",
        icon: "settings",
        defaultCost: 1500,
        unit: "week"
      },
      {
        type: "Concrete Cutter",
        description: "For cutting concrete and masonry.",
        icon: "settings",
        defaultCost: 600,
        unit: "day"
      },
      {
        type: "Road Roller",
        description: "For road construction and maintenance.",
        icon: "settings",
        defaultCost: 2000,
        unit: "day"
      },
      {
        type: "Asphalt Paver",
        description: "For laying asphalt surfaces.",
        icon: "settings",
        defaultCost: 3500,
        unit: "day"
      }
    ]
  }
};

// GET - Retrieve equipment categories and types
export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const format = searchParams.get("format") || "detailed";

    // Build cache key
    const cacheKey = `equipment:categories:${category || 'all'}:${format}`;
    
    // Check cache first
    let cacheValue = await client.get(cacheKey);
    if (cacheValue) {
      cacheValue = JSON.parse(cacheValue);
      return successResponse(cacheValue, "Equipment categories retrieved successfully (cached)");
    }

    let responseData;

    if (category) {
      // Return specific category
      const categoryData = equipmentCategories[category as keyof typeof equipmentCategories];
      if (!categoryData) {
        return successResponse(null, "Category not found", 404);
      }
      responseData = categoryData;
    } else if (format === "simple") {
      // Return simplified list for dropdowns
      const simpleCategories = Object.keys(equipmentCategories).map(categoryName => ({
        name: categoryName,
        equipment: equipmentCategories[categoryName as keyof typeof equipmentCategories].equipment.map(eq => ({
          type: eq.type,
          defaultCost: eq.defaultCost,
          unit: eq.unit
        }))
      }));
      
      responseData = simpleCategories;
    } else {
      // Return all categories with full details
      responseData = equipmentCategories;
    }

    // Cache the response
    await client.set(cacheKey, JSON.stringify(responseData));

    return successResponse(responseData, category ? `${category} equipment retrieved successfully` : "Equipment categories retrieved successfully");
  } catch (error: unknown) {
    return successResponse(equipmentCategories, "Equipment categories retrieved successfully");
  }
};