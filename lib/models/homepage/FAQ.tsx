import { Schema, model, models } from "mongoose";

const FAQSchema = new Schema({
    clientId: {
        type: String,
        required: true,
    },
    subTitle: {
        type: String,
        required: true,
    },
    FAQs: [
        {
            title: {
                type: String,
                required: true,
            },
            description: {
                type: String,
                required: true,
            },
        },
    ],
});

export const FAQ = models.FAQ || model("FAQ", FAQSchema);
