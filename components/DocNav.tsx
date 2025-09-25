import React, { useEffect, useRef } from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet, View, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Define a type for the valid Ionicons names used in this component
type IconName = "sparkles-outline" | "create-outline" | "document-text-outline" | "settings-outline";

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
    // Fade out the scrollbar after 3 seconds
    const fadeOut = Animated.timing(scrollBarOpacity, {
      toValue: 0,
      duration: 1000,
      delay: 3000, // Show for 3 seconds
      useNativeDriver: true,
    });

    fadeOut.start();

    return () => fadeOut.stop(); // Cleanup on unmount
  }, [scrollBarOpacity]);

  // Reset opacity to 1 on scroll to show scrollbar briefly during interaction
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
        showsHorizontalScrollIndicator={true}
        onScroll={handleScroll}
        scrollEventThrottle={16} // Optimize scroll event handling
        scrollIndicatorInsets={{ bottom: 0, top: 0, left: 0, right: 0 }}
        style={styles.scrollView}
      >
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={[
              styles.navItem,
              item.route === "askai" && styles.askaiNavItem,
            ]}
            onPress={() => setActiveTab(item.route)}
          >
            {item.route === "askai" ? (
              <LinearGradient
                colors={activeTab === "askai" ? ["#22c55e", "#4ade80"] : ["#d1fae5", "#ecfdf5"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientNav}
              >
                <View style={styles.navContent}>
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={activeTab === item.route ? "#fff" : "#111827"}
                    style={styles.icon}
                  />
                  <Text
                    style={[
                      styles.navText,
                      activeTab === item.route && styles.navTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
              </LinearGradient>
            ) : (
              <View
                style={[
                  styles.gradientNav,
                  activeTab === item.route ? styles.navItemActive : styles.navItemInactive,
                ]}
              >
                <View style={styles.navContent}>
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={activeTab === item.route ? "#fff" : "#111827"}
                    style={styles.icon}
                  />
                  <Text
                    style={[
                      styles.navText,
                      activeTab === item.route && styles.navTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        ))}
        {/* Custom scrollbar */}
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
    marginTop: 20,
    flexDirection: "row",
    position: "relative",
  },
  scrollView: {
    flexGrow: 0, // Prevent ScrollView from expanding unnecessarily
  },
  navItem: {
    marginRight: 10,
    borderRadius: 18,
  },
  askaiNavItem: {
    backgroundColor: "transparent",
  },
  gradientNav: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  navItemActive: {
    backgroundColor: "#15803d",
  },
  navItemInactive: {
    backgroundColor: "#ecfdf5",
  },
  navText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  navTextActive: {
    color: "#fff",
  },
  icon: {
    marginRight: 8,
  },
  scrollBar: {
    position: "absolute",
    bottom: -4, // Position below the ScrollView
    height: 3, // Tiny scrollbar
    width: "20%", // Short width to indicate scrollability
    backgroundColor: "#22c55e", // Green to match theme
    borderRadius: 2,
    ...Platform.select({
      web: {
        scrollbarWidth: "thin",
        scrollbarColor: "#22c55e transparent",
      },
    }),
  },
});