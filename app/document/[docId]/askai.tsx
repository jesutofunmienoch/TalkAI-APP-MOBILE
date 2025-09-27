// app/document/[docId]/askai.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  ScrollView,
  TextInput,
  Keyboard,
  KeyboardEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import MaskedView from "@react-native-masked-view/masked-view";
import LottieView from "lottie-react-native";

// Animated LinearGradient
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function AskAI() {
  const { user } = useUser();
  const gradientAnimation = useRef(new Animated.Value(0)).current;
  const [inputText, setInputText] = useState("");
  const [inputHeight, setInputHeight] = useState(58);
  const textInputRef = useRef<TextInput>(null);
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Loop border animation
    Animated.loop(
      Animated.timing(gradientAnimation, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: false,
      })
    ).start();

    // Keyboard listeners
    const keyboardDidShow = (event: KeyboardEvent) => {
      const keyboardHeight = event.endCoordinates.height;
      Animated.timing(keyboardOffset, {
        toValue: keyboardHeight,
        duration: 300,
        useNativeDriver: false,
      }).start();
    };

    const keyboardDidHide = () => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    };

    const showListener = Keyboard.addListener("keyboardDidShow", keyboardDidShow);
    const hideListener = Keyboard.addListener("keyboardDidHide", keyboardDidHide);

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [gradientAnimation, keyboardOffset]);

  // Animate gradient start/end positions
  const start = gradientAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const end = gradientAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const handleButtonPress = (text: string) => {
    const cleanText = text.replace(/\n/g, " ");
    setInputText(cleanText);
    textInputRef.current?.focus();
  };

  const handleContentSizeChange = (event: any) => {
    const newHeight = Math.min(event.nativeEvent.contentSize.height, 120);
    setInputHeight(Math.max(58, newHeight));
  };

  return (
    <View style={styles.page}>
      {/* Animation + Gradient Hello */}
      <View style={styles.animationContainer}>
        <LottieView
          source={require("../../../assets/images/chatbot.json")}
          autoPlay
          loop
          style={styles.animation}
        />
        <MaskedView
          maskElement={
            <Text style={styles.greetingText}>
              Hello, {user?.firstName || "User"}
            </Text>
          }
        >
          <LinearGradient
            colors={["#3b82f6", "#9333ea", "#f43f5e"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[styles.greetingText, { opacity: 0 }]}>
              Hello, {user?.firstName || "User"}
            </Text>
          </LinearGradient>
        </MaskedView>
      </View>

      {/* Horizontal Scrollable Buttons */}
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

      {/* Animated Gradient Input Bar */}
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
          start={[start, 0]}
          end={[0, end]}
          style={styles.glowWrapper}
        >
          <View style={[styles.inputBar, { height: inputHeight }]}>
            <Ionicons name="add" size={22} color="#6B7280" />
            <TextInput
              ref={textInputRef}
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask Talkai"
              placeholderTextColor="#6b7280"
              multiline
              scrollEnabled
              onContentSizeChange={handleContentSizeChange}
            />
            <View style={styles.actions}>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="mic" size={20} color="#3b82f6" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconBtn, { marginLeft: 8 }]}>
                <MaterialIcons name="auto-awesome" size={20} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          </View>
        </AnimatedLinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingTop: 60,
    alignItems: "center",
  },
  animationContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  animation: {
    width: 120,
    height: 120,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  scrollContainer: {
    paddingHorizontal: 10,
    marginBottom: 90,
  },
  scrollBtn: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  scrollBtnText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    color: "#111827",
  },
  container: {
    width: "100%",
    alignItems: "center",
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
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
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
});
