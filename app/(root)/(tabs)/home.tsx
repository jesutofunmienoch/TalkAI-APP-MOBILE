import React, { useState, useRef, useEffect, useContext } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Dimensions,
  FlatList,
  Animated,
  StyleSheet,
  Modal,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { icons } from "@/constants";
import { DocumentContext, DocItem } from "../../../context/DocumentContext";
import { databases, storage, appwriteConfig, setJWT, uploadDocument } from "../../../lib/appwrite";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
 

const { width } = Dimensions.get("window");

const ICONS = {
  pdf: require("../../../assets/images/pdf.png"),
  word: require("../../../assets/images/word.png"),
  excel: require("../../../assets/images/excel.png"),
  ppt: require("../../../assets/images/ppt.png"),
  generic: require("../../../assets/images/no-document.png"),
};

const Home = () => {
  const { user, isLoaded } = useUser();
  const { signOut, getToken } = useAuth();
  const { documents, setDocuments } = useContext(DocumentContext)!;
  const [searchQuery, setSearchQuery] = useState("");
  const [seeMoreSearchQuery, setSeeMoreSearchQuery] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [seeMoreVisible, setSeeMoreVisible] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const errorAnim = useRef(new Animated.Value(-100)).current;
  const headerLottie = require("../../../assets/images/learning.json");
  const noDataLottie = require("../../../assets/images/No-Data.json");

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

  const mapExtToIcon = (ext: string) => {
    if (["pdf"].includes(ext)) return ICONS.pdf;
    if (["doc", "docx"].includes(ext)) return ICONS.word;
    if (["xls", "xlsx", "csv"].includes(ext)) return ICONS.excel;
    if (["ppt", "pptx"].includes(ext)) return ICONS.ppt;
    return ICONS.generic;
  };

  const inferSourceFromUri = (uri: string) => {
    if (!uri) return "My phone";
    const lower = uri.toLowerCase();
    if (lower.includes("whatsapp")) return "WhatsApp";
    if (lower.includes("download") || lower.includes("downloads")) return "Download";
    if (lower.includes("drive")) return "Drive";
    return "My phone";
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const handlePickDocument = async () => {
    await uploadDocument(
      getToken,
      user,
      setDocuments,
      (msg: string) => {
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(""), 2000);
      }
    );
  };

  const toggleFavorite = async (doc: DocItem, value: boolean) => {
    try {
      const jwt = await getToken();
      if (jwt) setJWT(jwt);

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collectionId,
        doc.id,
        { favorite: value }
      );

      setDocuments((prev: DocItem[]) =>
        prev.map((d: DocItem) => (d.id === doc.id ? { ...d, favorite: value } : d))
      );
    } catch (error) {
      console.error(error);
      setErrorMsg("Could not update favorite status. Please try again.");
      setTimeout(() => setErrorMsg(""), 2000);
    }
  };

  const handleDeleteDocument = async (doc: DocItem) => {
    try {
      const jwt = await getToken();
      if (jwt) setJWT(jwt);

      await storage.deleteFile(appwriteConfig.bucketId, doc.fileId);
      await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.collectionId, doc.id);

      setDocuments((prev: DocItem[]) => prev.filter((d: DocItem) => d.id !== doc.id));
      setMenuVisible(false);
    } catch (error) {
      console.error(error);
      setErrorMsg("Could not delete document. Please try again.");
      setTimeout(() => setErrorMsg(""), 2000);
    }
  };

  const handleOpenMenu = (doc: DocItem) => {
    setSelectedDoc(doc);
    setMenuVisible(true);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch {
      alert("Error signing out. Please try again.");
    }
  };

  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingBox}>
          <Text style={{ color: "#374151" }}>Loading user data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = user?.firstName ? user.firstName : "User";
  const filteredFavorites = documents
    .filter((d: DocItem) => d.favorite && d.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 4);
  const filteredNonFavorites = documents
    .filter((d: DocItem) => !d.favorite && d.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 4);
  const filteredAllDocuments = documents.filter((d: DocItem) =>
    d.name.toLowerCase().includes(seeMoreSearchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <LottieView source={headerLottie} autoPlay loop style={{ width, height: 250 }} />
          <LinearGradient colors={["transparent", "#f8fafc"]} style={styles.gradient} />
          <View style={styles.headerTextWrap}>
            <Text style={styles.welcome}>Welcome, {displayName}</Text>
            <Text style={styles.sub}>Ready to explore talkai?</Text>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={styles.logoutBtn}>
            <Image source={icons.out} style={styles.logoutIcon} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.container, { marginTop: -40 }]}>
          <View style={styles.searchBox}>
            <Image source={icons.search} style={styles.searchIcon} />
            <TextInput
              placeholder="Search document"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
        <View style={[styles.container, { marginTop: 18 }]}>
          <Text style={styles.sectionTitle}>Uploaded documents</Text>
          {documents.length === 0 ? (
            <View style={styles.emptyCard}>
              <LottieView source={noDataLottie} autoPlay loop style={{ width: 120, height: 120 }} />
              <Text style={styles.emptyTitle}>No documents yet</Text>
              <Text style={styles.emptySubtitle}>
                Start keeping track of your documents by uploading your first one
              </Text>
              <TouchableOpacity onPress={handlePickDocument} style={styles.uploadBtn}>
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.uploadBtnText}>Upload a Document</Text>
              </TouchableOpacity>
            </View>
          ) : filteredFavorites.length === 0 && filteredNonFavorites.length === 0 ? (
            <View style={styles.emptyCard}>
              <LottieView source={noDataLottie} autoPlay loop style={{ width: 120, height: 120 }} />
              <Text style={styles.emptyTitle}>No documents found</Text>
              <Text style={styles.emptySubtitle}>
                File named "{searchQuery}" not found. Try a different search term.
              </Text>
            </View>
          ) : (
            <>
              <FlatList
                data={filteredNonFavorites}
                keyExtractor={(item: DocItem) => item.id}
                renderItem={({ item }: { item: DocItem }) => {
                  const icon = mapExtToIcon(item.ext);
                  return (
                    <View style={styles.fileRow}>
                      <Image source={icon} style={styles.fileIcon} />
                      <View style={styles.fileInfo}>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View style={styles.fileMetaRow}>
                          <Text style={styles.fileSource}>{item.source}</Text>
                          <Text style={styles.fileDot}> · </Text>
                          <Text style={styles.fileTime}>{formatRelativeTime(item.uploadedAt)}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => handleOpenMenu(item)} style={styles.menuBtn}>
                        <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                  );
                }}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
              {filteredNonFavorites.length >= 4 && (
                <TouchableOpacity
                  onPress={() => setSeeMoreVisible(true)}
                  style={styles.seeMoreBtn}
                >
                  <Text style={styles.seeMoreText}>See More</Text>
                </TouchableOpacity>
              )}
              {filteredFavorites.length > 0 && (
                <View style={{ marginTop: 24 }}>
                  <Text style={styles.sectionTitle}>Favorites</Text>
                  {filteredFavorites.map((item: DocItem) => (
                    <View key={item.id} style={styles.fileRow}>
                      <Image source={mapExtToIcon(item.ext)} style={styles.fileIcon} />
                      <View style={styles.fileInfo}>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View style={styles.fileMetaRow}>
                          <Text style={styles.fileSource}>{item.source}</Text>
                          <Text style={styles.fileDot}> · </Text>
                          <Text style={styles.fileTime}>{formatRelativeTime(item.uploadedAt)}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => handleOpenMenu(item)} style={styles.menuBtn}>
                        <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
      {errorMsg !== "" && (
        <Animated.View style={[styles.errorBox, { transform: [{ translateY: errorAnim }] }]}>
          <View style={styles.errorContent}>
            <LottieView
              source={noDataLottie}
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
      <Modal visible={menuVisible} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.modalContent}>
            {selectedDoc && (
              <View style={styles.modalHeader}>
                <Image source={mapExtToIcon(selectedDoc.ext)} style={styles.fileIcon} />
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {selectedDoc.name}
                  </Text>
                  <View style={styles.fileMetaRow}>
                    <Text style={styles.fileSource}>{selectedDoc.source}</Text>
                    <Text style={styles.fileDot}> · </Text>
                    <Text style={styles.fileTime}>{formatRelativeTime(selectedDoc.uploadedAt)}</Text>
                  </View>
                </View>
              </View>
            )}
            <View style={styles.menuOption}>
              <MaterialIcons name="picture-as-pdf" size={20} color="#374151" />
              <Text style={styles.menuText}>Convert to PDF</Text>
            </View>
            <View style={styles.menuOption}>
              <Feather name="share-2" size={20} color="#374151" />
              <Text style={styles.menuText}>Share</Text>
            </View>
            <View style={styles.menuOption}>
              <Ionicons name="star-outline" size={20} color="#374151" />
              <Text style={styles.menuText}>Favorite</Text>
              <Switch
                value={selectedDoc?.favorite}
                onValueChange={(value) => {
                  if (selectedDoc) {
                    toggleFavorite(selectedDoc, value);
                  }
                }}
                trackColor={{ false: "#d1d5db", true: "#16a34a" }}
                thumbColor="white"
                style={{ marginLeft: "auto" }}
              />
            </View>
            <View style={styles.menuOption}>
              <Ionicons name="cloud-upload-outline" size={20} color="#374151" />
              <Text style={styles.menuText}>Upload to Cloud</Text>
            </View>
            <View style={styles.menuOption}>
              <Ionicons name="create-outline" size={20} color="#374151" />
              <Text style={styles.menuText}>Rename</Text>
            </View>
            <View style={styles.menuOption}>
              <Ionicons name="remove-circle-outline" size={20} color="#374151" />
              <Text style={styles.menuText}>Remove from List</Text>
            </View>
            <View style={styles.menuOption}>
              <Ionicons name="trash-outline" size={20} color="red" />
              <TouchableOpacity onPress={() => selectedDoc && handleDeleteDocument(selectedDoc)}>
                <Text style={[styles.menuText, { color: "red" }]}>Delete</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.menuOption}>
              <Ionicons name="information-circle-outline" size={20} color="#374151" />
              <Text style={styles.menuText}>Properties</Text>
            </View>
            <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.closeMenuBtn}>
              <Text style={{ color: "white", fontWeight: "700" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal visible={seeMoreVisible} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSeeMoreVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={[styles.searchBox, { marginBottom: 20 }]}>
              <Image source={icons.search} style={styles.searchIcon} />
              <TextInput
                placeholder="Search document"
                value={seeMoreSearchQuery}
                onChangeText={setSeeMoreSearchQuery}
                style={styles.searchInput}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            {filteredAllDocuments.length === 0 ? (
              <View style={styles.emptyCard}>
                <LottieView source={noDataLottie} autoPlay loop style={{ width: 120, height: 120 }} />
                <Text style={styles.emptyTitle}>No documents found</Text>
                <Text style={styles.emptySubtitle}>
                  File named "{seeMoreSearchQuery}" not found. Try a different search term.
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredAllDocuments}
                keyExtractor={(item: DocItem) => item.id}
                renderItem={({ item }: { item: DocItem }) => {
                  const icon = mapExtToIcon(item.ext);
                  return (
                    <View style={styles.fileRow}>
                      <Image source={icon} style={styles.fileIcon} />
                      <View style={styles.fileInfo}>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View style={styles.fileMetaRow}>
                          <Text style={styles.fileSource}>{item.source}</Text>
                          <Text style={styles.fileDot}> · </Text>
                          <Text style={styles.fileTime}>{formatRelativeTime(item.uploadedAt)}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => handleOpenMenu(item)} style={styles.menuBtn}>
                        <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                  );
                }}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            )}
            <TouchableOpacity onPress={() => setSeeMoreVisible(false)} style={styles.closeMenuBtn}>
              <Text style={{ color: "white", fontWeight: "700" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  container: { paddingHorizontal: 20 },
  header: { position: "relative", width: "100%", height: 250, backgroundColor: "#f8fafc" },
  gradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: 180 },
  headerTextWrap: { position: "absolute", bottom: 48, left: 20 },
  welcome: { fontSize: 26, fontWeight: "700", color: "#111827" },
  sub: { fontSize: 14, color: "#374151", marginTop: 4 },
  logoutBtn: {
    position: "absolute",
    top: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(156,163,175,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  logoutIcon: { width: 18, height: 18, marginRight: 8, tintColor: "#111827" },
  logoutText: { color: "#111827", fontWeight: "600" },
  searchBox: {
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  searchIcon: { width: 18, height: 18, marginRight: 10, tintColor: "#9CA3AF" },
  searchInput: { flex: 1, fontSize: 16, color: "#111827" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 10 },
  emptyCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginTop: 6 },
  emptySubtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", marginTop: 6, marginBottom: 12 },
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
  fileRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
  },
  fileIcon: { width: 44, height: 44, resizeMode: "contain", marginRight: 12 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  fileMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  fileSource: { color: "#6B7280", fontSize: 13 },
  fileDot: { color: "#6B7280", fontSize: 13 },
  fileTime: { color: "#6B7280", fontSize: 13 },
  menuBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  seeMoreBtn: {
    marginTop: 16,
    alignItems: "center",
  },
  seeMoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#16A34A",
    borderBottomWidth: 1,
    borderBottomColor: "#16A34A",
  },
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalHeader: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
    marginBottom: 20,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    height: 56,
  },
  menuText: {
    fontSize: 16,
    color: "#374151",
    marginLeft: 12,
  },
  closeMenuBtn: {
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 20,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});