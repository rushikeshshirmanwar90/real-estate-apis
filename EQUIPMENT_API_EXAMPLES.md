# Equipment Management API Examples

This file contains practical examples of how to use the Equipment Management APIs.

## 1. Basic Equipment Operations

### Create Equipment Entry
```javascript
// Add an excavator to a project
const createEquipment = async () => {
  const response = await fetch('/api/equipment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'Excavator',
      category: 'Earthmoving & Excavation Equipment',
      quantity: 2,
      perUnitCost: 2500,
      costType: 'rental',
      rentalPeriod: 'daily',
      rentalDuration: 30,
      entityType: 'project',
      entityId: '507f1f77bcf86cd799439011',
      projectId: '507f1f77bcf86cd799439011',
      specifications: {
        model: 'CAT 320D',
        brand: 'Caterpillar',
        capacity: '20 ton',
        fuelType: 'diesel',
        operatorRequired: true
      },
      notes: 'For foundation excavation work',
      usageDate: new Date().toISOString(),
      addedBy: '507f1f77bcf86cd799439012'
    })
  });
  
  const result = await response.json();
  console.log('Equipment created:', result);
};
```

### Get Equipment List
```javascript
// Get all equipment for a project
const getProjectEquipment = async (projectId) => {
  const response = await fetch(`/api/equipment?projectId=${projectId}&page=1&limit=20`);
  const result = await response.json();
  
  console.log('Project Equipment:', result.data.equipment);
  console.log('Total Equipment:', result.data.meta.total);
};

// Get equipment by category
const getEquipmentByCategory = async (category) => {
  const response = await fetch(`/api/equipment?category=${encodeURIComponent(category)}`);
  const result = await response.json();
  
  console.log(`${category} Equipment:`, result.data.equipment);
};
```

