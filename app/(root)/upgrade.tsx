import React, { useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  Modal, // Use React Native's Modal
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import Swiper from "react-native-swiper";

const { width, height } = Dimensions.get("window");

export default function UpgradePlanScreen() {
  const swiperRef = useRef<Swiper>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [uniquePlanPeriod, setUniquePlanPeriod] = useState<"monthly" | "yearly">("monthly");
  const [tokenPlanMode, setTokenPlanMode] = useState<"standard" | "discount">("standard");
  const [isCalculatorVisible, setCalculatorVisible] = useState(false);
  const [tokenInput, setTokenInput] = useState("");

  const calculateTokenDetails = () => {
    const tokens = parseInt(tokenInput) || 0;
    const cost = (tokens * (tokenPlanMode === "standard" ? 0.005 : 0.004)).toFixed(2);
    const minutes = (tokens / 160).toFixed(2);
    return { tokens, cost, minutes };
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Hero Title with Back Button */}
        <View style={styles.hero}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>
            TALKAI{" "}
            <LinearGradient
              colors={["#34D399", "#10B981"]}
              style={styles.proPill}
            >
              <Feather name="zap" size={16} color="#fff" />
              <Text style={styles.proPillText}>Pro</Text>
            </LinearGradient>
          </Text>
        </View>

        {/* Swiper for Plan Pages */}
        <Swiper
          ref={swiperRef}
          loop={false}
          dot={<View style={styles.dot} />}
          activeDot={<View style={styles.activeDot} />}
          onIndexChanged={(index) => setActiveIndex(index)}
        >
          {/* Token Plan Page */}
          <View style={styles.planContainer}>
            <Text style={styles.planNote}>
              160 tokens/minute for AI conversations
            </Text>
            <View style={styles.features}>
              <FeatureRow
                iconName="message-circle"
                title="AI Conversations"
                subtitle="Engage in real-time AI conversations"
              />
              <FeatureRow
                iconName="file-text"
                title="Document Access"
                subtitle="Access and interact with your documents"
              />
              <FeatureRow
                iconName="zap"
                title="Token-Based System"
                subtitle="Flexible usage with 160 tokens per minute"
              />
              <FeatureRow
                iconName="headphones"
                title="Priority Support"
                subtitle="Get faster responses from our support team"
              />
            </View>
            <View style={styles.periodToggle}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  tokenPlanMode === "standard" ? styles.toggleButtonSelected : undefined,
                ]}
                onPress={() => setTokenPlanMode("standard")}
              >
                <Text style={styles.toggleText}>Standard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  tokenPlanMode === "discount" ? styles.toggleButtonSelected : undefined,
                ]}
                onPress={() => setTokenPlanMode("discount")}
              >
                <Text style={styles.toggleText}>Discount</Text>
              </TouchableOpacity>
            </View>
            <PlanCard
              title="Token Plan"
              subtitle={
                tokenPlanMode === "standard"
                  ? "Custom token purchase"
                  : "20,000 tokens with 20% discount"
              }
              price={
                tokenPlanMode === "standard"
                  ? "$5.00/1000 tokens"
                  : "$80.00/20,000 tokens"
              }
              isSelected={activeIndex === 0}
              onPress={() => setCalculatorVisible(true)}
            />
          </View>

          {/* Unique Mode Page */}
          <View style={styles.planContainer}>
            <Text style={styles.planNote}>Advanced AI features for seamless interaction</Text>
            <View style={styles.features}>
              <FeatureRow
                iconName="users"
                title="Chatbots"
                subtitle="Interact with multiple specialized chatbots"
              />
              <FeatureRow
                iconName="camera"
                title="Scan & Get Answer"
                subtitle="Scan images or text for instant answers"
              />
              <FeatureRow
                iconName="heart"
                title="Humanized AI"
                subtitle="Natural, human-like AI interactions"
              />
              <FeatureRow
                iconName="user"
                title="Custom AI Profiles"
                subtitle="Personalize AI interactions to your style"
              />
            </View>
            <View style={styles.periodToggle}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  uniquePlanPeriod === "monthly" ? styles.toggleButtonSelected : undefined,
                ]}
                onPress={() => setUniquePlanPeriod("monthly")}
              >
                <Text style={styles.toggleText}>Monthly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  uniquePlanPeriod === "yearly" ? styles.toggleButtonSelected : undefined,
                ]}
                onPress={() => setUniquePlanPeriod("yearly")}
              >
                <Text style={styles.toggleText}>Yearly</Text>
              </TouchableOpacity>
            </View>
            <PlanCard
              title="Unique Mode"
              subtitle={uniquePlanPeriod === "monthly" ? "Unlock advanced AI features" : "Save with annual billing"}
              price={uniquePlanPeriod === "monthly" ? "$7.50/month" : "$75.00/year"}
              isSelected={activeIndex === 1}
              onPress={() => swiperRef.current?.scrollTo(1)}
            />
          </View>
        </Swiper>

        {/* Token Calculator Modal */}
        <Modal
          visible={isCalculatorVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setCalculatorVisible(false)}
        >
          <View style={styles.modal}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Calculate Token Purchase</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter number of tokens"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={tokenInput}
                onChangeText={setTokenInput}
              />
              <View style={styles.calcResult}>
                <Text style={styles.calcText}>
                  Tokens: {calculateTokenDetails().tokens}
                </Text>
                <Text style={styles.calcText}>
                  Cost: ${calculateTokenDetails().cost}
                </Text>
                <Text style={styles.calcText}>
                  Conversation Time: {calculateTokenDetails().minutes} minutes
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => console.log("Purchase confirmed", calculateTokenDetails())}
              >
                <LinearGradient
                  colors={["#34D399", "#10B981"]}
                  style={styles.modalButtonGradient}
                >
                  <Text style={styles.modalButtonText}>Purchase</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setCalculatorVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* CTA */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.cta}
          onPress={() => console.log("start trial tapped")}
        >
          <LinearGradient
            colors={["#34D399", "#10B981"]}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>
              Start Free 3 Day Trial & Plan 🔐
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.footText}>Terms and Privacy</Text>
          <Text style={[styles.footText, { marginHorizontal: 10 }]}>|</Text>
          <Text style={styles.footText}>Enter referral</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function FeatureRow({
  iconName,
  title,
  subtitle,
}: {
  iconName: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.featureRow}>
      <LinearGradient
        colors={["#F0FDF4", "#ECFDF5"]}
        style={styles.featureIconBg}
      >
        <Feather name={iconName as any} size={20} color="#10B981" />
      </LinearGradient>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSub}>{subtitle}</Text>
      </View>
    </View>
  );
}

