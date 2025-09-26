// app/document/[docId]/note.tsx
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import WebView from 'react-native-webview';
import { DocItem } from '@/context/DocumentContext';

interface NoteProps {
  document: DocItem;
}

function Note({ document }: NoteProps) {
  if (document.ext !== 'pdf') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Only PDF files can be viewed in-app. Please use an external viewer for {document.ext.toUpperCase()} files.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView 
        source={{ uri: `file://${document.localUri}` }} 
        style={styles.webview}
        originWhitelist={['*']}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={true}
      />
    </View>
  );
}

export default Note;

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  errorText: { textAlign: 'center', marginTop: 20, color: 'red' },
});