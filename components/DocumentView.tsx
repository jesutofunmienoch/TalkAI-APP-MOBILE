// components/DocumentView.tsx
import React, { useContext, useEffect, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LottieView from "lottie-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { DocumentContext, DocItem } from "@/context/DocumentContext";
import { useLocalSearchParams, router } from "expo-router";
import DocNav from "@/components/DocNav";
import AskAI from "@/app/document/[docId]/askai";
import Note from "@/app/document/[docId]/note";
import Summary from "@/app/document/[docId]/summary";
import Settings from "@/app/document/[docId]/settings";

const { width } = Dimensions.get("window");

const DocumentView = () => {
  const { documents, updateDocument, deleteDocument } =
    useContext(DocumentContext)!;
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const [document, setDocument] = useState<DocItem | null>(null);
  const [activeTab, setActiveTab] = useState("note");
  const [menuVisible, setMenuVisible] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const headerLottie = require("@/assets/images/askai.json");

  useEffect(() => {
    const doc = documents.find((d: DocItem) => d.fileId === docId);
    if (doc) {
      setDocument(doc);
      setNewName(doc.name);
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

  // Handle rename confirm
  const handleRename = () => {
    if (newName.trim() && document) {
      updateDocument(document.fileId, { name: newName.trim() });
      setDocument({ ...document, name: newName.trim() });
    }
    setRenameVisible(false);
    setMenuVisible(false);
  };

  // Handle delete confirm
  const handleDelete = () => {
    if (document) {
      deleteDocument(document.fileId);
      router.back();
    }
    setDeleteVisible(false);
    setMenuVisible(false);
  };

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
            <LinearGradient
              colors={["transparent", "#f8fafc"]}
              style={styles.gradient}
            />

            <View style={styles.headerTextWrap}>
              <Text style={styles.title} numberOfLines={1}>
                {document.name}
              </Text>
              <TouchableOpacity
                style={styles.moreBtn}
                onPress={() => setMenuVisible(true)}
              >
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
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Navigation + Tab Content */}
          <View style={styles.container}>
            <DocNav activeTab={activeTab} setActiveTab={setActiveTab} />
            <View style={{ marginTop: 20 }}>
              {activeTab === "note" && <Note document={document} />}
              {activeTab === "summary" && <Summary />}
              {activeTab === "settings" && <Settings />}
            </View>
          </View>
        </ScrollView>

        {/* AskAI fixed at bottom */}
        {activeTab === "askai" && (
          <View style={styles.askAIContainer}>
            <AskAI />
          </View>
        )}

        {/* ===== Overlay Menu ===== */}
        <Modal
          transparent
          visible={menuVisible}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable
            style={styles.overlay}
            onPress={() => setMenuVisible(false)}
          >
            <View style={styles.menuBox}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setRenameVisible(true);
                  setMenuVisible(false);
                }}
              >
                <MaterialIcons name="edit" size={20} color="#2563eb" />
                <Text style={styles.menuText}>Rename</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setDeleteVisible(true);
                  setMenuVisible(false);
                }}
              >
                <MaterialIcons name="delete" size={20} color="#dc2626" />
                <Text style={styles.menuText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* ===== Rename Modal ===== */}
        <Modal
          transparent
          visible={renameVisible}
          animationType="fade"
          onRequestClose={() => setRenameVisible(false)}
        >
          <View style={styles.centeredOverlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>Rename Document</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                style={styles.input}
                placeholder="Enter new name"
              />
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#e5e7eb" }]}
                  onPress={() => setRenameVisible(false)}
                >
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#2563eb" }]}
                  onPress={handleRename}
                >
                  <Text style={{ color: "#fff" }}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ===== Delete Modal ===== */}
        <Modal
          transparent
          visible={deleteVisible}
          animationType="fade"
          onRequestClose={() => setDeleteVisible(false)}
        >
          <View style={styles.centeredOverlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>
                Are you sure you want to delete?
              </Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#e5e7eb" }]}
                  onPress={() => setDeleteVisible(false)}
                >
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#dc2626" }]}
                  onPress={handleDelete}
                >
                  <Text style={{ color: "#fff" }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    height: 120,
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
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  menuBox: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  menuText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#111827",
  },
  centeredOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmBox: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    width: "90%",
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#111827",
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
});
