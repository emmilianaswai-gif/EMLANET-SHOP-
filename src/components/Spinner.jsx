import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { colors, font } from "../theme";

// Native spinner. `variant` is accepted for API compatibility with the web
// Spinner but the native implementation renders an ActivityIndicator.
export default function Spinner({ variant = "segments", size = 32, color = colors.slate700, text = "", style = {} }) {
  return (
    <View style={[styles.wrap, style]}>
      <ActivityIndicator size="small" color={color} style={variant === "segments" ? { transform: [{ scale: size / 24 }] } : undefined} />
      <Text style={[styles.text, { color }]}>{text || (variant === "segments" ? "LOADING" : "")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  text: { fontSize: font.xs, fontWeight: "700", letterSpacing: 1 },
});