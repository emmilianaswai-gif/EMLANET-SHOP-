import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import { roleLabel } from "../utils/roles";
import { TextField, Button, Card } from "../components/ui";
import { colors, font, radius, spacing, shadow } from "../theme";

export default function MyAccount() {
  const role = localStorage.getItem("shop_role") || "";
  const [userId, setUserId] = useState(localStorage.getItem("shop_user_id") || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [profile, setProfile] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    address: "",
    plainPassword: "",
    role: "",
    avatar: "",
    isEnabled: true,
    createdAt: "",
    lastLogin: "",
  });

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => { loadProfile(); }, []);

  const resolveUserId = async () => {
    const isLocalToken = (localStorage.getItem("shop_auth_token") || "") === "local_admin_token";
    const cached = userId || localStorage.getItem("shop_user_id") || "";
    if (isLocalToken) return cached || "";
    if (cached) {
      try {
        const { data } = await api.get(`/users/${cached}`);
        if (data?.id) {
          const resolved = String(data.id);
          if (resolved !== localStorage.getItem("shop_user_id")) localStorage.setItem("shop_user_id", resolved);
          setUserId(resolved);
          return resolved;
        }
      } catch {
        localStorage.removeItem("shop_user_id");
        setUserId("");
      }
    }
    const uname = localStorage.getItem("shop_username") || "";
    try {
      const { data } = await api.get("/users");
      const list = Array.isArray(data) ? data : [];
      const match = list.find((u) =>
        (u.username || "").toLowerCase() === uname.toLowerCase() ||
        (u.email || "").toLowerCase() === uname.toLowerCase()
      );
      if (match?.id) {
        const resolved = String(match.id);
        localStorage.setItem("shop_user_id", resolved);
        setUserId(resolved);
        return resolved;
      }
    } catch {}
    return "";
  };

  const applyProfile = (data) => {
    setProfile({
      fullName: data.fullName || "",
      username: data.username || "",
      email: data.email || "",
      phone: data.phone || "",
      address: data.address || "",
      plainPassword: data.plainPassword || "",
      role: data.role || "",
      avatar: data.avatar || "",
      isEnabled: data.isEnabled ?? true,
      createdAt: data.createdAt || "",
      lastLogin: data.lastLogin || "",
    });
  };

  const fallbackProfile = () => {
    setProfile((p) => ({
      ...p,
      fullName: localStorage.getItem("shop_full_name") || "",
      username: localStorage.getItem("shop_username") || "",
      role,
    }));
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const uid = await resolveUserId();
      if (uid) {
        const { data } = await api.get(`/users/${uid}`);
        applyProfile(data);
      } else {
        fallbackProfile();
      }
    } catch {
      fallbackProfile();
    } finally { setLoading(false); }
  };

  const saveProfile = async () => {
    setSaving(true);
    setMsg("");
    try {
      const uid = await resolveUserId();
      if (!uid) {
        setMsg("Account not found — please log in again");
        setTimeout(() => setMsg(""), 3000);
        return;
      }
      await api.put(`/users/${uid}`, {
        username: profile.username,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
      });
      localStorage.setItem("shop_full_name", profile.fullName);
      localStorage.setItem("shop_username", profile.username);
      setMsg("Profile updated successfully!");
      setTimeout(() => setMsg(""), 3000);
    } catch {
      setMsg("Failed to update profile");
      setTimeout(() => setMsg(""), 3000);
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    setPwMsg("");
    if (!pwForm.currentPassword) { setPwMsg("Enter your current password"); return; }
    if (!pwForm.newPassword) { setPwMsg("Enter a new password"); return; }
    if (pwForm.newPassword.length < 4) { setPwMsg("Password must be at least 4 characters"); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwMsg("New passwords do not match"); return; }

    setPwSaving(true);
    try {
      const uid = await resolveUserId();
      if (!uid) {
        setPwMsg("Account not found — please log in again");
        return;
      }
      await api.put(`/users/${uid}`, { password: pwForm.newPassword });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwMsg("Password changed successfully!");
      await loadProfile();
      setTimeout(() => setPwMsg(""), 3000);
    } catch {
      setPwMsg("Failed to change password");
      setTimeout(() => setPwMsg(""), 3000);
    } finally { setPwSaving(false); }
  };

  const updateProfileField = (field) => (value) => setProfile((prev) => ({ ...prev, [field]: value }));
  const updatePwField = (field) => (value) => setPwForm((prev) => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <Spinner size={28} text="Loading..." />
      </View>
    );
  }

  const isError = (m) => m.includes("Failed") || m.includes("do not match") || m.includes("must be") || m.includes("not found");

  return (
    <SafeAreaView edges={["bottom"]} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <Ionicons name="person-outline" size={22} color={colors.primary} />
          <Text style={styles.h1}>My Account</Text>
        </View>

        <View style={styles.columns}>
          {/* Left: Profile */}
          <Card style={styles.profileCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-outline" size={16} color={colors.primary} />
              <Text style={styles.cardHeaderText}>Profile Information</Text>
            </View>
            <View style={styles.cardBody}>
              {msg && (
                <View style={[styles.alert, { backgroundColor: isError(msg) ? "#fef2f2" : "#f0fdf4", borderColor: isError(msg) ? "#fecaca" : "#bbf7d0" }]}>
                  <Ionicons name={isError(msg) ? "alert-circle" : "checkmark-circle"} size={13} color={isError(msg) ? "#991b1b" : "#166534"} />
                  <Text style={{ fontSize: font.sm, color: isError(msg) ? "#991b1b" : "#166534", flex: 1 }}>{msg}</Text>
                </View>
              )}

              <View style={styles.avatarRow}>
                <View style={styles.avatarCircle}>
                  <Text style={{ fontSize: 22, fontWeight: "800", color: "#fff" }}>
                    {(profile.fullName || profile.username || "U").charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: font.lg, fontWeight: "700", color: colors.slate900 }}>{profile.fullName || profile.username}</Text>
                  <Text style={{ fontSize: font.sm, color: "#64748b" }}>@{profile.username}</Text>
                  <View style={styles.roleChip}>
                    <Ionicons name="shield-checkmark-outline" size={10} color={colors.primary} />
                    <Text style={{ fontSize: font.xs, fontWeight: "700", color: colors.primary }}>{roleLabel(profile.role)}</Text>
                  </View>
                </View>
              </View>

              <TextField label="Full Name" value={profile.fullName} onChangeText={updateProfileField("fullName")} />
              <TextField label="Username" value={profile.username} onChangeText={updateProfileField("username")} />
              <View style={styles.formRow}>
                <View style={styles.col}>
                  <TextField label="Email" value={profile.email} onChangeText={updateProfileField("email")} placeholder="you@example.com" keyboardType="email-address" />
                </View>
                <View style={styles.col}>
                  <TextField label="Phone" value={profile.phone} onChangeText={updateProfileField("phone")} placeholder="+255 7XX XXX XXX" keyboardType="phone-pad" />
                </View>
              </View>
              <TextField label="Address" value={profile.address} onChangeText={updateProfileField("address")} placeholder="Your address" />

              <View style={styles.formRow}>
                <View style={[styles.metaCard, { flex: 1 }]}>
                  <Text style={styles.metaLabel}>STATUS</Text>
                  <Text style={[styles.metaValue, { color: profile.isEnabled ? "#16a34a" : "#dc2626" }]}>
                    {profile.isEnabled ? "Active" : "Disabled"}
                  </Text>
                </View>
                <View style={[styles.metaCard, { flex: 1 }]}>
                  <Text style={styles.metaLabel}>LAST LOGIN</Text>
                  <Text style={styles.metaValue}>
                    {profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : "Never"}
                  </Text>
                </View>
              </View>

              <Button
                title={saving ? "Saving..." : "Save Changes"}
                variant="primary"
                size="md"
                loading={saving}
                disabled={saving}
                onPress={saveProfile}
                icon={<Ionicons name="save-outline" size={14} color="#fff" />}
              />
            </View>
          </Card>

          {/* Right: Password */}
          <View style={styles.rightCol}>
            {/* Current Password */}
            <Card style={styles.pwShowCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="lock-closed-outline" size={16} color="#f59e0b" />
                <Text style={styles.cardHeaderText}>Current Password</Text>
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.toggleBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={14} color="#64748b" />
                  <Text style={{ fontSize: font.xs, color: "#64748b" }}>{showPassword ? "Hide" : "Show"}</Text>
                </Pressable>
              </View>
              <View style={styles.pwDisplay}>
                <Text style={[styles.pwText, { fontSize: showPassword ? 18 : 16, letterSpacing: showPassword ? 2 : 6 }]}>
                  {showPassword ? (profile.plainPassword || "—") : "••••••••"}
                </Text>
                <Text style={{ fontSize: font.xs, color: "#94a3b8", marginTop: 8 }}>
                  {profile.plainPassword ? "Password stored in plain text" : "Password not available — contact admin"}
                </Text>
              </View>
            </Card>

            {/* Change Password */}
            <Card style={{ ...styles.pwShowCard, flex: 1 }}>
              <View style={styles.cardHeader}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.primary} />
                <Text style={styles.cardHeaderText}>Change Password</Text>
              </View>
              <View style={styles.cardBody}>
                {pwMsg && (
                  <View style={[styles.alert, { backgroundColor: isError(pwMsg) ? "#fef2f2" : "#f0fdf4", borderColor: isError(pwMsg) ? "#fecaca" : "#bbf7d0" }]}>
                    <Ionicons name={isError(pwMsg) ? "alert-circle" : "checkmark-circle"} size={13} color={isError(pwMsg) ? "#991b1b" : "#166534"} />
                    <Text style={{ fontSize: font.sm, color: isError(pwMsg) ? "#991b1b" : "#166534", flex: 1 }}>{pwMsg}</Text>
                  </View>
                )}
                <TextField label="Current Password" value={pwForm.currentPassword} onChangeText={updatePwField("currentPassword")} placeholder="Enter current password" secureTextEntry />
                <TextField label="New Password" value={pwForm.newPassword} onChangeText={updatePwField("newPassword")} placeholder="Enter new password" secureTextEntry />
                <TextField label="Confirm New Password" value={pwForm.confirmPassword} onChangeText={updatePwField("confirmPassword")} placeholder="Confirm new password" secureTextEntry />
                <Button
                  title={pwSaving ? "Changing..." : "Change Password"}
                  variant="secondary"
                  size="md"
                  loading={pwSaving}
                  disabled={pwSaving}
                  onPress={changePassword}
                  icon={<Ionicons name="lock-closed-outline" size={14} color="#fff" />}
                  style={{ backgroundColor: "#f59e0b" }}
                />
              </View>
            </Card>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  scroll: { padding: spacing.sm },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm, paddingHorizontal: spacing.sm },
  h1: { fontSize: 18, fontWeight: "700", color: colors.slate900 },
  columns: { flexDirection: "row", gap: spacing.sm, flex: 1 },
  profileCard: { flex: 1, overflow: "hidden", padding: 0 },
  rightCol: { flex: 1, gap: spacing.sm },
  pwShowCard: { padding: 0, overflow: "hidden" },
  cardHeader: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: "#e2e8f0", backgroundColor: "#f8fafc",
  },
  cardHeaderText: { fontSize: font.base, fontWeight: "700", color: colors.slate900 },
  cardBody: { padding: spacing.lg, gap: spacing.sm },
  alert: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm,
    borderWidth: 1,
  },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: spacing.sm },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
  },
  roleChip: {
    flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4,
    paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99,
    backgroundColor: colors.primaryLight, alignSelf: "flex-start",
  },
  formRow: { flexDirection: "row", gap: spacing.sm },
  col: { flex: 1 },
  metaCard: {
    padding: 10, backgroundColor: "#f8fafc", borderRadius: radius.sm, borderWidth: 1, borderColor: "#e2e8f0",
  },
  metaLabel: { fontSize: font.xs, color: "#64748b", fontWeight: "600", textTransform: "uppercase" },
  metaValue: { fontSize: 13, fontWeight: "700", color: colors.slate900, marginTop: 2 },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  pwDisplay: { alignItems: "center", padding: spacing.lg },
  pwText: {
    fontWeight: "700", color: colors.slate900, padding: 12,
    backgroundColor: "#f8fafc", borderRadius: radius.md,
    borderWidth: 1, borderStyle: "dashed", borderColor: "#e2e8f0",
    overflow: "hidden", textAlign: "center",
  },
});
