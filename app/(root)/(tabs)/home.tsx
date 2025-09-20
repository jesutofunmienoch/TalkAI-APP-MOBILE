import { useUser, useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { Text, View, TouchableOpacity, Image, TextInput, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { icons } from "@/constants";

const Home = () => {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Debug user data
  useEffect(() => {
    if (isLoaded && user) {
      console.log("User data:", JSON.stringify(user, null, 2));
    }
  }, [isLoaded, user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch (err) {
      console.error("Sign out error:", err);
      alert("Error signing out. Please try again.");
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      alert(`Searching for: ${searchQuery}`);
    } else {
      alert("Please enter a destination");
    }
  };

  if (!isLoaded) {
    return (
      <SafeAreaView className="bg-[#f8fafc] flex-1">
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600">Loading user data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Function to capitalize the first letter
  const capitalizeFirstLetter = (string: string) => {
    if (!string) return "";
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  // Only use firstName if available, capitalized; fallback to "User"
  // Note: If it's showing "User", check the console log for user.firstName. It might be null if not set in Clerk. Enable first/last name in Clerk dashboard under User & Authentication > User attributes.
  const displayName = user?.firstName ? capitalizeFirstLetter(user.firstName) : "User";

  return (
    <SafeAreaView className="bg-[#f8fafc] flex-1">
      <ScrollView className="flex-1">
        <View className="mx-5 mt-8">
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-3xl font-bold text-gray-900">
                Welcome, {displayName} 👋
              </Text>
              <Text className="text-base text-gray-600">
                Ready to explore today?
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSignOut}
              className="w-12 h-12 mb-4 rounded-lg bg-white shadow-md justify-center items-center"
            >
              <Image source={icons.out} className="w-5 h-5" />
            </TouchableOpacity>
          </View>

          <View className="mb-8">
            <View className="bg-white rounded-full shadow-md px-4 py-3 flex-row items-center">
              <Image source={icons.search} className="w-5 h-5 mr-3" />
              <TextInput
                placeholder="Enter your destination"
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 text-base"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <TouchableOpacity
              onPress={handleSearch}
              className="bg-blue-600 px-6 py-3 rounded-full mt-4 mx-auto w-2/3"
            >
              <Text className="text-white text-lg font-semibold text-center">
                Find Ride
              </Text>
            </TouchableOpacity>
          </View>

          <View className="mb-8">
            <Text className="text-2xl font-bold text-gray-900 mb-4">
              Suggested Destinations
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row"
            >
              {[
                { name: "Downtown", icon: icons.map },
                { name: "Airport", icon: icons.map },
                { name: "Beachfront", icon: icons.map },
              ].map((destination, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => alert(`Selected: ${destination.name}`)}
                  className="bg-white rounded-xl shadow-md p-4 mr-4 w-40"
                >
                  <View className="items-center">
                    <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mb-3">
                      <Image source={destination.icon} className="w-6 h-6" />
                    </View>
                    <Text className="text-gray-800 font-medium text-center">
                      {destination.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View className="mb-8">
            <Text className="text-2xl font-bold text-gray-900 mb-4">
              Why Choose Us?
            </Text>
            <View className="bg-white rounded-xl shadow-md p-6">
              <Text className="text-gray-600 text-base leading-6 mb-4">
                Enjoy fast, reliable rides with our trusted drivers. Book in seconds and track your journey in real-time.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(root)/(tabs)/profile")}
                className="bg-blue-100 px-4 py-2 rounded-full w-1/2 mx-auto"
              >
                <Text className="text-blue-600 text-base font-semibold text-center">
                  Learn More
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Home;