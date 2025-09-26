import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
  Keyboard,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import MaskedView from "@react-native-masked-view/masked-view";

const suggestionChips = [
  "Give me study tips",
  "Inspire me",
  "Save me time",
  "Tell me something new",
];

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function Chat() {
  const { user } = useUser();
  const router = useRouter();

  const [inputText, setInputText] = useState("");
  const [inputHeight, setInputHeight] = useState(58);
  const textInputRef = useRef<TextInput | null>(null);

  // Animated gradient rotation value
  const gradientAnimation = useRef(new Animated.Value(0)).current;
  const keyboardOffset = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(gradientAnimation, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: false,
      })
    ).start();

    const onShow = (e: any) => {
      const kbHeight = e.endCoordinates?.height || 250;
      Animated.timing(keyboardOffset, {
        toValue: kbHeight + 12,
        duration: 250,
        useNativeDriver: false,
      }).start();
    };

    const onHide = () => {
      Animated.timing(keyboardOffset, {
        toValue: 12,
        duration: 250,
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener("keyboardDidShow", onShow);
    const hideSub = Keyboard.addListener("keyboardDidHide", onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [gradientAnimation, keyboardOffset]);

  // Gradient animation
  const start = gradientAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const end = gradientAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const handleChipPress = (text: string) => {
    const cleaned = text.replace(/\n/g, " ");
    setInputText(cleaned);
    textInputRef.current?.focus();
  };

  const handleContentSizeChange = (e: any) => {
    const newHeight = Math.min(e.nativeEvent.contentSize.height, 120);
    setInputHeight(Math.max(58, newHeight));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push("/menu")}
          >
            <Feather name="menu" size={22} color="#111827" />
          </TouchableOpacity>

          <View style={styles.centerTitle}>
            <Text style={styles.headerTitle}>Talkai</Text>
            <View style={styles.modelBadge}>
              <Text style={styles.modelText}>2.1.0 Flash ▼</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push("/profile")}
          >
            {user?.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
            ) : (
              <Ionicons name="person-circle-outline" size={32} color="#111827" />
            )}
          </TouchableOpacity>
        </View>

        {/* Animation and Greeting */}
        <View style={styles.animationContainer}>
          <LottieView
            source={require("../../../assets/images/chatbot.json")}
            autoPlay
            loop
            style={styles.animation}
          />

          {/* Gradient Greeting Text */}
          <MaskedView
            maskElement={
              <Text style={styles.greetingText}>
                Hello, {user?.firstName || "User"}
              </Text>
            }
          >
            <LinearGradient
              colors={["#3b82f6", "#9333ea", "#f43f5e"]} // blue → purple → pink
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.greetingText, { opacity: 0 }]}>
                Hello, {user?.firstName || "User"}
              </Text>
            </LinearGradient>
          </MaskedView>
        </View>

        {/* Chips just above input */}
        <View style={styles.bottomContent}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            {suggestionChips.map((chip, i) => (
              <TouchableOpacity
                key={i}
                style={styles.scrollBtn}
                onPress={() => handleChipPress(chip)}
              >
                <Text style={styles.scrollBtnText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Floating animated input */}
        <Animated.View
          style={[
            styles.container,
            {
              bottom: keyboardOffset,
            },
          ]}
        >
          <AnimatedLinearGradient
            colors={["#93c5fd", "#60a5fa", "#a5b4fc", "#f0abfc", "#93c5fd"]}
            start={[start as any, 0]}
            end={[0, end as any]}
            style={styles.glowWrapper}
          >
            <View style={[styles.inputBar, { height: inputHeight }]}>
              <TouchableOpacity onPress={() => textInputRef.current?.focus()}>
                <Ionicons name="add" size={22} color="#6B7280" />
              </TouchableOpacity>

              <TextInput
                ref={textInputRef}
                style={[styles.input, { minHeight: 58, maxHeight: 120 }]}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask TalkAI"
                placeholderTextColor="#6b7280"
                multiline
                onContentSizeChange={handleContentSizeChange}
                returnKeyType="send"
              />

              <View style={styles.actions}>
                <TouchableOpacity style={styles.iconBtn}>
                  <Feather name="mic" size={18} color="#2563eb" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.iconBtn, { marginLeft: 8 }]}>
                  <MaterialIcons name="auto-awesome" size={18} color="#2563eb" />
                </TouchableOpacity>
              </View>
            </View>
          </AnimatedLinearGradient>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerBtn: { padding: 4 },
  centerTitle: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
  modelBadge: {
    marginTop: 2,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  modelText: { fontSize: 12, color: "#374151" },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#60a5fa",
  },

  animationContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  animation: {
    width: 200,
    height: 200,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
  },

  bottomContent: {
    marginBottom: 100,
  },
  scrollContainer: {
    paddingHorizontal: 12,
  },
  scrollBtn: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
    textAlign: "center",
  },

  container: {
    width: "100%",
    alignItems: "center",
    position: "absolute",
    left: 0,
    right: 0,
  },
  glowWrapper: {
    borderRadius: 40,
    padding: 4,
    width: "94%",
    shadowColor: "#93c5fd",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    ...Platform.select({
      android: { elevation: 10 },
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
    marginLeft: 10,
    color: "#374151",
    fontSize: 16,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
});
