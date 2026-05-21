import { model, models, Schema } from "mongoose";

const LoginUserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: false,
  },
  userType: {
    type: String,
    required: true,
    enum: ["admin", "users", "staff", "customer"],
  },
});

// Safe model registration to prevent data loss during redeployment
let LoginUser;
try {
  if (models.LoginUser) {
    LoginUser = models.LoginUser;
  } else {
    LoginUser = model("LoginUser", LoginUserSchema);
  }
} catch (error) {
  LoginUser = models.LoginUser || model("LoginUser", LoginUserSchema);
}

export { LoginUser };
