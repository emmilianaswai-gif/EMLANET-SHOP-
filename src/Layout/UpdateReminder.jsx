import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage, t } from "../i18n";
import { isUpdateDue, dismissUpdate, checkAndApplyUpdate } from "../utils/appUpdater";
import { colors, font, radius } from "../theme";

// Simplified update reminder. The web version reloads the page to grab a new
// service-worker build; here we just show a dismissible notice on first
// run-after-30-days. It's a no-op you can remove entirely.
export default function UpdateReminder() {
  useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isUpdateDue()) setVisible(true);
  }, []);

  const apply = () => {
    checkAndApplyUpdate();
    dismissUpdate();
    setVisible(false);
  };
  const later = () => {
    dismissUpdate();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="sparkles-outline" size={16} color={colors.warning} />
      <Text style={styles.text}>{t("updateAvailable") || "A new version is available."}</Text>
      <Pressable onPress={apply} style={styles.btnPrimary}>
        <Text style={styles.btnPrimaryText}>Update</Text>
      </Pressable>
      <Pressable onPress={later}>
        <Text style={styles.btnGhost}>Later</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.warningLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexWrap: "wrap",
  },
  text: { flex: 1, fontSize: font.sm, color: colors.slate700, fontWeight: "600", minWidth: 120 },
  btnPrimary: { backgroundColor: colors.warning, borderRadius: radius.sm, paddingVertical: 5, paddingHorizontal: 12 },
  btnPrimaryText: { color: "#fff", fontSize: font.xs, fontWeight: "700" },
  btnGhost: { color: colors.slate500, fontSize: font.xs, fontWeight: "700" },
});