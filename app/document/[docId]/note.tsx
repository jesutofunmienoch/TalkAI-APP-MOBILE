// app/document/[docId]/note.tsx
import { View, Text, StyleSheet } from "react-native";

export default function Note() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>📝 Notes Page</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 18, fontWeight: "600" },
});
