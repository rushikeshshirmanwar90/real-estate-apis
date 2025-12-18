import { model, models, Schema } from "mongoose";

const RoomInfoSchema = new Schema({
  projectId: {
    type: Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },

  buildingId: {
    type: Schema.Types.ObjectId,
    ref: "Building",
    required: true,
  },

  flatId: {
    type: String,
    required: true,
  },

  rooms: [
    {
      title: {
        type: String,
        required: true,
      },

      description: {
        type: String,
      },

      images: {
        type: [String],
        required: true,
      },

      area: {
        type: Number,
        required: true,
      },

      type: {
        type: String,
        required: true,
        enum: [
          "rooms",
          "bathroooms",
          "kitchens",
          "livingrooms",
          "balconies",
          "other",
        ],
      },

      features: [
        {
          icon: {
            type: String,
            required: true,
          },
          name: {
            type: String,
            required: true,
          },
        },
      ],

      changes: [
        {
          image: {
            type: String,
            required: true,
          },
          description: {
            type: String,
            required: true,
          },
          feedback: {
            type: String,
            required: false,
          },

          userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },

          FlatNumber: {
            type: String,
            required: true,
          },
        },
      ],
    },
  ],
});

// Make `changes` optional
const changesPath = RoomInfoSchema.path("rooms").schema?.path("changes");
if (changesPath) {
  changesPath.options.default = [];
}

export const RoomInfo = models.RoomInfo || model("RoomInfo", RoomInfoSchema);
