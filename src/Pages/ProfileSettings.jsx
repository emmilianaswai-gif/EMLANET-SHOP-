import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import { t, useLanguage } from "../i18n";
import { isSuperAdmin } from "../utils/roles";
import { pickAndResizeImage } from "../utils/imageUtils";
import { TextField, SelectField, Button, Card } from "../components/ui";
import { colors, font, radius, spacing, shadow } from "../theme";

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "TZS", label: "TZS (TSh)" },
  { value: "KES", label: "KES (KSh)" },
  { value: "NGN", label: "NGN (₦)" },
];

const roleColors = {
  super_admin: { bg: "#f3f4f6", text: "#1f2937", border: "#d1d5db" },
  admin: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  manager: { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
  employee: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  cashier: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  customer: { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" },
};

function SystemUsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/users")
      .then(({ data }) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isSuper = isSuperAdmin(localStorage.getItem("shop_role") || "");
  const scopedUsers = isSuper ? users : users.filter((u) => (u.role || "").toLowerCase() !== "super_admin");
  const currentUserId = localStorage.getItem("shop_user_id");

  if (loading) return <Text style={{ color: "#94a3b8", fontSize: font.sm, textAlign: "center", padding: 20 }}>Loading users...</Text>;
  if (scopedUsers.length === 0) return <Text style={{ color: "#94a3b8", fontSize: font.sm, textAlign: "center", padding: 20 }}>No users found</Text>;

  return (
    <View style={{ gap: spacing.sm }}>
      {scopedUsers.map((u) => {
        const rc = roleColors[u.role] || roleColors.customer;
        const isCurrentUser = String(u.id) === String(currentUserId);
        return (
          <View key={u.id} style={[styles.userRow, isCurrentUser && styles.userRowCurrent]}>
            <View style={[styles.userAvatar, { backgroundColor: rc.bg, borderColor: rc.border }]}>
              <Text style={{ fontWeight: "700", fontSize: font.base, color: rc.text }}>{(u.fullName || u.username || "?").charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: font.base, fontWeight: "600", color: colors.slate900 }}>
                {u.fullName || u.username}
                {isCurrentUser ? " (You)" : ""}
              </Text>
              <Text style={{ fontSize: font.sm, color: "#64748b", marginTop: 2 }} numberOfLines={1}>
                {u.email || "No email"}{u.phone ? ` · ${u.phone}` : ""}
              </Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: rc.bg, borderColor: rc.border }]}>
              <Text style={{ fontSize: font.xs, fontWeight: "600", color: rc.text, textTransform: "capitalize" }}>{u.role || "user"}</Text>
            </View>
            {u.isEnabled === false && (
              <Text style={{ fontSize: font.xs, color: "#ef4444", fontWeight: "600" }}>Disabled</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function ProfileSettings() {
  useLanguage();
  const username = localStorage.getItem("shop_username") || "";
  const role = localStorage.getItem("shop_role") || "";
  const userId = localStorage.getItem("shop_user_id") || "";

  const [form, setForm] = useState({
    storeName: "Central Market Groceries",
    currency: "TZS",
    openingTime: "08:00",
    closingTime: "20:00",
    address: "",
    phone: "",
    email: "",
  });

  const [logoPreview, setLogoPreview] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.get(`/profile/settings?userId=${userId}`).then(({ data }) => {
      if (data && typeof data === "object") {
        setForm((prev) => ({
          ...prev,
          storeName: data.storeName || prev.storeName,
          currency: data.currency || prev.currency,
          openingTime: data.openingTime || prev.openingTime,
          closingTime: data.closingTime || prev.closingTime,
          address: data.address || prev.address,
          phone: data.phone || prev.phone,
          email: data.email || prev.email,
        }));
        if (data.avatar) setAvatarPreview(data.avatar);
        if (data.logo) setLogoPreview(data.logo);
      }
    }).catch(() => {}).finally(() => {
      setLogoPreview((prev) => prev || localStorage.getItem("shop_logo") || null);
      setAvatarPreview((prev) => prev || localStorage.getItem("shop_avatar") || null);
    });
  }, [userId]);

  const setField = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleLogoUpload = async () => {
    try {
      const img = await pickAndResizeImage({ maxDim: 512 });
      if (img) setLogoPreview(img.dataUri);
    } catch {}
  };

  const handleAvatarUpload = async () => {
    try {
      const img = await pickAndResizeImage({ maxDim: 256 });
      if (img) setAvatarPreview(img.dataUri);
    } catch {}
  };

  const removeImage = (type) => {
    if (type === "logo") setLogoPreview(null);
    else setAvatarPreview(null);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const profileData = {
        userId: userId ? Number(userId) : undefined,
        storeName: form.storeName,
        currency: form.currency,
        openingTime: form.openingTime,
        closingTime: form.closingTime,
        address: form.address,
        phone: form.phone,
        email: form.email,
        logo: logoPreview,
        avatar: avatarPreview,
      };
      await api.put("/profile/settings", profileData);
      setStatus({ text: "Profile saved successfully!", type: "success" });
    } catch {
      setStatus({ text: "Saved locally — server update failed", type: "error" });
    } finally {
      if (logoPreview) localStorage.setItem("shop_logo", logoPreview);
      else localStorage.removeItem("shop_logo");
      if (avatarPreview) localStorage.setItem("shop_avatar", avatarPreview);
      else localStorage.removeItem("shop_avatar");
      localStorage.setItem("shop_storeName", form.storeName);
      localStorage.setItem("shop_currency", form.currency);
      window.dispatchEvent(new Event("shopImagesChanged"));
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={{ maxWidth: 900, alignSelf: "center", width: "100%" }}>
          <View style={styles.titleRow}>
            <Ionicons name="person-outline" size={24} color={colors.primary} />
            <View>
              <Text style={styles.h1}>{t("profile")} {t("settings")}</Text>
              <Text style={styles.subtitle}>{role.toUpperCase()} — {username}</Text>
            </View>
          </View>

          {status && (
            <View style={[styles.alert, { backgroundColor: status.type === "error" ? "#fef2f2" : "#f0fdf4", borderColor: status.type === "error" ? "#fecaca" : "#bbf7d0" }]}>
              <Ionicons name={status.type === "error" ? "alert-circle" : "checkmark-circle"} size={14} color={status.type === "error" ? "#991b1b" : "#166534"} />
              <Text style={{ fontSize: font.sm, color: status.type === "error" ? "#991b1b" : "#166534", flex: 1 }}>{status.text}</Text>
            </View>
          )}

          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="image-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Store Images</Text>
            </View>
            <View style={styles.imagesRow}>
              <View style={styles.imageCol}>
                <Text style={styles.imageLabel}>STORE LOGO</Text>
                <Pressable style={styles.logoContainer} onPress={handleLogoUpload}>
                  {logoPreview ? (
                    <Image source={{ uri: logoPreview }} style={styles.logoImage} />
                  ) : (
                    <View style={styles.placeholderWrap}>
                      <Ionicons name="storefront-outline" size={28} color="#94a3b8" />
                      <Text style={{ fontSize: font.xs, color: "#94a3b8" }}>No logo</Text>
                    </View>
                  )}
                </Pressable>
              </View>
              <View style={styles.imageCol}>
                <Text style={styles.imageLabel}>PROFILE AVATAR</Text>
                <Pressable style={styles.avatarContainer} onPress={handleAvatarUpload}>
                  {avatarPreview ? (
                    <Image source={{ uri: avatarPreview }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.placeholderWrap}>
                      <Ionicons name="person-outline" size={28} color="#94a3b8" />
                      <Text style={{ fontSize: font.xs, color: "#94a3b8" }}>No photo</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: spacing.sm }}>
              {logoPreview && (
                <Button size="sm" variant="ghost" title="Remove Logo" onPress={() => removeImage("logo")}
                  icon={<Ionicons name="trash-outline" size={13} color="#ef4444" />} />
              )}
              {avatarPreview && (
                <Button size="sm" variant="ghost" title="Remove Photo" onPress={() => removeImage("avatar")}
                  icon={<Ionicons name="trash-outline" size={13} color="#ef4444" />} />
              )}
            </View>
          </Card>

          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="storefront-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Store Information</Text>
            </View>
            <View style={styles.formRow}>
              <View style={styles.col}>
                <TextField label="Store Name" value={form.storeName} onChangeText={setField("storeName")} placeholder="Store name" />
              </View>
              <View style={styles.col}>
                <SelectField label="Currency" value={form.currency} onChange={setField("currency")} options={CURRENCIES} searchable={false} />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.col}>
                <TextField label="Opening Time" value={form.openingTime} onChangeText={setField("openingTime")} placeholder="HH:MM" />
              </View>
              <View style={styles.col}>
                <TextField label="Closing Time" value={form.closingTime} onChangeText={setField("closingTime")} placeholder="HH:MM" />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.col}>
                <TextField label="Address" value={form.address} onChangeText={setField("address")} placeholder="Street / area" />
              </View>
              <View style={styles.col}>
                <TextField label="Phone" value={form.phone} onChangeText={setField("phone")} placeholder="+255..." keyboardType="phone-pad" />
              </View>
            </View>
            <View style={{ marginTop: spacing.sm }}>
              <TextField label="Email" value={form.email} onChangeText={setField("email")} placeholder="email@example.com" keyboardType="email-address" />
            </View>
          </Card>

          {["admin", "manager"].includes(role.toLowerCase()) && (
            <Card style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people-outline" size={18} color="#8b5cf6" />
                <Text style={styles.sectionTitle}>System Users — Employees & Managers</Text>
              </View>
              <SystemUsersList />
            </Card>
          )}

          <View style={styles.footer}>
            <Button
              title={saving ? t("saving") : "Save All Changes"}
              variant="primary"
              size="md"
              loading={saving}
              disabled={saving}
              onPress={handleSubmit}
              icon={<Ionicons name="save-outline" size={16} color="#fff" />}
            />
            <Text style={{ fontSize: font.sm, color: "#94a3b8", marginLeft: spacing.sm }}>
              Settings are saved to your profile and persist across sessions
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  scroll: { padding: spacing.xl },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: spacing.lg },
  h1: { fontSize: 22, fontWeight: "700", color: colors.slate900 },
  subtitle: { color: "#64748b", fontSize: font.base, marginTop: 2 },
  alert: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md,
    borderWidth: 1, marginBottom: spacing.lg,
  },
  section: { padding: spacing.xl, marginBottom: spacing.lg, ...shadow.card },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.lg },
  sectionTitle: { fontSize: font.lg, fontWeight: "700", color: colors.slate900 },
  imagesRow: { flexDirection: "row", gap: spacing.xl, alignItems: "flex-start" },
  imageCol: { flex: 1, alignItems: "center" },
  imageLabel: { fontSize: font.xs, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: spacing.sm },
  logoContainer: {
    width: 140, height: 140, borderRadius: 16, borderWidth: 2, borderStyle: "dashed", borderColor: "#d1d5db",
    alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#f8fafc",
  },
  avatarContainer: {
    width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderStyle: "dashed", borderColor: "#d1d5db",
    alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#f8fafc",
  },
  logoImage: { width: "100%", height: "100%", resizeMode: "cover" },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholderWrap: { alignItems: "center", gap: 4 },
  formRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.sm },
  col: { flex: 1 },
  footer: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.xl, paddingBottom: spacing["2xl"] },
  userRow: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 12,
    borderRadius: radius.md, borderWidth: 1, borderColor: "#f1f5f9", backgroundColor: "#fafbfc",
  },
  userRowCurrent: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  userAvatar: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  roleBadge: {
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1,
  },
});
