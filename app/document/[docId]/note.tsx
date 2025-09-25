import { View, Text, StyleSheet, Platform } from "react-native";
import React, { useContext, useEffect, useState } from "react";
import { DocumentContext, DocItem } from "@/context/DocumentContext";
import { useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";

export default function Note() {
  const { documents } = useContext(DocumentContext)!;
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const [document, setDocument] = useState<DocItem | null>(null);

  useEffect(() => {
    const doc = documents.find((d: DocItem) => d.fileId === docId);
    if (doc) {
      setDocument(doc);
    }
  }, [docId, documents]);

  if (!document || !document.localUri) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>📝 No document available</Text>
      </View>
    );
  }

  // Display the document using WebView for local files (e.g., PDF, DOC)
  const uri = `file://${document.localUri}`;

  const webViewProps = {
    ... (Platform.OS === 'android' ? { allowFileAccess: true } : {}),
    ... (Platform.OS === 'ios' ? { allowsInlineMediaPlayback: true } : {}),
  };

  return (
    <View style={styles.fullContainer}>
      <WebView
        source={{ uri }}
        style={styles.webview}
        originWhitelist={["*"]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={true}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error: ', nativeEvent);
        }}
        {...webViewProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  fullContainer: { 
    flex: 1 
  },
  text: { 
    fontSize: 18, 
    fontWeight: "600", 
    marginBottom: 10 
  },
  webview: { 
    flex: 1, 
    width: "100%" 
  },
});