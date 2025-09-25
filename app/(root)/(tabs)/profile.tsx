// app/(root)/(tabs)/profile.tsx
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { Link, router } from "expo-router";

type AppRoute =
  | "/data-controls"
  | "/shared-links"
  | "/recently-deleted"
  | "/terms"
  | "/privacy"
  | "/report";

export default function ProfileSettingsScreen() {
  const { user, isLoaded } = useUser();
  const [hapticsPress, setHapticsPress] = useState(true);
  const [hapticsResponding, setHapticsResponding] = useState(false);
  const [appearance, setAppearance] = useState<"system" | "foryou" | "dark" | "light">("light");

  useEffect(() => {
    if (isLoaded && user) console.log("profile user:", user);
  }, [isLoaded, user]);

  const displayName =
    user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "enochagram";

  const avatarUri =
    user?.externalAccounts?.[0]?.imageUrl ?? user?.imageUrl ?? "https://i.pravatar.cc/150?u=enochagram";

  const ListRow: React.FC<{ icon: React.ReactNode; label: string; href?: AppRoute; onPress?: () => void; destructive?: boolean }> = ({
    icon,
    label,
    href,
    onPress,
    destructive,
  }) => {
    const content = (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75} className="flex-row items-center justify-between py-4">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: "rgba(0,0,0,0.03)" }}>
            {icon}
          </View>
          <Text style={[styles.rowLabel, destructive ? { color: "#EF4444" } : undefined]}>{label}</Text>
        </View>
        <Feather name="chevron-right" size={20} color={destructive ? "#EF4444" : "#9CA3AF"} />
      </TouchableOpacity>
    );

    return href ? (
      <Link href={href} asChild>
        {content}
      </Link>
    ) : (
      content
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View className="flex-row items-center px-5 pt-4 pb-2" style={{ alignItems: "center" }}>
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Feather name="x" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-bold flex-1 text-center">Profile</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View className="items-center" style={{ marginTop: 6, marginBottom: 18 }}>
          <View style={{ width: 110, height: 110 }}>
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          </View>
          <Text className="text-base font-semibold mt-3">{displayName}</Text>
          <Text className="text-sm text-gray-400 mt-1">{user?.primaryEmailAddress?.emailAddress ?? "usermail@gmail.com"}</Text>
        </View>

        <Text style={styles.sectionTitle}>Subscription</Text>
        <TouchableOpacity activeOpacity={0.85} style={styles.subscriptionCard}>
          <View style={styles.subIconWrap}>
            <LinearGradient
              colors={["#34D399", "#10B981"]} // Gradient colors for the badge
              style={styles.gradientBadge}
            >
              <Feather name="zap" size={20} color="#FFFFFF" />
              <Text style={styles.proBadgeText}>Pro</Text>
            </LinearGradient>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.subTitle}>Upgrade Your Plan</Text>
            <Text style={styles.subSubtitle}>Unlock advanced features</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Appearance</Text>
        <View className="flex-row justify-between mt-3" style={{ gap: 12 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.apTile, appearance === "system" ? styles.apTileSelected : undefined]}
            onPress={() => setAppearance("system")}
          >
            <Feather name="sliders" size={20} color="#374151" />
            <Text style={styles.apLabel}>Token</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.apTile, appearance === "foryou" ? styles.apTileSelected : undefined]}
            onPress={() => setAppearance("foryou")}
          >
            <Feather name="heart" size={20} color="#374151" />
            <Text style={styles.apLabel}>Munites</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.apTile, appearance === "dark" ? styles.apTileSelected : undefined]}
            onPress={() => setAppearance("dark")}
          >
            <Feather name="moon" size={20} color="#374151" />
            <Text style={styles.apLabel}>Files</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.apTile, appearance === "light" ? styles.apTileSelected : undefined]}
            onPress={() => setAppearance("light")}
          >
            <Feather name="sun" size={20} color="#374151" />
            <Text style={styles.apLabel}>Plan</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Haptics & Vibration</Text>
        <View style={{ marginTop: 6 }}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.rowIconWrap}>
                <Feather name="smartphone" size={18} color="#6B7280" />
              </View>
              <Text style={styles.rowLabel}>When pressing buttons</Text>
            </View>
            <Switch
              value={hapticsPress}
              onValueChange={setHapticsPress}
              trackColor={{ false: "#E5E7EB", true: "#111827" }}
              thumbColor={hapticsPress ? "#ffffff" : "#ffffff"}
            />
          </View>
          <View style={[styles.rowBetween, { marginTop: 12 }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.rowIconWrap}>
                <Feather name="speaker" size={18} color="#6B7280" />
              </View>
              <Text style={styles.rowLabel}>When Grok is responding</Text>
            </View>
            <Switch
              value={hapticsResponding}
              onValueChange={setHapticsResponding}
              trackColor={{ false: "#E5E7EB", true: "#111827" }}
              thumbColor={hapticsResponding ? "#ffffff" : "#ffffff"}
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Data & Information</Text>
        <View style={{ marginTop: 8 }}>
          <ListRow icon={<Feather name="database" size={18} color="#374151" />} label="Data Controls" href="/data-controls" />
          <ListRow icon={<Feather name="link" size={18} color="#374151" />} label="Shared Links" href="/shared-links" />
          <ListRow icon={<Feather name="trash-2" size={18} color="#374151" />} label="Recently Deleted" href="/recently-deleted" />
          <ListRow icon={<Feather name="file-text" size={18} color="#374151" />} label="Terms of Use" href="/terms" />
          <ListRow icon={<Feather name="lock" size={18} color="#374151" />} label="Privacy Policy" href="/privacy" />
          <ListRow icon={<Feather name="message-square" size={18} color="#374151" />} label="Report Issue" href="/report" />
          <View style={{ height: 8 }} />
          <ListRow
            icon={<Feather name="log-out" size={18} color="#EF4444" />}
            label="Log out"
            onPress={() => console.log("logout tapped")}
            destructive
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignSelf: "center",
  },
  sectionTitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 8,
    fontWeight: "600",
  },
  subscriptionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  subIconWrap: {
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  gradientBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  proBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  subSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  apTile: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  apTileSelected: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E9EE",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  apLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#374151",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.03)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    color: "#0F172A",
  },
});