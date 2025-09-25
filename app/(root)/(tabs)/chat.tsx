import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, Share, StatusBar, Animated, Keyboard, KeyboardEvent, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from "expo-router";
import { useState, useEffect, useRef } from 'react';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from "expo-linear-gradient";
import { useUser } from "@clerk/clerk-expo";
import { images } from "@/constants";

// Animated LinearGradient
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const UserMessage = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View className="items-end mt-2">
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
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(0);
  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(58);
  const [messages, setMessages] = useState<{ type: 'user' | 'ai'; text: string }[]>([]);
  const maxInputHeight = 120;
  const gradientAnimation = useRef(new Animated.Value(0)).current;
  const textInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Gradient animation
    Animated.loop(
      Animated.timing(gradientAnimation, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false,
      })
    ).start();
  }, [gradientAnimation]);

  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const startX = gradientAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });

  const startY = gradientAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });

  const endX = gradientAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 1],
  });

  const endY = gradientAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 1],
  });

  const handleButtonPress = (text: string) => {
    const cleanText = text.replace(/\n/g, " ");
    setInputText(cleanText);
    textInputRef.current?.focus();
  };

  const handleContentSizeChange = (event: any) => {
    const newHeight = Math.min(event.nativeEvent.contentSize.height, maxInputHeight);
    setInputHeight(Math.max(58, newHeight));
  };

  const handleSend = () => {
    if (inputText.trim()) {
      setMessages([...messages, { type: 'user', text: inputText }]);
      // Simulate AI response (replace with actual AI integration)
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { type: 'ai', text: `Response to: ${inputText}` },
        ]);
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 500);
      setInputText('');
      setInputHeight(58);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -insets.bottom : StatusBar.currentHeight || 0}
      >
        <View style={{flex: 1, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 0}}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 0, justifyContent: 'space-between'}} onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
            <TouchableOpacity onPress={() => router.back()}>
              <Feather name="arrow-left" size={24} color="black" />
            </TouchableOpacity>
            <Text style={{fontSize: 24, fontWeight: 'bold', flex: 1, textAlign: 'center'}}>ChatBot</Text>
            <TouchableOpacity onPress={() => router.push("/menu")}>
              <Feather name="menu" size={24} color="black" />
            </TouchableOpacity>
          </View>
          {messages.length === 0 ? (
            <View style={{flex: 1, justifyContent: 'space-between', alignItems: 'center'}}>
              <Text style={styles.helloText}>
                Hello, {user?.firstName || "Guest"}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
              >
                {[
                  "Tell me what\nyou can do",
                  "Help me\nplan",
                  "Research\na topic",
                  "Help me\nwrite",
                ].map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.scrollBtn}
                    onPress={() => handleButtonPress(item)}
                  >
                    <Text style={styles.scrollBtnText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <ScrollView 
              ref={scrollViewRef}
              style={{flex: 1, marginTop: 4}} 
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            >
              {messages.map((msg, index) =>
                msg.type === 'user' ? (
                  <UserMessage key={index} text={msg.text} />
                ) : (
                  <AIMessage key={index} text={msg.text} />
                )
              )}
            </ScrollView>
          )}
          <TouchableOpacity activeOpacity={1} onPress={() => textInputRef.current?.focus()}>
            <AnimatedLinearGradient
              colors={["#22c55e", "#4ade80", "#22c55e"]}
              start={[startX, startY]}
              end={[endX, endY]}
              style={styles.glowWrapper}
            >
              <View style={[styles.inputBar, { height: inputHeight }]}>
                <Ionicons name="add" size={22} color="#6B7280" />
                <TextInput
                  ref={textInputRef}
                  style={styles.input}
                  value={inputText}
                  onChangeText={(text) => {
                    setInputText(text);
                    if (!text) setInputHeight(58);
                  }}
                  placeholder="Ask anything"
                  placeholderTextColor="#374151"
                  multiline
                  scrollEnabled
                  onContentSizeChange={handleContentSizeChange}
                />
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.iconBtn}>
                    <Ionicons name="mic" size={20} color="#15803d" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconBtn, { marginLeft: 8 }]} onPress={handleSend}>
                    <Feather name="send" size={20} color="#15803d" />
                  </TouchableOpacity>
                </View>
              </View>
            </AnimatedLinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  helloText: {
    fontSize: 26,
    fontWeight: "600",
    color: "#15803d",
    marginBottom: 20,
    textAlign: "center",
  },
  scrollContainer: {
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  scrollBtn: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  scrollBtnText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    color: "#111827",
  },
  glowWrapper: {
    borderRadius: 40,
    padding: 4,
    width: "100%",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    ...Platform.select({
      android: { elevation: 12 },
    }),
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    color: "#374151",
    fontSize: 16,
    minHeight: 58,
    maxHeight: 120,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Chat;