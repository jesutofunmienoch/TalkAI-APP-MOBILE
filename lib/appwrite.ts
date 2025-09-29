import { Client, Account, Databases, Storage } from "react-native-appwrite";

const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1")
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "68d99d2200263ed6ea89");

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export default client;