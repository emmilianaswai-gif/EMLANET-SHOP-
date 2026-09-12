import { View, Text, StyleSheet } from "react-native";
import { usePermissions } from "./PermissionContext";
import { colors, font, radius } from "../theme";

// Component-level permission gate that mirrors ProtectedRoute.jsx's PermGate.
// Pass `module` (e.g. "products") and it renders children only when the
// current role has read access. Admins always pass through.
export default function PermGate({ module, children, fallback = null }) {
  const { hasPerm, loading } = usePermissions();
  const role = global.localStorage.getItem("shop_role") || "";

  if (role === "admin" || role === "super_admin") return children;
  if (loading) return <View style={styles.wrap}><Text style={styles.text}>Loading...</Text></View>;
  if (!module || !hasPerm(module, "read")) {
    if (fallback) return fallback;
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Access Restricted</Text>
        <Text style={styles.text}>You do not have permission to view this.</Text>
      </View>
    );
  }
  return children;
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", padding: 40, gap: 8 },
  title: { fontSize: font.lg, fontWeight: "700", color: colors.slate700 },
  text: { fontSize: font.sm, color: colors.slate500, textAlign: "center" },
});