import { SafeAreaView, Text, View, TouchableOpacity } from "react-native";
import { Feather } from '@expo/vector-icons';
import { router } from "expo-router";

const Menu = () => {
  return (
    <SafeAreaView className="flex-1 bg-white p-5">
      
      {/* Add menu items here */}
      <View className="flex-1 justify-center items-center">
        <Text>Menu Items Go Here</Text>
      </View>
    </SafeAreaView>
  );
};

export default Menu;