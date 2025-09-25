// app/(root)/(tabs)/chat.tsx
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Keyboard,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useEffect, useRef } from "react";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useUser } from "@clerk/clerk-expo";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const UserMessage = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <View style={{ alignItems: "flex-end", marginTop: 8 }}>
      <View
        style={{
          backgroundColor: "#f3f4f6",
          borderTopRightRadius: 18,
          borderTopLeftRadius: 18,
          borderBottomLeftRadius: 18,
          padding: 10,
          maxWidth: "80%",
        }}
      >
        <Text style={{ fontSize: 15, color: "#111" }}>{text}</Text>
      </View>
      <TouchableOpacity style={{ padding: 2, marginTop: 2 }} onPress={handleCopy}>
        <Feather
          name={copied ? "check" : "copy"}
          size={14}
          color={copied ? "green" : "gray"}
        />
      </TouchableOpacity>
    </View>
  );
};

const AIMessage = ({ text }: { text: string }) => (
  <View style={{ alignItems: "flex-start", marginBottom: 12 }}>
    <View style={{ paddingVertical: 6, maxWidth: "100%" }}>
      <Text style={{ fontSize: 15, color: "#111" }}>{text}</Text>
    </View>
  </View>
);

const Chat = () => {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState("");
  const [inputHeight, setInputHeight] = useState(58);
  const [messages, setMessages] = useState<{ type: "user" | "ai"; text: string }[]>([]);
  const maxInputHeight = 120;
  const gradientAnimation = useRef(new Animated.Value(0)).current;
  const textInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.loop(
      Animated.timing(gradientAnimation, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  const startX = gradientAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });
  const endX = gradientAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 1],
  });

  const handleButtonPress = (text: string) => {
    setInputText(text);
    textInputRef.current?.focus();
  };

  const handleContentSizeChange = (e: any) => {
    const newHeight = Math.min(e.nativeEvent.contentSize.height, maxInputHeight);
    setInputHeight(Math.max(58, newHeight));
  };

  const handleSend = () => {
    if (inputText.trim()) {
      setMessages((prev) => [...prev, { type: "user", text: inputText }]);
      setTimeout(() => {
        setMessages((prev) => [...prev, { type: "ai", text: `Response to: ${inputText}` }]);
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 500);
      setInputText("");
      setInputHeight(58);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.bottom + 50 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ChatBot</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push("/menu")}>
            <Feather name="menu" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg, i) =>
            msg.type === "user" ? (
              <UserMessage key={i} text={msg.text} />
            ) : (
              <AIMessage key={i} text={msg.text} />
            )
          )}
        </ScrollView>

        {/* Quick actions + Input */}
        <View style={{ flexShrink: 0 }}>
          {/* Input bar */}
          <View style={[styles.footerWrapper, { paddingBottom: insets.bottom || 8 }]}>
            {messages.length === 0 && (
              <View style={styles.quickWrapper}>
                <Text style={styles.helloText}>Hello, {user?.firstName || "Guest"}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContainer}
                >
                  {["Tell me what you can do", "Help me plan", "Research a topic", "Help me write"].map(
                    (item, i) => (
                      <TouchableOpacity key={i} style={styles.scrollBtn} onPress={() => handleButtonPress(item)}>
                        <Text style={styles.scrollBtnText}>{item}</Text>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>
              </View>
            )}

            <AnimatedLinearGradient
              colors={["#22c55e", "#4ade80", "#22c55e"]}
              start={[startX, 0]}
              end={[endX, 1]}
              style={styles.glowWrapper}
            >
              <View style={[styles.inputBar, { height: inputHeight }]}>
                <Ionicons name="add" size={22} color="#6B7280" />
                <TextInput
                  ref={textInputRef}
                  style={styles.input}
                  value={inputText}
                  onChangeText={(t) => {
                    setInputText(t);
                    if (!t) setInputHeight(58);
                  }}
                  placeholder="Ask anything"
                  placeholderTextColor="#374151"
                  multiline
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
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: { padding: 6 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },

  quickWrapper: {
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  helloText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#15803d",
    marginBottom: 12,
  },
  scrollContainer: { paddingHorizontal: 6 },
  scrollBtn: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  scrollBtnText: { fontSize: 14, fontWeight: "500", color: "#111827" },

  footerWrapper: {
    padding: 8,
    backgroundColor: "#fff",
  },
  glowWrapper: {
    borderRadius: 40,
    padding: 4,
    width: "100%",
    shadowColor: "#22c55e",
    shadowOpacity: 0.6,
    shadowRadius: 8,
    ...Platform.select({ android: { elevation: 6 } }),
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    color: "#374151",
    fontSize: 15,
    minHeight: 58,
    maxHeight: 120,
  },
  actions: { flexDirection: "row", alignItems: "center" },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Chat;