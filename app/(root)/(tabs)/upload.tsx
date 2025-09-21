import React, { useEffect, useContext, useState, useRef } from "react";
import { View, Text, Animated, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import LottieView from "lottie-react-native";
import { Ionicons } from "@expo/vector-icons";
import { DocumentContext, DocItem } from "../../../context/DocumentContext";

const ALLOWED_EXTS = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv"];

const useDocumentContext = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocumentContext must be used within a DocumentContext.Provider");
  }
  return context;
};

const Upload = () => {
  const { setDocuments } = useDocumentContext();
  const { errorMsg: initialErrorMsg } = useLocalSearchParams<{ errorMsg?: string }>();
  const [errorMsg, setErrorMsg] = useState(initialErrorMsg || "");
  const errorAnim = useRef(new Animated.Value(-100)).current;
  const notFoundLottie = require("../../../assets/images/not-found.json");

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

  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (res.canceled) {
        router.replace("/(root)/(tabs)/home");
        return;
      }

      const { name, uri } = res.assets[0];
      const ext = getExt(name);

      if (!ALLOWED_EXTS.includes(ext)) {
        setErrorMsg(`File type ".${ext}" is not supported. Only PDF, Word, Excel, and PowerPoint files are allowed.`);
        setTimeout(() => {
          setErrorMsg("");
        }, 2000);
        return;
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const uploadedAt = Date.now();
      const source = inferSourceFromUri(uri || "");

      const newDoc: DocItem = {
        id,
        name,
        uri,
        ext,
        source,
        uploadedAt,
        favorite: false,
      };

      setDocuments((prev: DocItem[]) => [newDoc, ...prev]);
      router.replace("/(root)/(tabs)/home");
    } catch (err) {
      setErrorMsg("Could not pick document. Please try again.");
      setTimeout(() => {
        setErrorMsg("");
      }, 2000);
    }
  };

  const getExt = (filename: string) => {
    if (!filename) return "";
    const parts = filename.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  };

  const inferSourceFromUri = (uri: string) => {
    if (!uri) return "My phone";
    const lower = uri.toLowerCase();
    if (lower.includes("whatsapp")) return "WhatsApp";
    if (lower.includes("download") || lower.includes("downloads")) return "Download";
    if (lower.includes("drive")) return "Drive";
    return "My phone";
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.uploadCard}>
          <LottieView source={notFoundLottie} autoPlay loop style={styles.lottie} />
          <Text style={styles.uploadTitle}>Upload a Document</Text>
          <Text style={styles.uploadSubtitle}>Something went wrong, please try again.</Text>
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