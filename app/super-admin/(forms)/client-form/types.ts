export interface ClientFormProps {
  _id?: string;
  name: string;
  email: string;
  phoneNumber: string;
  city: string;
  state: string;
  address: string;
  logo: string;
  licenseDays?: number; // New field for license days input
  createdAt?: string;
  agency?: string;
}
