import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import { addShop, isCredentialTaken } from "../utils/shopStore";
import PublicToolbar from "../Layout/PublicToolbar";
import { TextField, Button } from "../components/ui";
import { t, useLanguage } from "../i18n";
import { nav, redirect } from "../navigation/nav";
import { colors, font, radius, spacing } from "../theme";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ShopRegister() {
  useLanguage();
  const [form, setForm] = useState({
    shopName: "",
    address: "",
    phone: "",
    location: "",
    fullName: "",
    email: "",
    username: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const set = (field, value) =>
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "email" && !prev.username) next.username = value;
      return next;
    });

  const handleRegister = async () => {
    if (!form.shopName.trim()) return setError(t("enterShopName"));
    if (!form.fullName.trim()) return setError(t("enterAdminFullName"));
    if (!form.email.trim()) return setError(t("enterAdminEmail"));
    if (!EMAIL_RE.test(form.email.trim())) return setError(t("enterValidEmail"));
    if (!form.password.trim()) return setError(t("enterPassword"));
    if (form.password.length < 4) return setError(t("passwordMinLength"));
    if (form.password !== form.confirm) return setError(t("passwordsDoNotMatch"));

    // Check that email is not already used by another account
    if (isCredentialTaken(form.email.trim())) {
      return setError(t("emailAlreadyRegisteredShort"));
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const username = form.email.trim();
    const shopPayload = {
      name: form.shopName.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
    };

    try {
      // Create the independent tenant (shop) and its admin account in one call.
      const res = await api.post("/auth/register", {
        shopName: form.shopName.trim(),
        shopAddress: form.address.trim(),
        shopPhone: form.phone.trim(),
        shopLocation: form.location.trim(),
        username,
        password: form.password,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
      });
      const data = res.data || {};
      if (!data.token) {
        addShop(shopPayload);
        setSuccess(t("registeredOnDeviceNoSession"));
        setLoading(false);
        return;
      }

      localStorage.setItem("shop_auth_token", data.token);
      localStorage.setItem("shop_username", data.email || data.phone || data.username || username);
      localStorage.setItem("shop_role", (data.role || "admin").toLowerCase());
      localStorage.setItem("shop_user_id", String(data.id || ""));
      localStorage.setItem("shop_full_name", data.fullName || form.fullName.trim());
      if (data.shopId) localStorage.setItem("shop_id", String(data.shopId));
      if (data.shopName) localStorage.setItem("shop_name", data.shopName);
      else localStorage.setItem("shop_name", shopPayload.name);

      window.dispatchEvent(new Event("roleChanged"));
      window.dispatchEvent(new Event("tenantChanged"));
      redirect("/");
    } catch (err) {
      if (!err.response) {
        // Server unreachable - keep a local-only shop record so the app still works offline.
        addShop(shopPayload);
        setSuccess(t("registeredOnDeviceServer"));
      } else {
        const msg = err.response?.data?.message || err.response?.data || t("registrationFailed");
        setError(typeof msg === "string" ? msg : t("registrationFailedConnection"));
      }
      setLoading(false);
    }
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
              <LinearGradient
                colors={["#e63958", "#f97316"]}
                style={styles.iconBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="storefront" size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.title}>{t("registerYourShop")}</Text>
              <Text style={styles.subtitle}>{t("registerShopSubtitle")}</Text>
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

            <View style={styles.noteBox}>
              <Ionicons name="shield-checkmark" size={15} color="#ea580c" />
              <Text style={styles.noteText}>{t("shopIndependenceNote")}</Text>
            </View>

            <View style={styles.sectionHeader}>
              <Ionicons name="storefront" size={14} color="#e63958" />
              <Text style={[styles.sectionTitle, { color: "#e63958" }]}>{t("shopDetails")}</Text>
            </View>

            <TextField
              label={t("shopName") + " *"}
              value={form.shopName}
              placeholder={t("shopNamePlaceholder")}
              onChangeText={(value) => set("shopName", value)}
            />
            <View style={styles.row}>
              <TextField
                label={t("shopAddressArea")}
                value={form.address}
                placeholder={t("shopAddressPlaceholder")}
                onChangeText={(value) => set("address", value)}
                containerStyle={styles.colLeft}
              />
              <TextField
                label={t("phone")}
                value={form.phone}
                placeholder={t("phonePlaceholder")}
                onChangeText={(value) => set("phone", value)}
                keyboardType="phone-pad"
                containerStyle={styles.colRight}
              />
            </View>
            <TextField
              label={t("locationNote")}
              value={form.location}
              placeholder={t("locationPlaceholder")}
              onChangeText={(value) => set("location", value)}
            />

            <View style={[styles.sectionHeader, { marginTop: spacing.sm }]}>
              <Ionicons name="person-add" size={14} color="#e63958" />
              <Text style={[styles.sectionTitle, { color: "#e63958" }]}>{t("shopAdminAccount")}</Text>
            </View>

            <TextField
              label={t("adminFullName") + " *"}
              value={form.fullName}
              placeholder={t("fullNamePlaceholder")}
              onChangeText={(value) => set("fullName", value)}
            />
            <TextField
              label={t("emailAdminLogin") + " *"}
              value={form.email}
              placeholder={t("emailAdminPlaceholder")}
              onChangeText={(value) => set("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={{ fontSize: font.xs, color: colors.slate400, marginTop: -spacing.sm, marginBottom: spacing.md }}>
              {t("emailUsedToLogInAsAdmin")}
            </Text>
            <View style={styles.row}>
              <TextField
                label={t("password") + " *"}
                value={form.password}
                placeholder={t("atLeast4Chars")}
                onChangeText={(value) => set("password", value)}
                secureTextEntry
                containerStyle={styles.colLeft}
              />
              <TextField
                label={t("confirmPassword") + " *"}
                value={form.confirm}
                placeholder={t("repeatPassword")}
                onChangeText={(value) => set("confirm", value)}
                secureTextEntry
                containerStyle={styles.colRight}
              />
            </View>

            <Button
              title={loading ? t("registeringShop") : t("registerMyShop")}
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleRegister}
              icon={<Ionicons name="storefront" size={16} color="#fff" />}
            />

            <View style={{ marginTop: spacing.md, alignItems: "center" }}>
              <Pressable onPress={() => nav("/login")} hitSlop={8}>
                <Text style={{ fontSize: font.sm, fontWeight: "600", color: colors.slate500 }}>{t("alreadyHaveShopSignIn")}</Text>
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
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    marginBottom: spacing.md,
  },
  noteText: { flex: 1, fontSize: font.xs, color: "#9a3412", lineHeight: 17 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  sectionTitle: { fontSize: font.xs, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  row: { flexDirection: "row", gap: spacing.sm },
  colLeft: { flex: 1 },
  colRight: { flex: 1 },
});