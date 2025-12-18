export type Property = {
  id: string;
  projectId: string;
  projectName: string;
  sectionId: string;
  sectionName: string;
  sectionType: string;
  flatId: string;
  flatName: string;
};

// Define customer type
export type Customer = {
  id: string;
  srNumber: number;
  name: string;
  email: string;
  phone: string;
  properties: Property[] | null;
};

export type ApiUser = {
  _id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  userType: string;
  clientId: string;
  properties?: {
    _id: string;
    property: Property[];
  };
};

export type PropertyItem = {
  id: string;
  projectId: string;
  projectName: string;
  sectionId: string;
  sectionName: string;
  sectionType: string;
  flatId?: string;
  flatName?: string;
};

export interface Details {
  userName: string;
  flatName: string;
  title: string;
  description: string;
  images: string[];
  totalArea: number;
  video: string;
}
