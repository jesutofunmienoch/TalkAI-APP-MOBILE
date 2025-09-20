import React from "react";
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { icons } from "@/constants";

const Upload = () => {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");

  const handleUpload = () => {
    if (title.trim() && description.trim()) {
      alert(`Uploading: ${title} - ${description}`);
    } else {
      alert("Please fill in all fields");
    }
  };

  return (
    <SafeAreaView className="bg-[#f8fafc] flex-1">
      <ScrollView className="flex-1">
        <View className="mx-5 mt-8 mb-8">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <TouchableOpacity
              onPress={() => router.push("/(root)/(tabs)/home")}
              className="w-12 h-12 rounded-full bg-white shadow-md justify-center items-center"
            >
              <Image source={icons.out} className="w-5 h-5" />
            </TouchableOpacity>
            <Text className="text-3xl font-bold text-gray-900">
              Share a Ride
            </Text>
            <View className="w-12 h-12" /> {/* Placeholder for alignment */}
          </View>

          {/* Form Card */}
          <View className="bg-white rounded-xl shadow-md p-6 mb-6">
            <Text className="text-xl font-semibold text-gray-900 mb-4">
              Ride Details
            </Text>
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Title</Text>
              <TextInput
                placeholder="e.g., Ride to Downtown"
                value={title}
                onChangeText={setTitle}
                className="bg-[#f8fafc] rounded-lg px-4 py-3 text-base text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Description</Text>
              <TextInput
                placeholder="e.g., Looking for a ride to the city center..."
                value={description}
                onChangeText={setDescription}
                className="bg-[#f8fafc] rounded-lg px-4 py-3 text-base text-gray-900"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
              />
            </View>
            <TouchableOpacity
              onPress={() => alert("Media upload feature coming soon!")}
              className="bg-blue-100 rounded-lg p-4 flex-row items-center justify-center"
            >
              <Image source={icons.upload} className="w-5 h-5 mr-2" />
              <Text className="text-blue-600 font-semibold">
                Upload Media
              </Text>
            </TouchableOpacity>
          </View>

          {/* Upload Button */}
          <TouchableOpacity
            onPress={handleUpload}
            className="w-2/3 mx-auto"
          >
            <LinearGradient
              colors={["#2563EB", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="rounded-full p-4"
            >
              <Text className="text-white text-lg font-semibold text-center">
                Upload Ride
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Upload;