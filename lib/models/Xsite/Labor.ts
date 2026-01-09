import { Schema, model, models } from "mongoose";

// Embedded Labor Schema for use in Project/Building/etc documents
const EmbeddedLaborSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      // Labor types from the modal categories
      enum: [
        // Civil / Structural Works
        'Mason (Raj Mistri)',
        'Helper / Unskilled Labour',
        'Shuttering Carpenter',
        'Steel Fixer / Bar Bender',
        'Concrete Labour',
        'Tile Fixer',
        'Stone Mason',
        'Waterproofing Labour',
        
        // Electrical Works
        'Electrical Engineer / Supervisor',
        'Electrician',
        'Electrician Helper',
        'Panel Technician',
        'Earthing Technician',
        
        // Plumbing & Sanitary Works
        'Plumbing Engineer / Supervisor',
        'Plumber',
        'Plumber Helper',
        'Sanitary Fitter',
        'Drainage Labour',
        
        // Finishing Works
        'Painter',
        'Polish Worker',
        'Gypsum / POP Worker',
        'Carpenter (Finishing)',
        'Glass Fitter',
        'Aluminium Fabricator',
        
        // Mechanical & HVAC Works
        'HVAC Engineer',
        'AC Technician',
        'Duct Fabricator',
        'Ventilation Technician',
        
        // Fire Fighting & Safety Works
        'Fire Fighting Engineer',
        'Fire Pipe Fitter',
        'Sprinkler Technician',
        'Fire Alarm Technician',
        
        // External & Infrastructure Works
        'Paver Block Labour',
        'Road Work Labour',
        'Compound Wall Mason',
        'Landscaping Labour / Gardener',
        'Rainwater Harvesting Technician',
        
        // Waterproofing & Treatment Works
        'Waterproofing Applicator',
        'Chemical Treatment Technician',
        'Basement Treatment Labour',
        
        // Site Management & Support Staff
        'Site Engineer',
        'Junior Engineer',
        'Site Supervisor / Foreman',
        'Safety Officer',
        'Store Keeper',
        'Quantity Surveyor (QS)',
        'Time Keeper',
        
        // Equipment Operators
        'Excavator / JCB Operator',
        'Crane Operator',
        'Concrete Mixer Operator',
        'Lift Operator (Material/Passenger)',
        
        // Security & Housekeeping
        'Security Guard',
        'Watchman',
        'Housekeeping Labour'
      ]
    },
    
    category: {
      type: String,
      required: true,
      enum: [
        'Civil / Structural Works',
        'Electrical Works',
        'Plumbing & Sanitary Works',
        'Finishing Works',
        'Mechanical & HVAC Works',
        'Fire Fighting & Safety Works',
        'External & Infrastructure Works',
        'Waterproofing & Treatment Works',
        'Site Management & Support Staff',
        'Equipment Operators',
        'Security & Housekeeping'
      ]
    },
    
    count: {
      type: Number,
      required: true,
      min: 1,
    },
    
    perLaborCost: {
      type: Number,
      required: true,
      min: 0,
    },
    
    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },
    
    miniSectionId: {
      type: String,
      required: false,
    },
    
    miniSectionName: {
      type: String,
      required: false,
    },
    
    sectionId: {
      type: String,
      required: false,
    },
    
    // UI related fields
    icon: {
      type: String,
      required: false,
      default: 'people',
    },
    
    color: {
      type: String,
      required: false,
      default: '#3B82F6',
    },
    
    // Tracking fields
    addedAt: {
      type: Date,
      default: Date.now,
    },
    
    notes: {
      type: String,
      required: false,
    },
    
    workDate: {
      type: Date,
      required: false,
    },
    
    // Status tracking
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
    
    // Audit fields (using String instead of ObjectId for embedded docs)
    addedBy: {
      type: String,
      required: false,
    },
    
    updatedBy: {
      type: String,
      required: false,
    },
  },
  { 
    timestamps: true,
    _id: true 
  }
);

