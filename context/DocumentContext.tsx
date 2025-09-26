// context/DocumentContext.tsx
import React, { createContext, useState, useEffect, useContext } from "react";
import { databases, appwriteConfig, account, client } from "@/lib/appwrite";
import { Query, ID } from "react-native-appwrite";
import { useUser, useAuth } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface DocItem {
  id: string;
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
  updateDocument: (id: string, updates: Partial<DocItem>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
}

export const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider = ({ children }: { children: any }) => {
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    const loadSession = async () => {
      const session = await AsyncStorage.getItem("appwrite_session");
      if (session) {
        client.setSession(session);
      }
    };
    loadSession();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!isLoaded || !user?.id) {
        setDocuments([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      try {
        await account.get();
      } catch {
        const clerkJwt = await getToken({ template: "appwrite" });
        if (!clerkJwt) throw new Error("Failed to get Clerk token");

        const functionId = process.env.EXPO_PUBLIC_APPWRITE_CLERK_AUTH_FUNCTION_ID!;
        if (!functionId) throw new Error("Appwrite clerk auth function ID is not configured");

        const endpoint = `${process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT}/functions/${functionId}/executions`;
        const fetchResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Appwrite-Project": process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!,
          },
          body: JSON.stringify({
            body: JSON.stringify({ clerkJwt }),
            method: "POST",
            async: false,
          }),
        });

        if (!fetchResponse.ok) {
          const errorBody = await fetchResponse.json();
          throw new Error(`Fetch failed with status ${fetchResponse.status}: ${errorBody.message || "Unknown error"}`);
        }

        const execution = await fetchResponse.json();
        const response = JSON.parse(execution.responseBody ?? "{}");
        if (response.error) throw new Error(response.error);

        client.setSession(response.secret);
        await AsyncStorage.setItem("appwrite_session", response.secret);
      }

      try {
        const appwriteUser = await account.get();
        const appwriteUserId = appwriteUser.$id;
        const response = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.collectionId,
          [Query.equal("userId", appwriteUserId), Query.orderDesc("uploadedAt")]
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
      } catch (error: any) {
        console.error("Error fetching documents:", error.message);
        setDocuments([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user, isLoaded, getToken]);

  // ✅ Add updateDocument
  const updateDocument = async (id: string, updates: Partial<DocItem>) => {
    try {
      await databases.updateDocument(appwriteConfig.databaseId, appwriteConfig.collectionId, id, updates);
      setDocuments((prev) =>
        prev.map((doc) => (doc.fileId === id ? { ...doc, ...updates } : doc))
      );
    } catch (error: any) {
      console.error("Error updating document:", error.message);
    }
  };

  // ✅ Add deleteDocument
  const deleteDocument = async (id: string) => {
    try {
      await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.collectionId, id);
      setDocuments((prev) => prev.filter((doc) => doc.fileId !== id));
    } catch (error: any) {
      console.error("Error deleting document:", error.message);
    }
  };

  return (
    <DocumentContext.Provider value={{ documents, setDocuments, isLoading, updateDocument, deleteDocument }}>
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
