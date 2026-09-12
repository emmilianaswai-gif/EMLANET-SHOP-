import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, font, radius, spacing } from "../../theme";

export default function Button({
  title,
  variant = "primary",
  size = "md",
  onPress,
  disabled,
  loading,
  icon,
  style,
}) {
  const palette = {
    primary: { bg: colors.primary, fg: "#fff", border: colors.primary },
    secondary: { bg: colors.slate800, fg: "#fff", border: colors.slate800 },
    danger: { bg: colors.danger, fg: "#fff", border: colors.danger },
    success: { bg: colors.success, fg: "#fff", border: colors.success },
    outline: { bg: "#fff", fg: colors.slate700, border: colors.slate300 },
    ghost: { bg: "transparent", fg: colors.primary, border: "transparent" },
    dangerGhost: { bg: "transparent", fg: colors.danger, border: "transparent" },
  }[variant];

  const sizeStyle = {
    sm: { paddingVertical: 6, paddingHorizontal: 12, fontSize: font.sm, gap: 5 },
    md: { paddingVertical: 10, paddingHorizontal: 16, fontSize: font.base, gap: 6 },
    lg: { paddingVertical: 13, paddingHorizontal: 20, fontSize: font.lg, gap: 8 },
  }[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border },
        sizeStyle,
        pressed && !disabled && !loading && { opacity: 0.85 },
        (disabled || loading) && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <>
          {icon}
          {!!title && <Text style={[styles.text, { color: palette.fg, fontSize: sizeStyle.fontSize }]}>{title}</Text>}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
  },
  text: { fontWeight: "700" },
});