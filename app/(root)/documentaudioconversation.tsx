import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Alert,
  ActivityIndicator,
  AppState,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { Audio, AVPlaybackStatus, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { Buffer } from "buffer";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Custom FileInfo type to include size
interface FileInfo {
  exists: boolean;
  uri: string;
  isDirectory: boolean;
  size?: number;
}

// Logger
const logger = {
  info: console.log,
  error: console.error,
};

// API key check
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  logger.error("OPENAI_API_KEY is not set.");
  Alert.alert("Error", "OpenAI API key is missing.");
}

// Recording settings (optimized for smaller files)
const recordingSettings: Audio.RecordingOptions = {
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 22050, // Lower sample rate
    numberOfChannels: 1, // Mono
    bitRate: 64000, // Lower bitrate
  },
  ios: {
    extension: ".m4a",
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 22050,
    numberOfChannels: 1,
    bitRate: 64000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 64000,
  },
};

// Fetch with timeout and retry
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 60000, retries = 3): Promise<Response> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await Promise.race([
        fetch(url, options),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Request timeout after ${timeout / 1000}s`)), timeout)),
      ]);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      return response;
    } catch (err) {
      logger.error(`Attempt ${attempt} failed:`, err);
      if (attempt === retries) throw err;
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
    }
  }
  throw new Error("All retry attempts failed");
};

const AudioConversationScreen = () => {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isClosingState, setIsClosingState] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isRecordingRef = useRef(false);
  const recordingLock = useRef(false);
  const playbackLock = useRef(false);
  const hasPlayedWelcome = useRef(false);
  const isClosing = useRef(false);
  const isMounted = useRef(true);
  const { startRecording: startRecordingParam, docId } = useLocalSearchParams<{ startRecording?: string; docId?: string }>();
  const router = useRouter();

  // Cache welcome TTS
  const WELCOME_TTS_URI = `${FileSystem.cacheDirectory}welcome_cached.mp3`;
  const WELCOME_TEXT = "Hello! I'm TalkAI, ready to assist you. How can I help today?";

  // Generate unique message IDs
  const makeId = () => Math.random().toString(36).slice(2, 9);

  // Save message to AsyncStorage (limit to 10 messages)
  const saveMessage = async (userText: string, reply: string) => {
    if (!docId) return;
    const storageKey = `askai_${docId}`;
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      let messages = stored ? JSON.parse(stored) : [];
      const userMessage = {
        id: "user-" + makeId(),
        text: userText,
        isUser: true,
        liked: null,
        isDelivered: true,
      };
      const aiMessage = {
        id: "ai-" + makeId(),
        text: reply,
        isUser: false,
        liked: null,
        originalUserMessageId: userMessage.id,
        isDelivered: true,
      };
      messages = [...messages, userMessage, aiMessage].slice(-20); // Keep last 10 conversations (20 messages)
      await AsyncStorage.setItem(storageKey, JSON.stringify(messages));
      logger.info("Saved conversation to AsyncStorage:", storageKey);
    } catch (err) {
      logger.error("Failed to save conversation:", err);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      logger.info("AudioConversationScreen unmounted");
      unloadRecording();
      unloadSound();
    };
  }, []);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "background") {
        logger.info("App going to background, unloading resources");
        unloadRecording();
        unloadSound();
      }
    });
    return () => subscription.remove();
  }, []);

  // Unload recording
  const unloadRecording = async () => {
    if (recordingRef.current) {
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.canRecord) {
          await recordingRef.current.stopAndUnloadAsync();
        }
        logger.info("Recording unloaded.");
      } catch (err) {
        logger.error("Unload recording error:", err);
      }
      recordingRef.current = null;
      isRecordingRef.current = false;
      recordingLock.current = false;
      if (isMounted.current) setIsMicOn(false);
    }
  };

  // Unload sound
  const unloadSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        logger.info("Sound unloaded.");
      } catch (err) {
        logger.error("Unload sound error:", err);
      }
      soundRef.current = null;
      if (isMounted.current) {
        setIsAssistantSpeaking(false);
        setIsPaused(false);
      }
      playbackLock.current = false;
    }
  };

  // Play welcome message on mount
  useEffect(() => {
    if (startRecordingParam === "true" && !hasPlayedWelcome.current) {
      logger.info("Triggering welcome message");
      playWelcomeMessage();
      hasPlayedWelcome.current = true;
    }
  }, [startRecordingParam]);

  // Animation effect
  useEffect(() => {
    logger.info("Animation effect triggered, isMicOn:", isMicOn, "isAssistantSpeaking:", isAssistantSpeaking);
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

  // Cache and play welcome message
  const playWelcomeMessage = async () => {
    logger.info("playWelcomeMessage triggered");
    try {
      if (isClosing.current) return;
      if (isMounted.current) setIsAssistantSpeaking(true);
      setIsProcessing(true);

      // Check for cached welcome TTS
      const ttsInfo = await FileSystem.getInfoAsync(WELCOME_TTS_URI) as FileInfo;
      let ttsUri = WELCOME_TTS_URI;

      if (!ttsInfo.exists) {
        logger.info("Generating welcome TTS...");
        const ttsRes = await fetchWithTimeout("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "tts-1",
            voice: "alloy",
            input: WELCOME_TEXT,
          }),
        });

        if (isClosing.current) return;

        logger.info("Processing TTS buffer...");
        const ttsBuffer = await ttsRes.arrayBuffer();
        const base64Data = Buffer.from(ttsBuffer).toString("base64");
        ttsUri = WELCOME_TTS_URI;
        logger.info("TTS file URI:", ttsUri);

        logger.info("Writing TTS file...");
        await FileSystem.writeAsStringAsync(ttsUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        logger.info("Using cached welcome TTS");
      }

      // Verify TTS file
      const ttsFileInfo = await FileSystem.getInfoAsync(ttsUri) as FileInfo;
      logger.info("TTS file exists:", ttsFileInfo.exists, "size:", ttsFileInfo.exists ? ttsFileInfo.size : "N/A");
      if (!ttsFileInfo.exists) {
        throw new Error("TTS file does not exist at URI: " + ttsUri);
      }

      if (isClosing.current) {
        if (ttsUri !== WELCOME_TTS_URI) await FileSystem.deleteAsync(ttsUri);
        return;
      }

      // Play welcome message
      logger.info("Creating and playing welcome sound...");
      const { sound } = await Audio.Sound.createAsync({ uri: ttsUri });
      soundRef.current = sound;
      await sound.playAsync();
      logger.info("Welcome sound playback started");

      // Save welcome message to AsyncStorage
      await saveMessage("", WELCOME_TEXT);

      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          logger.info("Welcome playback finished");
          if (isMounted.current) {
            setIsAssistantSpeaking(false);
            setIsPaused(false);
            setIsProcessing(false);
          }
          sound.unloadAsync().catch((err) => logger.error("Failed to unload welcome sound:", err));
          soundRef.current = null;
          playbackLock.current = false;
          // Start recording after welcome message
          startRecording();
        }
      });

      // Delete non-cached TTS file
      if (ttsUri !== WELCOME_TTS_URI) {
        await FileSystem.deleteAsync(ttsUri);
        logger.info("Deleted welcome TTS file:", ttsUri);
      }
    } catch (err: any) {
      logger.error("Welcome message error:", err);
      Alert.alert("Error", `Failed to play welcome message: ${err.message || "Unknown error"}`);
      if (isMounted.current) {
        setIsAssistantSpeaking(false);
        setIsPaused(false);
        setIsProcessing(false);
      }
      startRecording();
    }
  };

  // Start recording
  const startRecording = async () => {
    if (isRecordingRef.current || recordingLock.current) {
      logger.info("Recording in progress or locked—skipping.");
      return;
    }
    logger.info("startRecording triggered");
    recordingLock.current = true;
    isRecordingRef.current = true;
    try {
      await unloadRecording();

      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission required", "Enable microphone access.");
        throw new Error("Microphone permission denied");
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

      recordingRef.current = new Audio.Recording();
      await recordingRef.current.prepareToRecordAsync(recordingSettings);
      await recordingRef.current.startAsync();
      logger.info("Recording prepared and started.");
      if (isMounted.current) setIsMicOn(true);
    } catch (err: any) {
      logger.error("Failed to start recording:", err);
      Alert.alert("Error", `Failed to start: ${err.message}`);
      await unloadRecording();
    } finally {
      recordingLock.current = false;
    }
  };

  // Stop recording
  const stopRecording = async () => {
    logger.info("stopRecording triggered");
    if (!isRecordingRef.current || !recordingRef.current) {
      logger.info("No recording in progress");
      return;
    }
    if (isMounted.current) setIsMicOn(false);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      logger.info("Recording stopped and unloaded, URI:", uri);
      recordingRef.current = null;
      isRecordingRef.current = false;
      recordingLock.current = false;

      if (uri) {
        await handleConversation(uri);
      } else {
        throw new Error("No URI from recording.");
      }
    } catch (err: any) {
      logger.error("Failed to stop recording:", err);
      Alert.alert("Error", `Failed to stop: ${err.message}`);
      await unloadRecording();
    }
  };

  // Pause playback
  const pausePlayback = async () => {
    if (!soundRef.current || playbackLock.current) {
      logger.info("No playback or locked—skipping pause.");
      return;
    }
    playbackLock.current = true;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await soundRef.current.pauseAsync();
        logger.info("Playback paused.");
        if (isMounted.current) setIsPaused(true);
      }
    } catch (err: any) {
      logger.error("Failed to pause playback:", err);
      Alert.alert("Error", `Failed to pause: ${err.message}`);
    } finally {
      playbackLock.current = false;
    }
  };

  // Resume playback
  const resumePlayback = async () => {
    if (!soundRef.current || playbackLock.current) {
      logger.info("No playback or locked—skipping resume.");
      return;
    }
    playbackLock.current = true;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded && !status.isPlaying) {
        await soundRef.current.playAsync();
        logger.info("Playback resumed.");
        if (isMounted.current) setIsPaused(false);
      }
    } catch (err: any) {
      logger.error("Failed to resume playback:", err);
      Alert.alert("Error", `Failed to resume: ${err.message}`);
    } finally {
      playbackLock.current = false;
    }
  };

  // Handle conversation: STT → GPT → TTS → Play
  const handleConversation = async (audioUri: string) => {
    logger.info("handleConversation started with URI:", audioUri);
    let ttsUri: string | null = null;
    try {
      setIsProcessing(true);
      const startTime = Date.now();
      const fileInfo = await FileSystem.getInfoAsync(audioUri) as FileInfo;
      logger.info("Audio file exists:", fileInfo.exists, "size:", fileInfo.exists ? fileInfo.size : "N/A");
      if (!fileInfo.exists) {
        throw new Error("Audio file does not exist at URI: " + audioUri);
      }

      // Transcribe with Whisper
      logger.info("Preparing FormData for transcription...");
      const formData = new FormData();
      formData.append("file", {
        uri: audioUri,
        type: "audio/m4a",
        name: "speech.m4a",
      } as any);
      formData.append("model", "whisper-1");

      logger.info("Sending transcription request...");
      const sttRes = await fetchWithTimeout("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (isClosing.current) return;

      const sttData = await sttRes.json();
      if (sttData.error) {
        throw new Error(`Transcription error: ${sttData.error.message}`);
      }
      const userText = sttData.text || "";
      logger.info("User said:", userText, `Transcription took: ${Date.now() - startTime}ms`);

      // Delete audio file after transcription
      await FileSystem.deleteAsync(audioUri);
      logger.info("Deleted audio file:", audioUri);

      // Send to Chat model
      logger.info("Sending chat completion request...");
      const chatRes = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: userText || "Hello" }],
        }),
      });

      if (isClosing.current) return;

      const chatData = await chatRes.json();
      if (chatData.error) {
        throw new Error(`Chat completion error: ${chatData.error.message}`);
      }
      const reply = chatData.choices[0].message.content;
      logger.info("AI reply:", reply, `Chat completion took: ${Date.now() - startTime}ms`);

      // Save to AsyncStorage
      await saveMessage(userText, reply);

      if (isClosing.current) return;

      // Convert reply to speech
      logger.info("Sending TTS request...");
      if (isMounted.current) setIsAssistantSpeaking(true);
      const ttsRes = await fetchWithTimeout("https://api.openai.com/v1/audio/speech", {
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

      if (isClosing.current) return;

      logger.info("Processing TTS buffer...");
      const ttsBuffer = await ttsRes.arrayBuffer();
      const base64Data = Buffer.from(ttsBuffer).toString("base64");
      ttsUri = `${FileSystem.cacheDirectory}reply.mp3`;
      logger.info("TTS file URI:", ttsUri);

      logger.info("Writing TTS file...");
      await FileSystem.writeAsStringAsync(ttsUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Verify TTS file
      const ttsInfo = await FileSystem.getInfoAsync(ttsUri) as FileInfo;
      logger.info("TTS file exists:", ttsInfo.exists, "size:", ttsInfo.exists ? ttsInfo.size : "N/A");
      if (!ttsInfo.exists) {
        throw new Error("TTS file does not exist at URI: " + ttsUri);
      }

      if (isClosing.current) return;

      // Play reply
      logger.info("Creating and playing sound...");
      const { sound } = await Audio.Sound.createAsync({ uri: ttsUri });
      soundRef.current = sound;
      await sound.playAsync();
      logger.info("Sound playback started");
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          logger.info("Playback finished");
          if (isMounted.current) {
            setIsAssistantSpeaking(false);
            setIsPaused(false);
            setIsProcessing(false);
          }
          sound.unloadAsync().catch((err) => logger.error("Failed to unload sound:", err));
          soundRef.current = null;
          playbackLock.current = false;
          startRecording();
        }
      });

      // Delete TTS file
      await FileSystem.deleteAsync(ttsUri);
      logger.info("Deleted TTS file:", ttsUri);
    } catch (err: any) {
      logger.error("Conversation error:", err);
      Alert.alert("Error", `Failed to process conversation: ${err.message || "Unknown error"}`);
      if (isMounted.current) {
        setIsAssistantSpeaking(false);
        setIsPaused(false);
        setIsProcessing(false);
      }
      startRecording();
    }
  };

  logger.info("Rendering AudioConversationScreen");

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {isProcessing && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2196f3" />
        </View>
      )}
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

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.iconButton, isMicOn && styles.activeButton]}
          onPress={() => {
            logger.info("Mic button pressed, isMicOn:", isMicOn);
            isMicOn ? stopRecording() : startRecording();
          }}
          disabled={isProcessing}
        >
          <MaterialIcons
            name={isMicOn ? "mic" : "mic-off"}
            size={28}
            color={isMicOn ? "#fff" : "#111"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconButton, isPaused && styles.activeButton]}
          onPress={() => {
            logger.info("Pause/Play button pressed, isPaused:", isPaused);
            isPaused ? resumePlayback() : pausePlayback();
          }}
          disabled={isProcessing}
        >
          <MaterialIcons
            name={isPaused ? "play-arrow" : "pause"}
            size={28}
            color={isPaused ? "#fff" : "#111"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconButton, (isClosingState || isProcessing) && styles.disabledButton]}
          disabled={isClosingState || isProcessing}
          onPress={async () => {
            if (isClosingState || isProcessing) return;
            setIsClosingState(true);
            logger.info("Cancel button pressed");
            isClosing.current = true;
            await stopRecording();
            await unloadSound();
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
  disabledButton: { backgroundColor: "#ccc" },
  loading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -25 }, { translateY: -25 }],
    zIndex: 10,
  },
});

export default AudioConversationScreen;