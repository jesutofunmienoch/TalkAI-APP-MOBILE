import { Tabs } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Image, Platform, View, TouchableOpacity, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { icons } from "@/constants";
import { router } from "expo-router";
import { useContext } from "react";
import { DocumentContext, DocItem } from "@/context/DocumentContext";
import { useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";

interface IconsMap {
  [key: string]: any;
  home: any;
  askai: any;
  upload: any;
  profile: any;
  chat: any;
}

export default function Layout() {
  const { documents, setDocuments } = useContext(DocumentContext)!;
  const { user } = useUser();

  const saveDocs = async (docs: DocItem[]) => {
    if (!user?.id) return;
    const key = `documents_${user.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(docs));
  };

  const handleUpload = () =>
    uploadDocument(
      user,
      documents,
      setDocuments,
      (errorMsg) =>
        router.navigate({
          pathname: "/(root)/(tabs)/upload",
          params: { errorMsg },
        }),
      saveDocs
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props: BottomTabBarProps) => {
        const { state, descriptors, navigation } = props;
        if (state.index === 1 || state.index === 4) {
          return null;
        }

        const iconsMap: IconsMap = {
          home: icons.home,
          askai: icons.list,
          upload: icons.plus,
          profile: icons.profile,
          chat: icons.chat,
        };

        return (
          <View
            style={{
              flexDirection: "row",
              backgroundColor:
                Platform.OS === "ios"
                  ? "rgba(255,255,255,0.3)"
                  : "rgba(255,255,255,0.9)",
              height: 70,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 6,
              overflow: "hidden",
              marginHorizontal: 0,
              marginBottom: 0,
              borderRadius: 0,
              ...(Platform.OS === "web"
                ? {
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                  }
                : {}),
            }}
          >
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;

              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  if (route.name === "upload") {
                    handleUpload();
                  } else {
                    navigation.navigate(route.name);
                  }
                }
              };

              if (route.name === "upload") {
                return (
                  <TouchableOpacity
                    key={route.key}
                    onPress={handleUpload}
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <LinearGradient
                      colors={["#EF4444", "#EC4899", "#8B5CF6", "#3B82F6"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        borderRadius: 50,
                        padding: 2,
                        width: 58,
                        height: 58,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: "white",
                          borderRadius: 50,
                          width: 52,
                          height: 52,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Image
                          source={iconsMap[route.name]}
                          style={{
                            width: 28,
                            height: 28,
                            tintColor: "#3B82F6",
                          }}
                        />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={onPress}
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  activeOpacity={0.8}
                >
                  {isFocused ? (
                    <View
                      style={{
                        backgroundColor: "#111827",
                        borderRadius: 10,
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        width: "90%",
                      }}
                    >
                      <Image
                        source={iconsMap[route.name]}
                        style={{
                          width: 22,
                          height: 22,
                          tintColor: "#fff",
                          marginBottom: 2,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: "#fff",
                        }}
                      >
                        {options.title}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Image
                        source={iconsMap[route.name]}
                        style={{
                          width: 22,
                          height: 22,
                          tintColor: "#9CA3AF",
                          marginBottom: 2,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "500",
                          color: "#9CA3AF",
                        }}
                      >
                        {options.title}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        );
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="askai" options={{ title: "AskAI" }} />
      <Tabs.Screen
        name="upload"
        options={{
          title: "Upload",
          tabBarLabel: "",
        }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="chat" options={{ title: "ChatBot" }} />
    </Tabs>
  );
}

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