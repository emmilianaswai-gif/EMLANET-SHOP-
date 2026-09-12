import { View, Text, ScrollView, RefreshControl, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Footer from "../../Layout/Footer";
import { colors, font, spacing } from "../../theme";

// Standard page wrapper: page background, optional title header, scrollable
// body and the app footer. Mirrors the web app's <main> area.
export default function Screen({
  title,
  subtitle,
  children,
  scroll = true,
  refreshing,
  onRefresh,
  padded = true,
  right,
  style,
  contentStyle,
  showFooter = true,
  keyboardShouldPersistTaps = undefined,
}) {
  const body = (
    <>
      {!!title && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {right}
        </View>
      )}
      <View style={[padded && styles.padded, contentStyle]}>{children}</View>
    </>
  );

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.root, style]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? "handled"}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            ) : undefined
          }
        >
          {body}
          {showFooter && <Footer />}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {body}
          {showFooter && <Footer />}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    marginBottom: spacing.md,
  },
  headerText: { flex: 1, paddingRight: spacing.sm },
  title: { fontSize: font.xl, fontWeight: "700", color: colors.slate900 },
  subtitle: { fontSize: font.xs, color: colors.slate400, marginTop: 2 },
  padded: { paddingHorizontal: spacing.lg },
});