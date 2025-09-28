import React, { useState, useEffect, useRef } from "react";
import { View, TouchableOpacity, StyleSheet, Animated, Easing, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import LottieView from "lottie-react-native";
import Vapi from "../../__mocks__/vapi-ai"; // Use mock for testing

// Define Vapi interface with a distinct name
interface IVapi {
  start(assistantId: string, overrides?: any): void;
  stop(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  on(
    event: "speech-start" | "speech-end" | "error" | "volume-level",
    callback: (...args: any[]) => void
  ): void;
}

const AudioConversationScreen = () => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Scale animation reference
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const vapiRef = useRef<IVapi | null>(null);

  // Initialize VAPI
  useEffect(() => {
    // Validate environment variables
    if (!process.env.EXPO_PUBLIC_VAPI_PUBLIC_KEY || !process.env.EXPO_PUBLIC_VAPI_ASSISTANT_ID) {
      Alert.alert("Configuration Error", "VAPI public key or assistant ID is missing in environment variables.");
      return;
    }

    const vapi = new Vapi(process.env.EXPO_PUBLIC_VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    // Start the assistant
    vapi.start(process.env.EXPO_PUBLIC_VAPI_ASSISTANT_ID);

    // Debug: Log all events to discover correct event names
    vapi.on("error", (error: Error) => {
      console.error("VAPI error:", error);
      if (error.message.includes("permission")) {
        Alert.alert("Permission Required", "Please grant microphone permissions in your device settings.");
      }
    });

    // Handle assistant speaking state
    vapi.on("speech-start", () => {
      console.log("VAPI event: speech-start");
      setIsAssistantSpeaking(true);
    });

    vapi.on("speech-end", () => {
      console.log("VAPI event: speech-end");
      setIsAssistantSpeaking(false);
    });

    // Handle user speech detection using volume-level
    vapi.on("volume-level", (volume: number) => {
      console.log("VAPI event: volume-level", volume);
      setIsListening(volume > 0.1);
    });

    // Debug: Catch all events (type cast to bypass type check)
    vapi.on("*" as any, (event: string, ...args: any[]) => {
      console.log("VAPI event received:", event, args);
    });

    return () => {
      vapi.stop();
    };
  }, []);

  // Toggle microphone
  const toggleMic = () => {
    if (vapiRef.current) {
      const newMutedState = !vapiRef.current.isMuted();
      vapiRef.current.setMuted(newMutedState);
      setIsMicOn(!newMutedState);
      console.log("Microphone toggled:", newMutedState ? "muted" : "unmuted");
    }
  };

  // Animation control
  useEffect(() => {
    if (isAssistantSpeaking || (isListening && isMicOn)) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.stopAnimation();
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isAssistantSpeaking, isListening, isMicOn, scaleAnim]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Center Animation */}
      <View style={styles.animationContainer}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <LottieView
            source={require("../../assets/images/audio.json")}
            autoPlay
            loop
            style={styles.animation}
          />
        </Animated.View>
      </View>

      {/* Bottom Control Icons */}
      <View style={styles.controls}>
        {/* Mic Toggle */}
        <TouchableOpacity
          style={[styles.iconButton, !isMicOn && styles.mutedButton]}
          onPress={toggleMic}
        >
          <MaterialIcons
            name={isMicOn ? "mic" : "mic-off"}
            size={28}
            color={isMicOn ? "#111" : "#fff"}
          />
        </TouchableOpacity>

        {/* Camera (placeholder, not implemented) */}
        <TouchableOpacity style={styles.iconButton}>
          <MaterialIcons name="videocam" size={28} color="#111" />
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            vapiRef.current?.stop();
            router.back();
          }}
        >
          <MaterialIcons name="close" size={28} color="#111" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  animationContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  animation: {
    width: 250,
    height: 250,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "80%",
    marginBottom: 40,
  },
  iconButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f2f2f2",
    justifyContent: "center",
    alignItems: "center",
  },
  mutedButton: {
    backgroundColor: "#d32f2f",
  },
});

export default AudioConversationScreen;