import connect from "@/lib/db";
import { LoginUser } from "@/lib/models/Xsite/LoginUsers";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { isValidEmail, sanitizeInput } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";
import { Model, Document } from "mongoose";

// Type definitions for the models
interface ClientDocument extends Document {
  _id: any;
  name: string;
  email: string;
  phoneNumber: number;
  city: string;
  state: string;
  address: string;
  license?: number;
  isLicenseActive?: boolean;
  licenseExpiryDate?: Date;
}

interface StaffDocument extends Document {
  _id: any;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  clients?: Array<{
    clientId: string;
    clientName: string;
    assignedAt: Date;
    isContractor: boolean;
  }>;
  assignedProjects?: Array<any>;
}

// Track failed login attempts
const failedAttempts = new Map<string, { count: number; lockUntil: number }>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

export const POST = async (req: NextRequest) => {
  try {
    await connect();
    const body = await req.json();
    const email = sanitizeInput(body.email || "").toLowerCase();
    const password = body.password || "";

    // Validate input
    if (!email || !password) {
      return errorResponse("Email and password are required", 400);
    }

    if (!isValidEmail(email)) {
      return errorResponse("Invalid email format", 400);
    }

    // Check if account is locked
    const attemptData = failedAttempts.get(email);
    if (attemptData && attemptData.lockUntil > Date.now()) {
      const remainingTime = Math.ceil(
        (attemptData.lockUntil - Date.now()) / 1000 / 60
      );
      logger.warn("Account locked attempt", { email, remainingTime });
      return errorResponse(
        `Account temporarily locked. Try again in ${remainingTime} minutes.`,
        423
      );
    }

    // Find user in LoginUser collection
    const loginUser = await LoginUser.findOne({ email }).select("+password").lean();
    if (!loginUser) {
      trackFailedAttempt(email);
      logger.warn("Login attempt with non-existent email", { email });
      return errorResponse("Invalid credentials", 401);
    }

    // Check if password exists and is valid
    if (!loginUser.password || typeof loginUser.password !== "string") {
      logger.error("User has invalid password field", { email, userType: loginUser.userType });
      return errorResponse("Account setup incomplete. Please contact support.", 401);
    }

    // Verify password
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, loginUser.password);
    } catch (bcryptError) {
      logger.error("Bcrypt comparison error", { email, error: bcryptError });
      return errorResponse("Authentication error", 500);
    }

    if (!isValidPassword) {
      trackFailedAttempt(email);
      const attempts = failedAttempts.get(email);
      const remaining = MAX_FAILED_ATTEMPTS - (attempts?.count || 0);

      logger.warn("Invalid password attempt", { email, remaining });

      if (remaining > 0) {
        return errorResponse(
          `Invalid credentials. ${remaining} attempts remaining.`,
          401
        );
      } else {
        return errorResponse(
          "Account locked due to too many failed attempts. Try again in 15 minutes.",
          423
        );
      }
    }

    // Clear failed attempts on successful login
    failedAttempts.delete(email);

    // Get user details and clientId based on user type
    let userDetails: any = null;
    let clientId: string | null = null;
    let additionalData: any = {};

    try {
      switch (loginUser.userType) {
        case 'admin': {
          // Admins live in the Admin collection (created via /api/users/admin),
          // with a clientId pointing to their organization
          const adminModule = await import("@/lib/models/users/Admin");
          const AdminModel = adminModule.Admin as Model<any>;
          const admin = await AdminModel.findOne({ email }).lean() as any;

          if (admin) {
            clientId = admin.clientId ? admin.clientId.toString() : null;
            userDetails = {
              id: admin._id,
              email: admin.email,
              firstName: admin.firstName,
              lastName: admin.lastName,
              phoneNumber: admin.phoneNumber,
              userType: loginUser.userType,
            };

            if (!clientId) {
              logger.error("Admin has no clientId", { email, adminId: admin._id });
              return errorResponse("No organization assigned. Please contact support.", 403);
            }

            additionalData = {
              primaryClientId: clientId,
            };
            logger.info("Admin login successful", { email, adminId: admin._id, clientId });
            break;
          }

          // Fallback: some admins are the client owner and only exist as a Client record
          const adminClientModule = await import("@/lib/models/super-admin/Client");
          const AdminClientModel = adminClientModule.Client as Model<ClientDocument>;
          const ownerClient = await AdminClientModel.findOne({ email }).lean();
          if (ownerClient) {
            clientId = ownerClient._id.toString();
            userDetails = {
              id: ownerClient._id,
              email: ownerClient.email,
              name: ownerClient.name,
              phoneNumber: ownerClient.phoneNumber,
              city: ownerClient.city,
              state: ownerClient.state,
              address: ownerClient.address,
              userType: loginUser.userType,
            };
            additionalData = {
              companyName: ownerClient.name,
              license: ownerClient.license,
              isLicenseActive: ownerClient.isLicenseActive,
              licenseExpiryDate: ownerClient.licenseExpiryDate,
            };
            logger.info("Admin (client owner) login successful", { email, clientId });
          } else {
            logger.error("No admin or client record found for admin user", { email });
            return errorResponse("Account configuration error. Please contact support.", 404);
          }
          break;
        }

        case 'users':
          // For users, find the client record
          const clientModule = await import("@/lib/models/super-admin/Client");
          const ClientModel = clientModule.Client as Model<ClientDocument>;
          const client = await ClientModel.findOne({ email }).lean();
          if (client) {
            clientId = client._id.toString();
            userDetails = {
              id: client._id,
              email: client.email,
              name: client.name,
              phoneNumber: client.phoneNumber,
              city: client.city,
              state: client.state,
              address: client.address,
              userType: loginUser.userType,
            };
            additionalData = {
              companyName: client.name,
              license: client.license,
              isLicenseActive: client.isLicenseActive,
              licenseExpiryDate: client.licenseExpiryDate,
            };
            logger.info("Admin/User login successful", { email, clientId, companyName: client.name });
          } else {
            logger.error("No client record found for admin/user", { email });
            return errorResponse("Account configuration error. Please contact support.", 404);
          }
          break;

        case 'staff':
          // For staff, find the staff record
          const staffModule = await import("@/lib/models/users/Staff");
          const StaffModel = staffModule.Staff as Model<StaffDocument>;
          const staff = await StaffModel.findOne({ email }).lean();
          if (staff) {
            userDetails = {
              id: staff._id,
              email: staff.email,
              firstName: staff.firstName,
              lastName: staff.lastName,
              phoneNumber: staff.phoneNumber,
              role: staff.role,
              userType: loginUser.userType,
            };
            
            // For staff, we need to handle multiple clients
            if (staff.clients && staff.clients.length > 0) {
              // Use the first client as primary, but include all clients
              clientId = staff.clients[0].clientId.toString();
              additionalData = {
                clients: staff.clients,
                assignedProjects: staff.assignedProjects || [],
                primaryClientId: clientId,
                totalClients: staff.clients.length,
              };
              logger.info("Staff login successful", { 
                email, 
                staffId: staff._id, 
                primaryClientId: clientId,
                totalClients: staff.clients.length 
              });
            } else {
              logger.warn("Staff has no assigned clients", { email, staffId: staff._id });
              return errorResponse("No organization assigned. Please contact your administrator.", 403);
            }
          } else {
            logger.error("No staff record found for staff user", { email });
            return errorResponse("Staff account not found. Please contact support.", 404);
          }
          break;

        case 'customer':
          // For customers, use the LoginUser record itself
          userDetails = {
            id: loginUser._id,
            email: loginUser.email,
            userType: loginUser.userType,
          };
          clientId = loginUser._id.toString(); // Use loginUser ID as clientId for customers
          logger.info("Customer login successful", { email, customerId: loginUser._id });
          break;

        default:
          logger.error("Unknown user type", { email, userType: loginUser.userType });
          return errorResponse("Invalid account type", 400);
      }

      if (!userDetails) {
        logger.error("Failed to get user details", { email, userType: loginUser.userType });
        return errorResponse("Account configuration error", 500);
      }

    } catch (detailsError) {
      logger.error("Error fetching user details", { 
        email, 
        userType: loginUser.userType, 
        error: detailsError instanceof Error ? detailsError.message : String(detailsError) 
      });
      return errorResponse("Error loading account details", 500);
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error("JWT_SECRET not configured");
      return errorResponse("Server configuration error", 500);
    }

    const tokenPayload = {
      id: userDetails.id,
      email: userDetails.email,
      userType: loginUser.userType,
      clientId: clientId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };

    const jwtToken = jwt.sign(tokenPayload, jwtSecret, { algorithm: 'HS256' });

    // Success response
    const responseData = {
      user: {
        ...userDetails,
        clientId: clientId,
      },
      token: jwtToken,
      ...additionalData,
    };

    logger.info("Login successful", { 
      email, 
      userType: loginUser.userType, 
      userId: userDetails.id,
      clientId 
    });

    return successResponse(responseData, "Login successful");

  } catch (error: unknown) {
    logger.error("Login error", { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined 
    });
    return errorResponse("An error occurred during login", 500);
  }
};

function trackFailedAttempt(email: string): void {
  const attemptData = failedAttempts.get(email) || { count: 0, lockUntil: 0 };
  attemptData.count++;

  if (attemptData.count >= MAX_FAILED_ATTEMPTS) {
    attemptData.lockUntil = Date.now() + LOCK_TIME_MS;
    logger.warn("Account locked due to failed attempts", { email, attempts: attemptData.count });
  }

  failedAttempts.set(email, attemptData);

  // Clean up old entries after 1 hour
  setTimeout(
    () => {
      const data = failedAttempts.get(email);
      if (data && data.lockUntil < Date.now()) {
        failedAttempts.delete(email);
      }
    },
    60 * 60 * 1000
  );
}
