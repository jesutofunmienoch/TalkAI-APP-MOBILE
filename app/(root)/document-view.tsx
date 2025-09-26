// app/(root)/document-view.tsx
import { Stack } from "expo-router";
import DocumentView from "@/components/DocumentView";

export default function DocumentViewScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <DocumentView />
    </>
  );
}