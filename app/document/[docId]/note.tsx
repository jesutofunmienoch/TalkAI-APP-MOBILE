import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text, Alert, ScrollView, Platform } from "react-native";
import { WebView } from "react-native-webview";
import Markdown from "react-native-markdown-display";
import { DocItem } from "@/context/DocumentContext";
import { Client, Storage } from "react-native-appwrite";

interface ExtendedDocItem extends DocItem {
  fileId: string;
  name: string;
  source: string;
  uploadedAt: number;
  ext: string;
  localUri?: string;
  remoteUrl?: string;
  appwriteFileId?: string;
  isCloudSynced?: boolean;
  content?: string;
  size?: number;
}

interface NoteProps {
  document: ExtendedDocItem;
}

function Note({ document }: NoteProps) {
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!document) {
      setError("Document not found.");
      return;
    }

    // For non-PDF files with content, show markdown
    if (document.ext !== "pdf" && document.content) {
      return;
    }

    // For PDF, prioritize viewer; for others without content, error
    if (document.ext !== "pdf") {
      setError(`Only PDF files can be viewed in-app. Please use an external viewer for ${document.ext.toUpperCase()} files.`);
      return;
    }

    // PDF handling
    let uri = document.remoteUrl || document.localUri;

    // If no URI but cloud synced with appwriteFileId, fetch the download URL
    if (!uri && document.isCloudSynced && document.appwriteFileId && typeof document.appwriteFileId === 'string') {
      try {
        const client = new Client()
          .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
          .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "68d99d2200263ed6ea89");
        const storage = new Storage(client);
        uri = storage.getFileDownload("68d99e310009199afc3a", document.appwriteFileId).toString();
      } catch (e: any) {
        console.error("Failed to fetch Appwrite download URL:", e.message);
        setError("Failed to fetch PDF from cloud. Please check your connection.");
        return;
      }
    }

    if (!uri) {
      setError("No valid PDF source found.");
      return;
    }

    if (Platform.OS === 'android') {
      if (uri.startsWith('http')) {  // Remote URL
        setPdfUri(`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(uri)}`);
      } else {
        setError("PDF viewing for local files on Android is not supported. Please upload to cloud to view.");
      }
    } else {
      // On iOS, WebView can handle both local (file://) and remote URLs
      if (document.localUri && !uri.startsWith('file://')) {
        uri = `file://${document.localUri}`;
      }
      setPdfUri(uri);
    }
  }, [document]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // If not PDF and has content, show markdown
  if (document.ext !== "pdf" && document.content) {
    return (
      <ScrollView style={styles.container}>
        <Markdown>{document.content}</Markdown>
      </ScrollView>
    );
  }

  if (!pdfUri) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Loading PDF...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: pdfUri }}
        style={styles.pdf}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error("PDF error:", nativeEvent);
          Alert.alert("Error", "Could not load PDF. Please try again.");
        }}
      />
    </View>
  );
}

export default Note;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  pdf: {
    flex: 1,
    width: "100%",
  },
  errorText: {
    textAlign: "center",
    fontSize: 16,
    color: "#dc2626",
  },
});