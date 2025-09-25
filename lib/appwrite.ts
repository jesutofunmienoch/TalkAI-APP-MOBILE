// lib/appwrite.ts
import {
  Client,
  Databases,
  Storage,
  ID,
  Permission,
  Role,
  Account,
  Query,
} from "react-native-appwrite";  // Remove Functions import
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { DocItem } from "@/context/DocumentContext";

export { Permission, Role } from "react-native-appwrite";

// 🔹 Appwrite client
export const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const appwriteConfig = {
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
  collectionId: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID!,
  bucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID!,
};

// 🔹 Clerk <-> Appwrite bridge
const CLERK_AUTH_FUNCTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_CLERK_AUTH_FUNCTION_ID!;
const ALLOWED_EXTS = [
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "csv",
];

// 🔹 Upload document
export const uploadDocument = async (
  user: any,
  setDocuments: React.Dispatch<React.SetStateAction<DocItem[]>>,
  navigateOnError: (errorMsg: string) => void,
  getToken: (options?: { template: string }) => Promise<string | null>
) => {
  try {
    if (!user?.id) throw new Error("User not authenticated");

    // ✅ Ensure Appwrite session exists
    try {
      await account.get();
    } catch {
      const clerkJwt = await getToken({ template: "appwrite" });
      if (!clerkJwt) throw new Error("Failed to get Clerk token");
      if (!CLERK_AUTH_FUNCTION_ID)
        throw new Error("Clerk auth function ID not configured");

      // ✅ Use fetch instead of SDK for execution
      const endpoint = `${process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT}/v1/functions/${CLERK_AUTH_FUNCTION_ID}/executions`;
      const fetchResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!,
        },
        body: JSON.stringify({ data: JSON.stringify({ clerkJwt }) }),
      });

      const execution = await fetchResponse.json();
      console.log('Execution response:', execution);  // For debugging

      if (execution.status !== 'completed') {
        throw new Error(`Function execution failed with status: ${execution.status}`);
      }

      const response = JSON.parse(execution.responseBody ?? "{}");
      if (response.error) throw new Error(response.error);

      client.setSession(response.secret);
      await AsyncStorage.setItem("appwrite_session", response.secret);
    }

    const appwriteUser = await account.get();
    const appwriteUserId = appwriteUser.$id;

    // ✅ Pick document
    const res = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });
    if (res.canceled) {
      router.navigate("/(root)/(tabs)/home");
      return;
    }

    const { name, uri, mimeType, size } = res.assets[0];
    const ext = name.split(".").pop()?.toLowerCase() || "";

    if (!ALLOWED_EXTS.includes(ext)) {
      navigateOnError(`File type ".${ext}" is not supported.`);
      return;
    }

    // ✅ Prevent duplicates
    const existingDocs = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.collectionId,
      [Query.equal("name", name), Query.equal("userId", appwriteUserId)]
    );
    if (existingDocs.documents.length > 0) {
      navigateOnError("A document with this name already exists.");
      return;
    }

    // ✅ Upload to storage
    const uploaded = await storage.createFile(
      appwriteConfig.bucketId,
      ID.unique(),
      {
        uri,
        name,
        type: mimeType || `application/${ext}`,
        size,
      } as any,
      [
        Permission.read(Role.user(appwriteUserId)),
        Permission.update(Role.user(appwriteUserId)),
        Permission.delete(Role.user(appwriteUserId)),
      ]
    );

    if (!uploaded?.$id) throw new Error("Upload failed: no file ID returned");

    // ✅ Save metadata to database
    const id = ID.unique();
    const uploadedAt = Date.now();
    const source = inferSourceFromUri(uri || "");
    const newDoc: DocItem = {
      id,
      name,
      ext,
      source,
      uploadedAt,
      favorite: false,
      fileId: uploaded.$id,
      userId: appwriteUserId,
    };

    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.collectionId,
      id,
      newDoc,
      [
        Permission.read(Role.user(appwriteUserId)),
        Permission.update(Role.user(appwriteUserId)),
        Permission.delete(Role.user(appwriteUserId)),
      ]
    );

    // ✅ Update state
    setDocuments((prev: DocItem[]) => [newDoc, ...prev]);
    router.navigate("/(root)/(tabs)/home");
  } catch (err: any) {
    console.error("Upload error:", err.message, err.stack);
    navigateOnError(
      `Could not upload document: ${err.message}. Please try again.`
    );
  }
};

// 🔹 Infer document source
const inferSourceFromUri = (uri: string) => {
  if (!uri) return "My phone";
  const lower = uri.toLowerCase();
  if (lower.includes("whatsapp")) return "WhatsApp";
  if (lower.includes("download")) return "Download";
  if (lower.includes("drive")) return "Drive";
  return "My phone";
};