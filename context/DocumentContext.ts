import { createContext } from "react";

export type DocItem = {
  id: string;
  name: string;
  uri: string;
  ext: string;
  source: string;
  uploadedAt: number;
  favorite: boolean;
};

export interface DocumentContextType {
  documents: DocItem[];
  setDocuments: React.Dispatch<React.SetStateAction<DocItem[]>>;
}

export const DocumentContext = createContext<DocumentContextType | undefined>(undefined);