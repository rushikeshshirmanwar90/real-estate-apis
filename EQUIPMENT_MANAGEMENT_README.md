# Equipment Management System

This system provides comprehensive equipment management for construction projects, similar to the Labor management system but specifically designed for construction equipment and machinery.

## Features

1. **Equipment Categories**: 5 main categories with 50+ equipment types
2. **Cost Management**: Rental, purchase, and lease tracking
3. **Project Integration**: Link equipment to projects, buildings, sections
4. **Statistics & Analytics**: Comprehensive reporting and insights
5. **Bulk Operations**: Efficient management of multiple equipment entries
6. **Specifications Tracking**: Model, brand, capacity, fuel type details

## Equipment Categories

### 1. Earthmoving & Excavation Equipment
**Purpose**: Site preparation and excavation work
- Excavators, Backhoe Loaders, Bulldozers
- Skid-Steer Loaders, Mini Excavators
- Track Loaders, Wheel Loaders, Graders

### 2. Material Handling & Lifting
**Purpose**: Moving heavy materials and lifting operations
- Tower Cranes, Mobile Cranes, Telehandlers
- Forklifts, Rough Terrain Cranes
- Crawler Cranes, Overhead Cranes, Gantry Cranes

### 3. Concrete & Paving Equipment
**Purpose**: Concrete work and paving operations
- Concrete Mixer Trucks, Concrete Pumps
- Compactors/Rollers, Plate Compactors
- Vibratory Rollers, Concrete Vibrators

### 4. Hauling & Transport Vehicles
**Purpose**: Material transportation and site logistics
- Dump Trucks, Articulated Haulers
- Flatbed Trucks, Water Trucks
- Fuel Trucks, Low Loader Trailers

### 5. Specialty & Finishing Equipment
**Purpose**: Specialized tasks and finishing work
- Aerial Lifts, Boom Lifts, Cherry Pickers
- Pavers, Trenchers, Compressors
- Generators, Welding Machines, Hoists

## API Endpoints

### Equipment Management (`/api/equipment`)

#### GET - Retrieve Equipment
```javascript
// Get all equipment for a project
GET /api/equipment?projectId=PROJECT_ID

// Get equipment by entity (building, section, etc.)
GET /api/equipment?entityType=building&entityId=BUILDING_ID

// Get specific equipment
GET /api/equipment?id=EQUIPMENT_ID

// Filter by category
GET /api/equipment?category=Earthmoving & Excavation Equipment

// Filter by status
GET /api/equipment?status=active

// Filter by cost type
GET /api/equipment?costType=rental
```

#### POST - Create Equipment Entry
```javascript
POST /api/equipment
{
  "type": "Excavator",
  "category": "Earthmoving & Excavation Equipment",
  "quantity": 2,
  "perUnitCost": 2500,
  "costType": "rental",
  "rentalPeriod": "daily",
  "rentalDuration": 30,
  "entityType": "project",
  "entityId": "PROJECT_ID",
  "projectId": "PROJECT_ID",
  "specifications": {
    "model": "CAT 320D",
    "brand": "Caterpillar",
    "capacity": "20 ton",
    "fuelType": "diesel",
    "operatorRequired": true
  },
  "notes": "For foundation excavation work"
}
```

#### PUT - Update Equipment
```javascript
PUT /api/equipment?id=EQUIPMENT_ID
{
  "quantity": 3,
  "perUnitCost": 2300,
  "status": "active"
}
```

#### DELETE - Remove Equipment
```javascript
DELETE /api/equipment?id=EQUIPMENT_ID
```

### Equipment Statistics (`/api/equipment/stats`)

#### Summary Statistics
```javascript
GET /api/equipment/stats?entityType=project&entityId=PROJECT_ID&type=summary
```

**Returns:**
- Total cost and equipment count
- Category breakdown
- Rental statistics
- Status breakdown
- Cost type breakdown

#### Category Statistics
```javascript
GET /api/equipment/stats?entityType=project&entityId=PROJECT_ID&type=category
```

#### Rental Statistics
```javascript
GET /api/equipment/stats?entityType=project&entityId=PROJECT_ID&type=rental
```

#### Timeline Statistics
```javascript
GET /api/equipment/stats?entityType=project&entityId=PROJECT_ID&type=timeline
```

#### Efficiency Statistics
```javascript
GET /api/equipment/stats?entityType=project&entityId=PROJECT_ID&type=efficiency
```

### Equipment Categories (`/api/equipment/categories`)

#### Get All Categories
```javascript
GET /api/equipment/categories
```

#### Get Specific Category
```javascript
GET /api/equipment/categories?category=Earthmoving & Excavation Equipment
```

#### Get Simple Format (for dropdowns)
```javascript
GET /api/equipment/categories?format=simple
```

### Bulk Operations (`/api/equipment/bulk`)

#### Bulk Create
```javascript
POST /api/equipment/bulk
{
  "operation": "create",
  "data": [
    {
      "type": "Excavator",
      "category": "Earthmoving & Excavation Equipment",
      "quantity": 1,
      "perUnitCost": 2500,
      "entityType": "project",
      "entityId": "PROJECT_ID",
      "projectId": "PROJECT_ID"
    },
    // ... more equipment entries
  ]
}
```

