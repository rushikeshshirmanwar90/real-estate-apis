interface Section {
    _id: string;
    name: string;
    description: string;
    images: string[];
}

interface FlatInfo {
    _id: string;
    title: string;
    description: string;
    images: string[];
    totalFlats: number;
    totalBookedFlats: number;
    totalArea: number;
    video: string;
}

interface Amenity {
    _id: string;
    icon: string;
    name: string;
}

export interface BuildingProps {
    _id: string;
    name: string;
    description: string;
    area: number;
    projectId: string;
    images: string[];
    section: Section[];
    flatInfo: FlatInfo[];
    amenities: Amenity[];
    totalFlats: number | string
}