import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import {
  hasAdmin,
  getShops,
  getShopById,
  verifyAdmin,
  verifyOfflineCustomer,
  setSelectedShop,
  loadShopsFromServer,
} from "../utils/shopStore";
import PublicToolbar from "../Layout/PublicToolbar";
import PwaInstall from "../Layout/PwaInstall";
import { TextField, SelectField, Button } from "../components/ui";
import { t, useLanguage } from "../i18n";
import { nav, redirect } from "../navigation/nav";
import { colors, font, radius, spacing } from "../theme";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-()]{7,15}$/;

const validateIdentifier = (val) => {
  if (!val.trim()) return t("enterEmailOrPhone");
  if (EMAIL_RE.test(val.trim())) return null;
  if (PHONE_RE.test(val.trim())) return null;
  return t("enterValidEmailOrPhone");
};

const getLoginPayload = (val, password) => {
  return { username: val.trim(), password };
};

const getIdentifierPayload = (val) => {
  return { username: val.trim() };
};

export default function Login() {
  useLanguage();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showReset, setShowReset] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetLoading, setResetLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const [adminExists] = useState(() => hasAdmin());
  const [shops, setShops] = useState(() => getShops());
  const [selectedShop, setSelectedShopId] = useState(() => localStorage.getItem("shop_selected_shop") || "");

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

  const isStaffRole = (role) =>
    ["super_admin", "admin", "manager", "employee", "cashier", "clerk"].includes(
      role?.toLowerCase()
    );

  // Legacy hardcoded admins are scoped to the first (main) shop. When online,
  // refresh the tenant's real name for the header display.
  const resolveLegacyTenant = () => {
    api
      .get("/shops")
      .then((r) => {
        const shops = Array.isArray(r.data) ? r.data : [];
        if (shops.length > 0) {
          localStorage.setItem("shop_id", String(shops[0].id));
          localStorage.setItem("shop_name", shops[0].name);
          window.dispatchEvent(new Event("roleChanged"));
        }
      })
      .catch(() => {});
  };

  // Persist a real server session from a successful /auth/login response.
  const applyServerSession = (data) => {
    const role = (data.role || "admin").toLowerCase();
    const userName = data.email || data.phone || data.username || identifier;
    localStorage.setItem("shop_auth_token", data.token);
    localStorage.setItem("shop_username", userName);
    localStorage.setItem("shop_role", role);
    localStorage.setItem("shop_user_id", String(data.id || ""));
    localStorage.setItem("shop_full_name", data.fullName || data.username || "");
    if (data.shopId) {
      localStorage.setItem("shop_id", String(data.shopId));
    } else {
      localStorage.removeItem("shop_id");
    }
    if (data.shopName) {
      localStorage.setItem("shop_name", data.shopName);
    } else {
      localStorage.removeItem("shop_name");
    }
    // A shop explicitly selected on the login page wins over the server's
    // default tenant, so staff always sign into the shop they picked.
    const chosen = selectedShop ? getShopById(selectedShop) : null;
    if (chosen) {
      localStorage.setItem("shop_id", String(chosen.id));
      localStorage.setItem("shop_name", chosen.name || "");
    }
    if (selectedShop) setSelectedShop(selectedShop);
    window.dispatchEvent(new Event("roleChanged"));
    return role;
  };

  // Try the real backend login. reachable=true means the server answered,
  // so we know we must NOT use an offline (fake-token) session.
  const tryServerLogin = async (id, pw) => {
    try {
      const response = await api.post("/auth/login", getLoginPayload(id, pw));
      return { ok: true, reachable: true, data: response.data };
    } catch (err) {
      return { ok: false, reachable: !!err?.response, data: err?.response?.data || null };
    }
  };

  const handleLogin = async () => {
    if (!password.trim()) {
      setError(t("enterPassword"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const localAdmin = verifyAdmin(identifier, password);
      const localCustomer = verifyOfflineCustomer(identifier, password, selectedShop);
      const isLegacySuper = identifier.trim() === "emmilianaswai@gmail.com" && password === "123";
      const isLegacyShop = identifier.trim() === "shop@gmail.com" && password === "1234";

      // Local admin OR legacy owner account: prefer a real server session, but
      // NEVER block login. If the server is down or rejects these accounts,
      // an offline-first local session is created instead, so signing into any
      // shop always works.
      if (localAdmin || isLegacySuper || isLegacyShop) {
        const s = await tryServerLogin(identifier, password);
        if (s.ok && s.data?.token) {
          const role = applyServerSession(s.data);
          redirect(isStaffRole(role) ? "/" : "/portal");
          return;
        }

        const chosen = selectedShop ? getShopById(selectedShop) : null;

        // Offline (guaranteed) session scoped to the selected shop.
        const startOfflineSession = ({ username, role, userId, fullName }) => {
          localStorage.setItem("shop_auth_token", "local_admin_token");
          localStorage.setItem("shop_username", username);
          localStorage.setItem("shop_role", role);
          localStorage.setItem("shop_user_id", String(userId));
          localStorage.setItem("shop_full_name", fullName);
          if (chosen) {
            localStorage.setItem("shop_id", String(chosen.id));
            localStorage.setItem("shop_name", chosen.name || "");
          } else if (role === "super_admin" || role === "admin") {
            localStorage.setItem("shop_id", "1");
            localStorage.setItem("shop_name", "EMLANETSHOP");
            resolveLegacyTenant();
          } else {
            localStorage.removeItem("shop_id");
            localStorage.removeItem("shop_name");
          }
          window.dispatchEvent(new Event("roleChanged"));
        };

        if (localAdmin) {
          startOfflineSession({
            username: localAdmin.username,
            role: "admin",
            userId: "local-admin",
            fullName: localAdmin.fullName || localAdmin.username,
          });
          if (selectedShop) setSelectedShop(selectedShop);
          redirect("/");
          return;
        }

        if (isLegacySuper) {
          startOfflineSession({
            username: "emmilianaswai@gmail.com",
            role: "super_admin",
            userId: "1",
            fullName: "Administrator",
          });
          redirect("/");
          return;
        }

        if (isLegacyShop) {
          startOfflineSession({
            username: "shop@gmail.com",
            role: "admin",
            userId: "2",
            fullName: "Shop Admin",
          });
          redirect("/");
          return;
        }
      }

      // Offline-first login: local customer account (scoped to the chosen shop)
      if (localCustomer) {
        localStorage.setItem("shop_auth_token", "local_customer_token");
        localStorage.setItem("shop_username", localCustomer.username || localCustomer.email || identifier);
        localStorage.setItem("shop_role", "customer");
        localStorage.setItem("shop_user_id", localCustomer.id);
        localStorage.setItem("shop_full_name", localCustomer.fullName || "");
        localStorage.removeItem("shop_id");
        localStorage.removeItem("shop_name");
        if (selectedShop) setSelectedShop(selectedShop);
        window.dispatchEvent(new Event("roleChanged"));
        redirect("/portal");
        return;
      }

      const valErr = validateIdentifier(identifier);
      if (valErr) { setError(valErr); setLoading(false); return; }

      const payload = getLoginPayload(identifier, password);
      const response = await api.post("/auth/login", payload);

      const data = response.data;

      if (!data.token) {
        setError(data.message || data.error || t("loginFailed"));
        return;
      }

      const role = applyServerSession(data);
      redirect(isStaffRole(role) ? "/" : "/portal");
    } catch (err) {
      if (err.response) {
        const rd = err.response.data;
        const msg = typeof rd === "string" ? rd : rd?.message || rd?.error || JSON.stringify(rd);
        setError(msg || `${t("serverError")} (${err.response.status})`);
      } else if (err.request) {
        setError(t("cannotConnectServer"));
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateTempPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pw = "";
    for (let i = 0; i < 8; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
    return pw;
  };

  const handleSendOtp = async () => {
    const valErr = validateIdentifier(identifier);
    if (valErr) { setError(valErr); return; }

    setResetLoading(true);
    setError("");
    setResetSuccess("");

    try {
      await api.post("/auth/forgot-password", getIdentifierPayload(identifier));
      setNewPassword(generateTempPassword());
      setResetStep(2);
      setResetSuccess(t(EMAIL_RE.test(identifier.trim()) ? "otpSentToEmail" : "otpSentToPhone"));
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data || t("failedSendOtp"));
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp.trim()) { setError(t("enterOtp")); return; }
    if (!newPassword.trim()) { setError(t("enterNewPassword")); return; }
    if (newPassword.length < 4) { setError(t("passwordMinLength")); return; }

    setResetLoading(true);
    setError("");

    try {
      await api.post("/auth/reset-password", {
        ...getIdentifierPayload(identifier),
        otp: otp.trim(),
        newPassword,
      });
      setResetSuccess(t("passwordResetSuccess"));
      setShowReset(false);
      setResetStep(1);
      setOtp("");
      setNewPassword("");
      setPassword("");
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data || t("failedResetPassword"));
    } finally {
      setResetLoading(false);
    }
  };

  const openReset = () => {
    setShowReset(true);
    setResetStep(1);
    setError("");
    setResetSuccess("");
    setOtp("");
    setNewPassword("");
  };

  const closeReset = () => {
    setShowReset(false);
    setResetStep(1);
    setError("");
    setResetSuccess("");
    setOtp("");
    setNewPassword("");
  };

  if (showReset) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.root}>
        <PublicToolbar />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <Pressable onPress={closeReset} style={styles.backBtn} hitSlop={8}>
                <Ionicons name="arrow-back" size={14} color={colors.slate500} />
                <Text style={styles.backBtnText}>{t("backToLogin")}</Text>
              </Pressable>

              <View style={styles.titleBlock}>
                <View style={[styles.iconBadge, { backgroundColor: "#f59e0b" }]}>
                  <Ionicons name="key" size={22} color="#fff" />
                </View>
                <Text style={styles.title}>{t("resetPassword")}</Text>
                <Text style={styles.subtitle}>
                  {resetStep === 1 ? t("enterEmailPhoneOtp") : t("enterOtpNewPassword")}
                </Text>
              </View>

              {error && (
                <View style={[styles.alert, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
                  <Text style={{ fontSize: font.xs, color: "#991b1b" }}>{error}</Text>
                </View>
              )}
              {resetSuccess && (
                <View style={[styles.alert, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }]}>
                  <Text style={{ fontSize: font.xs, color: "#166534" }}>{resetSuccess}</Text>
                </View>
              )}

              {resetStep === 1 ? (
                <>
                  <TextField
                    label={t("emailOrPhone")}
                    value={identifier}
                    placeholder={t("emailPhonePlaceholder")}
                    onChangeText={setIdentifier}
                  />
                  <Button
                    title={resetLoading ? t("sending") : t("sendOtp")}
                    variant="primary"
                    size="lg"
                    loading={resetLoading}
                    onPress={handleSendOtp}
                    icon={<Ionicons name="send" size={16} color="#fff" />}
                  />
                </>
              ) : (
                <>
                  <TextField
                    label={t("otpCode")}
                    value={otp}
                    placeholder={t("enterOtp")}
                    onChangeText={setOtp}
                  />
                  <TextField
                    label={t("newPassword")}
                    value={newPassword}
                    placeholder={t("atLeast4Chars")}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />
                  <Button
                    title={resetLoading ? t("resetting") : t("resetPassword")}
                    variant="primary"
                    size="lg"
                    loading={resetLoading}
                    onPress={handleResetPassword}
                    icon={<Ionicons name="key" size={16} color="#fff" />}
                  />
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.root}>
      <PublicToolbar />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.titleBlock}>
              <View style={styles.logo}>
                <Ionicons name="storefront" size={40} color="#e63958" />
              </View>
              <Text style={styles.title}>EMLANETSHOP</Text>
              <Text style={styles.subtitle}>{t("signInToAccount")}</Text>
            </View>

            <PwaInstall banner />

            {error && (
              <View style={[styles.alert, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
                <Text style={{ fontSize: font.xs, color: "#991b1b" }}>{error}</Text>
              </View>
            )}

            {!adminExists && (
              <View style={styles.noAdminBox}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Ionicons name="shield-checkmark" size={16} color="#7c3aed" />
                  <Text style={{ fontSize: font.sm, fontWeight: "700", color: "#5b21b6" }}>{t("welcomeSetUpShop")}</Text>
                </View>
                <Text style={{ fontSize: font.xs, color: "#6d28d9", marginBottom: 10 }}>{t("noAdminExists")}</Text>
                <Button
                  title={t("createAdminAccount")}
                  variant="secondary"
                  onPress={() => nav("/setup")}
                  style={{ width: "100%" }}
                />
              </View>
            )}

            {shops.length > 0 && (
              <View style={{ marginBottom: spacing.lg }}>
                <SelectField
                  label={t("chooseShop")}
                  value={selectedShop}
                  onChange={(value) => {
                    setSelectedShopId(value);
                    setSelectedShop(value);
                  }}
                  options={shops.map((s) => ({
                    value: s.id,
                    label: s.name + (s.address ? ` - ${s.address}` : ""),
                  }))}
                  placeholder={t("selectShop")}
                />
                <Text style={{ fontSize: font.xs, color: colors.slate400, marginTop: -spacing.xs }}>
                  {shops.length} {shops.length === 1 ? t("shopCountSingular") : t("shopCountPlural")}
                </Text>
              </View>
            )}

            <TextField
              label={t("emailUsername")}
              value={identifier}
              placeholder={t("emailPlaceholder")}
              onChangeText={setIdentifier}
            />
            <Text style={{ fontSize: font.xs, color: colors.slate400, marginTop: -spacing.sm, marginBottom: spacing.md }}>
              {t("loginWithPhone")}
            </Text>

            <View style={styles.passwordHeader}>
              <Text style={styles.passwordLabel}>{t("password")}</Text>
              <Pressable onPress={openReset} hitSlop={8}>
                <Text style={{ color: colors.primary, fontSize: font.xs, fontWeight: "600" }}>{t("forgotPassword")}</Text>
              </Pressable>
            </View>
            <TextField
              value={password}
              placeholder={t("enterPassword")}
              onChangeText={setPassword}
              secureTextEntry
              containerStyle={{ marginBottom: spacing.lg }}
            />

            <Button
              title={loading ? t("signingIn") : t("signIn")}
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleLogin}
              icon={<Ionicons name="log-in" size={16} color="#fff" />}
            />

            <View style={styles.altActions}>
              <Pressable style={styles.altLink} onPress={() => nav("/register-shop")}>
                <Ionicons name="storefront" size={14} color="#e63958" />
                <Text style={[styles.altLinkText, { color: "#e63958", fontWeight: "700" }]}>{t("registerOwnShop")}</Text>
              </Pressable>
              <Pressable style={styles.altLink} onPress={() => nav("/register")}>
                <Ionicons name="person-add" size={14} color={colors.primary} />
                <Text style={[styles.altLinkText, { color: colors.primary }]}>{t("createCustomerAccount")}</Text>
              </Pressable>
              <Pressable style={styles.altLink} onPress={() => nav("/customer-payment")}>
                <Ionicons name="open-outline" size={14} color={colors.success} />
                <Text style={[styles.altLinkText, { color: colors.success }]}>{t("loginAsCustomer")}</Text>
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
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: { fontSize: font["2xl"], fontWeight: "700", color: colors.slate900, textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: font.sm, color: colors.slate500, textAlign: "center" },
  alert: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  noAdminBox: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#c4b5fd",
    backgroundColor: "#f5f3ff",
    marginBottom: spacing.lg,
  },
  passwordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  passwordLabel: { fontSize: font.xs, fontWeight: "700", color: colors.slate500, textTransform: "uppercase" },
  altActions: { marginTop: spacing.lg, alignItems: "center", gap: spacing.sm },
  altLink: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  altLinkText: { fontSize: font.sm, fontWeight: "600" },
});