// Client-side mirrors of the API DTOs (lib/assets/service.ts etc.) — kept here so
// components don't reach into server-only modules.

export type Asset = {
  id: string;
  code: string | null;
  type: "hardware" | "software";
  category: string;
  name: string;
  brandModel: string;
  serial: string;
  specs: string;
  vendor: string;
  purchaseDate: string;
  valueAmount: string;
  valueCurrency: "BDT" | "USD";
  valueType: "one_time" | "monthly" | "yearly";
  employeeId: string | null;
  location: string;
  status: "active" | "removed";
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Transfer = {
  id: string;
  assetId: string;
  code: string | null;
  assetName: string;
  fromLabel: string;
  toLabel: string;
  fromLocation: string;
  toLocation: string;
  byEmail: string;
  notes: string;
  createdAt: string;
};

export type Sticker = {
  id: string;
  label: string;
  storageKey: string;
  createdAt: string;
};

export type Photo = {
  id: string;
  storageKey: string;
  originalName: string;
  uploadedAt: string;
  deleted: boolean;
};

export type Doc = Photo & { docType: "pdf" | "image" };

export type Category = {
  name: string;
  kind: "hardware" | "software";
  codeTag: string | null;
};

export type Employee = {
  id: string;
  name: string;
  designation: string;
  contact: string;
  email: string;
  photoKey: string | null;
  status: "active" | "released";
  releasedAt: string | null;
  releasedNote: string;
  createdAt: string;
  updatedAt: string;
};
