import { useState } from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LANGUAGES, useLanguage, getLanguage, getDir } from "../i18n";
import Modal from "../components/ui/Modal";
import { colors, font, radius, spacing } from "../theme";

// Native language switcher: a globe button opens a modal list of supported
// languages (same list the web app's dropdown used).
export default function LanguageSwitcher({ compact = false }) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <>
      <Pressable
        style={styles.button}
        onPress={() => setOpen(true)}
        accessibilityLabel="Change language"
      >
        <Ionicons name="globe-outline" size={16} color={colors.slate700} />
        {!compact && <Text style={styles.buttonText}>{current.label}</Text>}
      </Pressable>
      <Modal visible={open} onClose={() => setOpen(false)} title="Language">
        {LANGUAGES.map((l) => {
          const active = l.code === lang;
          return (
            <Pressable
              key={l.code}
              style={[styles.row, active && styles.rowActive]}
              onPress={() => {
                setLang(l.code);
                setOpen(false);
              }}
            >
              <Text style={styles.flag}>{l.flag}</Text>
              <Text style={[styles.rowText, active && styles.rowTextActive]}>{l.label}</Text>
              {l.code === "ar" && (
                <Text style={styles.hint}>RTL</Text>
              )}
              {active && <Ionicons name="checkmark" size={14} color={colors.primary} />}
            </Pressable>
          );
        })}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: colors.slate100,
  },
  buttonText: { fontSize: font.xs, fontWeight: "700", color: colors.slate700 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.slate100,
  },
  rowActive: { backgroundColor: colors.primaryLight },
  flag: { fontSize: font.lg },
  rowText: { flex: 1, fontSize: font.base, color: colors.slate700 },
  rowTextActive: { color: colors.primary, fontWeight: "700" },
  hint: { fontSize: 9, color: colors.slate400, borderWidth: 1, borderColor: colors.slate300, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
});