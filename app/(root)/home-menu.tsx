import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DocumentContext } from "@/context/DocumentContext";
import { Alert } from "react-native";

interface MenuItem {
  icon: string;
  label: string;
  destructive?: boolean;
  onPress?: () => void;
  iconSet?: 'feather' | 'fontawesome5';
  brand?: boolean;
}

export default function HomeMenu(): React.JSX.Element {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { setDocuments } = React.useContext(DocumentContext)!;

  const handleSignOut = async () => {
    try {
      await signOut();
      if (user?.id) {
        await AsyncStorage.removeItem(`documents_${user.id}`);
      }
      setDocuments([]);
      router.replace("/(auth)/sign-in");
    } catch (error: any) {
      console.error("Sign out error:", error);
      Alert.alert("Error", "Error signing out. Please try again.");
    }
  };

  const firstItems: MenuItem[] = [
    { icon: "help-circle", label: "FAQ" },
    { icon: "sun", label: "Earn free questions" },
    { icon: "zap", label: "Humanize AI", onPress: () => router.push("/humanize") },
    { icon: "file-text", label: "Terms of Use", onPress: () => router.push("/terms") },
    { icon: "lock", label: "Privacy Policy", onPress: () => router.push("/privacy") },
  ];

  const communityItems: MenuItem[] = [
    { icon: "star", label: "Rate App on the Play Store" },
    { icon: "discord", label: "Join Discord", iconSet: "fontawesome5", brand: true },
    { icon: "tiktok", label: "Follow on TikTok", iconSet: "fontawesome5", brand: true },
    { icon: "instagram", label: "Follow on Instagram" },
  ];

  const aboutItems: MenuItem[] = [
    { icon: "headphones", label: "Contact Us" },
    { icon: "edit-2", label: "Give feedback" },
    { icon: "log-out", label: "Logout", destructive: true, onPress: handleSignOut },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.headerWrap}>
        <TouchableOpacity
          style={styles.closeBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Feather name="x" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {firstItems.map((it, idx) => (
            <RowItem
              key={it.label}
              icon={it.icon}
              label={it.label}
              onPress={it.onPress}
              showDivider={idx < firstItems.length - 1}
              iconSet={it.iconSet}
              brand={it.brand}
            />
          ))}
        </View>
        <Text style={styles.sectionTitle}>Community</Text>
        <View style={styles.card}>
          {communityItems.map((it, idx) => (
            <RowItem
              key={it.label}
              icon={it.icon}
              label={it.label}
              showDivider={idx < communityItems.length - 1}
              iconSet={it.iconSet}
              brand={it.brand}
            />
          ))}
        </View>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          {aboutItems.map((it, idx) => (
            <RowItem
              key={it.label}
              icon={it.icon}
              label={it.label}
              onPress={it.onPress}
              destructive={it.destructive}
              showDivider={idx < aboutItems.length - 1}
              iconSet={it.iconSet}
              brand={it.brand}
            />
          ))}
        </View>
        <Text style={styles.versionText}>App Version 2.1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

interface RowItemProps {
  icon: string;
  label: string;
  onPress?: () => void;
  destructive?: boolean;
  showDivider?: boolean;
  iconSet?: 'feather' | 'fontawesome5';
  brand?: boolean;
}

function RowItem({
  icon,
  label,
  onPress,
  destructive,
  showDivider = true,
  iconSet = 'feather',
  brand,
}: RowItemProps) {
  const IconComponent = iconSet === 'fontawesome5' ? FontAwesome5 : Feather;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.row, !showDivider ? { borderBottomWidth: 0 } : undefined]}
      disabled={!onPress} // Disable touchable if no onPress handler
    >
      <View style={styles.rowLeft}>
        <View
          style={[
            styles.iconWrap,
            destructive ? { backgroundColor: "rgba(239,68,68,0.08)" } : undefined,
          ]}
        >
          <IconComponent
            name={icon as any}
            size={18}
            color={destructive ? "#EF4444" : "#111827"}
            {...(iconSet === 'fontawesome5' && brand ? { brand: true } : {})}
          />
        </View>
        <Text style={[styles.rowLabel, destructive ? { color: "#EF4444" } : undefined]}>
          {label}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color={destructive ? "#EF4444" : "#9CA3AF"} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingTop: Platform.OS === "android" ? 24 : 12, // Increased top padding
  },
  headerWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 25,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 6,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    color: "#111827",
  },
  sectionTitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 8,
  },
  versionText: {
    textAlign: "center",
    color: "#9CA3AF",
    marginTop: 6,
    fontSize: 13,
  },
});