function PlanCard({
  title,
  subtitle,
  price,
  isSelected,
  onPress,
}: {
  title: string;
  subtitle: string;
  price: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.planCard,
        isSelected ? styles.planCardSelected : undefined,
      ]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={styles.planLeft}>
        <LinearGradient
          colors={["#34D399", "#10B981"]}
          style={styles.planBadge}
        >
          <Feather name="zap" size={18} color="#fff" />
          <Text style={styles.planBadgeText}>Pro</Text>
        </LinearGradient>
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.planTitle}>{title}</Text>
          <Text style={styles.planSub}>{subtitle}</Text>
        </View>
      </View>
      <Text style={styles.planPrice}>{price}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 2,
    paddingTop: 54,
    justifyContent: "space-between",
    maxHeight: height - 10,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
  },
  proPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  proPillText: {
    color: "#fff",
    marginLeft: 6,
    fontWeight: "700",
    fontSize: 16,
  },
  planContainer: {
    flex: 1,
    paddingVertical: 20,
  },
  planNote: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  features: {
    flexGrow: 0,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  featureIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  featureSub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 3,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E9EE",
    marginBottom: 10,
  },
  planCardSelected: {
    borderColor: "#10B981",
  },
  planLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  planBadgeText: {
    color: "#fff",
    marginLeft: 6,
    fontWeight: "700",
    fontSize: 14,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  planSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
    maxWidth: width * 0.5,
  },
  planPrice: {
    color: "#10B981",
    fontWeight: "700",
    fontSize: 14,
  },
  periodToggle: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleButtonSelected: {
    backgroundColor: "#10B981",
  },
  toggleText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  modal: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
  },
  modalContent: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: width - 40, // Match original modal width
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  input: {
    width: "100%",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#111827",
    marginBottom: 16,
  },
  calcResult: {
    marginBottom: 16,
    alignItems: "center",
  },
  calcText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  modalButton: {
    borderRadius: 10,
    overflow: "hidden",
    width: "100%",
    marginBottom: 10,
  },
  modalButtonGradient: {
    paddingVertical: 12,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    color: "#10B981",
    fontSize: 14,
    fontWeight: "600",
  },
  cta: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 14,
  },
  ctaGradient: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  footText: {
    color: "#9CA3AF",
    fontSize: 13,
  },
  dot: {
    width: 32,
    height: 4,
    marginHorizontal: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
  },
  activeDot: {
    width: 32,
    height: 4,
    marginHorizontal: 4,
    backgroundColor: "#10B981",
    borderRadius: 2,
  },
});