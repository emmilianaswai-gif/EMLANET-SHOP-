import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNav } from "../navigation/nav";
import { colors, font, radius, spacing, shadow } from "../theme";
import { useLanguage } from "../i18n";

const menuItems = [
  { id: "profile", label: "Profile Settings", icon: "person-outline", color: "#059669", description: "Store name, logo, and contact info", route: "/profile-settings" },
  { id: "system", label: "System Settings", icon: "shield-checkmark-outline", color: "#0d9488", description: "Tax rates, thresholds, and preferences", route: "/system-settings" },
  { id: "help", label: "Help & Support", icon: "help-circle-outline", color: "#ea580c", description: "Guides, FAQs, and troubleshooting", route: "/help" },
  { id: "feedback", label: "Feedback", icon: "chatbubble-ellipses-outline", color: "#ca8a04", description: "Report issues or suggest improvements", route: "/feedback" },
  { id: "about", label: "About", icon: "information-circle-outline", color: "#64748b", description: "Version info and changelog", route: "/about" },
  { id: "terms", label: "Terms of Service", icon: "document-text-outline", color: "#475569", description: "Legal terms and conditions", route: "/terms" },
  { id: "privacy", label: "Privacy Policy", icon: "lock-closed-outline", color: "#6d28d9", description: "Data handling and privacy", route: "/privacy" },
  { id: "support", label: "Contact Support", icon: "headset-outline", color: "#0d9488", description: "Reach our support team", route: "/support" },
];

export default function Setting() {
  useLanguage();
  const nav = useNav();

  return (
    <SafeAreaView edges={["bottom"]} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Ionicons name="settings" size={32} color="#60a5fa" />
          </View>
          <Text style={styles.heroTitle}>Settings</Text>
          <Text style={styles.heroSubtitle}>Click to configure your shop</Text>
          <View style={styles.miniIcons}>
            {["person-outline", "shield-checkmark-outline", "people-outline", "help-circle-outline"].map((icon, i) => (
              <View key={i} style={styles.miniIconBox}>
                <Ionicons name={icon} size={13} color="#475569" />
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Configure Your Shop</Text>
        <Text style={styles.sectionSubtitle}>Choose a category below to get started</Text>

        <View style={styles.grid}>
          {menuItems.map((item) => (
            <Pressable key={item.id} style={styles.card} onPress={() => nav(item.route)}>
              <View style={[styles.cardIconWrap, { backgroundColor: `${item.color}12`, borderColor: `${item.color}20` }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={styles.cardLabel}>{item.label}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
              <View style={[styles.openBadge, { backgroundColor: `${item.color}08`, borderColor: `${item.color}18` }]}>
                <Text style={[styles.openText, { color: item.color }]}>Open</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  scroll: { padding: spacing.xl },
  hero: {
    alignItems: "center", paddingVertical: spacing["2xl"], marginBottom: spacing.xl,
    backgroundColor: colors.slate800, borderRadius: radius.xl, overflow: "hidden", ...shadow.raised,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(37,99,235,0.2)", borderWidth: 2, borderColor: "rgba(37,99,235,0.3)",
    alignItems: "center", justifyContent: "center", marginBottom: spacing.lg,
  },
  heroTitle: { fontSize: font["2xl"], fontWeight: "800", color: "#f1f5f9", letterSpacing: -0.5 },
  heroSubtitle: { fontSize: font.sm, color: "#64748b", marginTop: 6 },
  miniIcons: { flexDirection: "row", gap: 6, marginTop: spacing.md },
  miniIconBox: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: colors.slate900, marginBottom: 6 },
  sectionSubtitle: { fontSize: font.sm, color: "#64748b", marginBottom: spacing.xl },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, maxWidth: 960, alignSelf: "center" },
  card: {
    width: "47%", flexGrow: 1, minWidth: 180,
    alignItems: "center", padding: 28, backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#e2e8f0", borderRadius: radius.xl,
    gap: 12, ...shadow.card,
  },
  cardIconWrap: {
    width: 56, height: 56, borderRadius: 14, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  cardLabel: { fontSize: font.base, fontWeight: "700", color: colors.slate900, textAlign: "center" },
  cardDesc: { fontSize: font.xs, color: "#94a3b8", textAlign: "center", lineHeight: 16 },
  openBadge: {
    paddingVertical: 4, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1,
  },
  openText: { fontSize: font.xs, fontWeight: "600" },
});
