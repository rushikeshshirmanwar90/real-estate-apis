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
    // Site engineer captured as flat fields in the form; mapped into the
    // `siteEngineer` object below before submitting to the API.
    siteEngineerName?: string;
    siteEngineerPhone?: string;
    siteEngineer?: {
        name: string;
        phoneNumber: string;
    };
}