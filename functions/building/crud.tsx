import { BuildingFormProps } from "@/app/(forms)/building-form/types"
import domain from "@/components/utils/domain"

export const addBuilding = async (data: BuildingFormProps) => {
    try {

        const res = await fetch(`${domain}/api/building`, {
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
        console.error('Error in addProject:', error);
        return null;
    }
}

export const deleteBuilding = async (projectId: string, sectionId: string | null | undefined) => {
    try {
        const res = await fetch(`${domain}/api/building?projectId=${projectId}&sectionId=${sectionId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("Error deleting section and building:", error);
        return null;
    }
}

export const updateBuilding = async (updatedData: BuildingFormProps, projectId: string) => {
    const res = await fetch(`${domain}/api/building?id=${projectId}`, {
        method: "PUT",
        body: JSON.stringify(updatedData),
    })
    const data = await res.json();
    return data;
}

export const getSingleBuilding = async (projectId: string | undefined | null) => {
    const res = await fetch(`${domain}/api/building?id=${projectId}`);
    const data = await res.json();
    return data;
}

export const getAllBuilding = async () => {
    const res = await fetch(`${domain}/api/building`);
    const data = await res.json();
    return data;
}
