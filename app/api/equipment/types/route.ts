import { NextRequest } from "next/server";
import { successResponse } from "@/lib/utils/api-response";

// All equipment types in a flat list (like labor types)
const equipmentTypes = [
  // Earthmoving & Excavation Equipment
  {
    type: "Excavator",
    category: "Earthmoving & Excavation Equipment",
    description: "The versatile giants with a bucket, boom, and cab on a rotating platform. Used for digging foundations and trenches.",
    icon: "construct",
    color: "#8B5CF6",
    defaultCost: 2500,
    unit: "day"
  },
  {
    type: "Backhoe Loader",
    category: "Earthmoving & Excavation Equipment",
    description: "A jack-of-all-trades featuring a loader bucket on the front and a backhoe for digging on the rear.",
    icon: "construct",
    color: "#8B5CF6",
    defaultCost: 2000,
    unit: "day"
  },
  {
    type: "Bulldozer",
    category: "Earthmoving & Excavation Equipment",
    description: "Massive, tracked machines with a front blade used to push large quantities of soil, sand, or rubble.",
    icon: "construct",
    color: "#8B5CF6",
    defaultCost: 3000,
    unit: "day"
  },
  {
    type: "Skid-Steer Loader",
    category: "Earthmoving & Excavation Equipment",
    description: "Small, maneuverable machines used for internal demolition, loading material, and clearing debris in tight spaces.",
    icon: "construct",
    color: "#8B5CF6",
    defaultCost: 1500,
    unit: "day"
  },
  {
    type: "Mini Excavator",
    category: "Earthmoving & Excavation Equipment",
    description: "Compact excavators for tight spaces and precision work.",
    icon: "construct",
    color: "#8B5CF6",
    defaultCost: 1800,
    unit: "day"
  },
  {
    type: "Track Loader",
    category: "Earthmoving & Excavation Equipment",
    description: "Tracked loader for heavy material handling.",
    icon: "construct",
    color: "#8B5CF6",
    defaultCost: 2200,
    unit: "day"
  },
  {
    type: "Wheel Loader",
    category: "Earthmoving & Excavation Equipment",
    description: "Wheeled loader for versatile material handling.",
    icon: "construct",
    color: "#8B5CF6",
    defaultCost: 2100,
    unit: "day"
  },
  {
    type: "Grader",
    category: "Earthmoving & Excavation Equipment",
    description: "Motor grader for fine grading and leveling.",
    icon: "construct",
    color: "#8B5CF6",
    defaultCost: 2800,
    unit: "day"
  },
  // Material Handling & Lifting
  {
    type: "Tower Crane",
    category: "Material Handling & Lifting",
    description: "Fixed to the ground (or the building itself), these provide the height and lifting capacity for skyscrapers.",
    icon: "arrow-up",
    color: "#10B981",
    defaultCost: 8000,
    unit: "month"
  },
  {
    type: "Mobile Crane",
    category: "Material Handling & Lifting",
    description: "Mounted on trucks or tracks, these can be moved around the site for flexible lifting.",
    icon: "arrow-up",
    color: "#10B981",
    defaultCost: 4000,
    unit: "day"
  },
  {
    type: "Telehandler",
    category: "Material Handling & Lifting",
    description: "Essentially a forklift with a telescopic boom, allowing it to reach into the upper floors of a structure.",
    icon: "arrow-up",
    color: "#10B981",
    defaultCost: 1800,
    unit: "day"
  },
  {
    type: "Forklift",
    category: "Material Handling & Lifting",
    description: "Used primarily at ground level to move pallets of bricks, cement, and other supplies.",
    icon: "arrow-up",
    color: "#10B981",
    defaultCost: 1200,
    unit: "day"
  },
  {
    type: "Rough Terrain Crane",
    category: "Material Handling & Lifting",
    description: "All-terrain crane for rough construction sites.",
    icon: "arrow-up",
    color: "#10B981",
    defaultCost: 3500,
    unit: "day"
  },
  {
    type: "All Terrain Crane",
    category: "Material Handling & Lifting",
    description: "Versatile crane for various terrains.",
    icon: "arrow-up",
    color: "#10B981",
    defaultCost: 4500,
    unit: "day"
  },
  {
    type: "Crawler Crane",
    category: "Material Handling & Lifting",
    description: "Heavy-duty tracked crane for maximum stability.",
    icon: "arrow-up",
    color: "#10B981",
    defaultCost: 5000,
    unit: "day"
  },
  {
    type: "Overhead Crane",
    category: "Material Handling & Lifting",
    description: "Fixed overhead crane for warehouse operations.",
    icon: "arrow-up",
    color: "#10B981",
    defaultCost: 6000,
    unit: "month"
  },
  {
    type: "Gantry Crane",
    category: "Material Handling & Lifting",
    description: "Portable gantry crane for material handling.",
    icon: "arrow-up",
    color: "#10B981",
    defaultCost: 3000,
    unit: "week"
  },
  // Concrete & Paving Equipment
  {
    type: "Concrete Mixer Truck",
    category: "Concrete & Paving Equipment",
    description: "The iconic rotating drums that keep concrete liquid during transit.",
    icon: "cube",
    color: "#F59E0B",
    defaultCost: 2000,
    unit: "day"
  },
  {
    type: "Concrete Pump",
    category: "Concrete & Paving Equipment",
    description: "Vehicles with long, robotic arms (booms) that shoot liquid concrete to the exact spot where it needs to be poured.",
    icon: "cube",
    color: "#F59E0B",
    defaultCost: 3500,
    unit: "day"
  },
  {
    type: "Concrete Pump Truck",
    category: "Concrete & Paving Equipment",
    description: "Mobile concrete pump with boom for high-rise construction.",
    icon: "cube",
    color: "#F59E0B",
    defaultCost: 4000,
    unit: "day"
  },
  {
    type: "Stationary Concrete Pump",
    category: "Concrete & Paving Equipment",
    description: "Fixed concrete pump for continuous operations.",
    icon: "cube",
    color: "#F59E0B",
    defaultCost: 2500,
    unit: "day"
  },
  {
    type: "Compactor/Roller",
    category: "Concrete & Paving Equipment",
    description: "Used to flatten and densify the ground or asphalt to create a stable base for floors and parking lots.",
    icon: "cube",
    color: "#F59E0B",
    defaultCost: 1500,
    unit: "day"
  },
  {
    type: "Plate Compactor",
    category: "Concrete & Paving Equipment",
    description: "Small compactor for tight spaces and finishing work.",
    icon: "cube",
    color: "#F59E0B",
    defaultCost: 800,
    unit: "day"
  },
  {
    type: "Vibratory Roller",
    category: "Concrete & Paving Equipment",
    description: "Heavy roller for soil and asphalt compaction.",
    icon: "cube",
    color: "#F59E0B",
    defaultCost: 2200,
    unit: "day"
  },
  {
    type: "Pneumatic Roller",
    category: "Concrete & Paving Equipment",
    description: "Rubber-tired roller for asphalt finishing.",
    icon: "cube",
    color: "#F59E0B",
    defaultCost: 2000,
    unit: "day"
  },
  {
    type: "Concrete Vibrator",
    category: "Concrete & Paving Equipment",
    description: "Equipment for concrete consolidation.",
    icon: "cube",
    color: "#F59E0B",
    defaultCost: 500,
    unit: "day"
  },
  {
    type: "Concrete Screed",
    category: "Concrete & Paving Equipment",
    description: "Equipment for concrete surface finishing.",
    icon: "cube",
    color: "#F59E0B",
    defaultCost: 800,
    unit: "day"
  },
  // Hauling & Transport Vehicles
  {
    type: "Dump Truck",
    category: "Hauling & Transport Vehicles",
    description: "The standard vehicle for hauling away excavated earth or bringing in gravel and sand.",
    icon: "car",
    color: "#EF4444",
    defaultCost: 1800,
    unit: "day"
  },
  {
    type: "Articulated Hauler",
    category: "Hauling & Transport Vehicles",
    description: "Heavy-duty dump trucks with a hinge between the cab and the bed, designed for off-road or muddy terrain.",
    icon: "car",
    color: "#EF4444",
    defaultCost: 2500,
    unit: "day"
  },
  {
    type: "Flatbed Truck",
    category: "Hauling & Transport Vehicles",
    description: "Used to deliver large pre-fabricated components, steel rebar, and heavy machinery.",
    icon: "car",
    color: "#EF4444",
    defaultCost: 1500,
    unit: "day"
  },
  {
    type: "Water Truck",
    category: "Hauling & Transport Vehicles",
    description: "For dust control and site maintenance.",
    icon: "car",
    color: "#EF4444",
    defaultCost: 1200,
    unit: "day"
  },
  {
    type: "Fuel Truck",
    category: "Hauling & Transport Vehicles",
    description: "Mobile fuel supply for equipment.",
    icon: "car",
    color: "#EF4444",
    defaultCost: 1000,
    unit: "day"
  },
  {
    type: "Low Loader Trailer",
    category: "Hauling & Transport Vehicles",
    description: "For transporting heavy equipment.",
    icon: "car",
    color: "#EF4444",
    defaultCost: 2000,
    unit: "day"
  },
  {
    type: "Tipper Truck",
    category: "Hauling & Transport Vehicles",
    description: "Standard tipping truck for material transport.",
    icon: "car",
    color: "#EF4444",
    defaultCost: 1600,
    unit: "day"
  },
  {
    type: "Transit Mixer",
    category: "Hauling & Transport Vehicles",
    description: "Mobile concrete mixing truck.",
    icon: "car",
    color: "#EF4444",
    defaultCost: 2200,
    unit: "day"
  },
  // Specialty & Finishing Equipment
  {
    type: "Aerial Lift (Scissor Lift)",
    category: "Specialty & Finishing Equipment",
    description: "Provide a stable platform for workers to perform electrical, plumbing, or painting tasks at height.",
    icon: "settings",
    color: "#6366F1",
    defaultCost: 1200,
    unit: "day"
  },
  {
    type: "Boom Lift",
    category: "Specialty & Finishing Equipment",
    description: "Articulating boom lift for reaching difficult areas.",
    icon: "settings",
    color: "#6366F1",
    defaultCost: 1500,
    unit: "day"
  },
  {
    type: "Cherry Picker",
    category: "Specialty & Finishing Equipment",
    description: "Mobile elevated work platform.",
    icon: "settings",
    color: "#6366F1",
    defaultCost: 1000,
    unit: "day"
  },
  {
    type: "Paver",
    category: "Specialty & Finishing Equipment",
    description: "Used if the building project includes parking lots or intricate walkways.",
    icon: "settings",
    color: "#6366F1",
    defaultCost: 3000,
    unit: "day"
  },
  {
    type: "Trencher",
    category: "Specialty & Finishing Equipment",
    description: "Specifically designed for digging narrow paths for underground piping and electrical conduits.",
    icon: "settings",
    color: "#6366F1",
    defaultCost: 1800,
    unit: "day"
  },
  {
    type: "Compressor",
    category: "Specialty & Finishing Equipment",
    description: "Air compressor for pneumatic tools.",
    icon: "settings",
    color: "#6366F1",
    defaultCost: 600,
    unit: "day"
  },
  {
    type: "Generator",
    category: "Specialty & Finishing Equipment",
    description: "Portable power generation.",
    icon: "settings",
    color: "#6366F1",
    defaultCost: 800,
    unit: "day"
  },
  {
    type: "Welding Machine",
    category: "Specialty & Finishing Equipment",
    description: "Equipment for metal fabrication and repair.",
    icon: "settings",
    color: "#6366F1",
    defaultCost: 500,
    unit: "day"
  },
  {
    type: "Cutting Machine",
    category: "Specialty & Finishing Equipment",
    description: "For cutting various materials.",
    icon: "settings",
    color: "#6366F1",
    defaultCost: 400,
    unit: "day"
  },
  {
    type: "Drilling Machine",
    category: "Specialty & Finishing Equipment",
    description: "For drilling holes and core sampling.",
    icon: "settings",
    color: "#6366F1",
    defaultCost: 700,
    unit: "day"
  },
  {
    type: "Hoist",
    category: "Specialty & Finishing Equipment",
    description: "Material hoist for vertical transport.",
    icon: "settings",
    color: "#6366F1",
    defaultCost: 1500,
    unit: "week"
  },
  {
    type: "Concrete Cutter",
    category: "Specialty & Finishing Equipment",
    description: "For cutting concrete and masonry.",
    icon: "settings",
    color: "#6366F1",
    defaultCost: 600,
    unit: "day"
  },
  {
    type: "Road Roller",
    category: "Specialty & Finishing Equipment",
    description: "For road construction and maintenance.",
    icon: "settings",
    color: "#6366F1",
    defaultCost: 2000,
    unit: "day"
  },
  {
    type: "Asphalt Paver",
    category: "Specialty & Finishing Equipment",
    description: "For laying asphalt surfaces.",
    icon: "settings",
    color: "#6366F1",
    defaultCost: 3500,
    unit: "day"
  }
];

// GET - Retrieve all equipment types in a flat list
export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");

    let filteredTypes = equipmentTypes;

    // Filter by category if specified
    if (category) {
      filteredTypes = equipmentTypes.filter(eq => 
        eq.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    // Filter by search term if specified
    if (search) {
      filteredTypes = filteredTypes.filter(eq => 
        eq.type.toLowerCase().includes(search.toLowerCase()) ||
        eq.description.toLowerCase().includes(search.toLowerCase()) ||
        eq.category.toLowerCase().includes(search.toLowerCase())
      );
    }

    return successResponse(filteredTypes, "Equipment types retrieved successfully");
  } catch (error: unknown) {
    console.error("Error retrieving equipment types:", error);
    return successResponse(equipmentTypes, "Equipment types retrieved successfully");
  }
};