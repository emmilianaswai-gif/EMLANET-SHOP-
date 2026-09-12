import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../components/ui";
import { colors, font, radius, spacing, shadow } from "../theme";

export default function About() {
  const systemVersion = "v2.4.1-stable";
  const buildDate = "June 2026";

  return (
    <SafeAreaView edges={["bottom"]} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Document Header */}
        <View style={styles.header}>
          <Text style={styles.h1}>About Shop Manager Pro</Text>
          <Text style={styles.headerSub}>
            Platform information, core system metrics, and developer build specifications.
          </Text>
        </View>

        <View style={styles.mainRow}>
          <View style={styles.narrative}>
            <Text style={styles.narrativeTitle}>The Modern Retail Operating System</Text>
            <Text style={styles.paragraph}>
              Shop Manager Pro is an all-in-one inventory tracking, sales processing, and analytics solution built to streamline retail environments. By combining lightning-fast data processing with clear visual graphs, the system removes administrative friction so you can focus entirely on growing your storefront.
            </Text>
            <Text style={styles.paragraph}>
              Designed using state-of-the-art modular single-page application architecture, this frontend client communicates efficiently with your centralized database cluster to provide smooth performance even during high-traffic checkout rush hours.
            </Text>
          </View>

          {/* System Build Specs Sidebar Box */}
          <View style={styles.specsBox}>
            <Text style={styles.specsTitle}>Build Diagnostics</Text>
            <View style={{ gap: 10, fontSize: font.sm }}>
              <View>
                <Text style={styles.specLabel}>Software Version:</Text>
                <Text style={{ color: colors.primary, fontWeight: "700" }}>{systemVersion}</Text>
              </View>
              <View>
                <Text style={styles.specLabel}>Release Cycle:</Text>
                <Text style={{ color: colors.slate900, fontWeight: "700" }}>{buildDate}</Text>
              </View>
              <View>
                <Text style={styles.specLabel}>Environment Framework:</Text>
                <Text style={{ color: colors.slate900, fontWeight: "700" }}>Vite + React 18</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Core Infrastructure Checkmarks */}
        <Text style={styles.subsectionTitle}>Activated Core Subsystems</Text>
        <View style={styles.features}>
          {[
            "Real-Time Analytics",
            "Automated Stock Warnings",
            "Secured Route Protection",
            "Session State Caching",
            "Multi-Method Payment Ledgers",
            "Dynamic User Welcome Profiles",
          ].map((feature) => (
            <Card key={feature} style={styles.featureBadge} padded={false}>
              <View style={styles.featureRow}>
                <Text style={{ color: "#16a34a", fontWeight: "700", marginRight: 6 }}>{"\u2713"}</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  scroll: { padding: spacing.xl, maxWidth: 850, alignSelf: "center", width: "100%" },
  header: { marginBottom: 35, borderBottomWidth: 1, borderBottomColor: colors.slate200, paddingBottom: spacing.xl },
  h1: { fontSize: 26, fontWeight: "700", color: colors.slate900, marginBottom: 5 },
  headerSub: { color: colors.slate500, fontSize: font.base },
  mainRow: { gap: spacing.xl, marginBottom: spacing["2xl"] },
  narrative: { flex: 2 },
  narrativeTitle: { fontSize: 18, fontWeight: "600", color: colors.slate700, marginBottom: 10 },
  paragraph: { fontSize: font.base, color: colors.slate600, marginBottom: spacing.md, lineHeight: 22 },
  specsBox: {
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radius.lg,
    padding: spacing.xl,
    flex: 1,
  },
  specsTitle: {
    marginBottom: spacing.md,
    fontSize: font.base,
    fontWeight: "700",
    color: colors.slate700,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  specLabel: { color: colors.slate500, fontSize: font.sm, marginBottom: 2 },
  subsectionTitle: { fontSize: font.lg, fontWeight: "600", marginBottom: spacing.md, color: colors.slate700 },
  features: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  featureBadge: {
    padding: spacing.md,
    width: "48%",
    borderWidth: 1,
    borderColor: colors.slate200,
    ...shadow.card,
  },
  featureRow: { flexDirection: "row", alignItems: "center" },
  featureText: { fontSize: font.base, fontWeight: "500", color: colors.slate700 },
});