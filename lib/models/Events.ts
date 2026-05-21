import { model, models, Schema } from "mongoose";

const EventSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  images: {
    type: [String],
    required: true,
  },
});

// Safe model registration to prevent data loss during redeployment
let Event;
try {
  if (models.Event) {
    Event = models.Event;
  } else {
    Event = model("Event", EventSchema);
  }
} catch (error) {
  Event = models.Event || model("Event", EventSchema);
}

export { Event };
