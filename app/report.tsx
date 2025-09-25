import React from "react";
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

export default function ReportScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View className="flex-row items-center px-5 pt-4 pb-2" style={{ alignItems: "center" }}>
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Feather name="x" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-bold flex-1 text-center">Report Issue</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Report an Issue</Text>
        <Text style={styles.description}>
          Let us know about any issues or feedback you have about the app.
        </Text>
        {/* Add a form or input fields for reporting issues */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBF8F6",
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 8,
    fontWeight: "600",
  },
  description: {
    fontSize: 16,
    color: "#0F172A",
  },
});