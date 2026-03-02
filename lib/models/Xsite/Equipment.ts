import { Schema, model, models } from "mongoose";

// Clear any existing Equipment model to avoid schema conflicts
if (models.Equipment) {
  delete models.Equipment;
}

// Equipment Schema for standalone Equipment documents
const EquipmentSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      // Equipment types from the categories
      enum: [
        // Earthmoving & Excavation Equipment
        'Excavator',
        'Backhoe Loader',
        'Bulldozer',
        'Skid-Steer Loader',
        'Mini Excavator',
        'Track Loader',
        'Wheel Loader',
        'Grader',
        
        // Material Handling & Lifting
        'Tower Crane',
        'Mobile Crane',
        'Telehandler',
        'Forklift',
        'Rough Terrain Crane',
        'All Terrain Crane',
        'Crawler Crane',
        'Overhead Crane',
        'Gantry Crane',
        
        // Concrete & Paving Equipment
        'Concrete Mixer Truck',
        'Concrete Pump',
        'Concrete Pump Truck',
        'Stationary Concrete Pump',
        'Compactor/Roller',
        'Plate Compactor',
        'Vibratory Roller',
        'Pneumatic Roller',
        'Concrete Vibrator',
        'Concrete Screed',
        
        // Hauling & Transport Vehicles
        'Dump Truck',
        'Articulated Hauler',
        'Flatbed Truck',
        'Water Truck',
        'Fuel Truck',
        'Low Loader Trailer',
        'Tipper Truck',
        'Transit Mixer',
        
        // Specialty & Finishing Equipment
        'Aerial Lift (Scissor Lift)',
        'Boom Lift',
        'Cherry Picker',
        'Paver',
        'Trencher',
        'Compressor',
        'Generator',
        'Welding Machine',
        'Cutting Machine',
        'Drilling Machine',
        'Hoist',
        'Concrete Cutter',
        'Road Roller',
        'Asphalt Paver'
      ]
    },
    
    category: {
      type: String,
      required: true,
      enum: [
        'Earthmoving & Excavation Equipment',
        'Material Handling & Lifting',
        'Concrete & Paving Equipment',
        'Hauling & Transport Vehicles',
        'Specialty & Finishing Equipment'
      ]
    },
    
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    
    perUnitCost: {
      type: Number,
      required: true,
      min: 0,
    },
    
    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },
    
    // Rental or purchase information
    costType: {
      type: String,
      enum: ['rental', 'purchase', 'lease'],
      default: 'rental',
    },
    
    // For rental equipment
    rentalPeriod: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly'],
      default: 'weekly',
      required: false,
    },
    
    rentalDuration: {
      type: Number,
      required: false,
      min: 0,
    },
    
    // Project and Section References - Main tracking fields
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Projects',
      required: true,
    },
    
    projectName: {
      type: String,
      required: true,
    },
    
    // Project section reference for proper cost tracking
    projectSectionId: {
      type: Schema.Types.ObjectId,
      required: true, // Making this required for proper section tracking
    },
    
    projectSectionName: {
      type: String,
      required: true, // Making this required for display purposes
    },
    
    // Usage and tracking fields
    usageDate: {
      type: Date,
      default: Date.now,
    },
    
    notes: {
      type: String,
      required: false,
    },
    
    // Equipment specifications
    specifications: {
      model: { type: String, required: false },
      brand: { type: String, required: false },
      capacity: { type: String, required: false },
      fuelType: { type: String, enum: ['diesel', 'petrol', 'electric', 'hybrid'], required: false },
      operatorRequired: { type: Boolean, default: true },
    },
    
    // Status tracking
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'maintenance'],
      default: 'active',
    },
    
    // Audit fields
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  { 
    timestamps: true,
    _id: true,
    strict: true, // Ensure only defined fields are saved
    strictQuery: false // Allow flexible queries
  }
);

// Pre-save middleware to calculate totalCost
EquipmentSchema.pre('save', function(next) {
  if (this.quantity && this.perUnitCost) {
    if (this.costType === 'rental' && this.rentalDuration) {
      // For rental: Total Cost = Quantity × Duration × Per Unit Cost
      this.totalCost = this.quantity * this.rentalDuration * this.perUnitCost;
    } else {
      // For purchase/lease: Total Cost = Quantity × Per Unit Cost
      this.totalCost = this.quantity * this.perUnitCost;
    }
  }
  next();
});

