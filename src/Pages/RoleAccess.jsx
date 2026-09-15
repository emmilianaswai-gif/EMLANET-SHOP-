import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import { usePermissions } from "../Layout/PermissionContext";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { isSuperAdmin, SUPER_ADMIN_ROLE } from "../utils/roles";
import { useLanguage } from "../i18n";
import { confirmDialog } from "../utils/confirm";
import { TextField, SelectField } from "../components/ui";
import { colors, font, radius, spacing } from "../theme";

const MODULES = [
  { id: "dashboard", label: "Dashboard", icon: "grid-outline", category: "Core" },
  { id: "products", label: "Products", icon: "cube-outline", category: "Inventory" },
  { id: "categories", label: "Categories", icon: "server-outline", category: "Inventory" },
  { id: "stock", label: "Stock", icon: "cube-outline", category: "Inventory" },
  { id: "stock_history", label: "Stock History", icon: "time-outline", category: "Inventory" },
  { id: "purchases", label: "Purchases", icon: "cart-outline", category: "Sales" },
  { id: "purchase_items", label: "Purchase Items", icon: "cart-outline", category: "Sales" },
  { id: "sales", label: "Sales", icon: "cart-outline", category: "Sales" },
  { id: "sale_manager", label: "Sale Manager", icon: "bar-chart-outline", category: "Sales" },
  { id: "sale_items", label: "Sale Items", icon: "bar-chart-outline", category: "Sales" },
  { id: "customers", label: "Customers", icon: "people-outline", category: "People" },
  { id: "suppliers", label: "Suppliers", icon: "truck-outline", category: "People" },
  { id: "users", label: "Users", icon: "shield-outline", category: "Administration" },
  { id: "exchange", label: "Exchange/Storing", icon: "swap-horizontal-outline", category: "Operations" },
  { id: "reports", label: "Reports", icon: "bar-chart-outline", category: "Analytics" },
  { id: "payments", label: "Payments", icon: "wallet-outline", category: "Finance" },
  { id: "my_pocket", label: "My Pocket", icon: "wallet-outline", category: "Finance" },
  { id: "settings", label: "Settings", icon: "settings-outline", category: "Administration" },
  { id: "my_account", label: "My Account", icon: "person-circle-outline", category: "System" },
  { id: "support", label: "Support", icon: "help-circle-outline", category: "System" },
];

const PERMISSIONS = [
  { id: "read", label: "Read", color: "#2563eb" },
  { id: "write", label: "Write", color: "#059669" },
  { id: "edit", label: "Edit", color: "#d97706" },
  { id: "delete", label: "Delete", color: "#dc2626" },
  { id: "export", label: "Export", color: "#7c3aed" },
];

const ROLE_COLORS = ["#7c3aed", "#2563eb", "#0891b2", "#059669", "#d97706", "#dc2626", "#db2777", "#6366f1", "#0d9488", "#ca8a04"];

const SYSTEM_ROLES = [
  { name: "Super Admin", color: "#4c1d95", level: 0, isSystem: true, description: "Full platform, shops & user management" },
  { name: "Admin", color: "#7c3aed", level: 1, isSystem: true, description: "Full system access" },
  { name: "Manager", color: "#2563eb", level: 2, isSystem: true, description: "Manage operations & staff" },
  { name: "Employee", color: "#0891b2", level: 3, isSystem: true, description: "General staff access" },
  { name: "Cashier", color: "#059669", level: 4, isSystem: true, description: "POS & payments" },
  { name: "Clerk", color: "#d97706", level: 5, isSystem: true, description: "Data entry & inventory" },
  { name: "Customer", color: "#db2777", level: 6, isSystem: true, description: "Customer portal & purchases" },
];

const hexToRgba = (hex, a) => {
  const h = String(hex || "#000000").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

function Toggle({ enabled, onChange, color = "#2563eb" }) {
  return (
    <Pressable onPress={() => onChange(!enabled)} style={[stylesToggle.track, { backgroundColor: enabled ? color : colors.slate200 }]} hitSlop={6}>
      <View style={[stylesToggle.knob, { left: enabled ? 18 : 2 }]} />
    </Pressable>
  );
}

const stylesToggle = StyleSheet.create({
  track: { width: 36, height: 20, borderRadius: 10, position: "relative", justifyContent: "center" },
  knob: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: colors.white,
    position: "absolute", top: 2, shadowColor: "#000", shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 }, shadowRadius: 1.5, elevation: 2,
  },
});

function Badge({ children, color, bg }) {
  const c = color || colors.slate500;
  return (
    <View style={[stylesBadge.badge, { backgroundColor: bg || hexToRgba(c, 0.08), borderColor: hexToRgba(c, 0.13) }]}>
      <Text style={[stylesBadge.text, { color: c }]}>{children}</Text>
    </View>
  );
}

const stylesBadge = StyleSheet.create({
  badge: {
    alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4,
    paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.pill, borderWidth: 1,
  },
  text: { fontSize: font.xs, fontWeight: "600" },
});