#### Bulk Update
```javascript
POST /api/equipment/bulk
{
  "operation": "update",
  "filters": { "projectId": "PROJECT_ID", "status": "active" },
  "data": { "perUnitCost": 2000 }
}
```

#### Bulk Status Update
```javascript
POST /api/equipment/bulk
{
  "operation": "status-update",
  "filters": { "projectId": "PROJECT_ID" },
  "data": { "status": "completed" }
}
```

#### Bulk Delete
```javascript
POST /api/equipment/bulk
{
  "operation": "delete",
  "filters": { "projectId": "PROJECT_ID", "status": "cancelled" }
}
```

#### Duplicate Equipment
```javascript
POST /api/equipment/bulk
{
  "operation": "duplicate",
  "filters": { "entityId": "SOURCE_ID" },
  "data": {
    "targetEntityId": "TARGET_ID",
    "targetEntityType": "building",
    "targetProjectId": "PROJECT_ID"
  }
}
```

## Data Model

### Equipment Schema Fields

#### Basic Information
- `type`: Equipment type (from predefined enum)
- `category`: Equipment category (5 main categories)
- `quantity`: Number of units
- `perUnitCost`: Cost per unit
- `totalCost`: Calculated total cost (quantity × perUnitCost)

#### Cost Management
- `costType`: 'rental' | 'purchase' | 'lease'
- `rentalPeriod`: 'hourly' | 'daily' | 'weekly' | 'monthly'
- `rentalDuration`: Duration in the specified period

#### Project References
- `entityType`: 'project' | 'building' | 'otherSection' | 'rowHouse'
- `entityId`: Reference to the entity
- `projectId`: Reference to the main project
- `miniSectionId`: Optional mini-section reference
- `sectionId`: Optional section reference

#### Equipment Specifications
```javascript
specifications: {
  model: String,        // Equipment model
  brand: String,        // Manufacturer brand
  capacity: String,     // Equipment capacity/size
  fuelType: String,     // 'diesel' | 'petrol' | 'electric' | 'hybrid'
  operatorRequired: Boolean  // Whether operator is needed
}
```

#### Tracking & Status
- `status`: 'active' | 'completed' | 'cancelled' | 'maintenance'
- `usageDate`: Date when equipment was used
- `addedAt`: Creation timestamp
- `notes`: Additional notes
- `addedBy`: User who added the entry
- `updatedBy`: User who last updated

#### UI Fields
- `icon`: Icon name for display
- `color`: Color code for UI

## Usage Examples

### Adding Equipment to a Project
```javascript
// Add excavator for foundation work
const excavator = await fetch('/api/equipment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'Excavator',
    category: 'Earthmoving & Excavation Equipment',
    quantity: 1,
    perUnitCost: 2500,
    costType: 'rental',
    rentalPeriod: 'daily',
    rentalDuration: 15,
    entityType: 'project',
    entityId: projectId,
    projectId: projectId,
    specifications: {
      model: 'CAT 320D',
      brand: 'Caterpillar',
      capacity: '20 ton',
      fuelType: 'diesel',
      operatorRequired: true
    },
    notes: 'For foundation excavation'
  })
});
```

### Getting Project Equipment Summary
```javascript
const stats = await fetch(`/api/equipment/stats?entityType=project&entityId=${projectId}&type=summary`);
const data = await stats.json();

console.log('Total Equipment Cost:', data.data.totalStats.totalCost);
console.log('Total Equipment Count:', data.data.totalStats.totalEquipment);
console.log('Category Breakdown:', data.data.categoryStats);
```

### Bulk Equipment Operations
```javascript
// Mark all project equipment as completed
const bulkUpdate = await fetch('/api/equipment/bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    operation: 'status-update',
    filters: { projectId: projectId },
    data: { status: 'completed' }
  })
});
```

## Integration with Projects

Equipment entries are automatically linked to projects and can be:
- Filtered by project, building, or section
- Included in project cost calculations
- Tracked across different project phases
- Analyzed for efficiency and utilization

## Cost Calculation

The system automatically calculates:
- **Total Cost**: `quantity × perUnitCost`
- **Category Totals**: Sum by equipment category
- **Rental Costs**: Based on duration and period
- **Project Totals**: All equipment costs for a project

## Status Management

Equipment can have different statuses:
- **Active**: Currently in use
- **Completed**: Work finished
- **Cancelled**: No longer needed
- **Maintenance**: Under repair/maintenance

## Best Practices

1. **Consistent Categorization**: Use predefined categories and types
2. **Accurate Costing**: Include all costs (rental, fuel, operator)
3. **Regular Updates**: Keep status and costs current
4. **Detailed Specifications**: Record model, brand, capacity details
5. **Proper Documentation**: Use notes for important details

## Security & Validation

- All ObjectIds are validated
- Required fields are enforced
- Numeric values are validated (positive costs, quantities)
- Enum values are restricted to predefined options
- Audit trail with user tracking