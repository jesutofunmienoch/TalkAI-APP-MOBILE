// app/document/[docId]/summary.tsx
import { View, Text, StyleSheet } from "react-native";

export default function Summary() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>📝 Note Page</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 18, fontWeight: "600" },
});
