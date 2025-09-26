import React, { useLayoutEffect } from "react";
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "expo-router";

export default function DataControlsScreen() {
  const navigation = useNavigation();

  // Remove the default navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View className="flex-row items-center px-5 pt-4 pb-2" style={{ alignItems: "center" }}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1">
          <Feather name="x" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-bold flex-1 text-center">Data Controls</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Manage Your Data</Text>
        <Text style={styles.description}>
          Here you can manage your account data, including clearing cache, exporting data, or deleting your account.
        </Text>
        {/* Add more UI elements like buttons or lists as needed */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBF8F6",
    paddingTop: 40,
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