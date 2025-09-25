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
    // Gradient animation
    Animated.loop(
      Animated.timing(gradientAnimation, {
        toValue: 1,
        duration: 3000,
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
    const newHeight = Math.min(event.nativeEvent.contentSize.height, 120);
    setInputHeight(Math.max(58, newHeight));
  };

  return (
    <View style={styles.page}>
      {/* Centered Hello User */}
      <Text style={styles.helloText}>
        Hello, {user?.firstName || "Guest"}
      </Text>

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
              onChangeText={setInputText}
              placeholder="Ask Talkai"
              placeholderTextColor="#374151"
              multiline
              scrollEnabled
              onContentSizeChange={handleContentSizeChange}
            />
            <View style={styles.actions}>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="mic" size={20} color="#15803d" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconBtn, { marginLeft: 8 }]}>
                <MaterialIcons name="auto-awesome" size={20} color="#15803d" />
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
  helloText: {
    fontSize: 26,
    fontWeight: "600",
    color: "#15803d",
    marginBottom: 120,
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
    borderColor: "#d1fae5",
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
    position: "absolute", // Allow dynamic positioning
    left: 0,
    right: 0,
    bottom: 12, // Default bottom position
  },
  glowWrapper: {
    borderRadius: 40,
    padding: 4,
    width: "94%",
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