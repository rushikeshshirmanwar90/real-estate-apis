import { model, models, Schema } from "mongoose";

const sealsPersonSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    phoneNumber: {
      type: Number,
      require: true,
    },

    email: {
      type: String,
      require: true,
    },

    password: {
      type: String,
      require: true,
    },

    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    assignLeads: {
      count: {
        type: Number,
        default: 0,
      },
      leadDetails: {
        type: [Schema.Types.ObjectId],
        ref: "Lead",
      },
    },

    closedLeads: {
      count: {
        type: Number,
        default: 0,
      },
      leadDetails: {
        type: [Schema.Types.ObjectId],
        ref: "Lead",
      },
    },
  },
  {
    timestamps: true,
  }
);

const sealsPerson =
  models.sealsPerson || model("sealsPerson", sealsPersonSchema);

export { sealsPerson };
