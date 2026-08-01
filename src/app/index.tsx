import { useCallback } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";

const ONSPACE_URL =
  (process.env["EXPO_PUBLIC_ONSPACE_URL"] as string | undefined)?.trim() || "https://onspace.ai";

export default function IndexScreen() {
  const openOnSpace = useCallback(async () => {
    const canOpen = await Linking.canOpenURL(ONSPACE_URL);
    if (!canOpen) {
      Alert.alert(
        "Cannot open link",
        `The URL "${ONSPACE_URL}" cannot be opened on this device.\n\nSet EXPO_PUBLIC_ONSPACE_URL to a reachable address and rebuild.`,
        [{ text: "OK" }],
      );
      return;
    }
    await Linking.openURL(ONSPACE_URL);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#070a10",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 16,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>Butler AI</Text>
      <Text style={{ color: "#d7dbe2", fontSize: 15, textAlign: "center", lineHeight: 22 }}>
        Native preview route is active. Open the deployed web shell from OnSpace.
      </Text>
      <Pressable
        onPress={() => void openOnSpace()}
        style={{
          backgroundColor: "#ff6a1f",
          borderRadius: 999,
          paddingHorizontal: 22,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>Open OnSpace</Text>
      </Pressable>
    </View>
  );
}
