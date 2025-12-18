export interface Lead {
  name: string;
  contactNumber: string;
  _id: string;
}

export interface ReferenceCustomer {
  name: string;
  contactNumber: string;
}

export interface ReferralEntry {
  clientId: string;
  _id: string;
  referenceCustomer: ReferenceCustomer;
  leads: Lead[];
}
