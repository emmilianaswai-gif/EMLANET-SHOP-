import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, spacing } from "../../theme";

export default function EmptyState({ message, icon = "file-tray-outline", sub }) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={colors.slate300} />
      <Text style={styles.message}>{message}</Text>
      {!!sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", padding: spacing.xl },
  message: { marginTop: spacing.sm, color: colors.slate500, fontSize: font.base, textAlign: "center" },
  sub: { marginTop: 4, color: colors.slate400, fontSize: font.sm, textAlign: "center" },
});