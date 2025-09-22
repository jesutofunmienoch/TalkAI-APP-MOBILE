import React, { createContext, useState, useEffect, useContext, ReactNode } from "react";
import { databases, appwriteConfig } from "../lib/appwrite";
import { Query } from "appwrite";
import { useUser } from "@clerk/clerk-expo";

export interface DocItem {
  id: string;
  name: string;
  ext: string;
  source: string;
  uploadedAt: number;
  favorite: boolean;
  fileId: string;
  userId: string;
}

interface DocumentContextType {
  documents: DocItem[];
  setDocuments: React.Dispatch<React.SetStateAction<DocItem[]>>;
}

export const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider = ({ children }: { children: ReactNode }) => {
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const { user } = useUser();

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user) return;
      try {
        const response = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.collectionId,
          [Query.equal("userId", user.id)]
        );
        setDocuments(
          response.documents.map((doc) => ({
            id: doc.$id,
            name: doc.name,
            ext: doc.ext,
            source: doc.source,
            uploadedAt: doc.uploadedAt,
            favorite: doc.favorite,
            fileId: doc.fileId,
            userId: doc.userId,
          }))
        );
      } catch (error) {
        console.error("Error fetching documents:", error);
      }
    };
    fetchDocuments();
  }, [user]);

 return React.createElement(
  DocumentContext.Provider,
  { value: { documents, setDocuments } },
  children
);
};

export const useDocumentContext = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocumentContext must be used within a DocumentProvider");
  }
  return context;
};
