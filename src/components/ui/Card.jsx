import { View, StyleSheet } from "react-native";
import { colors, radius, shadow } from "../../theme";

export default function Card({ children, style, padded = true }) {
  return (
    <View style={[styles.card, padded && styles.pad, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    ...shadow.card,
  },
  pad: { padding: 14 },
});