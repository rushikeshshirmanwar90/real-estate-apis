import mongoose from "mongoose";
import { logger } from "./logger";

/**
 * Check if MongoDB is running as a replica set (supports transactions)
 */
let isReplicaSet: boolean | null = null;

export async function checkReplicaSetStatus(): Promise<boolean> {
  if (isReplicaSet !== null) {
    return isReplicaSet;
  }

  try {
    const admin = mongoose.connection.db?.admin();
    if (!admin) {
      isReplicaSet = false;
      return false;
    }

    const status = await admin.command({ replSetGetStatus: 1 });
    isReplicaSet = !!status.set;
    logger.info(`MongoDB replica set detected: ${isReplicaSet}`);
    return isReplicaSet;
  } catch (error: any) {
    // If error code is 76, it means not running with --replSet
    if (error.code === 76 || error.codeName === 'NoReplicationEnabled') {
      isReplicaSet = false;
      logger.info('MongoDB is running as standalone (transactions disabled)');
      return false;
    }
    
    // For other errors, assume standalone
    isReplicaSet = false;
    logger.warn('Could not determine replica set status, assuming standalone', error);
    return false;
  }
}

/**
 * Execute a function with or without transaction based on MongoDB setup
 * 
 * @param operation - Async function that receives optional session parameter
 * @returns Result of the operation
 * 
 * @example
 * await withOptionalTransaction(async (session) => {
 *   await Model.create([data], { session });
 *   await OtherModel.updateOne(filter, update, { session });
 * });
 */
export async function withOptionalTransaction<T>(
  operation: (session?: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  const supportsTransactions = await checkReplicaSetStatus();

  if (!supportsTransactions) {
    // Run without transaction
    return await operation(undefined);
  }

  // Run with transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await operation(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Helper to add session to query options only if session exists
 */
export function withSession<T extends Record<string, any>>(
  options: T,
  session?: mongoose.ClientSession
): T {
  if (session) {
    return { ...options, session };
  }
  return options;
}
