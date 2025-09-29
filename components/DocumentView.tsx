import React, { useContext, useEffect, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Pressable,
  Share,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { DocumentContext, DocItem } from "@/context/DocumentContext";
import { useLocalSearchParams, router } from "expo-router";
import DocNav from "@/components/DocNav";
import AskAI from "@/app/document/[docId]/askai";
import Note from "@/app/document/[docId]/note";
import Summary from "@/app/document/[docId]/summary";
import Settings from "@/app/document/[docId]/settings";

interface ExtendedDocItem extends DocItem {
  fileId: string;
  name: string;
  source: string;
  uploadedAt: number;
  ext: string;
  localUri?: string;
  remoteUrl?: string;
}

const DocumentView = () => {
  const { documents, updateDocument, deleteDocument } = useContext(DocumentContext)!;
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const [document, setDocument] = useState<ExtendedDocItem | null>(null);
  const [activeTab, setActiveTab] = useState("note");
  const [menuVisible, setMenuVisible] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [propertiesVisible, setPropertiesVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [isUploadedToCloud, setIsUploadedToCloud] = useState<boolean>(false);

  useEffect(() => {
    if (!docId) {
      console.error("No docId provided");
      router.back();
      return;
    }

    const doc = documents.find((d: DocItem) => d.fileId === docId);
    if (doc) {
      const extendedDoc: ExtendedDocItem = {
        ...doc,
        fileId: doc.fileId,
        name: doc.name,
        source: doc.source,
        uploadedAt: doc.uploadedAt,
        ext: doc.ext || "pdf",
        localUri: (doc as any).localUri,
        remoteUrl: (doc as any).remoteUrl,
      };
      setDocument(extendedDoc);
      setNewName(doc.name);
      setIsUploadedToCloud(Boolean((doc as any).uploadedToCloud));
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

  const formattedUploadedAt = new Date(document.uploadedAt).toLocaleString();

  const handleRename = () => {
    if (newName.trim() && document) {
      updateDocument(document.fileId, { name: newName.trim() });
      setDocument({ ...document, name: newName.trim() });
    }
    setRenameVisible(false);
    setMenuVisible(false);
  };

  const handleDelete = () => {
    if (document) {
      deleteDocument(document.fileId);
      router.back();
    }
    setDeleteVisible(false);
    setMenuVisible(false);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: document.name,
        message: `${document.name} — from ${document.source}\n\nUploaded: ${formattedUploadedAt}`,
      });
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Unable to share", "An error occurred while trying to share the document.");
    }
    setMenuVisible(false);
  };

  const handleUploadToCloud = async () => {
    try {
      setIsUploadedToCloud(true);
      Alert.alert("Uploaded", "Document marked as uploaded to cloud (local only).");
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Upload failed", "Could not upload to cloud.");
    }
    setMenuVisible(false);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={20} color="#111827" />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {document.name}
          </Text>
          <TouchableOpacity style={styles.moreBtn} onPress={() => setMenuVisible(true)}>
            <Ionicons name="ellipsis-vertical" size={20} color="#111827" />
          </TouchableOpacity>
        </View>
        <View style={styles.fileMetaRow}>
          <Text style={styles.fileSource}>{document.source}</Text>
          <Text style={styles.fileDot}> · </Text>
          <Text style={styles.fileTime}>{formattedUploadedAt}</Text>
        </View>
        <View style={styles.navContainer}>
          <DocNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </View>
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "note":
        return <Note document={document} />;
      case "summary":
        return <Summary />;
      case "askai":
        return <AskAI />;
      case "settings":
        return <Settings />;
      default:
        return null;
    }
  };

  const docSize = (document as any)?.size;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.contentContainer}>
          {activeTab === "askai" ? (
            <View style={{ flex: 1 }}>{renderTabContent()}</View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
              {renderTabContent()}
            </ScrollView>
          )}
        </View>

        <Modal
          transparent
          visible={menuVisible}
          animationType="slide"
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
            <Pressable style={styles.sheetContainer}>
              <View style={styles.sheetHandle} />
              <View style={styles.filePreview}>
                <View style={styles.fileIconWrap}>
                  <View style={styles.wordIconBox}>
                    <MaterialIcons name="description" size={22} color="#1E3A8A" />
                  </View>
                </View>
                <View style={styles.fileMeta}>
                  <Text style={styles.previewTitle} numberOfLines={1}>
                    {document.name}
                  </Text>
                  <Text style={styles.previewSub}>
                    {document.source} · {formattedUploadedAt}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.menuItem} onPress={handleShare} activeOpacity={0.7}>
                <MaterialIcons name="share" size={22} color="#111827" />
                <Text style={styles.menuText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setDeleteVisible(true);
                  setMenuVisible(false);
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="delete" size={22} color="#dc2626" />
                <Text style={[styles.menuText, { color: "#dc2626" }]}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setPropertiesVisible(true);
                  setMenuVisible(false);
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="info" size={22} color="#111827" />
                <Text style={styles.menuText}>Properties</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

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

        <Modal
          transparent
          visible={deleteVisible}
          animationType="fade"
          onRequestClose={() => setDeleteVisible(false)}
        >
          <View style={styles.centeredOverlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>Are you sure you want to delete?</Text>
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

        <Modal
          transparent
          visible={propertiesVisible}
          animationType="fade"
          onRequestClose={() => setPropertiesVisible(false)}
        >
          <View style={styles.centeredOverlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>Properties</Text>
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.propLabel}>Name</Text>
                <Text style={styles.propValue}>{document.name}</Text>
                <Text style={styles.propLabel}>Source</Text>
                <Text style={styles.propValue}>{document.source}</Text>
                <Text style={styles.propLabel}>Uploaded</Text>
                <Text style={styles.propValue}>{formattedUploadedAt}</Text>
                {typeof docSize !== "undefined" && docSize !== null ? (
                  <>
                    <Text style={styles.propLabel}>Size</Text>
                    <Text style={styles.propValue}>{String(docSize)}</Text>
                  </>
                ) : null}
                <Text style={styles.propLabel}>Uploaded to cloud</Text>
                <Text style={styles.propValue}>{isUploadedToCloud ? "Yes" : "No"}</Text>
              </View>
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#e5e7eb" }]}
                  onPress={() => setPropertiesVisible(false)}
                >
                  <Text>Close</Text>
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
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    flexDirection: "column",
  },
  header: {
    width: "100%",
    backgroundColor: "#f8fafc",
    paddingTop: 25,
  },
  headerContent: {
    paddingHorizontal: 10,
    paddingBottom: 12,
  },
  headerTextWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingTop: 16,
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
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  fileSource: {
    color: "#6B7280",
    fontSize: 13,
  },
  fileDot: {
    color: "#6B7280",
    fontSize: 13,
  },
  fileTime: {
    color: "#6B7280",
    fontSize: 13,
  },
  backBtn: {
    position: "absolute",
    top: 10,
    left: 10,
    padding: 4,
    backgroundColor: "rgba(156,163,175,0.15)",
    borderRadius: 12,
  },
  navContainer: {
    backgroundColor: "#f8fafc",
  },
  contentContainer: {
    flex: 1,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#374151",
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#fff",
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e5e7eb",
    alignSelf: "center",
    marginBottom: 12,
  },
  filePreview: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  fileIconWrap: {
    marginRight: 12,
  },
  wordIconBox: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  fileMeta: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  previewSub: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
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
  propLabel: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 6,
  },
  propValue: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "500",
  },
});