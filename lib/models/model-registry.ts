import mongoose from 'mongoose';
import { logger } from '../utils/logger';

/**
 * Safe model registration that prevents re-registration issues during hot reload
 * and deployment updates
 * 
 * This solves the critical issue where model re-registration during server updates
 * can cause data loss due to schema conflicts and collection drops.
 * 
 * @param modelName - Name of the model (e.g., "Labor", "Staff", "Projects")
 * @param schema - Mongoose schema for the model
 * @param collectionName - Optional collection name (defaults to lowercase plural of modelName)
 * @returns Mongoose model instance
 */
export function safeModelRegistration<T>(
  modelName: string,
  schema: mongoose.Schema,
  collectionName?: string
): mongoose.Model<T> {
  try {
    // Check if model already exists in mongoose cache
    if (mongoose.models[modelName]) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (isDevelopment) {
        // In development, allow hot reload by clearing the model
        logger.info(`[Model Registry] Hot reload detected for ${modelName}, re-registering...`);
        delete mongoose.models[modelName];
        delete mongoose.connection.models[modelName];
      } else {
        // In production, ALWAYS reuse existing model to prevent schema conflicts
        logger.info(`[Model Registry] Reusing existing model: ${modelName}`);
        return mongoose.models[modelName] as mongoose.Model<T>;
      }
    }

    // Register new model
    logger.info(`[Model Registry] Registering new model: ${modelName}`);
    const model = mongoose.model<T>(modelName, schema, collectionName);
    
    return model;
    
  } catch (error) {
    logger.error(`[Model Registry] Error registering model ${modelName}:`, error);
    
    // If registration fails, try to return existing model
    if (mongoose.models[modelName]) {
      logger.warn(`[Model Registry] Falling back to existing model: ${modelName}`);
      return mongoose.models[modelName] as mongoose.Model<T>;
    }
    
    // If no existing model, re-throw error
    throw error;
  }
}

/**
 * Check if a model is already registered
 */
export function isModelRegistered(modelName: string): boolean {
  return !!mongoose.models[modelName];
}

/**
 * Get all registered model names
 */
export function getRegisteredModels(): string[] {
  return Object.keys(mongoose.models);
}

/**
 * Clear all models (use with extreme caution, only for testing)
 */
export function clearAllModels(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot clear models in production environment');
  }
  
  logger.warn('[Model Registry] Clearing all models (testing only)');
  
  Object.keys(mongoose.models).forEach(modelName => {
    delete mongoose.models[modelName];
  });
  
  Object.keys(mongoose.connection.models).forEach(modelName => {
    delete mongoose.connection.models[modelName];
  });
}
