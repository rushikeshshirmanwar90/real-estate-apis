import { AmenitiesProps } from "@/components/types/editable-card";

export interface projectProps {
    _id: string
    images: string[];
    name: string;
    description: string;
    projectType: string;
    area: number;
    address: string;
    state: string;
    city: string;
    totalBuilding: number;
    amenities: AmenitiesProps[];
    clientId: string;
    section: {
        sectionId: string,
        name: string,
        type: string
    }[]
}
