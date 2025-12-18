export interface Feature {
  icon: string;
  name: string;
}

export interface Room {
  title: string;
  description?: string;
  images: string[];
  type:
    | "rooms"
    | "bathroooms"
    | "kitchens"
    | "livingrooms"
    | "balconies"
    | "other"
    | "";
  area: number;
  features: Feature[];
}

export interface FlatInfo {
  projectId: string;
  buildingId: string;
  flatId: string;
  rooms: Room[];
}
