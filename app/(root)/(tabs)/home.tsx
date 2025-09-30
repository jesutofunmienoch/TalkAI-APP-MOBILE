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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { icons } from "@/constants";
import { DocumentContext, DocItem } from "@/context/DocumentContext";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as LegacyFileSystem from "expo-file-system/legacy"; // Use legacy import for readAsStringAsync
import { Client, Functions, ID, Storage } from "react-native-appwrite";
const { width, height } = Dimensions.get("window");
const ICONS = {
  pdf: require("@/assets/images/pdf.png"),
  word: require("@/assets/images/word.png"),
  excel: require("@/assets/images/excel.png"),
  ppt: require("@/assets/images/ppt.png"),
  generic: require("@/assets/images/no-document.png"),
};
const ALLOWED_EXTS = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv"];
const Home = () => {
  const { user, isLoaded } = useUser();
  const { signOut, getToken } = useAuth();
  const { documents, setDocuments, addDocument, updateDocument, deleteDocument } = useContext(DocumentContext)!;
  const [searchQuery, setSearchQuery] = useState("");
  const [seeMoreSearchQuery, setSeeMoreSearchQuery] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [seeMoreVisible, setSeeMoreVisible] = useState(false);
  const [propertiesVisible, setPropertiesVisible] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCloudUploading, setIsCloudUploading] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const errorAnim = useRef(new Animated.Value(-100)).current;
  const headerLottie = require("@/assets/images/others.json");
  const noDataLottie = require("@/assets/images/No-Data.json");
  const cloudAnimation = require("@/assets/images/cloud.json");
  const checkIcon = require("@/assets/images/green.png");
  // Initialize Appwrite client once
  const client = useRef<Client | null>(null);
  useEffect(() => {
    client.current = new Client()
      .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
      .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "68d99d2200263ed6ea89");
  }, []);
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
  const getExt = (filename: string) => {
    if (!filename) return "";
    const parts = filename.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  };
  const mapExtToIcon = (ext: string) => {
    if (["pdf"].includes(ext)) return ICONS.pdf;
    if (["doc", "docx"].includes(ext)) return ICONS.word;
    if (["xls", "xlsx", "csv"].includes(ext)) return ICONS.excel;
    if (["ppt", "pptx"].includes(ext)) return ICONS.ppt;
    return ICONS.generic;
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
  const handlePickDocument = () => {
    uploadDocument(
      user,
      (errorMsg) => {
        setErrorMsg(errorMsg);
        setTimeout(() => setErrorMsg(""), 2000);
      },
      addDocument
    );
  };
  const toggleFavorite = async (doc: DocItem, value: boolean) => {
    try {
      if (!user?.id) {
        setErrorMsg("User not authenticated. Please log in.");
        setTimeout(() => setErrorMsg(""), 2000);
        return;
      }
      await updateDocument(doc.fileId, { favorite: value });
      setSelectedDoc({ ...doc, favorite: value });
    } catch (error: any) {
      console.error("Toggle favorite error:", error.message);
      setErrorMsg("Could not update favorite status. Please try again.");
      setTimeout(() => setErrorMsg(""), 2000);
    }
  };
  const handleDeleteDocument = async (doc: DocItem) => {
    try {
      if (!user?.id) {
        setErrorMsg("User not authenticated. Please log in.");
        setTimeout(() => setErrorMsg(""), 2000);
        return;
      }
      if (doc.localUri) {
        await LegacyFileSystem.deleteAsync(doc.localUri);
      }
      await deleteDocument(doc.fileId);
      setMenuVisible(false);
    } catch (error: any) {
      console.error("Delete document error:", error.message);
      setErrorMsg("Could not delete document. Please try again.");
      setTimeout(() => setErrorMsg(""), 2000);
    }
  };
  const uploadToAppwrite = async (doc: DocItem, userId: string) => {
    if (!client.current) {
      throw new Error("Appwrite client not initialized.");
    }
    const functions = new Functions(client.current);
    try {
      // Read file as base64 using legacy API
      const base64 = await LegacyFileSystem.readAsStringAsync(doc.localUri!, { encoding: 'base64' });
      // Get Clerk JWT
      const jwt = await getToken({ template: 'appwrite' }); // Assume you have a Clerk JWT template named 'appwrite'
      if (!jwt) {
        throw new Error("Failed to get JWT from Clerk.");
      }
      // Prepare payload
      const payload = {
        jwt,
        userId,
        name: doc.name,
        ext: doc.ext,
        uploadedAt: doc.uploadedAt,
        favorite: doc.favorite,
        fileId: doc.fileId,
        content: doc.content || "",
        fileData: base64,
        size: doc.size || 0,
      };
      // Execute function
      const execution = await functions.createExecution(
        '68daae8e00061a5126ca',
        JSON.stringify(payload),
        false
      );
      const response = JSON.parse(execution.responseBody);
      if (!response.success) {
        throw new Error(response.error);
      }
      // Fetch signed download URL for viewing
      const clientForUrl = new Client()
        .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
        .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "68d99d2200263ed6ea89");
      // Removed setJWT as bucket is assumed public
      const storageForUrl = new Storage(clientForUrl);
      const downloadUrl = storageForUrl.getFileDownload("68d99e310009199afc3a", response.appwriteFileId).toString();
      // Update local doc
      await updateDocument(doc.fileId, { isCloudSynced: true, source: "Cloud", appwriteFileId: response.appwriteFileId });
    } catch (error: any) {
      throw new Error("Failed to upload via function: " + error.message);
    }
  };
  const handleUploadToCloud = async (doc: DocItem) => {
    try {
      if (!user?.id || !client.current) {
        setErrorMsg("User or client not ready. Please log in.");
        setTimeout(() => setErrorMsg(""), 2000);
        return;
      }
      setIsCloudUploading(true);
      await uploadToAppwrite(doc, user.id);
      setMenuVisible(false);
    } catch (error: any) {
      console.error("Upload to cloud error:", error.message);
      setErrorMsg("Could not upload to cloud. Please try again.");
      setTimeout(() => setErrorMsg(""), 2000);
    } finally {
      setIsCloudUploading(false);
    }
  };
  const handleRenameDocument = async () => {
    if (!selectedDoc || !newName.trim()) {
      setErrorMsg("Please enter a valid name.");
      setTimeout(() => setErrorMsg(""), 2000);
      return;
    }
    try {
      if (!user?.id) {
        setErrorMsg("User not authenticated. Please log in.");
        setTimeout(() => setErrorMsg(""), 2000);
        return;
      }
      const ext = getExt(selectedDoc.name);
      const newFileName = `${newName.trim()}.${ext}`;
      await updateDocument(selectedDoc.fileId, { name: newFileName });
      setSelectedDoc({ ...selectedDoc, name: newFileName });
      setRenameVisible(false);
      setNewName("");
      setMenuVisible(false);
    } catch (error: any) {
      console.error("Rename document error:", error.message);
      setErrorMsg("Could not rename document. Please try again.");
      setTimeout(() => setErrorMsg(""), 2000);
    }
  };
  const handleOpenMenu = (doc: DocItem) => {
    setSelectedDoc(doc);
    setMenuVisible(true);
  };
  const handleViewDocument = async (doc: DocItem) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      router.push({
        pathname: "/(root)/document-view" as const,
        params: { docId: doc.fileId },
      });
    } catch (error: any) {
      console.error("View document error:", error.message);
      setErrorMsg("Could not open document. Please try again.");
      setTimeout(() => setErrorMsg(""), 2000);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSignOut = async () => {
    try {
      await signOut();
      setDocuments([]);
      router.replace("/(auth)/sign-in");
    } catch (error: any) {
      console.error("Sign out error:", error);
      Alert.alert("Error", "Error signing out. Please try again.");
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
            <TouchableOpacity
              style={styles.menuBtnTop}
              activeOpacity={0.8}
              onPress={() => router.push("/home-menu")}
            >
              <Feather name="menu" size={20} color="#111827" />
            </TouchableOpacity>
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
              {filteredNonFavorites.map((item: DocItem, index: number) => {
                const icon = mapExtToIcon(item.ext);
                const isLast = index === filteredNonFavorites.length - 1;
                return (
                  <TouchableOpacity
                    key={item.fileId}
                    style={[styles.fileRow, !isLast && { marginBottom: 10 }]}
                    onPress={() => handleViewDocument(item)}
                  >
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
                    <TouchableOpacity
                      onPress={() => handleOpenMenu(item)}
                      style={styles.menuBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
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
                  {filteredFavorites.map((item: DocItem, index: number) => {
                    const icon = mapExtToIcon(item.ext);
                    const isLast = index === filteredFavorites.length - 1;
                    return (
                      <TouchableOpacity
                        key={item.fileId}
                        style={[styles.fileRow, !isLast && { marginBottom: 10 }]}
                        onPress={() => handleViewDocument(item)}
                      >
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
                        <TouchableOpacity
                          onPress={() => handleOpenMenu(item)}
                          style={styles.menuBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
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
          style={[styles.modalOverlay, { justifyContent: "flex-end" }]}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={[styles.modalContent, styles.modalShadow]}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
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
              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  setRenameVisible(true);
                  setMenuVisible(false);
                  setNewName(selectedDoc?.name.split(".").slice(0, -1).join(".") || "");
                }}
              >
                <Ionicons name="create-outline" size={20} color="#374151" />
                <Text style={styles.menuText}>Rename</Text>
              </TouchableOpacity>
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
              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => selectedDoc && handleUploadToCloud(selectedDoc)}
                disabled={selectedDoc?.isCloudSynced || isCloudUploading}
              >
                {isCloudUploading ? (
                  <LottieView source={cloudAnimation} autoPlay loop style={{ width: 20, height: 20 }} />
                ) : (
                  <MaterialIcons name="cloud-upload" size={20} color={selectedDoc?.isCloudSynced ? "#d1d5db" : "#374151"} />
                )}
                <Text style={[styles.menuText, { color: selectedDoc?.isCloudSynced ? "#d1d5db" : "#374151", marginLeft: 12 }]}>
                  {isCloudUploading ? "Uploading..." : "Upload to Cloud"}
                </Text>
                {selectedDoc?.isCloudSynced && (
                  <Image source={checkIcon} style={{ width: 20, height: 20, marginLeft: "auto", tintColor: "green" }} />
                )}
              </TouchableOpacity>
              <View style={styles.menuOption}>
                <Ionicons name="remove-circle-outline" size={20} color="#374151" />
                <Text style={styles.menuText}>Remove from List</Text>
              </View>
              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  Alert.alert(
                    "Delete Document",
                    "Are you sure you want to delete this document? This action cannot be undone.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => selectedDoc && handleDeleteDocument(selectedDoc) },
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={20} color="red" />
                <Text style={[styles.menuText, { color: "red" }]}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  setPropertiesVisible(true);
                  setMenuVisible(false);
                }}
              >
                <Ionicons name="information-circle-outline" size={20} color="#374151" />
                <Text style={styles.menuText}>Properties</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.closeMenuBtn}>
                <Text style={{ color: "white", fontWeight: "700" }}>Close</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal visible={renameVisible} animationType="slide" transparent>
        <TouchableOpacity
          style={[styles.modalOverlay, { justifyContent: "center" }]}
          activeOpacity={1}
          onPress={() => setRenameVisible(false)}
        >
          <View style={[styles.modalContent, styles.modalShadow, { minHeight: 200, maxHeight: height * 0.5 }]}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <Text style={styles.sectionTitle}>Rename Document</Text>
              <TextInput
                placeholder="Enter new name"
                value={newName}
                onChangeText={setNewName}
                style={[styles.searchInput, { marginVertical: 10, backgroundColor: "#f9fafb", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" }]}
                placeholderTextColor="#9CA3AF"
              />
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20 }}>
                <TouchableOpacity
                  onPress={() => setRenameVisible(false)}
                  style={[styles.closeMenuBtn, { backgroundColor: "#6b7280" }]}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRenameDocument} style={styles.closeMenuBtn}>
                  <Text style={{ color: "white", fontWeight: "700" }}>Save</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal visible={propertiesVisible} animationType="slide" transparent>
        <TouchableOpacity
          style={[styles.modalOverlay, { justifyContent: "center" }]}
          activeOpacity={1}
          onPress={() => setPropertiesVisible(false)}
        >
          <View style={[styles.modalContent, styles.modalShadow, { minHeight: 300, maxHeight: height * 0.6 }]}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <Text style={styles.sectionTitle}>Document Properties</Text>
              <View style={{ marginVertical: 10 }}>
                <View style={styles.propertyRow}>
                  <Text style={styles.propertyLabel}>Name:</Text>
                  <Text style={styles.propertyValue}>{selectedDoc?.name}</Text>
                </View>
                <View style={styles.propertyRow}>
                  <Text style={styles.propertyLabel}>Type:</Text>
                  <Text style={styles.propertyValue}>{selectedDoc?.ext.toUpperCase()}</Text>
                </View>
                <View style={styles.propertyRow}>
                  <Text style={styles.propertyLabel}>Size:</Text>
                  <Text style={styles.propertyValue}>{selectedDoc?.size ? `${(selectedDoc.size / 1024).toFixed(2)} KB` : 'N/A'}</Text>
                </View>
                <View style={styles.propertyRow}>
                  <Text style={styles.propertyLabel}>Uploaded:</Text>
                  <Text style={styles.propertyValue}>{selectedDoc ? new Date(selectedDoc.uploadedAt).toLocaleString() : ''}</Text>
                </View>
                <View style={styles.propertyRow}>
                  <Text style={styles.propertyLabel}>Source:</Text>
                  <Text style={styles.propertyValue}>{selectedDoc?.source}</Text>
                </View>
                {selectedDoc?.isCloudSynced && (
                  <View style={styles.propertyRow}>
                    <Text style={styles.propertyLabel}>Cloud ID:</Text>
                    <Text style={styles.propertyValue}>{selectedDoc?.appwriteFileId}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setPropertiesVisible(false)} style={styles.closeMenuBtn}>
                <Text style={{ color: "white", fontWeight: "700" }}>Close</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal visible={seeMoreVisible} animationType="slide" transparent>
        <TouchableOpacity
          style={[styles.modalOverlay, { justifyContent: "flex-end" }]}
          activeOpacity={1}
          onPress={() => setSeeMoreVisible(false)}
        >
          <View style={[styles.modalContent, styles.modalShadow]}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
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
                  keyExtractor={(item: DocItem) => item.fileId}
                  renderItem={({ item }: { item: DocItem }) => {
                    const icon = mapExtToIcon(item.ext);
                    return (
                      <TouchableOpacity
                        style={styles.fileRow}
                        onPress={() => handleViewDocument(item)}
                      >
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
                        <TouchableOpacity
                          onPress={() => handleOpenMenu(item)}
                          style={styles.menuBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  }}
                  ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                  nestedScrollEnabled={true}
                />
              )}
              <TouchableOpacity onPress={() => setSeeMoreVisible(false)} style={styles.closeMenuBtn}>
                <Text style={{ color: "white", fontWeight: "700" }}>Close</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal visible={isLoading} animationType="fade" transparent>
        <View style={styles.loadingOverlay}>
          <LottieView
            source={require("@/assets/images/loading.json")}
            autoPlay
            loop
            style={{ width: 150, height: 150 }}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};
const uploadDocument = async (
  user: any,
  onError: (msg: string) => void,
  addDocument: (newDoc: DocItem) => Promise<void>
) => {
  if (!user?.id) {
    onError("User not authenticated. Please log in.");
    return;
  }
  try {
    const result = await DocumentPicker.getDocumentAsync({});
    if (result.canceled) return;
    const { uri, name, size } = result.assets[0];
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTS.includes(ext)) {
      onError("Unsupported file type.");
      return;
    }
    const localDir = `${LegacyFileSystem.documentDirectory}documents/${user.id}/`;
    await LegacyFileSystem.makeDirectoryAsync(localDir, { intermediates: true });
    const fileId = Date.now().toString();
    const localUri = `${localDir}${fileId}.${ext}`;
    await LegacyFileSystem.copyAsync({ from: uri, to: localUri });
    // Content will be extracted server-side
    const newDoc = {
      fileId,
      userId: user.id,
      name,
      ext,
      favorite: false,
      source: "Device",
      uploadedAt: Date.now(),
      localUri,
      content: "",
      isCloudSynced: false,
      size,
    } as DocItem;
    await addDocument(newDoc);
  } catch (e: any) {
    console.error("Upload document error:", e.message);
    onError("Failed to upload document.");
  }
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
  menuBtnTop: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    marginBottom: 80,
  },
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
    backgroundColor: "#111827",
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    backgroundColor: "#111827",
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
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  propertyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  propertyLabel: {
    fontWeight: "600",
    color: "#374151",
  },
  propertyValue: {
    color: "#6B7280",
  },
});