### Update Equipment
```javascript
// Update equipment quantity and cost
const updateEquipment = async (equipmentId) => {
  const response = await fetch(`/api/equipment?id=${equipmentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      quantity: 3,
      perUnitCost: 2300,
      status: 'active',
      notes: 'Updated quantity for additional work',
      updatedBy: '507f1f77bcf86cd799439012'
    })
  });
  
  const result = await response.json();
  console.log('Equipment updated:', result);
};
```

## 2. Equipment Statistics

### Get Project Equipment Summary
```javascript
const getEquipmentSummary = async (projectId) => {
  const response = await fetch(`/api/equipment/stats?entityType=project&entityId=${projectId}&type=summary`);
  const result = await response.json();
  
  const { totalStats, categoryStats, statusBreakdown, costTypeBreakdown } = result.data;
  
  console.log('=== Equipment Summary ===');
  console.log(`Total Cost: ₹${totalStats.totalCost.toLocaleString()}`);
  console.log(`Total Equipment: ${totalStats.totalEquipment} units`);
  
  console.log('\n=== By Category ===');
  categoryStats.forEach(cat => {
    console.log(`${cat._id}: ₹${cat.totalCost.toLocaleString()} (${cat.totalEquipment} units)`);
  });
  
  console.log('\n=== By Status ===');
  statusBreakdown.forEach(status => {
    console.log(`${status._id}: ${status.count} entries, ₹${status.totalCost.toLocaleString()}`);
  });
  
  console.log('\n=== By Cost Type ===');
  costTypeBreakdown.forEach(type => {
    console.log(`${type._id}: ${type.count} entries, ₹${type.totalCost.toLocaleString()}`);
  });
};
```

### Get Rental Statistics
```javascript
const getRentalStats = async (projectId) => {
  const response = await fetch(`/api/equipment/stats?entityType=project&entityId=${projectId}&type=rental`);
  const result = await response.json();
  
  const { rentalDetails, rentalInsights } = result.data;
  
  console.log('=== Rental Statistics ===');
  rentalDetails.forEach(rental => {
    console.log(`${rental._id}: ₹${rental.totalCost.toLocaleString()} (${rental.totalEquipment} units)`);
  });
  
  console.log('\n=== Rental Insights ===');
  rentalInsights.forEach(insight => {
    console.log(`${insight._id.category} - ${insight._id.rentalPeriod}: ₹${insight.totalCost.toLocaleString()}`);
  });
};
```

## 3. Equipment Categories

### Get All Categories
```javascript
const getEquipmentCategories = async () => {
  const response = await fetch('/api/equipment/categories');
  const result = await response.json();
  
  Object.keys(result.data).forEach(categoryName => {
    const category = result.data[categoryName];
    console.log(`\n=== ${categoryName} ===`);
    console.log(category.description);
    console.log(`Equipment Types: ${category.equipment.length}`);
    
    category.equipment.forEach(equipment => {
      console.log(`- ${equipment.type}: ₹${equipment.defaultCost}/${equipment.unit}`);
    });
  });
};
```

### Get Specific Category
```javascript
const getCategoryDetails = async (categoryName) => {
  const response = await fetch(`/api/equipment/categories?category=${encodeURIComponent(categoryName)}`);
  const result = await response.json();
  
  if (result.data) {
    console.log(`=== ${categoryName} ===`);
    console.log(result.data.description);
    console.log('\nAvailable Equipment:');
    
    result.data.equipment.forEach(equipment => {
      console.log(`- ${equipment.type}`);
      console.log(`  Description: ${equipment.description}`);
      console.log(`  Default Cost: ₹${equipment.defaultCost}/${equipment.unit}`);
    });
  }
};
```

## 4. Bulk Operations

### Bulk Create Equipment
```javascript
const bulkCreateEquipment = async (projectId) => {
  const equipmentList = [
    {
      type: 'Excavator',
      category: 'Earthmoving & Excavation Equipment',
      quantity: 2,
      perUnitCost: 2500,
      costType: 'rental',
      rentalPeriod: 'daily',
      rentalDuration: 30,
      entityType: 'project',
      entityId: projectId,
      projectId: projectId,
      specifications: {
        model: 'CAT 320D',
        brand: 'Caterpillar',
        fuelType: 'diesel'
      }
    },
    {
      type: 'Concrete Mixer Truck',
      category: 'Concrete & Paving Equipment',
      quantity: 1,
      perUnitCost: 2000,
      costType: 'rental',
      rentalPeriod: 'daily',
      rentalDuration: 15,
      entityType: 'project',
      entityId: projectId,
      projectId: projectId,
      specifications: {
        capacity: '8 cubic meters',
        fuelType: 'diesel'
      }
    },
    {
      type: 'Tower Crane',
      category: 'Material Handling & Lifting',
      quantity: 1,
      perUnitCost: 8000,
      costType: 'rental',
      rentalPeriod: 'monthly',
      rentalDuration: 6,
      entityType: 'project',
      entityId: projectId,
      projectId: projectId,
      specifications: {
        capacity: '50 ton',
        operatorRequired: true
      }
    }
  ];

  const response = await fetch('/api/equipment/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operation: 'create',
      data: equipmentList
    })
  });
  
  const result = await response.json();
  console.log(`Bulk created ${result.data.length} equipment entries`);
};
```

### Bulk Status Update
```javascript
const completeProjectEquipment = async (projectId) => {
  const response = await fetch('/api/equipment/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operation: 'status-update',
      filters: { 
        projectId: projectId,
        status: 'active'
      },
      data: { 
        status: 'completed',
        updatedBy: '507f1f77bcf86cd799439012'
      }
    })
  });
  
  const result = await response.json();
  console.log(`Updated ${result.data.modifiedCount} equipment entries to completed`);
};
```

### Duplicate Equipment to Another Project
```javascript
const duplicateEquipmentToNewProject = async (sourceProjectId, targetProjectId) => {
  const response = await fetch('/api/equipment/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operation: 'duplicate',
      filters: { 
        projectId: sourceProjectId,
        status: 'active'
      },
      data: {
        targetEntityId: targetProjectId,
        targetEntityType: 'project',
        targetProjectId: targetProjectId,
        addedBy: '507f1f77bcf86cd799439012'
      }
    })
  });
  
  const result = await response.json();
  console.log(`Duplicated ${result.data.length} equipment entries to new project`);
};
```

## 5. Advanced Queries

### Get Equipment by Multiple Filters
```javascript
const getFilteredEquipment = async () => {
  // Get active rental equipment for a specific project
  const params = new URLSearchParams({
    projectId: '507f1f77bcf86cd799439011',
    status: 'active',
    costType: 'rental',
    page: '1',
    limit: '50'
  });
  
  const response = await fetch(`/api/equipment?${params}`);
  const result = await response.json();
  
  console.log('Filtered Equipment:', result.data.equipment);
  console.log('Total Found:', result.data.meta.total);
};
```

### Get Equipment Timeline
```javascript
const getEquipmentTimeline = async (projectId) => {
  const response = await fetch(`/api/equipment/stats?entityType=project&entityId=${projectId}&type=timeline`);
  const result = await response.json();
  
  console.log('=== Equipment Usage Timeline ===');
  result.data.forEach(entry => {
    const date = `${entry._id.year}-${entry._id.month}-${entry._id.day}`;
    console.log(`${date}: ${entry.count} entries, ₹${entry.totalCost.toLocaleString()}, ${entry.totalQuantity} units`);
  });
};
```

### Get Equipment Efficiency Stats
```javascript
const getEquipmentEfficiency = async (projectId) => {
  const response = await fetch(`/api/equipment/stats?entityType=project&entityId=${projectId}&type=efficiency`);
  const result = await response.json();
  
  console.log('=== Equipment Efficiency Analysis ===');
  result.data.forEach(equipment => {
    console.log(`\n${equipment._id}:`);
    console.log(`  Total Cost: ₹${equipment.totalCost.toLocaleString()}`);
    console.log(`  Usage Count: ${equipment.usageCount}`);
    console.log(`  Avg Cost/Unit: ₹${equipment.avgCostPerUnit.toFixed(2)}`);
    console.log(`  Cost Efficiency: ₹${equipment.costEfficiency.toFixed(2)}/usage`);
    console.log(`  Utilization Rate: ${(equipment.utilizationRate * 100).toFixed(1)}%`);
  });
};
```

## 6. Error Handling

### Robust API Calls with Error Handling
```javascript
const safeApiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }
    
    return result;
  } catch (error) {
    console.error('API Error:', error.message);
    throw error;
  }
};

