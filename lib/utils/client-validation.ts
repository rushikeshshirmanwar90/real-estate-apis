import { Client } from "@/lib/models/super-admin/Client";
import connect from "../db";
import { isValidObjectId } from "./validation";
import { logger } from "./logger";

/**
 * Validates if a client exists in the database
 * @param clientId - The client ID to validate
 * @returns Promise<boolean> - True if client exists, false otherwise
 */
export async function validateClientExists(clientId: string): Promise<boolean> {
  try {
    if (!clientId) {
      logger.warn("Client ID is missing");
      return false;
    }

    if (!isValidObjectId(clientId)) {
      logger.warn(`Invalid client ID format: ${clientId}`);
      return false;
    }

    await connect();

    const client = await Client.findById(clientId).select("_id").lean();

    if (!client) {
      logger.warn(`Client not found with ID: ${clientId}`);
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Error validating client existence:", error);
    return false;
  }
}

/**
 * Validates client and throws error if not found
 * Use this in API routes where you want to stop execution if client doesn't exist
 * @param clientId - The client ID to validate
 * @throws Error if client doesn't exist or is invalid
 */
export async function requireValidClient(clientId: string): Promise<void> {
  if (!clientId) {
    throw new Error("Client ID is required");
  }

  if (!isValidObjectId(clientId)) {
    throw new Error("Invalid client ID format");
  }

  await connect();

  const client = await Client.findById(clientId).select("_id").lean();

  if (!client) {
    throw new Error(
      `Client not found with ID: ${clientId}. Please ensure the client exists before performing this operation.`
    );
  }
}
