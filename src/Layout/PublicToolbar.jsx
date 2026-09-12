import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage, t } from "../i18n";
import { nav } from "../navigation/nav";
import LanguageSwitcher from "./LanguageSwitcher";
import { colors, font, spacing } from "../theme";

// Auth/public pages top bar with a language switcher and quick links.
export default function PublicToolbar() {
  useLanguage();
  const links = [
    { key: "login", path: "/login" },
    { key: "register", path: "/register" },
    { key: "shopRegistration", path: "/register-shop" },
  ];
  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <Ionicons name="storefront" size={18} color={colors.white} />
        <Text style={styles.brand}>EMLANETSHOP</Text>
      </View>
      <View style={styles.right}>
        {links.map((l) => (
          <Pressable key={l.key} onPress={() => nav(l.path)} hitSlop={6}>
            <Text style={styles.link}>{t(l.key)}</Text>
          </Pressable>
        ))}
        <LanguageSwitcher compact />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.slate800,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { color: colors.white, fontWeight: "800", fontSize: font.base },
  right: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  link: { color: colors.slate300, fontSize: font.sm, fontWeight: "600" },
});