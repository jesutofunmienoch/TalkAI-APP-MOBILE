import { Stack } from "expo-router";
import { DocumentProvider } from "../../context/DocumentContext";

const Layout = () => {
  return (
    <DocumentProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="document-view" options={{ headerShown: false }} />
      </Stack>
    </DocumentProvider>
  );
};

export default Layout;