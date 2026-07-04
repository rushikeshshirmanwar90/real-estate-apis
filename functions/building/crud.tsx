import { BuildingFormProps } from "@/app/(forms)/building-form/types"
import domain from "@/components/utils/domain"

// ✅ Helper function to validate URL for undefined parameters
const validateUrl = (url: string, operation: string): boolean => {
    if (url.includes('undefined') || url.includes('null')) {
        console.error(`❌ ${operation} blocked: URL contains undefined/null parameter`);
        console.error('   URL:', url);
        return false;
    }
    return true;
};

// ✅ Safe fetch wrapper that validates URLs before making requests
const safeFetch = async (url: string, options: RequestInit, operation: string) => {
    if (!validateUrl(url, operation)) {
        throw new Error(`${operation} blocked: URL contains undefined/null parameter`);
    }
    
    console.log(`🔐 ${operation}: ${options.method || 'GET'} ${url}`);
    return fetch(url, options);
};

export const addBuilding = async (data: BuildingFormProps) => {
    try {
        const url = `${domain}/api/building`;
        
        const res = await safeFetch(url, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        }, 'Add Building');

        if (!res.ok) {
            const errorData = await res.json();
            console.error('API Error:', errorData);
            throw new Error(`API Error: ${errorData.message}`);
        }

        const newData = await res.json();
        return newData;
    } catch (error) {
        console.error('Error in addBuilding:', error);
        return null;
    }
}

export const deleteBuilding = async (projectId: string, sectionId: string | null | undefined) => {
    try {
        // ✅ Validate IDs before making API call
        if (!projectId || projectId === 'undefined' || projectId === 'null') {
            console.error('❌ Project ID is invalid, cannot delete building');
            console.error('   Received projectId:', projectId);
            return { success: false, error: 'Valid Project ID is required' };
        }
        
        if (!sectionId || sectionId === 'undefined' || sectionId === 'null') {
            console.error('❌ Section ID is invalid, cannot delete building');
            console.error('   Received sectionId:', sectionId);
            return { success: false, error: 'Valid Section ID is required' };
        }
        
        const url = `${domain}/api/building?projectId=${projectId}&sectionId=${sectionId}`;
        
        const res = await safeFetch(url, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
        }, 'Delete Building');

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("Error deleting section and building:", error);
        return { success: false, error: String(error) };
    }
}

export const updateBuilding = async (updatedData: BuildingFormProps, projectId: string) => {
    try {
        // ✅ Validate projectId before making API call
        if (!projectId || projectId === 'undefined' || projectId === 'null') {
            console.error('❌ Project ID is invalid, cannot update building');
            console.error('   Received projectId:', projectId);
            return { success: false, error: 'Valid Project ID is required' };
        }
        
        const url = `${domain}/api/building?id=${projectId}`;
        
        const res = await safeFetch(url, {
            method: "PUT",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData),
        }, 'Update Building');
        
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Error in updateBuilding:', error);
        return { success: false, error: String(error) };
    }
}

export const getSingleBuilding = async (projectId: string | undefined | null) => {
    try {
        // ✅ Validate projectId before making API call
        if (!projectId || projectId === 'undefined' || projectId === 'null') {
            console.error('❌ Project ID is invalid, cannot fetch building');
            console.error('   Received projectId:', projectId);
            return { success: false, error: 'Valid Project ID is required' };
        }
        
        const url = `${domain}/api/building?id=${projectId}`;
        
        const res = await safeFetch(url, {
            method: "GET",
            headers: {
                'Content-Type': 'application/json'
            }
        }, 'Get Single Building');
        
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Error in getSingleBuilding:', error);
        return { success: false, error: String(error) };
    }
}

export const getAllBuilding = async () => {
    const res = await fetch(`${domain}/api/building`);
    const data = await res.json();
    return data;
}