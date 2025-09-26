import React, { createContext, useState, useEffect, useContext, useRef } from "react";
import { useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface DocItem {
  name: string;
  ext: string;
  source: string;
  uploadedAt: number;
  favorite: boolean;
  fileId: string;
  userId: string;
  localUri?: string;
}

interface DocumentContextType {
  documents: DocItem[];
  setDocuments: (value: DocItem[] | ((prev: DocItem[]) => DocItem[])) => void;
  isLoading: boolean;
  updateDocument: (fileId: string, updates: Partial<DocItem>) => Promise<void>;
  deleteDocument: (fileId: string) => Promise<void>;
  addDocument: (newDoc: DocItem) => Promise<void>;
  loadDocuments: () => Promise<void>;
}

export const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider = ({ children }: { children: React.ReactNode }) => {
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isLoaded } = useUser();
  const loaded = useRef(false);

  const saveDocuments = async (docs: DocItem[]) => {
    if (!user?.id) return;
    const key = `documents_${user.id}`;
    try {
      await AsyncStorage.setItem(key, JSON.stringify(docs));
    } catch (e) {
      console.error("Failed to save documents:", e);
    }
  };

  const loadDocuments = async () => {
    if (!isLoaded || !user?.id || loaded.current) return;
    loaded.current = true;
    setIsLoading(true);
    try {
      const key = `documents_${user.id}`;
      const stored = await AsyncStorage.getItem(key);
      setDocuments(stored ? JSON.parse(stored) : []);
    } catch (error: any) {
      console.error("Error fetching documents:", error.message);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments().catch(console.error);
  }, [isLoaded, user?.id]);

  const addDocument = async (newDoc: DocItem) => {
    try {
      setDocuments((prev) => {
        const updated = [...prev, newDoc];
        saveDocuments(updated);
        return updated;
      });
    } catch (error: any) {
      console.error("Error adding document:", error.message);
    }
  };

  const updateDocument = async (fileId: string, updates: Partial<DocItem>) => {
    try {
      setDocuments((prev) => {
        const updated = prev.map((doc) => (doc.fileId === fileId ? { ...doc, ...updates } : doc));
        saveDocuments(updated);
        return updated;
      });
    } catch (error: any) {
      console.error("Error updating document:", error.message);
    }
  };

  const deleteDocument = async (fileId: string) => {
    try {
      setDocuments((prev) => {
        const updated = prev.filter((doc) => doc.fileId !== fileId);
        saveDocuments(updated);
        return updated;
      });
    } catch (error: any) {
      console.error("Error deleting document:", error.message);
    }
  };

  return (
    <DocumentContext.Provider value={{ documents, setDocuments, isLoading, addDocument, updateDocument, deleteDocument, loadDocuments }}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocumentContext = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocumentContext must be used within a DocumentProvider");
  }
  return context;
};