export default function RoleAccess() {
  useLanguage();
  const { refreshPerms } = usePermissions();
  const [roles, setRoles] = useState([]);
  const [permMap, setPermMap] = useState({});
  const [activeTab, setActiveTab] = useState("hierarchy");
  const [selectedRole, setSelectedRole] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [assigningUser, setAssigningUser] = useState(null);
  const [newAssignRole, setNewAssignRole] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState({});
  const [auditFilter, setAuditFilter] = useState("all");
  const [permSearch, setPermSearch] = useState("");
  const [showAddRole, setShowAddRole] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: "", color: "#7c3aed", description: "", level: "10" });

  const deletableRoles = roles.filter((r) => !r.isSystem);
  const bulk = useBulkSelect(deletableRoles, (r) => r.id);

  const ALL_PERMS = ["read", "write", "edit", "delete", "export"];
  const CUSTOMER_MODULE_IDS = ["dashboard", "products", "purchases", "payments", "my_account"];

  const buildDefaultPerms = useCallback(() => {
    const map = {};
    SYSTEM_ROLES.forEach((role) => {
      map[role.name.toLowerCase()] = {};
      MODULES.forEach((m) => {
        if (role.name === "Customer") {
          if (CUSTOMER_MODULE_IDS.includes(m.id)) {
            map[role.name.toLowerCase()][m.id] = m.id === "my_account" ? [] : ["read"];
          }
        } else {
          map[role.name.toLowerCase()][m.id] = [...ALL_PERMS];
        }
      });
    });
    return map;
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [permsRes, usersRes, customRolesRes] = await Promise.all([
        api.get("/role-permissions").catch(() => ({ data: [] })),
        api.get("/users").catch(() => ({ data: [] })),
        api.get("/custom-roles").catch(() => ({ data: [] })),
      ]);

      const map = buildDefaultPerms();
      if (Array.isArray(permsRes.data)) {
        permsRes.data.forEach((p) => {
          const role = (p.roleName || "").toLowerCase();
          if (!map[role]) map[role] = {};
          if (role === "customer" && !CUSTOMER_MODULE_IDS.includes(p.moduleId)) return;
          map[role][p.moduleId] = [];
          if (p.canRead) map[role][p.moduleId].push("read");
          if (p.canWrite) map[role][p.moduleId].push("write");
          if (p.canEdit) map[role][p.moduleId].push("edit");
          if (p.canDelete) map[role][p.moduleId].push("delete");
          if (p.canExport) map[role][p.moduleId].push("export");
        });
      }

      const customRoles = (Array.isArray(customRolesRes.data) ? customRolesRes.data : []).map((r) => ({
        name: r.name, color: r.color || "#64748b", level: r.level || 10,
        isSystem: false, description: r.description || "", id: r.id,
      }));

      customRoles.forEach((role) => {
        if (!map[role.name.toLowerCase()]) {
          map[role.name.toLowerCase()] = {};
          MODULES.forEach((m) => { map[role.name.toLowerCase()][m.id] = [...ALL_PERMS]; });
        }
      });

      if (!Array.isArray(permsRes.data) || permsRes.data.length === 0) {
        const payload = [];
        Object.entries(map).forEach(([role, modules]) => {
          Object.entries(modules).forEach(([moduleId, perms]) => {
            payload.push({
              roleName: role, moduleId,
              canRead: perms.includes("read"), canWrite: perms.includes("write"),
              canEdit: perms.includes("edit"), canDelete: perms.includes("delete"),
              canExport: perms.includes("export"),
            });
          });
        });
        if (payload.length > 0) {
          api.post("/role-permissions/bulk", payload).catch(() => {});
        }
      }

      setRoles([...SYSTEM_ROLES, ...customRoles]);
      setPermMap(map);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch {
      setRoles([...SYSTEM_ROLES]);
      setPermMap(buildDefaultPerms());
    } finally {
      setLoading(false);
    }
  }, [buildDefaultPerms]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const handler = () => loadAll();
    window.addEventListener("roleChanged", handler);
    return () => window.removeEventListener("roleChanged", handler);
  }, [loadAll]);

  const showMsg = (text) => { setMsg(text); setTimeout(() => setMsg(""), 2500); };

  const deleteSelectedRoles = async () => {
    if (bulk.selected.length === 0) return;
    if (!(await confirmDialog(`Delete ${bulk.selected.length} selected role(s)?`))) return;
    let failed = 0;
    for (const id of bulk.selected) {
      try { await api.delete(`/custom-roles/${id}`); } catch { failed++; }
    }
    bulk.clear();
    await loadAll();
    if (failed > 0) showMsg(`Deleted most roles — ${failed} failed`);
    else showMsg("Roles deleted!");
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      const payload = [];
      Object.entries(permMap).forEach(([role, modules]) => {
        Object.entries(modules).forEach(([moduleId, perms]) => {
          payload.push({
            roleName: role, moduleId,
            canRead: perms.includes("read"), canWrite: perms.includes("write"),
            canEdit: perms.includes("edit"), canDelete: perms.includes("delete"),
            canExport: perms.includes("export"),
          });
        });
      });
      await api.post("/role-permissions/bulk", payload);
      showMsg("Permissions saved to database!");
      refreshPerms();
    } catch {
      showMsg("Failed to save permissions");
    } finally { setSaving(false); }
  };

  const handleAddRole = async () => {
    if (!roleForm.name.trim()) return showMsg("Role name is required");
    const exists = roles.some((r) => r.name.toLowerCase() === roleForm.name.trim().toLowerCase());
    if (exists) return showMsg("Role already exists");
    try {
      const payload = {
        name: roleForm.name.trim(),
        color: roleForm.color,
        level: parseInt(roleForm.level) || 10,
        description: roleForm.description.trim(),
        isSystem: false,
      };
      await api.post("/custom-roles", payload);
      setShowAddRole(false);
      setRoleForm({ name: "", color: "#7c3aed", description: "", level: "10" });
      showMsg("Role created!");
      await loadAll();
    } catch {
      showMsg("Failed to create role");
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.isSystem) return showMsg("Cannot delete system role");
    const roleUsers = users.filter((u) => (u.role || "").toLowerCase() === role.name.toLowerCase());
    if (roleUsers.length > 0) {
      if (!(await confirmDialog(`Role "${role.name}" has ${roleUsers.length} user(s) assigned.\nAll users will lose their role. Delete anyway?`))) return;
    } else {
      if (!(await confirmDialog(`Delete role "${role.name}"?`))) return;
    }
    try {
      await api.delete(`/custom-roles/${role.id}`);
      showMsg("Role deleted!");
      setSelectedRole(null);
      await loadAll();
    } catch {
      showMsg("Failed to delete role");
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    try {
      await api.put(`/custom-roles/${editingRole.id}`, {
        name: roleForm.name.trim() || editingRole.name,
        color: roleForm.color,
        level: parseInt(roleForm.level) || editingRole.level,
        description: roleForm.description.trim(),
        isSystem: false,
      });
      setEditingRole(null);
      showMsg("Role updated!");
      await loadAll();
    } catch {
      showMsg("Failed to update role");
    }
  };

  const updatePerm = (roleName, moduleId, permId) => {
    setPermMap((prev) => {
      const copy = { ...prev };
      if (!copy[roleName]) copy[roleName] = {};
      if (!copy[roleName][moduleId]) copy[roleName][moduleId] = [];
      const current = copy[roleName][moduleId];
      copy[roleName][moduleId] = current.includes(permId) ? current.filter((p) => p !== permId) : [...current, permId];
      return copy;
    });
  };

  const setAllModulePerms = (roleName, moduleId) => {
    setPermMap((prev) => {
      const copy = { ...prev };
      if (!copy[roleName]) copy[roleName] = {};
      const current = copy[roleName][moduleId] || [];
      copy[roleName][moduleId] = current.length === 5 ? [] : PERMISSIONS.map((p) => p.id);
      return copy;
    });
  };

  const assignUserRole = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      const { data } = await api.get("/users");
      setUsers(Array.isArray(data) ? data : []);
      setAssigningUser(null);
      window.dispatchEvent(new Event("roleChanged"));
      showMsg("Role updated!");
    } catch { showMsg("Failed to update role"); }
  };

  const isSuper = isSuperAdmin(localStorage.getItem("shop_role") || "");
  const scopedUsers = isSuper ? users : users.filter((u) => (u.role || "").toLowerCase() !== SUPER_ADMIN_ROLE);
  const visibleRoles = isSuper ? roles : roles.filter((r) => r.name.toLowerCase() !== SUPER_ADMIN_ROLE);
  const assignableRoles = visibleRoles;

  const roleUserCounts = {};
  scopedUsers.forEach((u) => { const r = (u.role || "").toLowerCase(); roleUserCounts[r] = (roleUserCounts[r] || 0) + 1; });

  const tabs = [
    { id: "hierarchy", label: "Hierarchy", icon: "shield-outline" },
    { id: "matrix", label: "Permissions", icon: "key-outline" },
    { id: "assignment", label: "Assignment", icon: "person-check-outline" },
    { id: "security", label: "Security", icon: "lock-closed-outline" },
  ];

  const AUDIT_LOGS = [
    { id: 1, user: "Emmy Admin", action: "Role Changed", target: "johndoe", detail: "Cashier → Manager", time: "2 min ago", type: "role" },
    { id: 2, user: "Emmy Admin", action: "User Created", target: "newclerk", detail: "Role: Clerk assigned", time: "15 min ago", type: "create" },
    { id: 3, user: "Manager", action: "Permission Updated", target: "Products", detail: "Added export to Employee", time: "1 hr ago", type: "permission" },
    { id: 4, user: "Emmy Admin", action: "Access Revoked", target: "olduser", detail: "Account disabled", time: "3 hrs ago", type: "revoke" },
    { id: 5, user: "System", action: "Login Attempt", target: "unknown_user", detail: "Failed 3x — locked", time: "5 hrs ago", type: "security" },
  ];
  const typeColors = { role: "#2563eb", create: "#059669", permission: "#d97706", revoke: "#dc2626", security: "#ef4444" };
  const filteredLogs = auditFilter === "all" ? AUDIT_LOGS : AUDIT_LOGS.filter((l) => l.type === auditFilter);

  if (loading) return (
    <View style={{ height: 400, alignItems: "center", justifyContent: "center" }}>
      <Spinner size={28} text="Loading..." />
    </View>
  );

  const isError = msg => msg.includes("Failed") || msg.includes("Cannot");

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {!!msg && (
        <View style={[styles.toast, {
          backgroundColor: isError(msg) ? colors.dangerLight : colors.successLight,
          borderColor: isError(msg) ? "#fecaca" : "#bbf7d0",
        }]}>
          <Text style={{ color: isError(msg) ? "#991b1b" : "#166534", fontSize: font.sm, fontWeight: "600" }}>{msg}</Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="shield-outline" size={22} color="#7c3aed" />
          <Text style={styles.pageTitle}>Role & Access Management</Text>
          <Badge color="#7c3aed">{visibleRoles.length} Roles</Badge>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.headerBtn, bulk.mode ? { backgroundColor: "#f5f3ff", borderColor: "#7c3aed" } : { backgroundColor: "#fff", borderColor: "#d1d5db" }]}
            onPress={() => (bulk.mode ? bulk.clear() : bulk.startMode())}
          >
            <Ionicons name="checkbox" size={14} color="#7c3aed" />
            <Text style={[styles.headerBtnText, { color: "#7c3aed" }]}>{bulk.mode ? "Cancel" : "Select"}</Text>
          </Pressable>
          <Pressable
            style={[styles.headerBtn, styles.headerBtnAdd]}
            onPress={() => { setShowAddRole(true); setEditingRole(null); setRoleForm({ name: "", color: ROLE_COLORS[roles.length % ROLE_COLORS.length], description: "", level: String(10 + roles.length) }); }}
          >
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={[styles.headerBtnText, { color: "#fff" }]}>Add Role</Text>
          </Pressable>
          <Pressable
            style={[styles.headerBtn, { backgroundColor: saving ? colors.slate400 : "#7c3aed", borderColor: "transparent" }]}
            disabled={saving}
            onPress={savePermissions}
          >
            <Ionicons name="save-outline" size={14} color="#fff" />
            <Text style={[styles.headerBtnText, { color: "#fff" }]}>{saving ? "Saving..." : "Save Perms"}</Text>
          </Pressable>
          {bulk.mode && <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected}
            onSelectAll={bulk.toggleAll} onDelete={deleteSelectedRoles} deleteLabel="Delete Selected" />}
        </View>
      </View>

      {(showAddRole || editingRole) && (
        <View style={[styles.roleFormCard, { borderColor: hexToRgba(roleForm.color, 0.25) }]}>
          <View style={styles.roleFormHeader}>
            <View style={styles.roleFormTitle}>
              <Ionicons name="shield-outline" size={16} color={roleForm.color} />
              <Text style={styles.roleFormHeading}>{editingRole ? `Edit Role: ${editingRole.name}` : "Create New Role"}</Text>
            </View>
            <Pressable onPress={() => { setShowAddRole(false); setEditingRole(null); }} hitSlop={8}>
              <Ionicons name="close" size={16} color={colors.slate400} />
            </Pressable>
          </View>
          <View style={styles.roleFormGrid}>
            <View style={styles.roleFormField}>
              <TextField
                label="Role Name *"
                value={roleForm.name}
                onChangeText={(v) => setRoleForm((f) => ({ ...f, name: v }))}
                placeholder="e.g. Supervisor"
                editable={!(!!editingRole && editingRole.isSystem)}
              />
            </View>
            <View style={styles.roleFormField}>
              <TextField
                label="Level (1=highest)"
                value={roleForm.level}
                onChangeText={(v) => setRoleForm((f) => ({ ...f, level: v }))}
                keyboardType="number-pad"
                placeholder="10"
              />
            </View>
            <View style={[styles.roleFormField, { flexBasis: "100%" }]}>
              <TextField
                label="Description"
                value={roleForm.description}
                onChangeText={(v) => setRoleForm((f) => ({ ...f, description: v }))}
                placeholder="Brief description"
              />
            </View>
            <View style={[styles.roleFormField, { flexBasis: "100%" }]}>
              <Text style={styles.colorLabel}>Color</Text>
              <View style={styles.colorRow}>
                {ROLE_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setRoleForm((f) => ({ ...f, color: c }))}
                    style={[styles.colorSwatch, { backgroundColor: c, borderWidth: roleForm.color === c ? 3 : 2, borderColor: roleForm.color === c ? colors.slate900 : colors.slate200 }]}
                  />
                ))}
              </View>
            </View>
          </View>
          <View style={styles.roleFormFooter}>
            <Pressable style={styles.cancelBtn} onPress={() => { setShowAddRole(false); setEditingRole(null); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.submitBtn, { backgroundColor: editingRole ? colors.primary : colors.success }]} onPress={editingRole ? handleUpdateRole : handleAddRole}>
              <Text style={styles.submitBtnText}>{editingRole ? "Update Role" : "Create Role"}</Text>
            </Pressable>
          </View>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBarScroll}>
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)}
                style={[styles.tab, { backgroundColor: active ? "#7c3aed" : "transparent" }]}>
                <Ionicons name={tab.icon} size={14} color={active ? "#fff" : colors.slate500} />
                <Text style={[styles.tabText, { color: active ? "#fff" : colors.slate500 }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {activeTab === "hierarchy" && (
        <View style={styles.hierarchyGrid}>
          {[...visibleRoles].sort((a, b) => a.level - b.level).map((role) => {
            const isSelected = selectedRole === role.name;
            const rPerms = permMap[role.name.toLowerCase()] || {};
            const totalPerms = Object.values(rPerms).reduce((sum, p) => sum + p.length, 0);
            const moduleCount = role.name === "Customer" ? CUSTOMER_MODULE_IDS.length : MODULES.length;
            const maxPerms = moduleCount * 5;
            const permPercent = maxPerms > 0 ? Math.round((totalPerms / maxPerms) * 100) : 0;
            const userCount = roleUserCounts[role.name.toLowerCase()] || 0;
            const roleUsers = scopedUsers.filter((u) => (u.role || "").toLowerCase() === role.name.toLowerCase());
            return (
              <Pressable key={role.name}
                onPress={() => setSelectedRole(isSelected ? null : role.name)}
                style={[styles.roleCard, { borderColor: isSelected ? role.color : colors.slate200 }]}>
                <View style={[styles.roleTopBar, { backgroundColor: role.color }]} />
                {bulk.mode && !role.isSystem && (
                  <Pressable style={styles.roleBulkBox} onPress={() => bulk.toggle(role.id)} hitSlop={6}>
                    <Ionicons name={bulk.selectedSet.has(role.id) ? "checkbox" : "square-outline"} size={17} color={bulk.selectedSet.has(role.id) ? colors.primary : colors.slate400} />
                  </Pressable>
                )}
                <View style={styles.roleCardHead}>
                  <View style={styles.roleIdentity}>
                    <View style={[styles.roleAvatar, { backgroundColor: hexToRgba(role.color, 0.08) }]}>
                      <Ionicons name="shield-outline" size={18} color={role.color} />
                    </View>
                    <View>
                      <Text style={styles.roleName}>{role.name}</Text>
                      <Text style={styles.roleLevel}>Level {role.level}</Text>
                    </View>
                  </View>
                  <View style={styles.roleCardActions}>
                    {role.isSystem ? <Badge color={colors.slate400} bg="#f1f5f9">System</Badge> : (
                      <>
                        <Pressable style={styles.roleSmallBtn} onPress={(e) => { e.stopPropagation(); setEditingRole(role); setShowAddRole(true); setRoleForm({ name: role.name, color: role.color, description: role.description || "", level: String(role.level) }); }} hitSlop={4}>
                          <Ionicons name="create-outline" size={12} color={colors.primary} />
                        </Pressable>
                        <Pressable style={styles.roleSmallBtn} onPress={(e) => { e.stopPropagation(); handleDeleteRole(role); }} hitSlop={4}>
                          <Ionicons name="trash-outline" size={12} color={colors.danger} />
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
                <Text style={styles.roleDesc}>{role.description || "No description"}</Text>
                <View style={styles.permMetaRow}>
                  <Text style={styles.permMetaLabel}>Permissions</Text>
                  <Text style={[styles.permMetaValue, { color: role.color }]}>{permPercent}%</Text>
                </View>
                <View style={[styles.permTrack, { backgroundColor: colors.slate100 }]}>
                  <View style={[styles.permFill, { width: `${permPercent}%`, backgroundColor: role.color }]} />
                </View>
                <View style={styles.roleCardFoot}>
                  <Text style={styles.userCountLine}><Ionicons name="people-outline" size={12} color={colors.slate400} /> {userCount} user{userCount !== 1 ? "s" : ""}</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.slate400} style={[isSelected && { transform: [{ rotate: "180deg" }] }]} />
                </View>
                {isSelected && (
                  <View style={styles.roleExpanded}>
                    <Text style={styles.moduleAccessLabel}>Module Access</Text>
                    <View style={styles.moduleChips}>
                      {MODULES.filter((m) => role.name !== "Customer" || CUSTOMER_MODULE_IDS.includes(m.id)).map((m) => {
                        const perms = rPerms[m.id] || [];
                        const full = perms.length === 5;
                        const some = perms.length > 0;
                        return (
                          <View key={m.id} style={[styles.moduleChip, {
                            backgroundColor: full ? hexToRgba(role.color, 0.08) : some ? "#fef3c7" : colors.slate50,
                            borderColor: full ? hexToRgba(role.color, 0.18) : some ? "#fcd34d" : colors.slate200,
                          }]}>
                            <Text style={{ fontSize: 10, fontWeight: "500", color: full ? role.color : some ? "#92400e" : colors.slate300 }}>{m.label}</Text>
                          </View>
                        );
                      })}
                    </View>
                    {roleUsers.length === 0 ? (
                      <Text style={styles.noUsersText}>No users assigned</Text>
                    ) : (
                      <View>
                        <Text style={styles.assignedLabel}>Assigned Users ({roleUsers.length})</Text>
                        <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                          {roleUsers.map((u) => {
                            const isThisUserAssigning = assigningUser === u.id;
                            return (
                              <View key={u.id} style={styles.assignRow}>
                                <View style={styles.assignIdentity}>
                                  <View style={[styles.assignAvatar, { backgroundColor: hexToRgba(role.color, 0.12) }]}>
                                    <Text style={{ fontSize: 9, fontWeight: "700", color: role.color }}>{(u.fullName || u.username || "?")[0].toUpperCase()}</Text>
                                  </View>
                                  <Text numberOfLines={1} style={styles.assignName}>{u.fullName || u.username}</Text>
                                </View>
                                {isThisUserAssigning ? (
                                  <View style={styles.assignControls}>
                                    <SelectField
                                      value={newAssignRole}
                                      onChange={setNewAssignRole}
                                      options={assignableRoles.map((r) => ({ value: r.name.toLowerCase(), label: r.name }))}
                                      containerStyle={{ marginBottom: 0, flex: 1 }}
                                    />
                                    <Pressable style={styles.okBtn} onPress={(e) => { e.stopPropagation(); assignUserRole(u.id, newAssignRole); }} hitSlop={4}>
                                      <Ionicons name="checkmark" size={12} color="#fff" />
                                    </Pressable>
                                    <Pressable onPress={(e) => { e.stopPropagation(); setAssigningUser(null); }} hitSlop={6}>
                                      <Ionicons name="close" size={14} color={colors.slate400} />
                                    </Pressable>
                                  </View>
                                ) : (
                                  <Pressable style={styles.moveBtn}
                                    onPress={(e) => { e.stopPropagation(); setAssigningUser(u.id); setNewAssignRole((u.role || "").toLowerCase()); }}>
                                    <Ionicons name="create-outline" size={9} color={colors.primary} />
                                    <Text style={styles.moveBtnText}>Move</Text>
                                  </Pressable>
                                )}
                              </View>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {activeTab === "matrix" && (
        <View style={styles.tableCard}>
          <View style={styles.tableToolbar}>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={14} color={colors.slate400} style={styles.searchIcon} />
              <TextField value={permSearch} onChangeText={setPermSearch} placeholder="Search modules..." containerStyle={styles.searchField} />
            </View>
            <Badge color="#7c3aed">{MODULES.length} Modules</Badge>
            <Badge color={colors.primary}>{visibleRoles.length} Roles</Badge>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.matrixTable, { minWidth: 160 + visibleRoles.length * 80 }]}>
              <View style={styles.matrixHeadRow}>
                <View style={[styles.matrixTh, { width: 160 }]}>
                  <Text style={styles.matrixThText}>Module</Text>
                </View>
                {visibleRoles.map((r) => (
                  <View key={r.name} style={[styles.matrixTh, styles.matrixThCenter, { width: 80 }]}>
                    <View style={styles.matrixRoleHead}>
                      <Ionicons name="shield-outline" size={11} color={r.color} />
                      <Text numberOfLines={2} style={[styles.matrixRoleHeadText, { color: r.color }]}>{r.name}</Text>
                    </View>
                  </View>
                ))}
              </View>
              {MODULES.filter((m) => !permSearch || m.label.toLowerCase().includes(permSearch.toLowerCase())).map((mod) => (
                <View key={mod.id} style={styles.matrixRow}>
                  <View style={[styles.matrixTd, { width: 160 }]}>
                    <View style={styles.matrixModuleCell}>
                      <Ionicons name={mod.icon} size={13} color={colors.slate400} />
                      <Text style={styles.matrixModuleText}>{mod.label}</Text>
                    </View>
                  </View>
                  {visibleRoles.map((r) => {
                    const isLocked = r.name === "Customer" && !CUSTOMER_MODULE_IDS.includes(mod.id);
                    const perms = (permMap[r.name.toLowerCase()] || {})[mod.id] || [];
                    if (isLocked) {
                      return (
                        <View key={r.name} style={[styles.matrixTd, styles.matrixTdCenter, { width: 80 }]}>
                          <View style={styles.lockedPill}>
                            <Ionicons name="lock-closed-outline" size={10} color={colors.slate300} />
                            <Text style={styles.lockedPillText}>—</Text>
                          </View>
                        </View>
                      );
                    }
                    const full = perms.length === 5;
                    const some = perms.length > 0;
                    return (
                      <View key={r.name} style={[styles.matrixTd, styles.matrixTdCenter, { width: 80 }]}>
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); setAllModulePerms(r.name.toLowerCase(), mod.id); }}
                          style={[styles.permPill, {
                            borderColor: full ? r.color : some ? "#fcd34d" : colors.slate200,
                            backgroundColor: full ? hexToRgba(r.color, 0.06) : some ? "#fffbeb" : colors.slate50,
                            color: full ? r.color : some ? "#92400e" : colors.slate300,
                          }]}
                        >
                          <Text style={{ fontSize: 10, fontWeight: "600", color: full ? r.color : some ? "#92400e" : colors.slate300 }}>
                            {full ? "All" : some ? `${perms.length}` : "—"}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={styles.matrixFooter}>
            <Text style={styles.matrixFooterText}><Ionicons name="eye-outline" size={11} color={colors.slate400} /> Sidebar toggle controls visibility in sidebar</Text>
            <Text style={styles.matrixFooterText}>Click permission cell to toggle All/None</Text>
          </View>
        </View>
      )}

      {activeTab === "matrix" && selectedRole && (() => {
        const role = roles.find((r) => r.name === selectedRole);
        if (!role) return null;
        const rPerms = permMap[role.name.toLowerCase()] || {};
        return (
          <View style={[styles.detailCard, { borderColor: hexToRgba(role.color, 0.19) }]}>
            <View style={[styles.detailHeader, { backgroundColor: hexToRgba(role.color, 0.03), borderBottomColor: hexToRgba(role.color, 0.13) }]}>
              <View style={styles.detailTitleRow}>
                <Ionicons name="shield-outline" size={18} color={role.color} />
                <View>
                  <Text style={styles.detailTitle}>{role.name} — Detailed Permissions</Text>
                  <Text style={styles.detailSubtitle}>Toggle individual permissions per module</Text>
                </View>
              </View>
              <Pressable onPress={() => setSelectedRole(null)} hitSlop={8}>
                <Ionicons name="close" size={16} color={colors.slate400} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[styles.detailTable, { minWidth: 600 }]}>
                <View style={styles.detailHeadRow}>
                  <View style={[styles.detailTh, { width: 200 }]}>
                    <Text style={styles.detailThText}>Module</Text>
                  </View>
                  <View style={[styles.detailTh, styles.detailThCenter, { width: 90 }]}>
                    <Text style={[styles.detailThText, { color: colors.primary }]}>Sidebar</Text>
                  </View>
                  {PERMISSIONS.map((p) => (
                    <View key={p.id} style={[styles.detailTh, styles.detailThCenter, { width: 72 }]}>
                      <Text style={[styles.detailThText, { color: p.color }]}>{p.label}</Text>
                    </View>
                  ))}
                </View>
                {MODULES.map((mod) => {
                  const isLocked = role.name === "Customer" && !CUSTOMER_MODULE_IDS.includes(mod.id);
                  const perms = rPerms[mod.id] || [];
                  const isVisible = perms.includes("read");
                  return (
                    <View key={mod.id} style={[styles.detailRow, { opacity: isLocked ? 0.4 : 1 }]}>
                      <View style={[styles.detailTd, { width: 200 }]}>
                        <View style={styles.detailModuleCell}>
                          <Ionicons name={mod.icon} size={13} color={colors.slate400} />
                          <Text style={styles.detailModuleText}>{mod.label}</Text>
                          {isLocked && <Ionicons name="lock-closed-outline" size={10} color={colors.slate400} />}
                        </View>
                      </View>
                      <View style={[styles.detailTd, styles.detailTdCenter, { width: 90 }]}>
                        {isLocked ? (
                          <Text style={{ fontSize: 10, color: colors.slate300 }}>—</Text>
                        ) : (
                          <Pressable
                            onPress={(e) => { e.stopPropagation(); updatePerm(role.name.toLowerCase(), mod.id, "read"); }}
                            style={[styles.sidebarBtn, {
                              borderColor: isVisible ? colors.primary : colors.slate200,
                              backgroundColor: isVisible ? colors.primaryLight : colors.slate50,
                            }]}
                          >
                            <Ionicons name={isVisible ? "eye-outline" : "eye-off-outline"} size={11} color={isVisible ? colors.primary : colors.slate400} />
                            <Text style={{ fontSize: 10, fontWeight: "600", color: isVisible ? colors.primary : colors.slate400 }}>{isVisible ? "On" : "Off"}</Text>
                          </Pressable>
                        )}
                      </View>
                      {PERMISSIONS.map((p) => (
                        <View key={p.id} style={[styles.detailTd, styles.detailTdCenter, { width: 72 }]}>
                          {isLocked ? (
                            <Text style={{ fontSize: 10, color: colors.slate300 }}>—</Text>
                          ) : (
                            <Toggle enabled={perms.includes(p.id)} color={p.color} onChange={() => updatePerm(role.name.toLowerCase(), mod.id, p.id)} />
                          )}
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        );
      })()}

      {activeTab === "assignment" && (
        <View style={styles.tableCard}>
          <View style={styles.assignTableHead}>
            <Ionicons name="person-check-outline" size={16} color={colors.primary} />
            <Text style={styles.assignTableTitle}>Team Members & Roles</Text>
            <Badge color={colors.slate400}>{scopedUsers.length}</Badge>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.assignTable, { minWidth: 600 }]}>
              <View style={styles.assignHeadRow}>
                {["User", "Role", "Status", "MFA", "Actions"].map((h, i) => (
                  <View key={h} style={[styles.assignTh, { width: i === 0 ? 200 : i === 1 ? 170 : i === 2 ? 90 : i === 3 ? 60 : 90 }]}>
                    <Text style={styles.assignThText}>{h}</Text>
                  </View>
                ))}
              </View>
              {scopedUsers.map((u) => {
                const uRole = roles.find((r) => r.name.toLowerCase() === (u.role || "").toLowerCase()) || roles[0];
                const active = u.isEnabled !== false;
                const isAssigning = assigningUser === u.id;
                return (
                  <View key={u.id} style={[styles.assignRowTable, { opacity: active ? 1 : 0.5 }]}>
                    <View style={[styles.assignTd, { width: 200 }]}>
                      <View style={styles.userCell}>
                        <View style={[styles.userAv, { backgroundColor: hexToRgba(uRole.color, 0.08) }]}>
                          <Text style={{ color: uRole.color, fontSize: font.xs, fontWeight: "700" }}>{(u.fullName || u.username || "?")[0].toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={1} style={styles.assignUserMain}>{u.fullName || u.username}</Text>
                          <Text numberOfLines={1} style={styles.assignUserSub}>@{u.username}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.assignTd, { width: 170 }]}>
                      {isAssigning ? (
                        <View style={styles.inlineAssign}>
                          <SelectField
                            value={newAssignRole}
                            onChange={setNewAssignRole}
                            options={assignableRoles.map((r) => ({ value: r.name.toLowerCase(), label: r.name }))}
                            containerStyle={{ marginBottom: 0, flex: 1 }}
                          />
                          <Pressable style={styles.saveTinyBtn} onPress={() => assignUserRole(u.id, newAssignRole)}>
                            <Text style={styles.saveTinyText}>Save</Text>
                          </Pressable>
                          <Pressable onPress={() => setAssigningUser(null)} hitSlop={6}>
                            <Text style={{ color: colors.slate400, fontSize: 10 }}>Cancel</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Badge color={uRole.color} bg={hexToRgba(uRole.color, 0.08)}>{uRole.name}</Badge>
                      )}
                    </View>
                    <View style={[styles.assignTd, styles.assignTdCenter, { width: 90 }]}>
                      <View style={[styles.statusPill, { backgroundColor: active ? "#f0fdf4" : "#fef2f2" }]}>
                        <View style={[styles.statusDot, { backgroundColor: active ? "#22c55e" : "#ef4444" }]} />
                        <Text style={{ fontSize: 10, fontWeight: "600", color: active ? "#166534" : "#991b1b" }}>{active ? "Active" : "Off"}</Text>
                      </View>
                    </View>
                    <View style={[styles.assignTd, styles.assignTdCenter, { width: 60 }]}>
                      <Toggle enabled={!!mfaEnabled[u.id]} color="#059669" onChange={() => setMfaEnabled((prev) => ({ ...prev, [u.id]: !prev[u.id] }))} />
                    </View>
                    <View style={[styles.assignTd, styles.assignTdCenter, { width: 90 }]}>
                      {!isAssigning && (
                        <Pressable style={styles.changeBtn} onPress={() => { setAssigningUser(u.id); setNewAssignRole((u.role || "").toLowerCase()); }}>
                          <Ionicons name="create-outline" size={11} color={colors.primary} />
                          <Text style={styles.changeBtnText}>Change</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {activeTab === "security" && (
        <View style={styles.securityGrid}>
          <View style={styles.securityCard}>
            <View style={styles.securityHead}>
              <View style={styles.securityHeadTitle}>
                <Ionicons name="pulse-outline" size={16} color={colors.danger} />
                <Text style={styles.securityHeadText}>Audit Log</Text>
              </View>
              <View style={styles.filterRow}>
                {["all", "role", "permission", "security", "create", "revoke"].map((f) => (
                  <Pressable key={f} style={[styles.filterBtn, { backgroundColor: auditFilter === f ? "#7c3aed" : "#fff", borderColor: auditFilter === f ? "#7c3aed" : colors.slate200 }]}
                    onPress={() => setAuditFilter(f)}>
                    <Text style={{ fontSize: 10, fontWeight: "600", color: auditFilter === f ? "#fff" : colors.slate500, textTransform: "capitalize" }}>{f}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View>
              {filteredLogs.map((log, i) => {
                const color = typeColors[log.type] || colors.slate500;
                const isLast = i === filteredLogs.length - 1;
                const iconByType = { role: "shield-outline", create: "add", permission: "key-outline", revoke: "person-remove-outline", security: "alert-circle-outline" };
                return (
                  <View key={log.id} style={[styles.logRow, { borderBottomWidth: isLast ? 0 : 1 }]}>
                    <View style={[styles.logIcon, { backgroundColor: hexToRgba(color, 0.08) }]}>
                      <Ionicons name={iconByType[log.type] || "information-circle-outline"} size={12} color={color} />
                    </View>
                    <View style={styles.logBody}>
                      <Text style={styles.logLine}>
                        <Text style={{ fontWeight: "600", color: colors.slate700 }}>{log.user}</Text>
                        {" — "}{log.action} <Text style={{ fontWeight: "600", color }}>{log.target}</Text>
                      </Text>
                      <Text style={styles.logDetail}>{log.detail}</Text>
                    </View>
                    <Text style={styles.logTime}>{log.time}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.securityCard}>
            <View style={styles.securityHeadTitle}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
              <Text style={styles.securityHeadText}>Security Settings</Text>
            </View>
            <View style={styles.settingList}>
              {[
                { label: "Strong Passwords", desc: "Require 8+ chars, symbols", on: true },
                { label: "Session Timeout", desc: "Auto-logout after 30 min", on: true },
                { label: "IP Whitelisting", desc: "Restrict to known IPs", on: false },
                { label: "Login Alerts", desc: "Email on new device", on: true },
              ].map((item, i) => (
                <View key={i} style={styles.settingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                    <Text style={styles.settingDesc}>{item.desc}</Text>
                  </View>
                  <Toggle enabled={item.on} color="#059669" onChange={() => {}} />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.securityCard}>
            <View style={styles.securityHeadTitle}>
              <Ionicons name="finger-print-outline" size={16} color="#7c3aed" />
              <Text style={styles.securityHeadText}>Privilege Summary</Text>
            </View>
            <View style={styles.privilegeList}>
              {visibleRoles.map((role) => {
                const rPerms = permMap[role.name.toLowerCase()] || {};
                const totalPerms = Object.values(rPerms).reduce((sum, p) => sum + p.length, 0);
                const moduleCount = role.name === "Customer" ? CUSTOMER_MODULE_IDS.length : MODULES.length;
                const maxPerms = moduleCount * 5;
                const pct = maxPerms > 0 ? Math.round((totalPerms / maxPerms) * 100) : 0;
                return (
                  <View key={role.name} style={styles.privilegeRow}>
                    <Text numberOfLines={1} style={[styles.privilegeName, { color: role.color }]}>{role.name}</Text>
                    <View style={[styles.privilegeTrack, { backgroundColor: colors.slate100 }]}>
                      <View style={[styles.privilegeFill, { width: `${pct}%`, backgroundColor: role.color }]} />
                    </View>
                    <Text style={styles.privilegePct}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  container: { gap: 0, padding: spacing.sm, paddingBottom: 40 },
  toast: {
    position: "absolute", top: 20, right: 20, zIndex: 9999,
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: radius.md, borderWidth: 1,
  },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 },
  pageTitle: { fontSize: font.lg, fontWeight: "700", color: colors.slate900 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  headerBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1 },
  headerBtnAdd: { backgroundColor: colors.success, borderColor: "transparent" },
  headerBtnText: { fontSize: font.xs, fontWeight: "600" },

  roleFormCard: { backgroundColor: colors.white, borderRadius: 10, borderWidth: 2, padding: 20, marginBottom: spacing.md },
  roleFormHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  roleFormTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  roleFormHeading: { fontSize: 15, fontWeight: "700", color: colors.slate900 },
  roleFormGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  roleFormField: { flexBasis: "46%", flexGrow: 1 },
  colorLabel: { fontSize: font.xs, fontWeight: "600", color: colors.slate500, marginBottom: 6, textTransform: "uppercase" },
  colorRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  colorSwatch: { width: 28, height: 28, borderRadius: radius.sm },
  roleFormFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 16 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md },
  cancelBtnText: { fontSize: font.xs, fontWeight: "600", color: colors.slate500 },
  submitBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: radius.md },
  submitBtnText: { fontSize: font.xs, fontWeight: "700", color: "#fff" },

  tabBarScroll: { marginBottom: spacing.md, flexGrow: 0 },
  tabBar: { flexDirection: "row", gap: 4, backgroundColor: "#fff", borderRadius: 10, padding: 4, borderWidth: 1, borderColor: colors.slate200 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.md },
  tabText: { fontSize: font.xs, fontWeight: "600" },

  hierarchyGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  roleCard: {
    flexBasis: 270, flexGrow: 1, backgroundColor: "#fff", borderWidth: 2, borderRadius: radius.lg,
    padding: 20, overflow: "hidden", position: "relative",
  },
  roleTopBar: { position: "absolute", top: 0, left: 0, right: 0, height: 4 },
  roleBulkBox: { position: "absolute", top: 10, left: 10, zIndex: 2 },
  roleCardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  roleIdentity: { flexDirection: "row", alignItems: "center", gap: 10 },
  roleAvatar: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  roleName: { fontWeight: "700", fontSize: 14, color: colors.slate900 },
  roleLevel: { fontSize: font.xs, color: colors.slate400 },
  roleCardActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  roleSmallBtn: { padding: 2 },
  roleDesc: { fontSize: font.sm, color: colors.slate500, marginBottom: 12, lineHeight: 18 },
  permMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  permMetaLabel: { fontSize: font.xs, color: colors.slate400 },
  permMetaValue: { fontSize: font.xs, fontWeight: "600" },
  permTrack: { width: "100%", height: 6, borderRadius: 3, overflow: "hidden" },
  permFill: { height: "100%", borderRadius: 3 },
  roleCardFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.slate100 },
  userCountLine: { fontSize: font.xs, color: colors.slate400, flexDirection: "row", alignItems: "center", gap: 4 },
  roleExpanded: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.slate100 },
  moduleAccessLabel: { fontSize: font.xs, fontWeight: "600", color: colors.slate700, marginBottom: 8 },
  moduleChips: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 12 },
  moduleChip: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4, borderWidth: 1 },
  noUsersText: { fontSize: font.xs, color: colors.slate400, fontStyle: "italic" },
  assignedLabel: { fontSize: font.xs, fontWeight: "600", color: colors.slate700, marginBottom: 6 },
  assignRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 8, backgroundColor: colors.slate50, borderRadius: radius.sm, gap: 6, marginBottom: 4 },
  assignIdentity: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  assignAvatar: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  assignName: { fontSize: font.xs, fontWeight: "500", color: colors.slate700, flexShrink: 1 },
  assignControls: { flexDirection: "row", alignItems: "center", gap: 3, flex: 1 },
  okBtn: { padding: 3, backgroundColor: colors.success, borderRadius: 3 },
  moveBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 3, borderWidth: 1, borderColor: colors.slate200, backgroundColor: "#fff" },
  moveBtnText: { fontSize: 9, fontWeight: "500", color: colors.primary },

  tableCard: { backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: colors.slate200, overflow: "hidden" },
  tableToolbar: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.slate200, flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  searchWrap: { flex: 1, flexDirection: "row", alignItems: "center", minWidth: 200 },
  searchIcon: { position: "absolute", left: 8, zIndex: 1 },
  searchField: { flex: 1, marginBottom: 0 },
  matrixTable: {},
  matrixHeadRow: { flexDirection: "row", backgroundColor: colors.slate50, borderBottomWidth: 2, borderBottomColor: colors.slate200 },
  matrixTh: { paddingVertical: 10, paddingHorizontal: 8 },
  matrixThCenter: { alignItems: "center" },
  matrixThText: { fontSize: 10, fontWeight: "700", color: colors.slate500, textTransform: "uppercase" },
  matrixRoleHead: { flexDirection: "column", alignItems: "center", gap: 2 },
  matrixRoleHeadText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", textAlign: "center" },
  matrixRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  matrixTd: { paddingVertical: 8, paddingHorizontal: 6, justifyContent: "center" },
  matrixTdCenter: { alignItems: "center" },
  matrixModuleCell: { flexDirection: "row", alignItems: "center", gap: 8 },
  matrixModuleText: { fontWeight: "600", color: colors.slate700, fontSize: font.sm },
  lockedPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate200, backgroundColor: colors.slate50 },
  lockedPillText: { fontSize: 10, fontWeight: "600", color: colors.slate300 },
  permPill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.sm, borderWidth: 1 },
  matrixFooter: { paddingVertical: 10, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: colors.slate200, flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" },
  matrixFooterText: { fontSize: font.xs, color: colors.slate400, fontWeight: "600", flexDirection: "row", alignItems: "center", gap: 4 },

  detailCard: { marginTop: spacing.md, backgroundColor: "#fff", borderRadius: 10, borderWidth: 2, overflow: "hidden" },
  detailHeader: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  detailTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  detailTitle: { fontWeight: "700", fontSize: 14, color: colors.slate900 },
  detailSubtitle: { fontSize: font.xs, color: colors.slate400 },
  detailTable: {},
  detailHeadRow: { flexDirection: "row", backgroundColor: colors.slate50, borderBottomWidth: 2, borderBottomColor: colors.slate200 },
  detailTh: { paddingVertical: 8, paddingHorizontal: 10 },
  detailThCenter: { alignItems: "center" },
  detailThText: { fontSize: 10, fontWeight: "700", color: colors.slate500, textTransform: "uppercase" },
  detailRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  detailTd: { paddingVertical: 8, paddingHorizontal: 10, justifyContent: "center" },
  detailTdCenter: { alignItems: "center" },
  detailModuleCell: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailModuleText: { fontWeight: "600", color: colors.slate700 },
  sidebarBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1.5 },

  assignTableHead: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.slate200, flexDirection: "row", alignItems: "center", gap: 8 },
  assignTableTitle: { fontWeight: "700", fontSize: 14, color: colors.slate900 },
  assignTable: {},
  assignHeadRow: { flexDirection: "row", backgroundColor: colors.slate50, borderBottomWidth: 2, borderBottomColor: colors.slate200 },
  assignTh: { paddingVertical: 10, paddingHorizontal: 12 },
  assignThText: { fontSize: 10, fontWeight: "700", color: colors.slate500, textTransform: "uppercase" },
  assignRowTable: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  assignTd: { paddingVertical: 10, paddingHorizontal: 12, justifyContent: "center" },
  assignTdCenter: { alignItems: "center" },
  userCell: { flexDirection: "row", alignItems: "center", gap: 10 },
  userAv: { width: 32, height: 32, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  assignUserMain: { fontWeight: "600", color: colors.slate900 },
  assignUserSub: { fontSize: 10, color: colors.slate400 },
  inlineAssign: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  saveTinyBtn: { paddingVertical: 4, paddingHorizontal: 8, backgroundColor: colors.success, borderRadius: radius.sm },
  saveTinyText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.pill },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  changeBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate200, backgroundColor: "#fff" },
  changeBtnText: { fontSize: font.xs, fontWeight: "600", color: colors.primary },

  securityGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  securityCard: { flexBasis: 300, flexGrow: 1, backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: colors.slate200, padding: 20 },
  securityHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  securityHeadTitle: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  securityHeadText: { fontWeight: "700", fontSize: 14, color: colors.slate900 },
  filterRow: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  filterBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1 },
  logRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10, borderBottomColor: colors.slate100 },
  logIcon: { width: 28, height: 28, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", marginTop: 2 },
  logBody: { flex: 1 },
  logLine: { fontSize: font.sm, color: colors.slate700 },
  logDetail: { fontSize: font.xs, color: colors.slate400, marginTop: 2 },
  logTime: { fontSize: 10, color: colors.slate400 },
  settingList: { gap: 10 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, backgroundColor: colors.slate50, borderRadius: radius.md, gap: 8 },
  settingLabel: { fontSize: font.sm, fontWeight: "600", color: colors.slate700 },
  settingDesc: { fontSize: font.xs, color: colors.slate400 },
  privilegeList: { gap: 10 },
  privilegeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  privilegeName: { width: 90, fontSize: font.sm, fontWeight: "600", flexShrink: 0 },
  privilegeTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  privilegeFill: { height: "100%", borderRadius: 4 },
  privilegePct: { fontSize: font.xs, fontWeight: "600", color: colors.slate500, width: 35, textAlign: "right" },
});