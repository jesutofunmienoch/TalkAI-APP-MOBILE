import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import LottieView from "lottie-react-native";
import { Audio, AVPlaybackStatus } from "expo-av";
import * as FileSystem from "expo-file-system";
import { Buffer } from "buffer";

// Ensure the API key is set in your environment variables
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set in environment variables.");
}

// Define recording options with web support
const recordingSettings: Audio.RecordingOptions = {
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  ios: {
    extension: ".m4a",
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 128000,
  },
};

const AudioConversationScreen = () => {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef<Audio.Sound | null>(null);

  // Animate mic when listening/speaking
  useEffect(() => {
    if (isMicOn || isAssistantSpeaking) {
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
  }, [isMicOn, isAssistantSpeaking, scaleAnim]);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  // Start recording
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission required", "Enable microphone access.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(recordingSettings);
      setRecording(recording);
      setIsMicOn(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
      Alert.alert("Error", "Failed to start recording.");
    }
  };

  // Stop recording & process conversation
  const stopRecording = async () => {
    if (!recording) return;
    setIsMicOn(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        await handleConversation(uri);
      } else {
        throw new Error("No URI returned from recording.");
      }
    } catch (err) {
      console.error("Failed to stop recording:", err);
      Alert.alert("Error", "Failed to stop recording.");
    }
  };

  // Handle AI conversation: STT → GPT → TTS → Play
  const handleConversation = async (audioUri: string) => {
    try {
      // 1. Transcribe with Whisper
      const formData = new FormData();
      formData.append("file", {
        uri: audioUri,
        type: "audio/m4a",
        name: "speech.m4a",
      } as any);
      formData.append("model", "whisper-1");

      const sttRes = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: formData,
        }
      );

      if (!sttRes.ok) {
        throw new Error(`Transcription failed: ${sttRes.statusText}`);
      }

      const sttData = await sttRes.json();
      const userText = sttData.text;
      console.log("User said:", userText);

      // 2. Send to Chat model
      const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: userText }],
        }),
      });

      if (!chatRes.ok) {
        throw new Error(`Chat completion failed: ${chatRes.statusText}`);
      }

      const chatData = await chatRes.json();
      const reply = chatData.choices[0].message.content;
      console.log("AI reply:", reply);

      // 3. Convert reply to speech
      setIsAssistantSpeaking(true);
      const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "tts-1",
          voice: "alloy",
          input: reply,
        }),
      });

      if (!ttsRes.ok) {
        throw new Error(`TTS failed: ${ttsRes.statusText}`);
      }

      const ttsBuffer = await ttsRes.arrayBuffer();
      const base64Data = Buffer.from(ttsBuffer).toString("base64");
      // Use documentDirectory as a fallback if cacheDirectory is not recognized
      const ttsUri = `${(FileSystem as any).cacheDirectory || FileSystem.documentDirectory}reply.mp3`;

      await (FileSystem as any).writeAsStringAsync(ttsUri, base64Data, {
        encoding: (FileSystem as any).Encoding?.Base64 || "base64",
      });

      // 4. Play reply
      const { sound } = await Audio.Sound.createAsync({ uri: ttsUri });
      soundRef.current = sound;
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          setIsAssistantSpeaking(false);
          sound.unloadAsync();
        }
      });
    } catch (err) {
      console.error("Conversation error:", err);
      Alert.alert("Error", "Failed to process conversation.");
      setIsAssistantSpeaking(false);
    }
  };

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

      {/* Controls */}
      <View style={styles.controls}>
        {/* Mic */}
        <TouchableOpacity
          style={[styles.iconButton, isMicOn && styles.activeButton]}
          onPress={isMicOn ? stopRecording : startRecording}
        >
          <MaterialIcons
            name={isMicOn ? "mic" : "mic-none"}
            size={28}
            color={isMicOn ? "#fff" : "#111"}
          />
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={async () => {
            await soundRef.current?.stopAsync();
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
  animationContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  animation: { width: 250, height: 250 },
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
  activeButton: { backgroundColor: "#2196f3" },
});

export default AudioConversationScreen;