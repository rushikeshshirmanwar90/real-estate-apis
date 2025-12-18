import domain from "@/components/utils/domain";
import { EventProps } from "@/types/Events";
import axios from "axios";

export const addEvent = async (payload: EventProps) => {
    try {
        console.log("Payload being sent:", payload);

        const res = await axios.post(`${domain}/api/events`, payload, {
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (res.status === 200 || res.status === 201) {
            return res.data; 
        } else {
            console.error("Unexpected response status:", res.status);
            return null;
        }
    } catch (error) {
        console.error("Error in addEvent function:", error);
        throw error; // Re-throw the error to handle it in the calling function
    }
};
