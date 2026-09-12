import { View, Text, StyleSheet } from "react-native";
import { statusColor, colors, font, radius } from "../../theme";

export default function Badge({ text, tone, style }) {
  const t = tone || statusColor(text);
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.text, { color: t.fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
  },
  text: { fontSize: font.xs, fontWeight: "700" },
});