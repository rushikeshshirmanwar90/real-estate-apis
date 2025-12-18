import { OtherSectionProps } from "@/app/(forms)/otherSection-form/types"
import domain from "@/components/utils/domain"

export const addOtherSection = async (data: OtherSectionProps) => {
    try {
        const res = await fetch(`${domain}/api/otherSection`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const errorData = await res.json();
            console.error('API Error:', errorData);
            throw new Error(`API Error: ${errorData.message}`);
        }

        const newData = await res.json();
        return newData;
    } catch (error) {
        console.error('Error in Adding Other Section:', error);
        return null;
    }
}

export const deleteOtherSection = async (projectId: string, sectionId: string | null) => {
    try {
        const res = await fetch(`${domain}/api/otherSection?projectId=${projectId}&sectionId=${sectionId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("Error deleting section and Other Section:", error);
        return null;
    }
}

export const updateOtherSection = async (updatedData: OtherSectionProps, projectId: string) => {
    const res = await fetch(`${domain}/api/otherSection?id=${projectId}`, {
        method: "PUT",
        body: JSON.stringify(updatedData),
    })
    const data = await res.json();
    return data;
}

export const getSingleOtherSection = async (projectId: string | undefined | null) => {
    const res = await fetch(`${domain}/api/otherSection?id=${projectId}`);
    const data = await res.json();
    return data;
}

export const getAllOtherSection = async () => {
    const res = await fetch(`${domain}/api/otherSection`);
    const data = await res.json();
    return data;
}