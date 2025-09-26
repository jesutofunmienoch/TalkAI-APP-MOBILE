import React, { useEffect, useRef } from "react";
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type IconName =
  | "sparkles-outline"
  | "create-outline"
  | "document-text-outline"
  | "settings-outline";

const NAV_ITEMS = [
  { label: "ASKAI", route: "askai", icon: "sparkles-outline" as IconName },
  { label: "Note", route: "note", icon: "create-outline" as IconName },
  { label: "Summary", route: "summary", icon: "document-text-outline" as IconName },
  { label: "Settings", route: "settings", icon: "settings-outline" as IconName },
];

interface DocNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const DocNav: React.FC<DocNavProps> = ({ activeTab, setActiveTab }) => {
  const scrollBarOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fadeOut = Animated.timing(scrollBarOpacity, {
      toValue: 0,
      duration: 1000,
      delay: 3000,
      useNativeDriver: true,
    });
    fadeOut.start();
    return () => fadeOut.stop();
  }, [scrollBarOpacity]);

  const handleScroll = () => {
    scrollBarOpacity.setValue(1);
    Animated.timing(scrollBarOpacity, {
      toValue: 0,
      duration: 1000,
      delay: 3000,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.navContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.route;
          const isAskAI = item.route === "askai";

          return (
            <TouchableOpacity
              key={item.route}
              style={styles.navItem}
              onPress={() => setActiveTab(item.route)}
              activeOpacity={0.8}
            >
              {isAskAI ? (
                <LinearGradient
                  colors={
                    isActive
                      ? ["#60a5fa", "#a5b4fc", "#f0abfc"] // soft blue → purple → pink (AskAI theme)
                      : ["#f1f5f9", "#f8fafc"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.gradientNav,
                    { borderWidth: isActive ? 0 : 1, borderColor: "#e5e7eb" },
                  ]}
                >
                  <View style={styles.navContent}>
                    <Ionicons
                      name={item.icon}
                      size={14}
                      color={isActive ? "#fff" : "#111827"}
                      style={styles.icon}
                    />
                    <Text style={[styles.navText, isActive && styles.navTextActive]}>
                      {item.label}
                    </Text>
                  </View>
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.gradientNav,
                    {
                      backgroundColor: isActive ? "#111827" : "#f1f5f9",
                      borderWidth: isActive ? 0 : 1,
                      borderColor: "#e5e7eb",
                    },
                  ]}
                >
                  <View style={styles.navContent}>
                    <Ionicons
                      name={item.icon}
                      size={14}
                      color={isActive ? "#fff" : "#111827"}
                      style={styles.icon}
                    />
                    <Text style={[styles.navText, isActive && styles.navTextActive]}>
                      {item.label}
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Sleek animated scrollbar */}
        <Animated.View
          style={[
            styles.scrollBar,
            {
              opacity: scrollBarOpacity,
            },
          ]}
        />
      </ScrollView>
    </View>
  );
};

export default DocNav;

const styles = StyleSheet.create({
  navContainer: {
    marginTop: 16,
    flexDirection: "row",
    position: "relative",
  },
  scrollView: {
    flexGrow: 0,
  },
  navItem: {
    marginRight: 8,
    borderRadius: 14,
  },
  gradientNav: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  navContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  navText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  navTextActive: {
    color: "#fff",
  },
  icon: {
    marginRight: 6,
  },
  scrollBar: {
    position: "absolute",
    bottom: -6,
    height: 3,
    width: "22%",
    backgroundColor: "#60a5fa", // changed to match AskAI gradient (blue accent)
    borderRadius: 2,
    ...Platform.select({
      web: {
        scrollbarWidth: "thin",
        scrollbarColor: "#60a5fa transparent",
      },
    }),
  },
});
