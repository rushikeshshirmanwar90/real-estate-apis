import { model, models, Schema } from "mongoose";

const ContactUsSchema = new Schema({
    subTitle: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    phone1: {
        type: String,
        required: true,
    },
    phone2: {
        type: String,
        required: false,
    },

    email1: {
        type: String,
        required: true,
    },

    email2: {
        type: String,
        required: false,
    },

    mapLink: {
        type: String,
        required: true,
    }
})

export const ContactUs = models.ContactUs || model("ContactUs", ContactUsSchema);
