import { AmenitiesProps } from "@/components/types/editable-card"

export interface FormData {
    _id?: string
    images: string[];
    name: string;
    description: string;
    projectType: string;
    area: number;
    address: string;
    state: string;
    city: string;
    amenities: AmenitiesProps[];
    clientId: string;
    longitude: number,
    latitude: number,
}