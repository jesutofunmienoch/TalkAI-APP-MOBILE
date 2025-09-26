// app/(root)/humanize.tsx
import React, { useState, useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInput,
  Modal,
  FlatList,
  Image,
  ScrollView,
  Dimensions,
  Alert,
  TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Polygon, Circle, Line, G, Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";

const { width } = Dimensions.get("window");
const CARD_PADDING = 16;

const LANGUAGES = [
  "English (US)",
  "Spanish",
  "French",
  "German",
  "Chinese (Simplified)",
  "Arabic",
  "Portuguese (Brazil)",
  "Hindi",
  "Russian",
  "Japanese",
];

export default function Humanize(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<"humanize" | "checker">("humanize");
  const [text, setText] = useState("");
  const [humanized, setHumanized] = useState("");
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([LANGUAGES[0]]);
  const [analysis, setAnalysis] = useState<number[]>([]);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Paste from clipboard
  async function handlePaste() {
    try {
      const clip = await Clipboard.getStringAsync();
      if (!clip) return Alert.alert("Clipboard empty", "There is no text in your clipboard.");
      setText(clip);
    } catch (e) {
      Alert.alert("Error", "Could not read clipboard");
    }
  }

  // Insert sample text
  function handleTrySample() {
    const sample =
      "Artificial intelligence is transforming industries. It can generate fluent, coherent text but sometimes lacks humanlike quirks. The goal here is to make machine-generated text sound more natural and conversational.";
    setText(sample);
  }

  // Toggle language selection
  function toggleLanguage(l: string) {
    setSelectedLangs([l]);
  }

  // Copy humanized text
  async function handleCopy() {
    await Clipboard.setStringAsync(humanized);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Simple humanize algorithm (lightweight demo)
  function handleHumanize() {
    if (!text.trim() || isHumanizing) return;

    setIsHumanizing(true);

    setTimeout(() => {
      // contractions map
      const contractions: Record<string, string> = {
        "do not": "don't",
        "does not": "doesn't",
        "did not": "didn't",
        "is not": "isn't",
        "are not": "aren't",
        "I am": "I'm",
        "I will": "I'll",
        "cannot": "can't",
        "will not": "won't",
        "it is": "it's",
        "we are": "we're",
        "they are": "they're",
        "you are": "you're",
        "in order to": "to",
      };

      // split into sentences
      const sentences = text.match(/[^.!?]+[.!?]?/g) || [text];
      const transformed = sentences
        .map(s => s.trim())
        .map((s, i) => {
          let out = s;
          // apply some contractions and casual phrases
          Object.keys(contractions).forEach(k => {
            const re = new RegExp(k, "gi");
            out = out.replace(re, contractions[k]);
          });
          // randomly shorten or add a conversational tail
          if (i % 2 === 0 && out.length > 40) {
            // shorten clunky clauses
            out = out.replace(/for the purpose of|with the aim of/gi, "to");
          }
          if (i % 3 === 0 && Math.random() > 0.5) {
            out = out.replace(/\.$/, "");
            out = out + ", you know?";
          }
          return out;
        })
        .join(" ");

      setHumanized(transformed);

      // Also run quick analysis so user can see improvement
      const before = analyzeText(text);
      const after = analyzeText(transformed);
      setAnalysis(before);
      setOverallScore(calcOverallScore(after));
      setActiveTab("checker");
      setIsHumanizing(false);
    }, 1500);
  }

  // Quick analysis heuristics for AI-likeness. Returns array of 5 metric scores (0-100) for the radar:
  // [Perplexity-ish, Burstiness, Repetition, Bigram-Repetition, Regularity]
  function analyzeText(t: string): number[] {
    const cleaned = t.replace(/["'`]/g, "");
    const tokens = cleaned.match(/\b\w+\b/g) || [];
    const sentences = cleaned.match(/[^.!?]+[.!?]?/g) || [cleaned];

    const avgWordLen = tokens.reduce((s, w) => s + w.length, 0) / Math.max(1, tokens.length);
    const sentLens = sentences.map(s => (s.match(/\b\w+\b/g) || []).length);
    const avgSentLen = sentLens.reduce((s, x) => s + x, 0) / Math.max(1, sentLens.length);

    // repetition: fraction of words that appear more than once
    const freq: Record<string, number> = {};
    tokens.forEach(w => {
      const key = w.toLowerCase();
      freq[key] = (freq[key] || 0) + 1;
    });
    const repeatedWords = Object.values(freq).filter(c => c > 1).reduce((s, c) => s + (c - 1), 0);
    const repetitionRatio = tokens.length ? repeatedWords / tokens.length : 0;

    // bigram repetition
    const bigrams: Record<string, number> = {};
    for (let i = 0; i < tokens.length - 1; i++) {
      const b = `${tokens[i].toLowerCase()} ${tokens[i + 1].toLowerCase()}`;
      bigrams[b] = (bigrams[b] || 0) + 1;
    };
    const repeatedBigrams = Object.values(bigrams).filter(c => c > 1).reduce((s, c) => s + (c - 1), 0);
    const bigramRatio = tokens.length ? repeatedBigrams / Math.max(1, tokens.length - 1) : 0;

    // burstiness: normalized variance of sentence lengths (AI tends to have low variance -> low burstiness)
    const mean = avgSentLen;
    const variance = sentLens.reduce((s, l) => s + Math.pow(l - mean, 2), 0) / Math.max(1, sentLens.length);
    const std = Math.sqrt(variance);
    // normalized variance between 0 and 1 (heuristic)
    const normVar = Math.min(1, variance / Math.max(1, Math.pow(mean, 2)));

    // map heuristics to 0-100 where higher means more AI-like
    const perplexityScore = Math.min(100, Math.max(0, (avgWordLen - 4) * 25 + 20));
    const burstinessScore = Math.round((1 - Math.min(1, normVar)) * 100); // low variance -> high AI-likeness
    const repetitionScore = Math.round(Math.min(1, repetitionRatio) * 100);
    const bigramScore = Math.round(Math.min(1, bigramRatio) * 100);
    const regularityScore = Math.round((1 - (std / Math.max(1, mean))) * 100);

    const metrics = [perplexityScore, burstinessScore, repetitionScore, bigramScore, regularityScore].map(n =>
      Math.round(n)
    );
    return metrics;
  }

  function calcOverallScore(metrics: number[]) {
    if (!metrics || metrics.length === 0) return 0;
    // simple weighted average
    const weights = [0.20, 0.25, 0.20, 0.20, 0.15];
    const sum = metrics.reduce((s, m, i) => s + m * weights[i], 0);
    return Math.round(sum);
  }

  // Get explanation for metric
  function getReason(label: string, value: number): string {
    if (label === "Perplexity") return "High perplexity suggests unusual word choices or complexity typical of AI generation.";
    if (label === "Burstiness") return "Low burstiness means consistent sentence lengths, a common AI trait.";
    if (label === "Repetition") return "Excessive word repetition can indicate mechanical writing.";
    if (label === "Bigram Rep") return "Repeated phrase patterns are often seen in AI output.";
    if (label === "Regularity") return "High regularity points to predictable structure, unlike natural human variation.";
    return "";
  }

  // Run analysis for AI Checker tab
  function handleRunCheck() {
    if (!text.trim()) return Alert.alert("No text", "Please enter or paste text to check.");
    const metrics = analyzeText(text);
    setAnalysis(metrics);
    setOverallScore(calcOverallScore(metrics));
    setActiveTab("checker");
  }

  // Radar chart component (small, using react-native-svg)
  function RadarChart({ values, labels, size = 300 }: { values: number[]; labels: string[]; size?: number }) {
    const axes = labels.length;
    const levels = 4;
    const radius = size / 2 - 20;
    const cx = size / 2;
    const cy = size / 2;

    // compute points for polygon
    const points = values
      .map((v, i) => {
        const angle = (Math.PI * 2 * i) / axes;
        const r = (v / 100) * radius;
        const x = cx + r * Math.sin(angle);
        const y = cy - r * Math.cos(angle);
        return `${x},${y}`;
      })
      .join(" ");

    // points for label positions (slightly outside)
    const labelPoints = labels.map((l, i) => {
      const angle = (Math.PI * 2 * i) / axes;
      const r = radius + 1;
      const x = cx + r * Math.sin(angle);
      const y = cy - r * Math.cos(angle);
      return { x, y };
    });

    return (
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="radarGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#a78bfa" stopOpacity="0.4" />
            <Stop offset="1" stopColor="#7c3aed" stopOpacity="0.1" />
          </SvgLinearGradient>
        </Defs>
        <G>
          {/* concentric circles */}
          {Array.from({ length: levels }, (_, i) => {
            const r = radius * ((i + 1) / levels);
            return <Circle key={`c-${i}`} cx={cx} cy={cy} r={r} stroke="#e6e6e6" strokeWidth={1} fill="none" />;
          })}

          {/* spokes */}
          {Array.from({ length: axes }, (_, i) => {
            const angle = (Math.PI * 2 * i) / axes;
            const x = cx + radius * Math.sin(angle);
            const y = cy - radius * Math.cos(angle);
            return <Line key={`l-${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke="#f2f2f2" strokeWidth={1} />;
          })}

          {/* data polygon */}
          <Polygon points={points} fill="url(#radarGrad)" stroke="#7c3aed" strokeWidth={2} />

          {/* small circles at points */}
          {values.map((v, i) => {
            const angle = (Math.PI * 2 * i) / axes;
            const r = (v / 100) * radius;
            const x = cx + r * Math.sin(angle);
            const y = cy - r * Math.cos(angle);
            return <Circle key={`p-${i}`} cx={x} cy={y} r={3} fill="#7c3aed" />;
          })}

          {/* labels */}
          {labelPoints.map((p, i) => (
            <SvgText
              key={`t-${i}`}
              x={p.x}
              y={p.y}
              fontSize={11}
              textAnchor={p.x > cx ? "start" : p.x < cx ? "end" : "middle"}
              fill="#000000"
            >
              {labels[i]}
            </SvgText>
          ))}
        </G>
      </Svg>
    );
  }

  const metricLabels = [
    "Perplexity",
    "Burstiness",
    "Repetition",
    "Bigram Rep",
    "Regularity",
  ];

  // Explanations component
  const Explanations = () => {
    const highMetrics = metricLabels
      .map((l, i) => ({ label: l, value: analysis[i] || 0 }))
      .filter(m => m.value > 50);

    if (highMetrics.length === 0) {
      return (
        <Text style={{ color: "#16a34a", fontSize: 14, marginTop: 8 }}>
          This text appears very human-like with low AI indicators across all metrics.
        </Text>
      );
    }

    return (
      <View>
        {highMetrics.map((m, idx) => (
          <View key={idx} style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: "500", color: "#0F172A" }}>
              {m.label}: {m.value}%
            </Text>
            <Text style={{ color: "#64748b", fontSize: 13 }}>
              {getReason(m.label, m.value)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top header / nav */}
      <View style={styles.headerWrap}>
        <TouchableOpacity style={styles.closeBtn} activeOpacity={0.8} onPress={() => router.back()}>
          <Feather name="x" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Humanize AI</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabWrap}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "humanize" && styles.tabBtnActive]}
          onPress={() => setActiveTab("humanize")}
        >
          <Text style={[styles.tabText, activeTab === "humanize" && styles.tabTextActive]}>Humanize AI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "checker" && styles.tabBtnActive]}
          onPress={() => setActiveTab("checker")}
        >
          <Text style={[styles.tabText, activeTab === "checker" && styles.tabTextActive]}>AI Checker</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* language + input card */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.langPill} onPress={() => setLangModalVisible(true)}>
            <Text style={styles.langText}>{selectedLangs[0] || "Select language"}</Text>
            <Feather name="chevron-down" size={16} color="#065f46" />
          </TouchableOpacity>

          <TextInput
            multiline
            value={text}
            onChangeText={setText}
            placeholder={'To humanize text, enter or paste it here and press "Humanize."'}
            style={styles.textArea}
            textAlignVertical="top"
          />

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.outlineBtn} onPress={handleTrySample} activeOpacity={0.8}>
              <Feather name="edit" size={16} color="#374151" />
              <Text style={styles.outlineBtnText}>  Try Sample Text</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn} onPress={handlePaste} activeOpacity={0.8}>
              <Feather name="clipboard" size={16} color="#374151" />
              <Text style={styles.outlineBtnText}>  Paste Text</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Humanize button */}
        <View style={{ marginVertical: 10 }}>
          <TouchableOpacity activeOpacity={0.9} onPress={handleHumanize}>
            <LinearGradient
              colors={["#a78bfa", "#7c3aed"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.primaryBtn, { opacity: isHumanizing ? 0.7 : 1 }]}
            >
              <Feather name="zap" size={18} color="#ffffff" />
              <Text style={styles.primaryBtnText}> {isHumanizing ? "Humanizing..." : "Humanize"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Show humanized result if present */}
        {humanized ? (
          <View style={[styles.card, { marginTop: 8 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ fontWeight: "700" }}>Humanized result</Text>
              <TouchableOpacity onPress={handleCopy} activeOpacity={0.8}>
                {copied ? (
                  <Text style={{ color: "#374151", fontWeight: "600" }}>Copied!</Text>
                ) : (
                  <Feather name="copy" size={18} color="#374151" />
                )}
              </TouchableOpacity>
            </View>
            <Text style={{ color: "#111827" }}>{humanized}</Text>
          </View>
        ) : null}

        {/* AI Checker area (also shows radar chart) */}
        {activeTab === "checker" && (
          <View style={[styles.card, { alignItems: "center" }]}>
            <Text style={{ fontWeight: "700", marginBottom: 8 }}>AI-likeness check</Text>
            <View style={{ flexDirection: "column", alignItems: "center" }}>
              <RadarChart values={analysis.length ? analysis : [35, 45, 20, 10, 30]} labels={metricLabels} size={260} />
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, justifyContent: "center" }}>
                <View style={{ alignItems: "center", marginRight: 20 }}>
                  <Text style={{ fontSize: 28, fontWeight: "700", color: overallScore && overallScore > 60 ? "#b45309" : "#065f46" }}>
                    {overallScore ?? 42}%
                  </Text>
                  <Text style={{ fontSize: 12, marginTop: 6, color: "#475569" }}>AI-likeness</Text>
                </View>
                <TouchableOpacity style={[styles.outlineBtn, { marginTop: 0 }]} onPress={handleRunCheck}>
                  <Feather name="refresh-cw" size={14} color="#374151" />
                  <Text style={[styles.outlineBtnText, { color: "#374151" }]}>  Re-check</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ marginTop: 20, width: "100%" }}>
              <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 10, color: "#94A3B8" }}>WHY IT LOOKS LIKE AI</Text>
              <Explanations />
            </View>
          </View>
        )}

        {/* Footer note */}
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: "#6b7280", fontSize: 12 }}>Select language</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
            {selectedLangs.map(l => (
              <View key={l} style={styles.languageChip}>
                <Text style={{ color: "#065f46" }}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

       
      </ScrollView>

      {/* Language modal */}
      <Modal visible={langModalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => setLangModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
              <Text style={{ fontWeight: "700", marginBottom: 8 }}>Choose language</Text>
              <FlatList
                data={LANGUAGES}
                keyExtractor={i => i}
                renderItem={({ item }) => {
                  const checked = selectedLangs.includes(item);
                  return (
                    <TouchableOpacity style={styles.langRow} onPress={() => toggleLanguage(item)}>
                      <Text>{item}</Text>
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked && <Feather name="check" size={12} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                <TouchableOpacity style={styles.modalBtn} onPress={() => setLangModalVisible(false)}>
                  <Text>Done</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#dcfce7" }]} onPress={() => setSelectedLangs([LANGUAGES[0]])}>
                  <Text>Reset</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingTop: Platform.OS === "android" ? 24 : 12,
  },
  headerWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  tabWrap: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  tabBtnActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E9EE",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    color: "#374151",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#065f46",
  },
  card: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: CARD_PADDING,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  langPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderColor: "#bbf7d0",
    borderWidth: 1,
    backgroundColor: "#f0fff4",
    marginBottom: 12,
  },
  langText: { color: "#065f46", fontWeight: "700" },
  textArea: {
    minHeight: 160,
    maxHeight: 320,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#ffffff",
    color: "#111827",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderColor: "#d1d5db",
    borderWidth: 1,
    backgroundColor: "#fff",
  },
  outlineBtnText: {
    color: "#374151",
    fontWeight: "600",
  },
  primaryBtn: {
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", marginLeft: 8 },
  languageChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "#ecfdf5",
    marginRight: 8,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: "60%",
  },
  langRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomColor: "#f3f4f6",
    borderBottomWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e6e6e6",
  },
});