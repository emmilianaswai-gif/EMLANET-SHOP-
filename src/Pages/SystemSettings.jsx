import { useState, useEffect } from "react";
import { View, Text, ScrollView, Switch, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import { useLanguage } from "../i18n";
import { useTheme } from "../ThemeContext";
import { useSystemSettings } from "../SystemSettingsContext";
import { TextField, SelectField, Button, Card } from "../components/ui";
import { colors, font, spacing, shadow } from "../theme";

const systemFields = [
  { name: "taxRate", label: "Tax Rate (%)", icon: "options-outline", default: "8.25", keyboardType: "numeric" },
  { name: "lowStockThreshold", label: "Low Stock Alert", icon: "notifications-outline", default: "10", keyboardType: "numeric" },
  { name: "piecesPerBundle", label: "Pieces per Bundle", icon: "cube-outline", default: "1", keyboardType: "numeric" },
  { name: "sessionTimeout", label: "Session Timeout (min)", icon: "lock-closed-outline", default: "60", keyboardType: "numeric" },
];

const languageOptions = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "sw", label: "Swahili" },
];

export default function SystemSettings() {
  const { lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { reload } = useSystemSettings();
  const [form, setForm] = useState(() => {
    const initial = {};
    systemFields.forEach((f) => (initial[f.name] = f.default));
    initial.autoInvoicing = true;
    initial.darkMode = theme === "dark";
    initial.language = lang || "en";
    return initial;
  });
  const [savedIds, setSavedIds] = useState({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.get("/system-settings").then(({ data }) => {
      if (Array.isArray(data)) {
        const flat = {};
        const ids = {};
        data.forEach((s) => {
          if (s.key) {
            flat[s.key] = s.value || "";
            ids[s.key] = s.id;
          }
        });
        ["autoInvoicing", "darkMode"].forEach((k) => { flat[k] = flat[k] === "true"; });
        if (flat.language === undefined) flat.language = lang;
        if (flat.darkMode === undefined) flat.darkMode = theme === "dark";
        setForm((prev) => ({ ...prev, ...flat }));
        setSavedIds(ids);
      }
    }).catch(() => {});
  }, [lang, theme]);

  const handleSubmit = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const promises = [];
      const allKeys = [...systemFields.map((f) => f.name), "language", "autoInvoicing", "darkMode"];
      for (const key of allKeys) {
        const value = String(form[key] ?? "");
        const payload = { key, value, description: key };
        if (savedIds[key]) {
          promises.push(api.put(`/system-settings/${savedIds[key]}`, payload));
        } else {
          promises.push(api.post("/system-settings", payload).then(({ data }) => {
            setSavedIds((prev) => ({ ...prev, [key]: data.id }));
          }));
        }
      }
      await Promise.all(promises);
      setLang(form.language);
      setTheme(form.darkMode ? "dark" : "light");
      reload();
      setStatus("Saved!");
      setTimeout(() => setStatus(null), 2000);
    } catch {
      setStatus("Failed to save");
      setTimeout(() => setStatus(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={{ maxWidth: 700, alignSelf: "center", width: "100%" }}>
          <View style={styles.titleRow}>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
            <View>
              <Text style={styles.h1}>System Settings</Text>
              <Text style={styles.subtitle}>Configure system preferences and application behavior</Text>
            </View>
          </View>

          <Card style={styles.form}>
            {systemFields.map((f) => (
              <View key={f.name} style={styles.fieldWrap}>
                <TextField
                  label={f.label}
                  value={String(form[f.name] ?? "")}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, [f.name]: v }))}
                  keyboardType={f.keyboardType}
                  placeholder={`e.g. ${f.default}`}
                />
              </View>
            ))}

            <View style={styles.fieldWrap}>
              <SelectField
                label="Language"
                value={form.language}
                onChange={(v) => setForm((prev) => ({ ...prev, language: v }))}
                options={languageOptions}
                searchable={false}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Enable automated email invoicing</Text>
              <Switch
                value={!!form.autoInvoicing}
                onValueChange={(v) => setForm((prev) => ({ ...prev, autoInvoicing: v }))}
                trackColor={{ false: "#d1d5db", true: colors.primaryLight }}
                thumbColor={form.autoInvoicing ? colors.primary : "#f4f3f4"}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Enable dark mode</Text>
              <Switch
                value={!!form.darkMode}
                onValueChange={(v) => setForm((prev) => ({ ...prev, darkMode: v }))}
                trackColor={{ false: "#d1d5db", true: colors.primaryLight }}
                thumbColor={form.darkMode ? colors.primary : "#f4f3f4"}
              />
            </View>

            <View style={styles.footer}>
              {status && (
                <Text style={{ fontSize: font.sm, fontWeight: "600", color: status === "Saved!" ? "#16a34a" : "#dc2626" }}>{status}</Text>
              )}
              <View style={{ flex: 1 }} />
              <Button
                title={saving ? "Saving..." : "Save Changes"}
                variant="primary"
                size="sm"
                loading={saving}
                disabled={saving}
                onPress={handleSubmit}
                icon={<Ionicons name="save-outline" size={14} color="#fff" />}
              />
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  scroll: { padding: spacing.xl },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: spacing.xl },
  h1: { fontSize: 22, fontWeight: "700", color: colors.slate900 },
  subtitle: { color: "#64748b", fontSize: font.sm, marginTop: 2 },
  form: { padding: spacing.xl, ...shadow.card },
  fieldWrap: { marginBottom: spacing.md },
  switchRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  switchLabel: { fontSize: font.sm, color: "#374151", flex: 1 },
  footer: { flexDirection: "row", alignItems: "center", marginTop: spacing.lg },
});
