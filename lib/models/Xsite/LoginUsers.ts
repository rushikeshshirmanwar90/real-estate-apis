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
    enum: ["admin", "users", "staff"],
  },
});

export const LoginUser =
  models.LoginUser || model("LoginUser", LoginUserSchema);
