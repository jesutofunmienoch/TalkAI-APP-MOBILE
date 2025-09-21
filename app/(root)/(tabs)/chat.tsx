import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, Share, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from '@expo/vector-icons';
import { router } from "expo-router";
import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';

import { images } from "@/constants";

const UserMessage = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View className="items-end  mt-2">
      <View className="bg-gray-100 rounded-l-3xl rounded-tr-3xl p-3 max-w-[80%] shadow-sm">
        <Text className="text-base text-black">{text}</Text>
      </View>
      <View className="flex-row mt-1">
        <View className="relative">
          <TouchableOpacity className="p-1" onPress={handleCopy}>
            <Feather name={copied ? "check" : "copy"} size={16} color={copied ? "green" : "gray"} />
          </TouchableOpacity>
          {copied && <Text className="absolute -top-5 left-0 text-xs text-gray-600">Copied</Text>}
        </View>
        <TouchableOpacity className="ml-2 p-1">
          <Feather name="edit-2" size={16} color="gray" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const AIMessage = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [shared, setShared] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLike = () => {
    setLiked(true);
    setTimeout(() => setLiked(false), 2000);
  };

  const handleDislike = () => {
    setDisliked(true);
    setTimeout(() => setDisliked(false), 2000);
  };

  const handleRegenerate = () => {
    setRegenerating(true);
    setTimeout(() => setRegenerating(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: text });
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View className="items-start mb-4">
      <View className="rounded-lg py-2 max-w-[100%]">
        <Text className="text-base text-black">{text}</Text>
      </View>
      <View className="flex-row mt-1">
        <View className="relative">
          <TouchableOpacity className="p-1" onPress={handleCopy}>
            <Feather name={copied ? "check" : "copy"} size={16} color={copied ? "green" : "gray"} />
          </TouchableOpacity>
          {copied && <Text className="absolute -top-5 left-0 text-xs text-gray-600">Copied</Text>}
        </View>
        <View className="relative ml-2">
          <TouchableOpacity className="p-1" onPress={handleLike}>
            <Feather name="thumbs-up" size={16} color={liked ? "blue" : "gray"} />
          </TouchableOpacity>
          {liked && <Text className="absolute -top-5 left-0 text-xs text-gray-600">Liked</Text>}
        </View>
        <View className="relative ml-2">
          <TouchableOpacity className="p-1" onPress={handleDislike}>
            <Feather name="thumbs-down" size={16} color={disliked ? "red" : "gray"} />
          </TouchableOpacity>
          {disliked && <Text className="absolute -top-5 left-0 text-xs text-gray-600">Disliked</Text>}
        </View>
        <View className="relative ml-2">
          <TouchableOpacity className="p-1" onPress={handleRegenerate}>
            <Feather name="refresh-cw" size={16} color={regenerating ? "orange" : "gray"} />
          </TouchableOpacity>
          {regenerating && <Text className="absolute -top-5 left-0 text-xs text-gray-600">Regenerating</Text>}
        </View>
        <View className="relative ml-2">
          <TouchableOpacity className="p-1" onPress={handleShare}>
            <Feather name="share-2" size={16} color={shared ? "purple" : "gray"} />
          </TouchableOpacity>
          {shared && <Text className="absolute -top-5 left-0 text-xs text-gray-600">Shared</Text>}
        </View>
      </View>
    </View>
  );
};

const Chat = () => {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const maxInputHeight = 150;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={headerHeight + (StatusBar.currentHeight || 0) + (Platform.OS === "ios" ? 20 : 0)}
      >
        <View className="flex-1 px-5  pt-1 pb-0">
          <View className="flex-row items-center mb-4 justify-between" onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
            <TouchableOpacity onPress={() => router.back()}>
              <Feather name="arrow-left" size={24} color="black" />
            </TouchableOpacity>
            <Text className="text-2xl font-JakartaBold flex-1 text-center">ChatBot</Text>
            <TouchableOpacity onPress={() => router.push("/menu")}>
              <Feather name="menu" size={24} color="black" />
            </TouchableOpacity>
          </View>
          <ScrollView 
            className="flex-1 mt-1" 
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
          >
            <UserMessage text="Hello! Can you tell me about the weather today?" />
            
            <AIMessage text="Sure! Based on current data, it's sunny with a high of 75°F in your area." />
            
            <UserMessage text="Thanks! What about tomorrow?" />
            
            <AIMessage text="Tomorrow looks cloudy with a chance of rain, highs around 68°F." />
             <UserMessage text="Hello! Can you tell me about the weather today?" />
            
            <AIMessage text="Sure! Based on current data, it's sunny with a high of 75°F in your area." />
            
            <UserMessage text="Thanks! What about tomorrow?" />
            
            <AIMessage text="Tomorrow looks cloudy with a chance of rain, highs around 68°F." />
          </ScrollView>
        </View>
        <View className="px-2 pb-2">
          <View className="w-full border bg-[#f8fafc] border-gray-300 rounded-3xl p-2 shadow-sm">
            <TextInput
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                if (!text) setInputHeight(40);
              }}
              multiline
              scrollEnabled
              placeholder="Ask anything"
              className="w-full bg-transparent text-base outline-none"
              style={{ height: inputHeight, minHeight: 40, padding: 10 }}
              onContentSizeChange={(e) => {
                setInputHeight(Math.min(maxInputHeight, e.nativeEvent.contentSize.height));
              }}
            />
            <View className="mt-2 flex-row items-center justify-between gap-2">
              <View className="flex-row items-center gap-2">
                <TouchableOpacity 
                  className="border bg-white border-gray-300 rounded-full p-1.5"
                  style={{ width: 30, height: 30 }}
                >
                  <Feather name="plus" size={16} color="black" />
                </TouchableOpacity>
                <TouchableOpacity className="border border-gray-300 bg-white flex-row items-center gap-1 rounded-xl px-3 py-1">
                  <Feather name="edit" size={16} color="black" />
                  <Text className="text-sm">New Chat</Text>
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity className="border bg-white border-gray-300 rounded-full p-2">
                  <Feather name="send" size={18} color="green" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Chat;