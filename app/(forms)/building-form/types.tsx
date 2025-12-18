
export interface Section {
    name: string;
    description?: string;
    images?: string[];
}

export interface FlatInfo {
    _id?: string;
    title: string;
    description?: string;
    images: string[];
    totalFlats: number;
    totalBookedFlats: number;
    totalArea: number;
    bhk: number
    video?: string;
}

export interface Amenity {
    icon: string;
    name: string;
}

export interface BuildingFormProps {
    _id?: string;
    projectId: string;
    name: string;
    description?: string;
    location: string
    area: number;
    images: string[];
    amenities?: Amenity[];
    section?: Section[];
    flatInfo?: FlatInfo[];
}