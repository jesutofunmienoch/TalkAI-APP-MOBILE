// app/(root)/menu.tsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import { Stack } from "expo-router";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ListRenderItemInfo,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Conversation = {
  id: string;
  title: string;
  date: string;
};

const SearchBar: React.FC<{
  value: string;
  onChange: (v: string) => void;
}> = ({ value, onChange }) => {
  return (
    <View className="flex-row items-center bg-gray-100 rounded-full px-3 py-2">
      <Feather name="search" size={18} color="#6B7280" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search Grok History"
        placeholderTextColor="#9CA3AF"
        className="flex-1 ml-3 text-sm"
      />
      <TouchableOpacity className="ml-2">
        <Feather name="chevron-right" size={20} color="#374151" />
      </TouchableOpacity>
    </View>
  );
};

export default function GrokHistoryScreen() {
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [renameText, setRenameText] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const menuRef = useRef<View>(null);

  useEffect(() => {
    const load = async () => {
      const listStr = await AsyncStorage.getItem('conv_list');
      if (listStr) {
        setConversations(JSON.parse(listStr));
      }
    };
    load();
  }, []);

  const uniqueConversations = useMemo(() => {
    return conversations.filter(
      (conv, index, self) =>
        index === self.findIndex((t) => t.id === conv.id)
    );
  }, [conversations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return uniqueConversations;
    return uniqueConversations.filter((s) => s.title.toLowerCase().includes(q));
  }, [query, uniqueConversations]);

  const handleMenuPress = (event: any, item: Conversation) => {
    const { pageX, pageY } = event.nativeEvent;
    setSelectedConversation(item);
    setMenuPosition({ x: pageX - 140, y: pageY - 120 });
    setMenuVisible(true);
    setRenameText(item.title);
  };

  const handleRename = () => {
    if (selectedConversation) {
      setIsRenaming(true);
    }
  };

  const handleRenameSubmit = async () => {
    if (selectedConversation && renameText.trim()) {
      const updated = conversations.map((conv) =>
        conv.id === selectedConversation.id
          ? { ...conv, title: renameText.trim() }
          : conv
      );
      setConversations(updated);
      await AsyncStorage.setItem('conv_list', JSON.stringify(updated));
      setIsRenaming(false);
      setMenuVisible(false);
    }
  };

  const handleDelete = async () => {
    if (selectedConversation) {
      const updated = conversations.filter((conv) => conv.id !== selectedConversation.id);
      setConversations(updated);
      await AsyncStorage.setItem('conv_list', JSON.stringify(updated));
      await AsyncStorage.removeItem(`conv_${selectedConversation.id}`);
      setMenuVisible(false);
    }
  };

  const handleOutsidePress = () => {
    setMenuVisible(false);
    setIsRenaming(false);
  };

  const renderItem = ({ item, index }: ListRenderItemInfo<Conversation>) => (
    <TouchableOpacity
      activeOpacity={0.7}
      className="flex-row items-start justify-between py-4 border-b border-gray-100"
      onPress={() => {
        setIsLoading(true);
        router.push({ pathname: "/(root)/(tabs)/chat", params: { conversationId: item.id } });
      }}
    >
      <View className="flex-1 pr-4">
        <Text
          className="text-base text-black font-normal"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.title}
        </Text>
        <Text className="text-sm text-gray-500 mt-1">{item.date}</Text>
      </View>

      <TouchableOpacity
        className="p-2"
        onPress={(e) => handleMenuPress(e, item)}
      >
        <Feather name="more-vertical" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white px-5 pt-10 pb-6">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center pt-10 justify-between">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Feather name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-center flex-1">Menu</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View className="mt-6">
        <SearchBar value={query} onChange={setQuery} />
      </View>

      {/* Tasks */}
      <TouchableOpacity
        activeOpacity={0.8}
        className="flex-row items-center mt-2 py-1"
      >
        <View
          className="w-12 h-12 items-center justify-center mr-3 bg-green-50"
          style={{ borderRadius: 24 }}
        >
          <Feather name="clock" size={20} color="#16A34A" />
        </View>
        <Text className="text-xl font-medium">Tasks</Text>
      </TouchableOpacity>

      {/* Conversations */}
      <Text className="text-base text-gray-500 mt-2 mb-2">CONVERSATIONS</Text>
      <FlatList
        data={filtered}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Context Menu */}
      {menuVisible && !isRenaming && (
        <View
          ref={menuRef}
          style={[
            styles.menuContainer,
            { top: menuPosition.y, left: menuPosition.x },
          ]}
        >
          <View className="bg-white rounded-xl shadow-lg w-40 p-2">
            <TouchableOpacity
              onPress={handleRename}
              className="px-4 py-3 border-b border-gray-100"
            >
              <Text className="text-base font-medium text-gray-800">Rename</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              className="px-4 py-3"
            >
              <Text className="text-base font-medium text-red-600">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Rename Overlay */}
      {isRenaming && (
        <View style={styles.renameOverlay}>
          <View className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <Text className="text-lg font-semibold text-gray-800 mb-4">
              Rename Conversation
            </Text>
            <TextInput
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Enter new title"
              placeholderTextColor="#9CA3AF"
              className="border border-gray-300 rounded-lg px-4 py-3 text-base mb-4"
              autoFocus
            />
            <View className="flex-row justify-end space-x-3">
              <TouchableOpacity
                onPress={() => setIsRenaming(false)}
                className="px-4 py-2 rounded-lg bg-gray-100"
              >
                <Text className="text-base text-gray-600 font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRenameSubmit}
                className="px-4 py-2 ml-2 rounded-lg bg-green-600"
              >
                <Text className="text-base text-white font-medium">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Bottom user row */}
      <View className="border-t border-gray-200 pt-4 flex-row items-center">
        <Image
          source={{
            uri:
              user?.imageUrl || "https://i.pravatar.cc/150?u=enochagram",
          }}
          className="w-12 h-12 rounded-full"
        />
        <View className="ml-3 flex-1">
          <Text className="text-base font-medium">
            {user?.username ||
              user?.firstName ||
              user?.fullName ||
              "enochagram"}
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            {user?.primaryEmailAddress?.emailAddress || "email@example.com"}
          </Text>
        </View>
        <TouchableOpacity
          className="p-2"
          onPress={() => {
            setIsLoading(true);
            router.push("/(root)/(tabs)/profile");
          }}
        >
          <Feather name="settings" size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Overlay for outside clicks */}
      {(menuVisible || isRenaming) && (
        <TouchableWithoutFeedback onPress={handleOutsidePress}>
          <View style={styles.fullScreenOverlay} />
        </TouchableWithoutFeedback>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  lottie: {
    width: 200,
    height: 200,
  },
  menuContainer: {
    position: "absolute",
    zIndex: 1000,
  },
  renameOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 2000,
  },
  fullScreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 500, 
  },
});