// Full Labor Entry Schema for standalone Labor documents
const LaborSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      // Labor types from the modal categories
      enum: [
        // Civil / Structural Works
        'Mason (Raj Mistri)',
        'Helper / Unskilled Labour',
        'Shuttering Carpenter',
        'Steel Fixer / Bar Bender',
        'Concrete Labour',
        'Tile Fixer',
        'Stone Mason',
        'Waterproofing Labour',
        
        // Electrical Works
        'Electrical Engineer / Supervisor',
        'Electrician',
        'Electrician Helper',
        'Panel Technician',
        'Earthing Technician',
        
        // Plumbing & Sanitary Works
        'Plumbing Engineer / Supervisor',
        'Plumber',
        'Plumber Helper',
        'Sanitary Fitter',
        'Drainage Labour',
        
        // Finishing Works
        'Painter',
        'Polish Worker',
        'Gypsum / POP Worker',
        'Carpenter (Finishing)',
        'Glass Fitter',
        'Aluminium Fabricator',
        
        // Mechanical & HVAC Works
        'HVAC Engineer',
        'AC Technician',
        'Duct Fabricator',
        'Ventilation Technician',
        
        // Fire Fighting & Safety Works
        'Fire Fighting Engineer',
        'Fire Pipe Fitter',
        'Sprinkler Technician',
        'Fire Alarm Technician',
        
        // External & Infrastructure Works
        'Paver Block Labour',
        'Road Work Labour',
        'Compound Wall Mason',
        'Landscaping Labour / Gardener',
        'Rainwater Harvesting Technician',
        
        // Waterproofing & Treatment Works
        'Waterproofing Applicator',
        'Chemical Treatment Technician',
        'Basement Treatment Labour',
        
        // Site Management & Support Staff
        'Site Engineer',
        'Junior Engineer',
        'Site Supervisor / Foreman',
        'Safety Officer',
        'Store Keeper',
        'Quantity Surveyor (QS)',
        'Time Keeper',
        
        // Equipment Operators
        'Excavator / JCB Operator',
        'Crane Operator',
        'Concrete Mixer Operator',
        'Lift Operator (Material/Passenger)',
        
        // Security & Housekeeping
        'Security Guard',
        'Watchman',
        'Housekeeping Labour'
      ]
    },
    
    category: {
      type: String,
      required: true,
      enum: [
        'Civil / Structural Works',
        'Electrical Works',
        'Plumbing & Sanitary Works',
        'Finishing Works',
        'Mechanical & HVAC Works',
        'Fire Fighting & Safety Works',
        'External & Infrastructure Works',
        'Waterproofing & Treatment Works',
        'Site Management & Support Staff',
        'Equipment Operators',
        'Security & Housekeeping'
      ]
    },
    
    count: {
      type: Number,
      required: true,
      min: 1,
    },
    
    perLaborCost: {
      type: Number,
      required: true,
      min: 0,
    },
    
    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },
    
    // Entity references for standalone Labor model
    entityType: {
      type: String,
      required: true,
      enum: ['project', 'building', 'otherSection', 'rowHouse'],
    },
    
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'entityModel',
    },
    
    entityModel: {
      type: String,
      required: true,
      enum: ['Projects', 'Building', 'OtherSection', 'RowHouse'],
    },
    
    // Project reference for cost tracking
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Projects',
      required: true,
    },
    
    miniSectionId: {
      type: String,
      required: false, // Optional as some projects might not have mini-sections
    },
    
    miniSectionName: {
      type: String,
      required: false,
    },
    
    sectionId: {
      type: String,
      required: false,
    },
    
    // UI related fields from the modal
    icon: {
      type: String,
      required: false,
      default: 'people',
    },
    
    color: {
      type: String,
      required: false,
      default: '#3B82F6',
    },
    
    // Tracking fields
    addedAt: {
      type: Date,
      default: Date.now,
    },
    
    // Optional fields for additional information
    notes: {
      type: String,
      required: false,
    },
    
    workDate: {
      type: Date,
      required: false,
    },
    
    // Status tracking
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
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
    _id: true 
  }
);

// Pre-save middleware to calculate totalCost
LaborSchema.pre('save', function(next) {
  if (this.count && this.perLaborCost) {
    this.totalCost = this.count * this.perLaborCost;
  }
  
  // Set entityModel based on entityType
  switch (this.entityType) {
    case 'project':
      this.entityModel = 'Projects';
      break;
    case 'building':
      this.entityModel = 'Building';
      break;
    case 'otherSection':
      this.entityModel = 'OtherSection';
      break;
    case 'rowHouse':
      this.entityModel = 'RowHouse';
      break;
  }
  
  next();
});

// Pre-update middleware to recalculate totalCost when count or perLaborCost changes
LaborSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  const update = this.getUpdate() as any;
  if (update && (update.count !== undefined || update.perLaborCost !== undefined)) {
    const count = update.count || (this as any).count;
    const perLaborCost = update.perLaborCost || (this as any).perLaborCost;
    if (count && perLaborCost) {
      update.totalCost = count * perLaborCost;
    }
  }
  next();
});

// Static methods for Labor model
LaborSchema.statics.findByEntity = function(entityType: string, entityId: string) {
  return this.find({ entityType, entityId });
};

LaborSchema.statics.findByProject = function(projectId: string) {
  return this.find({ projectId });
};

LaborSchema.statics.findByCategory = function(category: string) {
  return this.find({ category });
};

LaborSchema.statics.findByMiniSection = function(miniSectionId: string) {
  return this.find({ miniSectionId });
};

LaborSchema.statics.getTotalCostByEntity = async function(entityType: string, entityId: string) {
  const result = await this.aggregate([
    { $match: { entityType, entityId: new (require('mongoose')).Types.ObjectId(entityId), status: 'active' } },
    { $group: { _id: null, totalCost: { $sum: '$totalCost' }, totalLaborers: { $sum: '$count' } } }
  ]);
  return result[0] || { totalCost: 0, totalLaborers: 0 };
};

LaborSchema.statics.getCategoryStats = async function(entityType: string, entityId: string) {
  return await this.aggregate([
    { $match: { entityType, entityId: new (require('mongoose')).Types.ObjectId(entityId), status: 'active' } },
    {
      $group: {
        _id: '$category',
        totalCost: { $sum: '$totalCost' },
        totalLaborers: { $sum: '$count' },
        entries: { $sum: 1 },
        avgCostPerLaborer: { $avg: '$perLaborCost' }
      }
    },
    { $sort: { totalCost: -1 } }
  ]);
};

// Instance methods
LaborSchema.methods.updateCost = function() {
  this.totalCost = this.count * this.perLaborCost;
  return this.save();
};

LaborSchema.methods.markCompleted = function() {
  this.status = 'completed';
  return this.save();
};

LaborSchema.methods.markCancelled = function() {
  this.status = 'cancelled';
  return this.save();
};

// Create standalone Labor model
const Labor = models.Labor || model("Labor", LaborSchema);

export { LaborSchema, EmbeddedLaborSchema, Labor };