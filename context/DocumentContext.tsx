// context/DocumentContext.tsx
import React, { createContext, useState, useEffect, useContext, useRef } from "react";
import { useUser, useAuth } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Client, Databases, Storage, Query } from "react-native-appwrite";
export interface DocItem {
  name: string;
  ext: string;
  source: string;
  uploadedAt: number;
  favorite: boolean;
  fileId: string;
  userId: string;
  localUri?: string;
  content?: string;
  isCloudSynced?: boolean;
  appwriteFileId?: string;
  size?: number;
  remoteUrl?: string;
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
  const { getToken } = useAuth();
  const loaded = useRef(false);
  const saveDocuments = async (docs: DocItem[]) => {
    if (!user?.id) return;
    const key = `documents_${user.id}`;
    try {
      await AsyncStorage.setItem(key, JSON.stringify(docs.filter(doc => !doc.isCloudSynced)));
    } catch (e) {
      console.error("Failed to save documents:", e);
    }
  };
  const loadDocuments = async () => {
    if (!isLoaded || !user?.id || loaded.current) return;
    loaded.current = true;
    setIsLoading(true);
    try {
      const jwt = await getToken({ template: 'appwrite' });
      if (!jwt) throw new Error('Failed to get JWT');
      const authClient = new Client()
        .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
        .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "68d99d2200263ed6ea89");
      // Removed setJWT as bucket is assumed public
      const databases = new Databases(authClient);
      const storage = new Storage(authClient);
      const key = `documents_${user.id}`;
      const stored = await AsyncStorage.getItem(key);
      const localDocs = stored ? JSON.parse(stored) : [];
      const cloudDocsResponse = await databases.listDocuments(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || "68d99d49000b4cfa8654",
        process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID || "68d99d67002eff18d8b6",
        [Query.equal("userId", user.id)]
      );
      const cloudDocs = cloudDocsResponse.documents.map(doc => {
        const downloadUrl = doc.appwriteFileId ? storage.getFileDownload(
          process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID || "68d99e310009199afc3a",
          doc.appwriteFileId
        ).toString() : undefined;
        return {
          fileId: doc.fileId,
          userId: doc.userId,
          name: doc.name,
          ext: doc.ext,
          source: doc.source || "Cloud",
          uploadedAt: new Date(doc.uploadedAt).getTime(),
          favorite: doc.favorite === "true",
          content: doc.content,
          isCloudSynced: true,
          appwriteFileId: doc.appwriteFileId,
          size: doc.size,
          remoteUrl: downloadUrl,
        };
      });
      const mergedDocs = [...localDocs, ...cloudDocs].reduce((acc: DocItem[], doc: DocItem) => {
        if (!acc.find(d => d.fileId === doc.fileId)) {
          acc.push(doc);
        }
        return acc;
      }, []);
      setDocuments(mergedDocs);
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
        if (!newDoc.isCloudSynced) {
          saveDocuments(updated);
        }
        return updated;
      });
    } catch (error: any) {
      console.error("Error adding document:", error.message);
    }
  };
  const updateDocument = async (fileId: string, updates: Partial<DocItem>) => {
    try {
      setDocuments((prev) => {
        const updatedDocs = prev.map((doc) => (doc.fileId === fileId ? { ...doc, ...updates } : doc));
        const doc = updatedDocs.find(d => d.fileId === fileId);
        if (doc?.isCloudSynced) {
          (async () => {
            try {
              const jwt = await getToken({ template: 'appwrite' });
              if (!jwt) return;
              const authClient = new Client()
                .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
                .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "68d99d2200263ed6ea89")
                .setJWT(jwt);
              const databases = new Databases(authClient);
              const cloudUpdates: Record<string, any> = {};
              const syncFields = ['name', 'ext', 'favorite', 'source', 'content', 'appwriteFileId', 'size'];
              for (const key of syncFields) {
                if (key in updates) {
                  cloudUpdates[key] = (updates as any)[key];
                  if (key === 'favorite') cloudUpdates[key] = updates[key]?.toString();
                }
              }
              if (Object.keys(cloudUpdates).length > 0) {
                await databases.updateDocument(
                  process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || "68d99d49000b4cfa8654",
                  process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID || "68d99d67002eff18d8b6",
                  fileId,
                  cloudUpdates
                );
              }
            } catch (e) {
              console.error('Update cloud error:', e);
            }
          })();
        } else {
          saveDocuments(updatedDocs);
        }
        return updatedDocs;
      });
    } catch (error: any) {
      console.error("Error updating document:", error.message);
    }
  };
  const deleteDocument = async (fileId: string) => {
    try {
      const doc = documents.find(d => d.fileId === fileId);
      if (doc?.isCloudSynced && doc.appwriteFileId) {
        const jwt = await getToken({ template: 'appwrite' });
        if (jwt) {
          const authClient = new Client()
            .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
            .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "68d99d2200263ed6ea89")
            .setJWT(jwt);
          const databases = new Databases(authClient);
          const storage = new Storage(authClient);
          await databases.deleteDocument(
            process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || "68d99d49000b4cfa8654",
            process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID || "68d99d67002eff18d8b6",
            fileId
          );
          await storage.deleteFile(
            process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID || "68d99e310009199afc3a",
            doc.appwriteFileId
          );
        }
      }
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