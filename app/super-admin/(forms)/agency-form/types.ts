export interface AgencyFormProps {
  _id?: string;
  name: string;
  email: string;
  phoneNumber: string;
  city: string;
  state: string;
  address: string;
  logo: string;
  clients?: string[] | [];
  createdAt?: string;
}