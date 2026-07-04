import { Document, Model, model, models, Schema } from "mongoose";

// Interface representing a LoginUser document in MongoDB
export interface ILoginUser extends Document {
  email: string;
  password?: string;
  userType: "admin" | "users" | "staff" | "customer";
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
    enum: ["admin", "users", "staff", "customer"],
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
