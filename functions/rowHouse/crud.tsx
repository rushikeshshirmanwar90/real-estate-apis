import { RowHouseProps } from "@/app/(forms)/rowHouse-form/types"
import domain from "@/components/utils/domain"

export const addRowHouse = async (data: RowHouseProps) => {
    try {
        const res = await fetch(`${domain}/api/rowHouse`, {
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
        console.error('Error in adding the row-house:', error);
        return null;
    }
}

export const deleteRowHouse = async (projectId: string, sectionId: string | null) => {
    try {
        const res = await fetch(`${domain}/api/rowHouse?projectId=${projectId}&sectionId=${sectionId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("Error deleting section and row house:", error);
        return null;
    }
}

export const updateRowHouse = async (updatedData: RowHouseProps, projectId: string) => {
    const res = await fetch(`${domain}/api/rowHouse?id=${projectId}`, {
        method: "PUT",
        body: JSON.stringify(updatedData),
    })
    const data = await res.json();
    return data;
}

export const getSingleRowHouse = async (projectId: string | undefined | null) => {
    if (!projectId) {
        throw new Error('Project ID is required');
    }

    const res = await fetch(`${domain}/api/rowHouse?id=${projectId}`);

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API request failed with status ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    return data;
}

export const getAllRowHouse = async () => {
    const res = await fetch(`${domain}/api/rowHouse`);
    const data = await res.json();
    return data;
}