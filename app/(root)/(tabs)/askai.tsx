import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Dimensions, Platform, Modal, FlatList, ScrollView, NativeSyntheticEvent, NativeScrollEvent, KeyboardAvoidingView, Animated, Keyboard, TextInput, Share } from 'react-native';
import { CameraView, type CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, Feather, AntDesign, MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scanImage } from '../../../lib/scanai';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import * as Clipboard from 'expo-clipboard';
import openai from '../../../lib/openai';
import { useUser } from '@clerk/clerk-expo';
import * as FileSystem from 'expo-file-system/legacy';
import { MathJaxSvg } from 'react-native-mathjax-html-to-svg';
import { marked } from 'marked';
import * as ImageManipulator from 'expo-image-manipulator';

const { width, height } = Dimensions.get('window');

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  liked?: boolean | null;
  originalUserMessageId?: string;
  isDelivered?: boolean;
  imageUri?: string;
};

type Conversation = {
  id: string;
  title: string;
  date: string;
};

type ChatMessage = { role: 'system' | 'user' | 'assistant', content: string };

const suggestionChips = [
  "Give me study tips",
  "Inspire me",
  "Save me time",
  "Tell me something new",
];

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const { height: screenHeight } = Dimensions.get('window');

export default function AskaiCameraPage() {
  const { user } = useUser();
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const cameraRef = useRef<CameraView | null>(null);
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [galleryPermission, requestGalleryPermission] = ImagePicker.useMediaLibraryPermissions();
  const [type, setType] = useState<CameraType>('back');
  const [isTaking, setIsTaking] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [inputText, setInputText] = useState("");
  const [inputHeight, setInputHeight] = useState(58);
  const [messages, setMessages] = useState<Message[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [likedBadgeId, setLikedBadgeId] = useState<string | null>(null);
  const [dislikedBadgeId, setDislikedBadgeId] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editText, setEditText] = useState("");
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [contentPaddingBottom, setContentPaddingBottom] = useState<number>(120); // Increased for more bottom space

  const textInputRef = useRef<TextInput | null>(null);
  const gradientAnimation = useRef(new Animated.Value(0)).current;
  const keyboardOffset = useRef(new Animated.Value(12)).current;
  const scrollRef = useRef<FlatList | null>(null);
  const dot1Animation = useRef(new Animated.Value(0)).current;
  const dot2Animation = useRef(new Animated.Value(0)).current;
  const dot3Animation = useRef(new Animated.Value(0)).current;
  const inputTotalHeight = useRef(new Animated.Value(80)).current;
  const currentInterval = useRef<number | null>(null);
  const isAtBottomRef = useRef(true);

  const makeId = () => Math.random().toString(36).slice(2, 9);

  const loadConversation = useCallback(async () => {
    if (convId) {
      const stored = await AsyncStorage.getItem(`conv_${convId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        const updated = parsed.map((m: Message) => {
          if (!m.isUser && m.text !== '' && m.isDelivered !== true) {
            return { ...m, isDelivered: true };
          }
          return m;
        });
        setMessages(updated);
        setShowAnimation(false);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: false });
        }, 0);
      }
    } else {
      setMessages([]);
      setShowAnimation(true);
    }
  }, [convId]);

  useEffect(() => {
    if (showChat) {
      loadConversation();
    }
  }, [showChat, loadConversation]);

  useEffect(() => {
    if (messages.length > 0 && convId) {
      AsyncStorage.setItem(`conv_${convId}`, JSON.stringify(messages));
    }
  }, [messages, convId]);

  useEffect(() => {
    // Gradient animation for input glow
    Animated.loop(
      Animated.timing(gradientAnimation, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: false,
      })
    ).start();

    // Wavy animation for typing dots
    const createWavyAnimation = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: -4,
            duration: 300,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 4,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );

    createWavyAnimation(dot1Animation, 0).start();
    createWavyAnimation(dot2Animation, 100).start();
    createWavyAnimation(dot3Animation, 200).start();

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
  }, [gradientAnimation, dot1Animation, dot2Animation, dot3Animation]);

  useEffect(() => {
    const kbSub = keyboardOffset.addListener(({ value }) => {
      // Add extra padding to ensure messages clear the input area
      setContentPaddingBottom(value + (inputTotalHeight as any)._value + 20);
      if (isAtBottomRef.current) {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });

    const inputSub = inputTotalHeight.addListener(({ value }) => {
      // Add extra padding to ensure messages clear the input area
      setContentPaddingBottom((keyboardOffset as any)._value + value + 20);
      if (isAtBottomRef.current) {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });

    return () => {
      keyboardOffset.removeListener(kbSub);
      inputTotalHeight.removeListener(inputSub);
    };
  }, []);

  const handleEditingBarLayout = (event: any) => {
    const height = event.nativeEvent.layout.height;
    // Update inputTotalHeight to include editing bar height when visible
    if (editingMessageId) {
      inputTotalHeight.setValue(inputHeight + height);
    } else {
      inputTotalHeight.setValue(inputHeight);
    }
  };

  const start = gradientAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const end = gradientAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const takePhoto = async () => {
    if (!cameraRef.current || isTaking) return;
    try {
      setIsTaking(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, skipProcessing: true });
      const frameWidth = width * 0.82;
      const frameHeight = 280;
      const frameTop = (height - frameHeight) / 2;
      const frameLeft = (width - frameWidth) / 2;
      const cropped = await ImageManipulator.manipulateAsync(photo.uri, [{
        crop: {
          originX: (frameLeft / width) * photo.width,
          originY: (frameTop / height) * photo.height,
          width: (frameWidth / width) * photo.width,
          height: (frameHeight / height) * photo.height
        }
      }], { format: ImageManipulator.SaveFormat.JPEG, compress: 0.7 });
      setCaptured(cropped.uri);
      console.log('Captured:', cropped.uri);
      setIsProcessing(true);
      await processImage(cropped.uri);
    } catch (e) {
      console.warn(e);
    } finally {
      setIsTaking(false);
    }
  };

  const pickImage = async () => {
    if (!galleryPermission?.granted) {
      const { granted } = await requestGalleryPermission();
      if (!granted) {
        console.log('Gallery permission denied');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0].uri) {
      const frameWidth = width * 0.82;
      const frameHeight = 280;
      const frameTop = (height - frameHeight) / 2;
      const frameLeft = (width - frameWidth) / 2;
      const cropped = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{
        crop: {
          originX: (frameLeft / width) * result.assets[0].width,
          originY: (frameTop / height) * result.assets[0].height,
          width: (frameWidth / width) * result.assets[0].width,
          height: (frameHeight / height) * result.assets[0].height
        }
      }], { format: ImageManipulator.SaveFormat.JPEG, compress: 0.7 });
      setCaptured(cropped.uri);
      console.log('Selected from gallery:', cropped.uri);
      setIsProcessing(true);
      await processImage(cropped.uri);
    }
  };

  const processImage = async (uri: string) => {
    setIsProcessing(true);
    try {
      const response = await scanImage(uri);
      const newConvId = Date.now().toString();
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}photos/`, { intermediates: true });
      const newUri = `${FileSystem.documentDirectory}photos/photo_${newConvId}.jpg`;
      await FileSystem.copyAsync({ from: uri, to: newUri });

      const aiMessage: Message = {
        id: makeId(),
        text: response,
        isUser: false,
        liked: null,
        isDelivered: true,
        imageUri: newUri,
      };
      const newMessages: Message[] = [aiMessage];
      await AsyncStorage.setItem(`conv_${newConvId}`, JSON.stringify(newMessages));

      const title = 'Question Solution';
      const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const listStr = await AsyncStorage.getItem('conv_list');
      const list: Conversation[] = listStr ? JSON.parse(listStr) : [];
      list.unshift({ id: newConvId, title, date });
      await AsyncStorage.setItem('conv_list', JSON.stringify(list));

      setCaptured(null);
      setConvId(newConvId);
      setMessages(newMessages);
      setShowChat(true);
      setShowAnimation(false);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChipPress = (text: string) => {
    const cleaned = text.replace(/\n/g, " ");
    setInputText(cleaned);
    textInputRef.current?.focus();
  };

  const handleContentSizeChange = (e: any) => {
    const newHeight = Math.min(e.nativeEvent.contentSize.height, 120);
    setInputHeight(Math.max(58, newHeight));
  };

  const stopGenerating = () => {
    if (currentInterval.current) {
      clearInterval(currentInterval.current);
      currentInterval.current = null;
    }
    setMessages(prev => prev.map(m => !m.isUser && !m.isDelivered ? { ...m, isDelivered: true } : m));
    setIsGenerating(false);
  };

  const sendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed && !editingMessageId) return;

    Keyboard.dismiss();
    setShowAnimation(false);

    let currentConvId = convId;
    if (!currentConvId && messages.length === 0) {
      currentConvId = Date.now().toString();
      setConvId(currentConvId);
    }

    let aiId: string;
    if (editingMessageId) {
      const userIndex = messages.findIndex((m) => m.id === editingMessageId);
      if (userIndex === -1) return;

      const updatedHistory = [
        ...messages.slice(0, userIndex),
        { ...messages[userIndex], text: trimmed },
      ];

      aiId = "ai-" + makeId();
      const aiMessage: Message = {
        id: aiId,
        text: "",
        isUser: false,
        liked: null,
        originalUserMessageId: editingMessageId,
        isDelivered: false,
      };

      const wasAtBottom = isAtBottomRef.current;
      setMessages([...updatedHistory, aiMessage]);
      setIsGenerating(true);
      if (wasAtBottom) {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 0);
      }

      const chatMessages: ChatMessage[] = updatedHistory.map((m) => ({
        role: m.isUser ? "user" : "assistant",
        content: m.text,
      }));

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: chatMessages,
        });
        const response = completion.choices[0].message.content || "No response";

        if (currentConvId && userIndex === 0) {
          const titleMessages: ChatMessage[] = [
            { role: "system", content: "Generate a concise title for this conversation in 5-10 words." },
            ...chatMessages,
            { role: "assistant", content: response },
          ];
          const titleCompletion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: titleMessages,
          });
          const title = titleCompletion.choices[0].message.content?.trim() || "Untitled";
          const listStr = await AsyncStorage.getItem("conv_list");
          if (listStr) {
            const list: Conversation[] = JSON.parse(listStr);
            const updatedList = list.map(c => c.id === currentConvId ? { ...c, title } : c);
            await AsyncStorage.setItem("conv_list", JSON.stringify(updatedList));
          }
        }

        const chars = response.split('');
        let currentText = '';
        let i = 0;
        currentInterval.current = setInterval(() => {
          if (i < chars.length) {
            const batchSize = 2;
            currentText += chars.slice(i, i + batchSize).join('');
            const wasAtBottomInner = isAtBottomRef.current;
            setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: currentText } : m));
            if (wasAtBottomInner) {
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 0);
            }
            i += batchSize;
          } else {
            if (currentInterval.current) {
              clearInterval(currentInterval.current);
              currentInterval.current = null;
            }
            const wasAtBottomInner = isAtBottomRef.current;
            setMessages(prev => prev.map(m => m.id === aiId ? { ...m, isDelivered: true } : m));
            setIsGenerating(false);
            if (wasAtBottomInner) {
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 0);
            }
          }
        }, 40);
      } catch (error) {
        console.error("OpenAI API error:", error);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId ? { ...m, text: "Error generating response", isDelivered: true } : m
          )
        );
        setIsGenerating(false);
      }

      setEditingMessageId(null);
      setInputText("");
      setShowEditModal(false);
      return;
    }

    const userMessage: Message = {
      id: "user-" + makeId(),
      text: trimmed,
      isUser: true,
      liked: null,
    };

    const newMessages = [...messages, userMessage];
    const wasAtBottom = isAtBottomRef.current;
    setMessages(newMessages);
    setInputText("");
    if (wasAtBottom) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 0);
    }

    aiId = "ai-" + makeId();
    const aiMessage: Message = {
      id: aiId,
      text: "",
      isUser: false,
      liked: null,
      originalUserMessageId: userMessage.id,
      isDelivered: false,
    };

    setMessages([...newMessages, aiMessage]);
    setIsGenerating(true);
    if (wasAtBottom) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 0);
    }

    const chatMessages: ChatMessage[] = newMessages.map((m) => ({
      role: m.isUser ? "user" : "assistant",
      content: m.text,
    }));

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: chatMessages,
      });
      const response = completion.choices[0].message.content || "No response";

      if (currentConvId && messages.length === 0) {
        const titleMessages: ChatMessage[] = [
          { role: "system", content: "Generate a concise title for this conversation in 5-10 words." },
          ...chatMessages,
          { role: "assistant", content: response },
        ];
        const titleCompletion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: titleMessages,
        });
        const title = titleCompletion.choices[0].message.content?.trim() || "Untitled";
        const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const listStr = await AsyncStorage.getItem("conv_list");
        const list: Conversation[] = listStr ? JSON.parse(listStr) : [];
        list.unshift({ id: currentConvId, title, date });
        await AsyncStorage.setItem("conv_list", JSON.stringify(list));
      }

      const chars = response.split('');
      let currentText = '';
      let i = 0;
      currentInterval.current = setInterval(() => {
        if (i < chars.length) {
          const batchSize = 2;
          currentText += chars.slice(i, i + batchSize).join('');
          const wasAtBottomInner = isAtBottomRef.current;
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: currentText } : m));
          if (wasAtBottomInner) {
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 0);
          }
          i += batchSize;
        } else {
          if (currentInterval.current) {
            clearInterval(currentInterval.current);
            currentInterval.current = null;
          }
          const wasAtBottomInner = isAtBottomRef.current;
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, isDelivered: true } : m));
          setIsGenerating(false);
          if (wasAtBottomInner) {
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 0);
          }
        }
      }, 40);
    } catch (error) {
      console.error("OpenAI API error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId ? { ...m, text: "Error generating response", isDelivered: true } : m
        )
      );
      setIsGenerating(false);
    }
  };

  const handleCopy = async (msgId: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleLikeToggle = (msgId: string, value: boolean | null) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, liked: value === null ? null : value } : m
      )
    );
    if (value === true) {
      setLikedBadgeId(msgId);
      setTimeout(() => setLikedBadgeId(null), 2000);
    } else if (value === false) {
      setDislikedBadgeId(msgId);
      setTimeout(() => setDislikedBadgeId(null), 2000);
    }
  };

  const handleShare = async (text: string) => {
    try {
      await Share.share({ message: text });
    } catch (err) {
      console.warn("Share failed", err);
    }
  };

  const startEdit = (msg: Message) => {
    if (!msg.isUser) return;
    setEditingMessageId(msg.id);
    setEditText(msg.text);
    setShowEditModal(true);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
    setShowEditModal(false);
    setInputText("");
  };

  const handleEditSubmit = () => {
    setInputText(editText);
    sendMessage();
  };

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    const isAtBottomNow = distanceFromBottom < 100;
    isAtBottomRef.current = isAtBottomNow;
    setIsAtBottom(isAtBottomNow);
    setShowScrollToBottom(distanceFromBottom > 100);
  }, []);

  const handleInputLayout = (event: any) => {
    const height = event.nativeEvent.layout.height;
    inputTotalHeight.setValue(height);
  };

  const startNewChat = () => {
    setShowChat(false);
    setMessages([]);
    setConvId(null);
    setShowAnimation(true);
    setInputText("");
  };

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    if (item.isUser) {
      return (
        <View
          key={item.id}
          style={[chatStyles.messageRow, { justifyContent: "flex-end", marginRight: 4 }]}
        >
          <View style={{ alignItems: "flex-end" }}>
            <View style={[chatStyles.userMessageWrapper, { maxWidth: "80%" }]}>
              <Text
                style={chatStyles.userMessageText}
                numberOfLines={0}
                ellipsizeMode="tail"
              >
                {item.text}
              </Text>
            </View>
            <TouchableOpacity onPress={() => startEdit(item)} style={chatStyles.smallIconBtn}>
              <Feather name="edit-2" size={16} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
      );
    } else {
      return (
        <View
          key={item.id}
          style={[chatStyles.messageRow, { justifyContent: "flex-start", paddingHorizontal: 4 }]}
        >
          <View style={chatStyles.aiMessageWrapper}>
            <View style={chatStyles.aiHeader}>
              <MaskedView
                maskElement={<Text style={chatStyles.aiHeaderText}>TalkAI</Text>}
              >
                <LinearGradient
                  colors={["#3b82f6", "#9333ea", "#f43f5e"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={[chatStyles.aiHeaderText, { opacity: 0 }]}>TalkAI</Text>
                </LinearGradient>
              </MaskedView>
              <View style={{ marginLeft: 4, width: 20, height: 20, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                <LinearGradient
                  colors={["#3b82f6", "#9333ea", "#f43f5e"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
                <MaterialIcons name="auto-awesome" size={14} color="#fff" />
              </View>
              {!item.isDelivered && item.text === '' && (
                <View style={chatStyles.typingDots}>
                  <Animated.View
                    style={[chatStyles.dot, { transform: [{ translateY: dot1Animation }] }]}
                  />
                  <Animated.View
                    style={[chatStyles.dot, { transform: [{ translateY: dot2Animation }] }]}
                  />
                  <Animated.View
                    style={[chatStyles.dot, { transform: [{ translateY: dot3Animation }] }]}
                  />
                </View>
              )}
            </View>
            {item.imageUri && (
              <Image
                source={{ uri: item.imageUri }}
                style={chatStyles.aiImage}
                resizeMode="contain"
              />
            )}
            <MathJaxSvg 
              fontSize={16}
              color="#0b1220"
              fontCache={true}
            >
              {marked(item.text)}
            </MathJaxSvg>
            {item.isDelivered && (
              <View style={chatStyles.aiActionsRow}>
                <View style={{ position: 'relative' }}>
                  <TouchableOpacity
                    style={chatStyles.aiActionBtn}
                    onPress={() => handleCopy(item.id, item.text)}
                  >
                    <AntDesign name="copy" size={18} color="#374151" />
                    <Text style={chatStyles.aiActionLabel}>Copy</Text>
                  </TouchableOpacity>
                  {copiedMessageId === item.id && (
                    <View style={chatStyles.actionBadge}>
                      <Text style={chatStyles.actionBadgeText}>Copied!</Text>
                    </View>
                  )}
                </View>
                <View style={{ position: 'relative' }}>
                  <TouchableOpacity
                    style={chatStyles.aiActionBtn}
                    onPress={() => handleLikeToggle(item.id, item.liked === true ? null : true)}
                  >
                    <AntDesign
                      name="like"
                      size={18}
                      color={item.liked === true ? "#10b981" : "#374151"}
                    />
                    <Text style={chatStyles.aiActionLabel}>Like</Text>
                  </TouchableOpacity>
                  {likedBadgeId === item.id && (
                    <View style={chatStyles.actionBadge}>
                      <Text style={chatStyles.actionBadgeText}>Liked!</Text>
                    </View>
                  )}
                </View>
                <View style={{ position: 'relative' }}>
                  <TouchableOpacity
                    style={chatStyles.aiActionBtn}
                    onPress={() => handleLikeToggle(item.id, item.liked === false ? null : false)}
                  >
                    <AntDesign
                      name="dislike"
                      size={18}
                      color={item.liked === false ? "#ef4444" : "#374151"}
                    />
                    <Text style={chatStyles.aiActionLabel}>Dislike</Text>
                  </TouchableOpacity>
                  {dislikedBadgeId === item.id && (
                    <View style={chatStyles.actionBadge}>
                      <Text style={chatStyles.actionBadgeText}>Disliked!</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={chatStyles.aiActionBtn}
                  onPress={() => handleShare(item.text)}
                >
                  <AntDesign name="share-alt" size={18} color="#374151" />
                  <Text style={chatStyles.aiActionLabel}>Share</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      );
    }
  }, [copiedMessageId, likedBadgeId, dislikedBadgeId, dot1Animation, dot2Animation, dot3Animation]);

  if (!permission) {
    return <View />;
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>No access to camera. Please allow camera permissions.</Text>
        <TouchableOpacity style={styles.grantButton} onPress={requestPermission}>
          <Text style={styles.grantButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showChat) {
    return (
      <SafeAreaView style={chatStyles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View style={chatStyles.header}>
            <TouchableOpacity
              style={chatStyles.headerBtn}
              onPress={() => router.push("/menu")}
            >
              <Feather name="menu" size={22} color="#111827" />
            </TouchableOpacity>
            <View style={chatStyles.centerTitle}>
              <View style={chatStyles.modelBadge}>
                <Text style={chatStyles.modelText}>2.1.0 Version ▼</Text>
              </View>
              <TouchableOpacity
                style={chatStyles.newChatBtn}
                onPress={startNewChat}
              >
                <Feather name="camera" size={18} color="#374151" />
                <Text style={chatStyles.newChatText}>New Snap</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={chatStyles.headerBtn}
              onPress={() => router.push("/profile")}
            >
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} style={chatStyles.avatar} />
              ) : (
                <Ionicons name="person-circle-outline" size={32} color="#111827" />
              )}
            </TouchableOpacity>
          </View>

          {showAnimation && (
            <View style={chatStyles.animationContainer}>
              <LottieView
                source={require("../../../assets/images/chatbot.json")}
                autoPlay
                loop
                style={chatStyles.animation}
              />
              <MaskedView
                maskElement={
                  <Text style={chatStyles.greetingText}>
                    Hello, {user?.firstName || "User"}
                  </Text>
                }
              >
                <LinearGradient
                  colors={["#3b82f6", "#9333ea", "#f43f5e"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={[chatStyles.greetingText, { opacity: 0 }]}>
                    Hello, {user?.firstName || "User"}
                  </Text>
                </LinearGradient>
              </MaskedView>
            </View>
          )}

          <View style={chatStyles.messagesContainer}>
            <FlatList
              ref={scrollRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={{
                paddingVertical: 18,
                paddingBottom: contentPaddingBottom,
              }}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            />
          </View>

          <SafeAreaView style={{ width: "100%" }}>
            <View style={chatStyles.inputContainer}>
              {showAnimation && (
                <View style={chatStyles.bottomChips}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={chatStyles.scrollContainer}
                  >
                    {suggestionChips.map((chip, i) => (
                      <TouchableOpacity
                        key={i}
                        style={chatStyles.scrollBtn}
                        onPress={() => handleChipPress(chip)}
                      >
                        <Text style={chatStyles.scrollBtnText}>{chip}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {showScrollToBottom && (
                <Animated.View
                  style={{
                    bottom: Animated.add(keyboardOffset, Animated.add(inputTotalHeight, 20)),
                    position: "absolute",
                    alignSelf: "center",
                    zIndex: 10,
                  }}
                >
                  <TouchableOpacity
                    style={chatStyles.scrollToBottom}
                    onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
                  >
                    <Ionicons name="arrow-down" size={24} color="#fff" />
                  </TouchableOpacity>
                </Animated.View>
              )}

              <Animated.View
                style={[chatStyles.container, { bottom: keyboardOffset }]}
              >
                <AnimatedLinearGradient
                  colors={["#93c5fd", "#60a5fa", "#a5b4fc", "#f0abfc", "#93c5fd"]}
                  start={[start as any, 0]}
                  end={[0, end as any]}
                  style={chatStyles.glowWrapper}
                  onLayout={handleInputLayout}
                >
                  <View style={[chatStyles.inputBar, { height: inputHeight }]}>
                    <TouchableOpacity onPress={() => textInputRef.current?.focus()}>
                      <Ionicons name="add" size={22} color="#6B7280" />
                    </TouchableOpacity>
                    <TextInput
                      ref={textInputRef}
                      style={[chatStyles.input, { minHeight: 58, maxHeight: 120 }]}
                      value={inputText}
                      onChangeText={setInputText}
                      placeholder="Ask TalkAI"
                      placeholderTextColor="#6b7280"
                      multiline
                      onContentSizeChange={handleContentSizeChange}
                      returnKeyType="send"
                      onSubmitEditing={() => {
                        if (Platform.OS !== "ios") sendMessage();
                      }}
                    />
                    <View style={chatStyles.actions}>
                      {isGenerating ? (
                        <TouchableOpacity
                          style={[chatStyles.iconBtn, chatStyles.sendBtn]}
                          onPress={stopGenerating}
                          accessibilityLabel="Stop generating"
                        >
                          <Ionicons name="square" size={18} color="#fff" />
                        </TouchableOpacity>
                      ) : inputText.trim().length === 0 ? (
                        <TouchableOpacity
                          style={chatStyles.iconBtn}
                          onPress={() => textInputRef.current?.focus()}
                          accessibilityLabel="Voice input"
                        >
                          <Feather name="mic" size={18} color="#2563eb" />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[chatStyles.iconBtn, chatStyles.sendBtn]}
                          onPress={sendMessage}
                          accessibilityLabel="Send message"
                        >
                          <Ionicons name="send" size={18} color="#fff" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[chatStyles.iconBtn, { marginLeft: 8 }]}
                        onPress={() => router.push("/audioconversation")}
                      >
                        <MaterialIcons name="auto-awesome" size={18} color="#2563eb" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {editingMessageId && (
                    <View style={chatStyles.editingBar} onLayout={handleEditingBarLayout}>
                      <Text style={chatStyles.editingText}>Editing message…</Text>
                      <TouchableOpacity onPress={cancelEdit}>
                        <Text style={chatStyles.editCancel}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </AnimatedLinearGradient>
              </Animated.View>
            </View>
          </SafeAreaView>

          <Modal
            visible={showEditModal}
            transparent
            animationType="fade"
            onRequestClose={cancelEdit}
          >
            <View style={chatStyles.modalOverlay}>
              <View style={chatStyles.modalContainer}>
                <Text style={chatStyles.modalTitle}>Edit Message</Text>
                <TextInput
                  style={chatStyles.modalInput}
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  autoFocus
                />
                <View style={chatStyles.modalActions}>
                  <TouchableOpacity onPress={cancelEdit} style={chatStyles.modalButton}>
                    <Text style={chatStyles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleEditSubmit}
                    style={[chatStyles.modalButton, chatStyles.modalSubmitButton]}
                  >
                    <Text style={[chatStyles.modalButtonText, { color: "#fff" }]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView
          ref={(r) => { cameraRef.current = r; }}
          style={StyleSheet.absoluteFillObject}
          facing={type}
        />
      )}
      <View style={styles.topBar}>
        <View style={styles.topLeftRow}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => setType(type === 'back' ? 'front' : 'back')}>
            <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.topRightRow}>
          <TouchableOpacity style={styles.iconButton} onPress={() => console.log('history')}>
            <Ionicons name="time-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, styles.proPill]} onPress={() => console.log('gift')}>
            <Text style={styles.proText}>Pro</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => console.log('settings')}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.middleContainer}>
        <View style={{position: 'relative', alignItems: 'center', justifyContent: 'center'}}>
          {captured ? 
            <Image source={{uri: captured}} style={styles.frame} resizeMode="contain" />
            : <View style={styles.frame} />
          }
          {isProcessing && (
            <View style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)'}}>
              <LottieView
                source={require('../../../assets/images/Scan.json')}
                autoPlay
                loop
                style={{width: '100%', height: '100%'}}
              />
            </View>
          )}
        </View>
        <Text style={styles.headerText}>{isProcessing ? 'Scanning...' : 'Take a picture of a question'}</Text>
      </View>
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.smallAction} onPress={pickImage} disabled={isProcessing}>
          <Ionicons name="images-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shutterButton} onPress={takePhoto} disabled={isProcessing}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: { position: 'absolute', top: Platform.OS === 'android' ? 70 : 30, left: 12, right: 12, zIndex: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', },
  topLeftRow: { flexDirection: 'row', alignItems: 'center' },
  topRightRow: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginHorizontal: 6, padding: 8, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 8, },
  headerText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 20, },
  proPill: { backgroundColor: '#7C3AED', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 6, },
  proText: { color: '#fff', fontWeight: '700' },
  middleContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: width * 0.82, height: 280, borderRadius: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', },
  bottomBar: { position: 'absolute', bottom: Platform.OS === 'android' ? 48 : 40, left: 24, right: 24, height: 100, zIndex: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', },
  smallAction: { backgroundColor: 'rgba(0,0,0,0.35)', padding: 12, borderRadius: 999, marginRight: 20, },
  shutterButton: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', position: 'absolute', left: (width - 84 - 48) / 2, bottom: 8, },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grantButton: { marginTop: 20, padding: 10, backgroundColor: '#007AFF', borderRadius: 5, },
  grantButtonText: { color: '#fff', fontWeight: 'bold' },
});

const chatStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerBtn: { padding: 4 },
  centerTitle: { 
    flexDirection: "row",
    alignItems: "center",
  },
  modelBadge: {
    marginTop: 2,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  modelText: { fontSize: 12, color: "#374151" },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
  },
  newChatText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#374151",
  },
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
    paddingTop: 100,
  },
  animation: {
    width: 180,
    height: 180,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 4,
  },
  inputContainer: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  bottomChips: {
    marginBottom: 8,
    width: "100%",
  },
  scrollContainer: {
    paddingHorizontal: 12,
  },
  scrollBtn: {
    backgroundColor: "#fff",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 90,
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
    padding: 6,
    width: "94%",
    shadowColor: "#93c5fd",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    ...Platform.select({
      android: { elevation: 10 },
    }),
    backgroundColor: "transparent",
    marginBottom: -20,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 0,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: "#374151",
    fontSize: 16,
    minWidth: 0,
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
  sendBtn: {
    backgroundColor: "#2563eb",
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 14,
    alignItems: "flex-end",
  },
  userMessageWrapper: {
    backgroundColor: "#e6f0ff",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: "flex-end",
    maxWidth: "80%",
    minWidth: 60,
  },
  userMessageText: {
    fontSize: 16,
    color: "#0f172a",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  smallIconBtn: {
    padding: 6,
    borderRadius: 10,
    marginTop: 4,
  },
  aiMessageWrapper: {
    alignSelf: "flex-start",
    width: "100%",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  aiHeaderText: {
    fontSize: 16,
    fontWeight: "600",
  },
  typingDots: {
    flexDirection: "row",
    marginLeft: 8,
    alignItems: "center",
  },
  dot: {
    width: 4,
    height: 4,
    backgroundColor: "#374151",
    borderRadius: 2,
    marginHorizontal: 2,
  },
  aiImage: {
    width: width * 0.8,
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  aiMessageText: {
    fontSize: 16,
    color: "#0b1220",
  },
  aiActionsRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  aiActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  aiActionLabel: {
    marginLeft: 6,
    fontSize: 13,
    color: "#374151",
  },
  actionBadge: {
    position: "absolute",
    top: -30,
    left: 0,
    backgroundColor: "#111827",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionBadgeText: {
    color: "#fff",
    fontSize: 12,
  },
  editingBar: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  editingText: {
    fontSize: 13,
    color: "#111827",
  },
  editCancel: {
    fontSize: 13,
    color: "#ef4444",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  modalButtonText: {
    fontSize: 16,
    color: "#374151",
  },
  modalSubmitButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
  },
  scrollToBottom: {
    backgroundColor: "#2563eb",
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});