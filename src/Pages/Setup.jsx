import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { setAdmin, hasAdmin, getShops, addShop, getAdmin, clearAdmin, setSelectedShop } from "../utils/shopStore";
import api from "../api/axiosConfig";
import PublicToolbar from "../Layout/PublicToolbar";
import { TextField, Button } from "../components/ui";
import { t, useLanguage } from "../i18n";
import { nav, redirect } from "../navigation/nav";
import { colors, font, radius, spacing } from "../theme";

export default function Setup() {
  useLanguage();

  const [adminExists, setAdminExists] = useState(() => hasAdmin());
  const [step, setStep] = useState(adminExists ? 2 : 1);
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    shopName: "",
    shopAddress: "",
    shopPhone: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const shops = getShops();

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleCreateAdmin = async () => {
    setError("");
    setSuccess("");

    if (!form.username.trim()) return setError(t("enterAdminUsername"));
    if (form.password.length < 4) return setError(t("passwordMinLength"));
    if (form.password !== form.confirmPassword) return setError(t("passwordsDoNotMatch"));

    setLoading(true);
    try {
      // 1) Always save locally first so the app works offline.
      setAdmin({
        username: form.username.trim(),
        password: form.password,
        fullName: form.fullName.trim() || "Administrator",
      });

      const localShop = form.shopName.trim()
        ? addShop({
            name: form.shopName.trim(),
            address: form.shopAddress.trim(),
            phone: form.shopPhone.trim(),
          })
        : null;

      // 2) When connected, create the real tenant (shop + admin) on the server.
      try {
        const regRes = await api.post("/auth/register", {
          shopName: form.shopName.trim() || "EMLANETSHOP",
          shopAddress: form.shopAddress.trim(),
          shopPhone: form.shopPhone.trim(),
          shopLocation: "",
          username: form.username.trim(),
          password: form.password,
          fullName: form.fullName.trim() || "Administrator",
        });
        const data = regRes.data || {};
        if (data.token) {
          localStorage.setItem("shop_auth_token", data.token);
          localStorage.setItem("shop_username", data.username || form.username.trim());
          localStorage.setItem("shop_role", (data.role || "admin").toLowerCase());
          localStorage.setItem("shop_user_id", String(data.id || ""));
          localStorage.setItem("shop_full_name", data.fullName || form.fullName.trim() || form.username.trim());
          if (data.shopId) localStorage.setItem("shop_id", String(data.shopId));
          if (data.shopName) localStorage.setItem("shop_name", data.shopName);
          if (localShop?.id) setSelectedShop(localShop.id);
          window.dispatchEvent(new Event("roleChanged"));
          redirect("/");
          return;
        }
      } catch {
        // Backend offline - admin + shop are already saved on this device.
      }

      setSuccess(t("adminAccountCreated"));
      setTimeout(() => nav("/login"), 1500);
    } finally {
      setLoading(false);
    }
  };

  const handleResetAdmin = () => {
    clearAdmin();
    setAdminExists(false);
    setStep(1);
    setForm({ username: "", password: "", confirmPassword: "", fullName: "", shopName: "", shopAddress: "", shopPhone: "" });
    setError("");
    setSuccess("");
  };

  if (adminExists && step === 2) {
    const admin = getAdmin();
    return (
      <SafeAreaView edges={["bottom"]} style={styles.root}>
        <PublicToolbar />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { alignItems: "center" }]}>
            <View style={[styles.iconBadge, { width: 56, height: 56, backgroundColor: colors.success }]}>
              <Ionicons name="checkmark-circle" size={26} color="#fff" />
            </View>
            <Text style={styles.title}>{t("adminIsSetUp")}</Text>
            <Text style={styles.subtitle}>
              {t("adminReadyToSignIn")} <Text style={{ fontWeight: "700" }}>{admin?.username}</Text>.
            </Text>

            <View style={styles.registeredBox}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Ionicons name="storefront" size={14} color="#166534" />
                <Text style={{ fontWeight: "700", fontSize: font.sm, color: "#166534" }}>
                  {t("registeredShops")} ({shops.length})
                </Text>
              </View>
              {shops.map((s) => (
                <Text key={s.id} style={styles.registeredItem}>
                  • {s.name}{s.address ? ` - ${s.address}` : ""}
                </Text>
              ))}
              <Text style={{ marginTop: spacing.sm, fontSize: font.xs, color: "#166534" }}>
                {t("customersWillPickShop")}
              </Text>
            </View>

            <Button
              title={t("goToLogin")}
              variant="primary"
              size="lg"
              onPress={() => nav("/login")}
              style={{ marginBottom: spacing.sm, alignSelf: "stretch" }}
            />
            <Pressable onPress={handleResetAdmin} hitSlop={8}>
              <Text style={{ color: colors.slate500, fontSize: font.xs, fontWeight: "600", marginTop: spacing.sm, textDecorationLine: "underline" }}>
                {t("rerunSetup")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
              <View style={[styles.iconBadge, { backgroundColor: "#863bff" }]}>
                <Ionicons name="shield-checkmark" size={26} color="#fff" />
              </View>
              <Text style={styles.title}>{t("setUpYourShopAdmin")}</Text>
              <Text style={styles.subtitle}>{t("setupSubtitle")}</Text>
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

            <TextField
              label={t("adminUsername") + " *"}
              value={form.username}
              placeholder={t("adminUsernamePlaceholder")}
              onChangeText={(value) => set("username", value)}
              autoCapitalize="none"
            />
            <TextField
              label={t("adminPassword") + " *"}
              value={form.password}
              placeholder={t("atLeast4Chars")}
              onChangeText={(value) => set("password", value)}
              secureTextEntry={!showPassword}
              rightIcon={
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={{ position: "absolute", right: 10 }}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={16} color={colors.slate500} />
                </Pressable>
              }
            />
            <TextField
              label={t("confirmPassword") + " *"}
              value={form.confirmPassword}
              placeholder={t("repeatPassword")}
              onChangeText={(value) => set("confirmPassword", value)}
              secureTextEntry={!showConfirm}
              rightIcon={
                <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={8} style={{ position: "absolute", right: 10 }}>
                  <Ionicons name={showConfirm ? "eye-off" : "eye"} size={16} color={colors.slate500} />
                </Pressable>
              }
            />
            <TextField
              label={t("fullNameOptional")}
              value={form.fullName}
              placeholder="e.g. Mwanasheria Mkuu"
              onChangeText={(value) => set("fullName", value)}
            />

            <View style={styles.firstShopHeader}>
              <Ionicons name="storefront" size={15} color={colors.slate500} />
              <Text style={styles.firstShopText}>{t("firstShopOptional")}</Text>
            </View>

            <TextField
              label={t("shopName")}
              value={form.shopName}
              placeholder="e.g. EMLANETSHOP - Main"
              onChangeText={(value) => set("shopName", value)}
            />
            <TextField
              label={t("shopAddressArea")}
              value={form.shopAddress}
              placeholder={t("shopAddressPlaceholder")}
              onChangeText={(value) => set("shopAddress", value)}
            />
            <TextField
              label={t("shopPhone")}
              value={form.shopPhone}
              placeholder={t("phonePlaceholder")}
              onChangeText={(value) => set("shopPhone", value)}
              keyboardType="phone-pad"
            />

            <Button
              title={loading ? t("creating") : t("createAdmin")}
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleCreateAdmin}
              icon={<Ionicons name="person-add" size={16} color="#fff" />}
            />

            <Text style={styles.offlineNote}>{t("setupOfflineNote")}</Text>
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
  firstShopHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginVertical: 4,
    marginBottom: 14,
  },
  firstShopText: { color: colors.slate500, fontSize: font.sm, fontWeight: "600" },
  offlineNote: {
    marginTop: spacing.md,
    fontSize: font.xs,
    color: colors.slate400,
    textAlign: "center",
    lineHeight: 18,
  },
  registeredBox: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    fontSize: font.sm,
    alignSelf: "stretch",
  },
  registeredItem: { fontSize: font.sm, color: "#166534", marginBottom: 2 },
});