// Usage example
const createEquipmentSafely = async (equipmentData) => {
  try {
    const result = await safeApiCall('/api/equipment', {
      method: 'POST',
      body: JSON.stringify(equipmentData)
    });
    
    console.log('Equipment created successfully:', result.data);
    return result.data;
  } catch (error) {
    console.error('Failed to create equipment:', error.message);
    return null;
  }
};
```

## 7. Integration Examples

### Calculate Total Project Equipment Cost
```javascript
const calculateProjectEquipmentCost = async (projectId) => {
  try {
    const response = await fetch(`/api/equipment/stats?entityType=project&entityId=${projectId}&type=summary`);
    const result = await response.json();
    
    const totalCost = result.data.totalStats.totalCost;
    const totalEquipment = result.data.totalStats.totalEquipment;
    
    console.log(`Project Equipment Summary:`);
    console.log(`Total Cost: ₹${totalCost.toLocaleString()}`);
    console.log(`Total Equipment: ${totalEquipment} units`);
    console.log(`Average Cost per Unit: ₹${(totalCost / totalEquipment).toFixed(2)}`);
    
    return { totalCost, totalEquipment };
  } catch (error) {
    console.error('Error calculating equipment cost:', error);
    return { totalCost: 0, totalEquipment: 0 };
  }
};
```

### Export Equipment Data
```javascript
const exportProjectEquipment = async (projectId) => {
  const response = await fetch('/api/equipment/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operation: 'export',
      filters: { projectId: projectId }
    })
  });
  
  const result = await response.json();
  
  // Convert to CSV or process as needed
  const csvData = result.data.map(equipment => ({
    Type: equipment.type,
    Category: equipment.category,
    Quantity: equipment.quantity,
    'Per Unit Cost': equipment.perUnitCost,
    'Total Cost': equipment.totalCost,
    'Cost Type': equipment.costType,
    Status: equipment.status,
    'Added Date': new Date(equipment.createdAt).toLocaleDateString(),
    Notes: equipment.notes || ''
  }));
  
  console.log('Equipment export data:', csvData);
  return csvData;
};
```

These examples demonstrate the full capabilities of the Equipment Management API system and can be adapted for various use cases in construction project management.