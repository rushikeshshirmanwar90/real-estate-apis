import { Schema, model, models } from "mongoose";


const ServicesSchema = new Schema({
    icon: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },

}, { _id: false })

const OurServicesSchema = new Schema({

    clientId: { type: String, required: true },

    subTitle: {
        type: String,
        required: true,
    },

    services: {
        type: [ServicesSchema],
        required: true
    }

})

export const OurServices = models.OurServices || model("OurServices", OurServicesSchema)

