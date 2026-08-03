import { Document, Model, model, models, Schema } from "mongoose";

// Interface representing a LoginUser document in MongoDB
//
// NOTE: "clients" is the userType written by POST /api/clients and normalized to
// by POST /api/password. It was missing from the enum below, so every client
// created from the super-admin panel failed enum validation on save — the Client
// document was written but the LoginUser was not, leaving an account that could
// never reach the OTP/verification step. Keep this list in sync with the switch
// in app/api/login/route.ts and validUserTypes in app/api/password/route.ts.
export type LoginUserType = "admin" | "users" | "clients" | "staff" | "customer";

export const LOGIN_USER_TYPES: LoginUserType[] = [
  "admin",
  "users",
  "clients",
  "staff",
  "customer",
];

export interface ILoginUser extends Document {
  email: string;
  password?: string;
  userType: LoginUserType;
}

const LoginUserSchema = new Schema<ILoginUser>({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: false,
    select: false, // Never return password by default; use .select("+password") explicitly
  },
  userType: {
    type: String,
    required: true,
    enum: LOGIN_USER_TYPES,
  },
});

// Safe model registration to prevent data loss during redeployment
let LoginUser: Model<ILoginUser>;
try {
  LoginUser = (models.LoginUser as Model<ILoginUser>) || model<ILoginUser>("LoginUser", LoginUserSchema);
} catch {
  LoginUser = model<ILoginUser>("LoginUser", LoginUserSchema);
}

export { LoginUser };
