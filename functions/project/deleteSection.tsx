import domain from "@/components/utils/domain";

export const deleteSectionAndBuilding = async (projectId: string, sectionId: string | null) => {
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
};
