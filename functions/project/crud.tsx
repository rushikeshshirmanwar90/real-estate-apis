import domain from "@/components/utils/domain";
import { FormData } from "@/app/(forms)/project-form/types";

export const getSingleProject = async (projectId: string) => {
    const res = await fetch(`${domain}/api/project?id=${projectId}`);
    const data = await res.json();
    return data;
}


export const getAllProjects = async () => {
    try {
        const res = await fetch(`${domain}/api/project`);
        if (!res.ok) throw new Error("Failed to fetch projects");
        return await res.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const deleteProject = async (projectId: string) => {
    const res = await fetch(`${domain}/api/project?id=${projectId}`, {
        method: "DELETE"
    })
    const data = await res.json();
    return data;
}

export const updateProject = async (updatedData: FormData, projectId: string) => {
    const res = await fetch(`${domain}/api/project?id=${projectId}`, {
        method: "PUT",
        body: JSON.stringify(updatedData),
    })
    const data = await res.json();
    return data;
}

export const addProject = async (data: FormData) => {
    try {
        const res = await fetch(`${domain}/api/project`, {
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
};