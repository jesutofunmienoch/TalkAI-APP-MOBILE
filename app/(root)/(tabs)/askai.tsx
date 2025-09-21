import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { CameraView, type CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function AskaiCameraPage() {
  const cameraRef = useRef<CameraView | null>(null);
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [galleryPermission, requestGalleryPermission] = ImagePicker.useMediaLibraryPermissions();
  const [type, setType] = useState<CameraType>("back");
  const [isTaking, setIsTaking] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);

  const takePhoto = async () => {
    if (!cameraRef.current || isTaking) return;
    try {
      setIsTaking(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: true,
      });
      setCaptured(photo.uri);
      console.log("Captured:", photo.uri);
    } catch (e) {
      console.warn(e);
    } finally {
      setIsTaking(false);
    }
  };

  const pickImage = async () => {
    if (!galleryPermission?.granted) {
      const { granted } = await requestGalleryPermission();
      if (!granted) {
        console.log("Gallery permission denied");
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      setCaptured(result.assets[0].uri);
      console.log("Selected from gallery:", result.assets[0].uri);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#fff" }}>
          No access to camera. Please allow camera permissions.
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.grantButton}>
          <Text style={styles.grantButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView
          ref={(r) => {
            cameraRef.current = r;
          }}
          style={StyleSheet.absoluteFillObject}
          facing={type}
        >
          {/* Top bar with icons */}
          <View
            style={styles.topBar}
            pointerEvents={captured ? "none" : "auto"}
          >
            <View style={styles.topLeftRow}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => console.log("rotate/back")}
              >
                <Ionicons name="time-outline" size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => console.log("history")}
              >
                <Ionicons name="refresh" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.topRightRow}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => console.log("gift")}
              >
                <Ionicons name="gift-outline" size={20} color="#fff" />
              </TouchableOpacity>

              <View style={styles.proPill}>
                <Text style={styles.proText}>Pro</Text>
              </View>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => console.log("settings")}
              >
                <Ionicons name="settings-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Center framed area */}
          <View style={styles.middleContainer} pointerEvents="none">
            <Text style={styles.headerText}>Take a picture of a question</Text>
            <View style={styles.frame} />
          </View>

          {/* Bottom controls */}
          <View
            style={styles.bottomBar}
            pointerEvents={captured ? "none" : "auto"}
          >
            <TouchableOpacity
              style={styles.smallAction}
              onPress={pickImage}
            >
              <Ionicons name="image-outline" size={28} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shutterButton}
              onPress={takePhoto}
              disabled={isTaking}
            >
              <View style={styles.shutterInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      )}

      {/* Preview overlay after capture */}
      {captured && (
        <View style={styles.previewOverlay}>
          <Image source={{ uri: captured }} style={styles.previewImage} />
          <View style={styles.previewControls}>
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={() => setCaptured(null)}
            >
              <Text style={styles.previewBtnText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={() => console.log("use photo")}
            >
              <Text style={styles.previewBtnText}>Use Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  topBar: {
    position: "absolute",
    top: Platform.OS === "android" ? 70 : 30,
    left: 12,
    right: 12,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topLeftRow: { flexDirection: "row", alignItems: "center" },
  topRightRow: { flexDirection: "row", alignItems: "center" },
  iconButton: {
    marginHorizontal: 6,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 8,
  },
  headerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  },
  proPill: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 6,
  },
  proText: { color: "#fff", fontWeight: "700" },

  middleContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: {
    width: width * 0.82,
    height: 140,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
  },

  bottomBar: {
    position: "absolute",
    bottom: Platform.OS === "android" ? 48 : 40, // Increased to ensure full visibility
    left: 24,
    right: 24,
    height: 100, // Explicit height to accommodate shutter button
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  smallAction: {
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 12,
    borderRadius: 999,
    marginRight: 20,
  },
  shutterButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    left: (width - 84 - 48) / 2, // Center horizontally
    bottom: 8, // Position within bottomBar to ensure full visibility
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },

  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  previewImage: {
    width: width * 0.9,
    height: height * 0.64,
    resizeMode: "contain",
    borderRadius: 12,
  },
  previewControls: { flexDirection: "row", marginTop: 16 },
  previewBtn: {
    marginHorizontal: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  previewBtnText: { fontWeight: "700" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  grantButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#007AFF",
    borderRadius: 5,
  },
  grantButtonText: { color: "#fff", fontWeight: "bold" },
});