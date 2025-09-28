import React from "react";
import { View, StyleSheet, Text, Alert } from "react-native";
import { WebView } from "react-native-webview";
import { DocItem } from "@/context/DocumentContext";

interface ExtendedDocItem extends DocItem {
  fileId: string;
  name: string;
  source: string;
  uploadedAt: number;
  ext: string;
  localUri?: string;
  remoteUrl?: string;
}

interface NoteProps {
  document: ExtendedDocItem;
}

function Note({ document }: NoteProps) {
  if (!document) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Document not found.</Text>
      </View>
    );
  }

  if (document.ext !== "pdf") {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Only PDF files can be viewed in-app. Please use an external viewer for{" "}
          {document.ext.toUpperCase()} files.
        </Text>
      </View>
    );
  }

  const uri = document.remoteUrl || (document.localUri ? `file://${document.localUri}` : undefined);

  if (!uri) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No valid PDF source found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri }}
        style={styles.pdf}
        onError={(error) => {
          console.error("PDF error:", error);
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