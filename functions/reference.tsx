import axios from "axios";
import domain from "@/components/utils/domain";

export const getReferenceLeads = async (clientId: string) => {
    try {
        const { data } = await axios.get(`${domain}/api/reference-leads`, {
            params: { referenceCustomerId: clientId },
        });
        return data;
    } catch (error) {
        console.error("Failed to fetch reference leads:", error);
        throw error;
    }
};
