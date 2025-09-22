import { Client, Databases, Storage, ID, Permission, Role } from "react-native-appwrite";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system/legacy";
import { router } from "expo-router";
import { DocItem } from "../context/DocumentContext";

const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!);

export const databases = new Databases(client);
export const storage = new Storage(client);

export const appwriteConfig = {
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
  collectionId: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID!,
  bucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID!,
};

export const setJWT = (jwt: string) => {
  client.setJWT(jwt);
};

const ALLOWED_EXTS = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv"];

export const uploadDocument = async (
  getToken: () => Promise<string | null>,
  user: any,
  setDocuments: React.Dispatch<React.SetStateAction<DocItem[]>>,
  navigateOnError: (errorMsg: string) => void
) => {
  try {
    const jwt = await getToken();
    if (jwt) setJWT(jwt);

    const res = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });

    if (res.canceled) {
      router.navigate("/(root)/(tabs)/home");
      return;
    }

    const { name, uri, mimeType } = res.assets[0];
    const ext = name.split(".").pop()?.toLowerCase() || "";

    if (!ALLOWED_EXTS.includes(ext)) {
      navigateOnError(`File type ".${ext}" is not supported. Only PDF, Word, Excel, and PowerPoint files are allowed.`);
      return;
    }

    // React Native descriptor object accepted by Appwrite RN SDK
    const fileToUpload = {
      uri,
      name,
      type: mimeType || `application/${ext}`,
    } as any;

    const file = await storage.createFile(
      appwriteConfig.bucketId,
      ID.unique(),
      fileToUpload,
      [
        Permission.read(Role.users()),
        Permission.write(Role.users()),
        Permission.delete(Role.users()),
      ]
    );

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
      fileId: file.$id,
      userId: user?.id || "anonymous",
    };

    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.collectionId,
      id,
      newDoc,
      [
        Permission.read(Role.users()),
        Permission.write(Role.users()),
        Permission.delete(Role.users()),
      ]
    );

    setDocuments((prev: DocItem[]) => [newDoc, ...prev]);
    router.navigate("/(root)/(tabs)/home");
  } catch (err) {
    console.error(err);
    navigateOnError("Could not upload document. Please try again.");
  }
};

const inferSourceFromUri = (uri: string) => {
  if (!uri) return "My phone";
  const lower = uri.toLowerCase();
  if (lower.includes("whatsapp")) return "WhatsApp";
  if (lower.includes("download") || lower.includes("downloads")) return "Download";
  if (lower.includes("drive")) return "Drive";
  return "My phone";
};