// Pre-update middleware to recalculate totalCost when quantity, perUnitCost, or rental fields change
EquipmentSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  const update = this.getUpdate() as any;
  if (update && (update.quantity !== undefined || update.perUnitCost !== undefined || update.rentalDuration !== undefined || update.costType !== undefined)) {
    const quantity = update.quantity || (this as any).quantity;
    const perUnitCost = update.perUnitCost || (this as any).perUnitCost;
    const costType = update.costType || (this as any).costType;
    const rentalDuration = update.rentalDuration || (this as any).rentalDuration;
    
    if (quantity && perUnitCost) {
      if (costType === 'rental' && rentalDuration) {
        // For rental: Total Cost = Quantity × Duration × Per Unit Cost
        update.totalCost = quantity * rentalDuration * perUnitCost;
      } else {
        // For purchase/lease: Total Cost = Quantity × Per Unit Cost
        update.totalCost = quantity * perUnitCost;
      }
    }
  }
  next();
});

// Static methods for Equipment model
// Static methods for Equipment model
EquipmentSchema.statics.findByProject = function(projectId: string) {
  return this.find({ projectId });
};

EquipmentSchema.statics.findByProjectSection = function(projectId: string, projectSectionId: string) {
  return this.find({ projectId, projectSectionId });
};

EquipmentSchema.statics.getTotalCostByProject = async function(projectId: string) {
  const result = await this.aggregate([
    { $match: { projectId: new (require('mongoose')).Types.ObjectId(projectId), status: 'active' } },
    { $group: { _id: null, totalCost: { $sum: '$totalCost' }, totalEquipment: { $sum: '$quantity' } } }
  ]);
  return result[0] || { totalCost: 0, totalEquipment: 0 };
};

EquipmentSchema.statics.getTotalCostByProjectSection = async function(projectId: string, projectSectionId: string) {
  const result = await this.aggregate([
    { 
      $match: { 
        projectId: new (require('mongoose')).Types.ObjectId(projectId),
        projectSectionId: new (require('mongoose')).Types.ObjectId(projectSectionId),
        status: 'active' 
      } 
    },
    { 
      $group: { 
        _id: null, 
        totalCost: { $sum: '$totalCost' }, 
        totalEquipment: { $sum: '$quantity' } 
      } 
    }
  ]);
  return result[0] || { totalCost: 0, totalEquipment: 0 };
};

EquipmentSchema.statics.findByCategory = function(category: string) {
  return this.find({ category });
};

EquipmentSchema.statics.getCategoryStats = async function(projectId?: string, projectSectionId?: string) {
  const matchQuery: any = { status: 'active' };
  
  if (projectId) {
    matchQuery.projectId = new (require('mongoose')).Types.ObjectId(projectId);
  }
  
  if (projectSectionId) {
    matchQuery.projectSectionId = new (require('mongoose')).Types.ObjectId(projectSectionId);
  }

  return await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$category',
        totalCost: { $sum: '$totalCost' },
        totalEquipment: { $sum: '$quantity' },
        entries: { $sum: 1 },
        avgCostPerUnit: { $avg: '$perUnitCost' }
      }
    },
    { $sort: { totalCost: -1 } }
  ]);
};

EquipmentSchema.statics.getRentalStats = async function(projectId?: string, projectSectionId?: string) {
  const matchQuery: any = { status: 'active', costType: 'rental' };
  
  if (projectId) {
    matchQuery.projectId = new (require('mongoose')).Types.ObjectId(projectId);
  }
  
  if (projectSectionId) {
    matchQuery.projectSectionId = new (require('mongoose')).Types.ObjectId(projectSectionId);
  }

  return await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$rentalPeriod',
        totalCost: { $sum: '$totalCost' },
        totalEquipment: { $sum: '$quantity' },
        entries: { $sum: 1 }
      }
    },
    { $sort: { totalCost: -1 } }
  ]);
};

// Instance methods
EquipmentSchema.methods.updateCost = function() {
  if (this.costType === 'rental' && this.rentalDuration) {
    // For rental: Total Cost = Quantity × Duration × Per Unit Cost
    this.totalCost = this.quantity * this.rentalDuration * this.perUnitCost;
  } else {
    // For purchase/lease: Total Cost = Quantity × Per Unit Cost
    this.totalCost = this.quantity * this.perUnitCost;
  }
  return this.save();
};

EquipmentSchema.methods.markCompleted = function() {
  this.status = 'completed';
  return this.save();
};

EquipmentSchema.methods.markCancelled = function() {
  this.status = 'cancelled';
  return this.save();
};

EquipmentSchema.methods.markMaintenance = function() {
  this.status = 'maintenance';
  return this.save();
};

// Create Equipment model with fresh schema
const Equipment = model("Equipment", EquipmentSchema);

export { EquipmentSchema, Equipment };
