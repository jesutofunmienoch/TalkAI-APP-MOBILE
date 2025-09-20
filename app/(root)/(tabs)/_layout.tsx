import { Tabs } from "expo-router";
import { Image, Platform, View, TouchableOpacity, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { icons } from "@/constants";
import { router } from "expo-router";

// Define type for iconsMap to fix index signature error
interface IconsMap {
  [key: string]: any; // Replace 'any' with a more specific type if you have icon types
  home: any;
  notes: any;
  upload: any;
  profile: any;
  chat: any;
}

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: Platform.OS === "ios" ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.9)",
          borderTopWidth: 0,
          borderRadius: 20,
          marginHorizontal: 16,
          marginBottom: 16,
          height: 70,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 10,
          overflow: "hidden",
          justifyContent: "center",
          alignItems: "center",
          ...(Platform.OS === "web" ? {
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          } : {}),
        },
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          marginTop: 2,
        },
      }}
      tabBar={({ state, descriptors, navigation }) => {
        const iconsMap: IconsMap = {
          home: icons.home,
          notes: icons.list,
          upload: icons.plus,
          profile: icons.profile,
          chat: icons.chat,
        };

        return (
          <View
            style={{
              flexDirection: "row",
              backgroundColor: Platform.OS === "ios" ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.9)",
              borderRadius: 20,
              marginHorizontal: 16,
              marginBottom: 16,
              height: 70,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 10,
              overflow: "hidden",
              justifyContent: "space-around",
              alignItems: "center",
              ...(Platform.OS === "web" ? {
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              } : {}),
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
                  navigation.navigate(route.name);
                }
              };

              if (route.name === "upload") {
                return (
                  <TouchableOpacity
                    key={route.key}
                    onPress={() => router.push("/(root)/(tabs)/upload")}
                    style={{
                      justifyContent: "center",
                      alignItems: "center",
                      width: 60,
                      height: 60,
                      marginHorizontal: 8,
                    }}
                  >
                   <LinearGradient
  colors={["#EF4444", "#EC4899", "#8B5CF6", "#3B82F6"]} // red → pink → purple → blue
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={{
    borderRadius: 30,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
  }}
>
                      <View
                        style={{
                          backgroundColor: "white",
                          borderRadius: 27,
                          width: 54,
                          height: 38,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Image
                          source={iconsMap[route.name]}
                          style={{
                            width: 30,
                            height: 30,
                            tintColor: "#2563EB",
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
                    paddingVertical: 4,
                  }}
                >
                  <Image
                    source={iconsMap[route.name]}
                    style={{
                      width: 24,
                      height: 24,
                      tintColor: isFocused ? "#2563EB" : "#9CA3AF",
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      marginTop: 2,
                      color: isFocused ? "#2563EB" : "#9CA3AF",
                    }}
                  >
                    {options.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="notes" options={{ title: "Notes" }} />
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