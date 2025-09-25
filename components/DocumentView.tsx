import React, { useContext, useEffect, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LottieView from "lottie-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { DocumentContext, DocItem } from "@/context/DocumentContext";
import { useLocalSearchParams, router } from "expo-router";
import DocNav from "@/components/DocNav";
import AskAI from "@/app/document/[docId]/askai";
import Note from "@/app/document/[docId]/note";
import Summary from "@/app/document/[docId]/summary";
import Settings from "@/app/document/[docId]/settings";

const { width } = Dimensions.get("window");

const DocumentView = () => {
  const { documents } = useContext(DocumentContext)!;
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const [document, setDocument] = useState<DocItem | null>(null);
  const [activeTab, setActiveTab] = useState("note"); // Default tab
  const headerLottie = require("@/assets/images/askai.json");

  useEffect(() => {
    const doc = documents.find((d: DocItem) => d.fileId === docId);
    if (doc) {
      setDocument(doc);
    } else {
      console.error(`Document with ID ${docId} not found`);
      router.back();
    }
  }, [docId, documents]);

  if (!document) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>Loading document...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: activeTab === "askai" ? 120 : 40,
          }}
        >
          {/* Header */}
          <View style={styles.header}>
            <LottieView
              source={headerLottie}
              autoPlay
              loop
              style={{ width, height: 250 }}
            />

            {/* ✅ Gradient overlay just like SignIn */}
            <LinearGradient
              colors={["transparent", "#f8fafc"]}
              style={styles.gradient}
            />

            <View style={styles.headerTextWrap}>
              <Text style={styles.title} numberOfLines={1}>
                {document.name}
              </Text>
              <TouchableOpacity style={styles.moreBtn}>
                <Ionicons name="ellipsis-vertical" size={20} color="#111827" />
              </TouchableOpacity>
            </View>
            <View style={styles.fileMetaRow}>
              <Text style={styles.fileSource}>{document.source}</Text>
              <Text style={styles.fileDot}> · </Text>
              <Text style={styles.fileTime}>
                {new Date(document.uploadedAt).toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Navigation + Tab Content */}
          <View style={styles.container}>
            <DocNav activeTab={activeTab} setActiveTab={setActiveTab} />
            <View style={{ marginTop: 20 }}>
              {activeTab === "note" && <Note />}
              {activeTab === "summary" && <Summary />}
              {activeTab === "settings" && <Settings />}
            </View>
          </View>
        </ScrollView>

        {/* AskAI fixed at bottom ONLY when AskAI tab is active */}
        {activeTab === "askai" && (
          <View style={styles.askAIContainer}>
            <AskAI />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default DocumentView;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { paddingHorizontal: 20, marginTop: -40 },
  header: {
    position: "relative",
    width: "100%",
    height: 250,
    backgroundColor: "#f8fafc",
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120, // same fade height as sign-in
  },
  headerTextWrap: {
    position: "absolute",
    bottom: 72,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 10,
  },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(156,163,175,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  fileMetaRow: {
    position: "absolute",
    bottom: 50,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  fileSource: { color: "#6B7280", fontSize: 13 },
  fileDot: { color: "#6B7280", fontSize: 13 },
  fileTime: { color: "#6B7280", fontSize: 13 },
  backBtn: {
    position: "absolute",
    top: 18,
    left: 18,
    padding: 8,
    backgroundColor: "rgba(156,163,175,0.15)",
    borderRadius: 12,
  },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#374151", fontSize: 16 },
  askAIContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingBottom: 12,
  },
});