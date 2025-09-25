import React, { useEffect, useContext, useState, useRef } from "react";
import { View, Text, Animated, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import LottieView from "lottie-react-native";
import { Ionicons } from "@expo/vector-icons";
import { DocumentContext, DocItem } from "@/context/DocumentContext";
import { useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";

const Upload = () => {
  const { documents, setDocuments } = useContext(DocumentContext)!;
  const { errorMsg: initialErrorMsg } = useLocalSearchParams<{ errorMsg?: string }>();
  const [errorMsg, setErrorMsg] = useState<string>(initialErrorMsg || "");
  const errorAnim = useRef(new Animated.Value(-100)).current;
  const { user } = useUser();
  const notFoundLottie = require("@/assets/images/not-found.json");

  useEffect(() => {
    if (errorMsg) {
      Animated.timing(errorAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(errorAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [errorMsg]);

  const saveDocs = async (docs: DocItem[]) => {
    if (!user?.id) return;
    const key = `documents_${user.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(docs));
  };

  const pickDocument = () =>
    uploadDocument(user, documents, setDocuments, (errorMsg: string) => {
      setErrorMsg(errorMsg);
      setTimeout(() => setErrorMsg(""), 2000);
    }, saveDocs);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.uploadCard}>
          <LottieView source={notFoundLottie} autoPlay loop style={styles.lottie} />
          <Text style={styles.uploadTitle}>Upload a Document</Text>
          <Text style={styles.uploadSubtitle}>Start keeping track of your documents by uploading one.</Text>
          <TouchableOpacity onPress={pickDocument} style={styles.uploadBtn}>
            <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
            <Text style={styles.uploadBtnText}>Upload a Document</Text>
          </TouchableOpacity>
        </View>
      </View>
      {errorMsg !== "" && (
        <Animated.View style={[styles.errorBox, { transform: [{ translateY: errorAnim }] }]}>
          <View style={styles.errorContent}>
            <LottieView
              source={notFoundLottie}
              autoPlay
              loop
              style={{ width: 60, height: 60, marginRight: 12 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Error</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
            <TouchableOpacity onPress={() => setErrorMsg("")} style={styles.errorCloseBtn}>
              <Ionicons name="close" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const uploadDocument = async (
  user: any,
  documents: DocItem[],
  setDocuments: (docs: DocItem[]) => void,
  onError: (msg: string) => void,
  saveDocs: (docs: DocItem[]) => Promise<void>
) => {
  const ALLOWED_EXTS = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv"];

  if (!user?.id) {
    onError("User not authenticated. Please log in.");
    return;
  }

  try {
    const result = await DocumentPicker.getDocumentAsync({});
    if (result.canceled) return;

    const { uri, name } = result.assets[0];
    const ext = name.split(".").pop()?.toLowerCase() || "";

    if (!ALLOWED_EXTS.includes(ext)) {
      onError("Unsupported file type.");
      return;
    }

    const localDir = `${FileSystem.documentDirectory}documents/${user.id}/`;
    const dirInfo = await FileSystem.getInfoAsync(localDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(localDir, { intermediates: true });
    }

    const fileId = Date.now().toString();
    const localUri = `${localDir}${fileId}.${ext}`;

    await FileSystem.copyAsync({ from: uri, to: localUri });

    const newDoc = {
      fileId,
      userId: user.id,
      name,
      ext,
      favorite: false,
      source: "Device",
      uploadedAt: Date.now(),
      localUri,
    } as unknown as DocItem;

    const updated = [...documents, newDoc];
    setDocuments(updated);
    await saveDocs(updated);
  } catch (e) {
    console.error(e);
    onError("Failed to upload document.");
  }
};

export default Upload;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  container: { flex: 1, paddingHorizontal: 20, justifyContent: "center" },
  uploadCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  lottie: { width: 120, height: 120 },
  uploadTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginTop: 6 },
  uploadSubtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", marginTop: 6, marginBottom: 12 },
  uploadBtn: {
    marginTop: 10,
    backgroundColor: "#16A34A",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
  },
  uploadBtnText: { color: "#fff", fontWeight: "700", marginLeft: 8 },
  errorBox: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    backgroundColor: "#dc2626",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  errorContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  errorText: {
    fontSize: 14,
    color: "white",
    marginTop: 4,
  },
  errorCloseBtn: {
    padding: 8,
  },
});