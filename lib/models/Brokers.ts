import { model, models, Schema } from "mongoose";

const brokerSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: Number, require: true },
    password: { type: String, require: true },

    clientId: {
      type: Schema.Types.ObjectId,
      require: true,
    },

    totalLeads: {
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
  { timestamps: true }
);

const Broker = models.Broker || model("Broker", brokerSchema);

export { Broker };
