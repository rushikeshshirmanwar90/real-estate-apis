import mongoose from "mongoose";
import { Property as PropertyProps } from "@/components/types/customer";

// Define interfaces for the data types
export interface FlatInfo {
  title: string;
  description: string;
  images: string[];
  totalFlats: number;
  totalBookedFlats: number;
  bhk: number;
  totalArea: number;
  video?: string;
  _id: mongoose.Types.ObjectId | string;
}

export interface Amenity {
  icon: string;
  name: string;
  _id: mongoose.Types.ObjectId | string;
}

export interface BuildingDoc {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  description?: string;
  location: string;
  area: number;
  images: string[];
  flatInfo: FlatInfo[];
  amenities: Amenity[];
  [key: string]: any; // For other properties
}

export interface RowHouseDoc {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  description?: string;
  images: string[];
  totalHouse: number;
  bookedHouse: number;
  area: number;
  projectId: mongoose.Types.ObjectId | string;
  amenities: Amenity[];
  [key: string]: any;
}

export interface DetailedProperty extends PropertyProps {
  propertyDetails: {
    type: string;
    data: any;
    buildingDetails?: {
      name: string;
      location: string;
      area: number;
      images: string[];
      amenities: Amenity[];
    };
  } | null;
}
