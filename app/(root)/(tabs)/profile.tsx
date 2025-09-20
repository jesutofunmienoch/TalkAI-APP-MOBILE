import { useUser } from "@clerk/clerk-expo";
import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect } from "react";

import InputField from "@/components/InputField";

const Profile = () => {
  const { user, isLoaded } = useUser();

  // Debug user data
  useEffect(() => {
    if (isLoaded && user) {
      console.log("Profile user data:", JSON.stringify(user, null, 2));
    }
  }, [isLoaded, user]);

  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1">
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600">Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || "User";

  return (
    <SafeAreaView className="flex-1">
      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <Text className="text-2xl font-JakartaBold my-5">My Profile</Text>

        <View className="flex items-center justify-center my-5">
          <Image
            source={{
              uri: user?.externalAccounts[0]?.imageUrl ?? user?.imageUrl ?? "https://via.placeholder.com/110",
            }}
            style={{ width: 110, height: 110, borderRadius: 55 }}
            className="rounded-full h-[110px] w-[110px] border-[3px] border-white shadow-sm shadow-neutral-300"
          />
          <Text className="text-lg font-JakartaSemiBold mt-3">{displayName}</Text>
        </View>

        <View className="flex flex-col items-start justify-center bg-white rounded-lg shadow-sm shadow-neutral-300 px-5 py-3">
          <View className="flex flex-col items-start justify-start w-full">
            <InputField
              label="First Name"
              placeholder={user?.firstName || "Enter first name"}
              containerStyle="w-full"
              inputStyle="p-3.5"
              editable={false}
            />
            <InputField
              label="Last Name"
              placeholder={user?.lastName || "Enter last name"}
              containerStyle="w-full"
              inputStyle="p-3.5"
              editable={false}
            />
            <InputField
              label="Email"
              placeholder={user?.primaryEmailAddress?.emailAddress || "Enter email"}
              containerStyle="w-full"
              inputStyle="p-3.5"
              editable={false}
            />
            <InputField
              label="Phone"
              placeholder={user?.primaryPhoneNumber?.phoneNumber || "Enter phone number"}
              containerStyle="w-full"
              inputStyle="p-3.5"
              editable={false}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;