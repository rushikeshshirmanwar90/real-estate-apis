import { Schema, model, models } from "mongoose";

const OurTeamSchema = new Schema({
    clientId: {
        type: String,
        required: true,
    },
    subTitle: {
        type: String,
        required: true,
    },
    teamMembers: [
        {
            name: {
                type: String,
                required: true,
            },
            position: {
                type: String,
                required: true,
            },
            image: {
                type: String,
                required: true,
            },
        },
    ],
});

export const OurTeam = models.OurTeam || model("OurTeam", OurTeamSchema);
