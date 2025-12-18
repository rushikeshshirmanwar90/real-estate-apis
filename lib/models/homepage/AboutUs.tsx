import { models, model, Schema } from "mongoose"


const PointSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        required: true,
        trim: true
    },

}, {
    _id: false
})

const AboutUsSchema = new Schema({

    clientId: {
        type: String,
        required: true
    },

    subTitle: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        required: true,
        trim: true
    },

    image: {
        type: String,
        required: true,
    },

    points: {
        type: [PointSchema],
        required: true
    }

})

export const AboutUs = models.AboutUs || model("AboutUs", AboutUsSchema)
