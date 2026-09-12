import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage, t } from "../i18n";
import { useTenant } from "../TenantContext";
import { labelKeyForScreen } from "../navigation/navRoutes";
import LanguageSwitcher from "./LanguageSwitcher";
import { colors, font, spacing } from "../theme";

// Native in-app header, shown on every drawer screen (mirrors the web Header).
export default function Header() {
  useLanguage();
  const navigation = useNavigation();
  const route = useRoute();
  const { shopName } = useTenant();
  const labelKey = labelKeyForScreen(route?.name);
  const title = labelKey ? t(labelKey) : route?.name || "";

  return (
    <View style={styles.bar}>
      <Pressable onPress={() => navigation.openDrawer()} hitSlop={8} style={styles.menu}>
        <Ionicons name="menu" size={22} color={colors.white} />
      </Pressable>
      <View style={styles.titles}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {!!shopName && <Text style={styles.sub} numberOfLines={1}>{shopName}</Text>}
      </View>
      <View style={styles.actions}>
        <LanguageSwitcher compact />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.slate800,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  menu: { padding: 4 },
  titles: { flex: 1, minWidth: 0 },
  title: { color: colors.white, fontSize: font.lg, fontWeight: "700" },
  sub: { color: colors.slate400, fontSize: font.xs },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});