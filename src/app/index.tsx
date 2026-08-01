import { useCallback } from "react";
import { Linking, Pressable, Text, View } from "react-native";

const FALLBACK_URL = "https://onspace.ai";

export default function IndexScreen() {
  const openOnSpace = useCallback(() => {
    void Linking.openURL(FALLBACK_URL);
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
        onPress={openOnSpace}
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
