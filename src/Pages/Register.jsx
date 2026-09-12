import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import { getShops, saveOfflineCustomer, loadShopsFromServer, isCredentialTaken } from "../utils/shopStore";
import PublicToolbar from "../Layout/PublicToolbar";
import { TextField, SelectField, Button } from "../components/ui";
import { t, useLanguage } from "../i18n";
import { nav } from "../navigation/nav";
import { colors, font, radius, spacing } from "../theme";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  useLanguage();
  const [form, setForm] = useState({ password: "", fullName: "", email: "", phone: "", shopId: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [shops, setShops] = useState(() => getShops());

  // Prefer the server's tenant list when online; fall back to the device registry.
  useEffect(() => {
    let cancelled = false;
    loadShopsFromServer().then((list) => {
      if (!cancelled) setShops(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectedShop = shops.find((s) => s.id === form.shopId) || null;

  const handleRegister = async () => {
    if (!form.email.trim()) return setError(t("enterEmailAddress"));
    if (!EMAIL_RE.test(form.email.trim())) return setError(t("enterValidEmail"));
    if (!form.password.trim()) return setError(t("enterPassword"));
    if (form.password.length < 4) return setError(t("passwordMinLength"));
    if (!form.fullName.trim()) return setError(t("enterFullName"));
    if (!form.shopId) return setError(t("chooseShopForService"));
    if (!selectedShop) return setError(t("chooseValidShop"));

    // Check that email/phone are not already used by another account
    if (isCredentialTaken(form.email.trim())) {
      return setError(t("emailAlreadyRegistered"));
    }
    if (form.phone.trim() && isCredentialTaken(form.phone.trim())) {
      return setError(t("phoneAlreadyRegistered"));
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const payload = {
      username: form.email.trim(),
      password: form.password,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || "",
      role: "customer",
      status: "active",
      shopId: form.shopId,
      shopName: selectedShop.name,
    };

    try {
      await api.post("/users", payload);
      saveOfflineCustomer({ ...payload, username: form.email.trim(), shopId: form.shopId, shopName: selectedShop.name });
      setSuccess(t("accountCreated"));
      setTimeout(() => nav("/login"), 2000);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || t("registrationFailed");
      setError(typeof msg === "string" ? msg : t("registrationFailedEmail"));
    } finally {
      setLoading(false);
    }
  };

  const offlineMode = () => {
    if (!form.email.trim() || !form.fullName.trim()) {
      setError(t("fillNameEmail"));
      return;
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      setError(t("enterValidEmail"));
      return;
    }
    if (!form.password.trim() || form.password.length < 4) {
      setError(t("passwordMinLength"));
      return;
    }
    if (!form.shopId) {
      setError(t("chooseShopForService"));
      return;
    }
    if (isCredentialTaken(form.email.trim())) {
      setError(t("emailAlreadyRegisteredDevice"));
      return;
    }
    if (form.phone.trim() && isCredentialTaken(form.phone.trim())) {
      setError(t("phoneAlreadyRegisteredDevice"));
      return;
    }
    saveOfflineCustomer({
      username: form.email.trim(),
      password: form.password,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || "",
      role: "customer",
      shopId: form.shopId,
      shopName: selectedShop.name,
    });
    setError("");
    setSuccess(t("savedOnDevice"));
    setTimeout(() => nav("/login"), 2000);
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.root}>
      <PublicToolbar />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Pressable onPress={() => nav("/login")} style={styles.backBtn} hitSlop={8}>
              <Ionicons name="arrow-back" size={14} color={colors.slate500} />
              <Text style={styles.backBtnText}>{t("backToLogin")}</Text>
            </Pressable>

            <View style={styles.titleBlock}>
              <View style={styles.iconBadge}>
                <Ionicons name="person-add" size={22} color="#fff" />
              </View>
              <Text style={styles.title}>{t("customerRegistration")}</Text>
              <Text style={styles.subtitle}>{t("customerRegistrationSubtitle")}</Text>
            </View>

            {error && (
              <View style={[styles.alert, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
                <Text style={{ fontSize: font.xs, color: "#991b1b" }}>{error}</Text>
              </View>
            )}
            {success && (
              <View style={[styles.alert, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }]}>
                <Text style={{ fontSize: font.xs, color: "#166534" }}>{success}</Text>
              </View>
            )}

            <SelectField
              label={t("chooseYourShop") + " *"}
              value={form.shopId}
              onChange={(value) => set("shopId", value)}
              options={shops.map((s) => ({
                value: s.id,
                label: s.name + (s.address ? ` - ${s.address}` : ""),
              }))}
              placeholder={t("selectShop")}
            />
            {shops.length === 0 && (
              <Text style={{ fontSize: font.xs, color: "#dc2626", marginTop: -spacing.sm, marginBottom: spacing.md }}>
                {t("noShopsRegistered")}
              </Text>
            )}

            <TextField
              label={t("fullName") + " *"}
              value={form.fullName}
              placeholder={t("fullNamePlaceholder")}
              onChangeText={(value) => set("fullName", value)}
            />
            <TextField
              label={t("emailLoginUsername") + " *"}
              value={form.email}
              placeholder={t("emailPlaceholder")}
              onChangeText={(value) => set("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={{ fontSize: font.xs, color: colors.slate400, marginTop: -spacing.sm, marginBottom: spacing.md }}>
              {t("willBeUsername")}
            </Text>
            <TextField
              label={t("password") + " *"}
              value={form.password}
              placeholder={t("atLeast4Chars")}
              onChangeText={(value) => set("password", value)}
              secureTextEntry
            />
            <TextField
              label={t("phoneOptional")}
              value={form.phone}
              placeholder={t("phonePlaceholder")}
              onChangeText={(value) => set("phone", value)}
              keyboardType="phone-pad"
            />
            <Text style={{ fontSize: font.xs, color: colors.slate400, marginTop: -spacing.sm, marginBottom: spacing.md }}>
              {t("phoneOptionalNote")}
            </Text>

            <Button
              title={loading ? t("creatingAccount") : t("createAccount")}
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleRegister}
              icon={<Ionicons name="person-add" size={16} color="#fff" />}
            />

            <Button
              title={t("saveOnDeviceOffline")}
              variant="outline"
              size="md"
              onPress={offlineMode}
              style={{ marginTop: spacing.sm }}
            />

            <View style={{ marginTop: spacing.md, alignItems: "center" }}>
              <Pressable onPress={() => nav("/login")} hitSlop={8}>
                <Text style={{ fontSize: font.sm, fontWeight: "600", color: colors.slate500 }}>{t("alreadyHaveAccount")}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: spacing.lg },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.xl,
    maxWidth: 480,
    alignSelf: "center",
    width: "100%",
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.lg },
  backBtnText: { color: colors.slate500, fontSize: font.sm, fontWeight: "600" },
  titleBlock: { alignItems: "center", marginBottom: spacing.sm },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.slate500,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: { fontSize: font["2xl"], fontWeight: "700", color: colors.slate900, textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: font.sm, color: colors.slate500, textAlign: "center", marginBottom: spacing.md },
  alert: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
});