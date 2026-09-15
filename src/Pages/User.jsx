import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { useUndo } from "../UndoContext";
import { isStaffRole, isSuperAdmin, SUPER_ADMIN_ROLE } from "../utils/roles";
import { useLanguage } from "../i18n";
import { confirmDialog } from "../utils/confirm";
import { Modal, TextField, SelectField, Button } from "../components/ui";
import { colors, font, radius, spacing } from "../theme";

const COUNTRIES = [
  "Tanzania", "Kenya", "Uganda", "Rwanda", "Burundi", "South Sudan",
  "Democratic Republic of Congo", "Zambia", "Malawi", "Mozambique",
  "Zimbabwe", "Botswana", "Namibia", "South Africa", "Ethiopia",
  "Nigeria", "Ghana", "Senegal", "Cameroon", "Ivory Coast",
  "United States", "United Kingdom", "Canada", "India", "China",
  "Germany", "France", "Japan", "Brazil", "Australia"
];

const DEFAULT_ROLES = [
  { value: "super_admin", label: "Super Admin", color: "#4c1d95" },
  { value: "admin", label: "Admin", color: "#7c3aed" },
  { value: "manager", label: "Manager", color: "#2563eb" },
  { value: "employee", label: "Employee", color: "#0891b2" },
  { value: "cashier", label: "Cashier", color: "#16a34a" },
  { value: "clerk", label: "Clerk", color: "#f59e0b" },
  { value: "customer", label: "Customer", color: "#64748b" },
];

const STATUSES = [
  { value: "active", label: "Active", color: "#16a34a", bg: "#f0fdf4" },
  { value: "inactive", label: "Inactive", color: "#94a3b8", bg: "#f1f5f9" },
  { value: "suspended", label: "Suspended", color: "#dc2626", bg: "#fef2f2" },
];

const hexToRgba = (hex, a) => {
  const h = String(hex || "#000000").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

function RoleChips({ value, onChange, roles, radioName }) {
  return (
    <View style={styles.roleChips}>
      {(roles || DEFAULT_ROLES).map((r) => {
        const active = value === r.value;
        return (
          <Pressable
            key={r.value}
            onPress={() => onChange(r.value)}
            style={[styles.roleChip, {
              borderColor: active ? r.color : colors.slate200,
              backgroundColor: active ? hexToRgba(r.color, 0.07) : colors.slate50,
            }]}
          >
            <Ionicons
              name={active ? "radio-button-on" : "radio-button-off"}
              size={14}
              color={active ? r.color : colors.slate400}
            />
            <Text style={{ fontSize: font.xs, fontWeight: active ? "700" : "500", color: active ? r.color : colors.slate500 }}>
              {r.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function GenderChips({ value, onChange }) {
  return (
    <View style={styles.genderRow}>
      {["Male", "Female", "Other"].map((g) => {
        const active = value === g;
        return (
          <Pressable key={g} onPress={() => onChange(g)} style={styles.genderOption} hitSlop={6}>
            <Ionicons
              name={active ? "radio-button-on" : "radio-button-off"}
              size={15}
              color={active ? colors.primary : colors.slate400}
            />
            <Text style={[styles.genderText, active && { color: colors.primary, fontWeight: "700" }]}>{g}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AddUserForm({ onClose, onSave, roles }) {
  const [form, setForm] = useState({
    username: "", fullName: "", email: "", phone: "", password: "", confirmPassword: "",
    gender: "", country: "", role: "customer",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.email.trim()) return setError("Email is required");
    if (!form.fullName.trim()) return setError("Full name is required");
    if (!form.password.trim()) return setError("Password is required");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match");
    setSaving(true); setError("");
    try {
      await api.post("/users", {
        username: form.email.trim(), fullName: form.fullName.trim(), email: form.email.trim() || null,
        phone: form.phone.trim() || null, password: form.password.trim(),
        role: form.role, gender: form.gender, country: form.country, isEnabled: false,
      });
      onSave();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Registration failed";
      setError(typeof msg === "string" ? msg : "Registration failed");
    } finally { setSaving(false); }
  };

  return (
    <Modal visible onClose={onClose} title="Add New User" actions={[
      <Button key="cancel" title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />,
      <Button key="save" title={saving ? "Registering..." : "Register"} onPress={handleSave} disabled={saving} style={{ flex: 1 }} />,
    ]}>
      <Text style={styles.formSubtitle}>Create a new user account</Text>

      {!!error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorBarText}>{error}</Text>
        </View>
      )}

      <TextField
        label="Full Name"
        value={form.fullName}
        onChangeText={(v) => set("fullName", v)}
        placeholder="Full Name"
      />
      <TextField
        label="Email Address"
        value={form.email}
        onChangeText={(v) => set("email", v)}
        placeholder="Email Address"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextField
        label="Mobile Number"
        value={form.phone}
        onChangeText={(v) => set("phone", v)}
        placeholder="Mobile Number"
        keyboardType="phone-pad"
      />
      <TextField
        label="Password"
        value={form.password}
        onChangeText={(v) => set("password", v)}
        placeholder="Password"
        secureTextEntry={!showPassword}
        rightIcon={
          <Pressable hitSlop={8} onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={17} color={colors.slate400} />
          </Pressable>
        }
      />
      <TextField
        label="Confirm Password"
        value={form.confirmPassword}
        onChangeText={(v) => set("confirmPassword", v)}
        placeholder="Confirm Password"
        secureTextEntry={!showConfirm}
        rightIcon={
          <Pressable hitSlop={8} onPress={() => setShowConfirm(!showConfirm)}>
            <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={17} color={colors.slate400} />
          </Pressable>
        }
      />

      <Text style={styles.fieldLabel}>Gender</Text>
      <GenderChips value={form.gender} onChange={(g) => set("gender", g)} />

      <Text style={styles.fieldLabel}>Role</Text>
      <RoleChips value={form.role} onChange={(r) => set("role", r)} roles={roles} />

      <Text style={styles.fieldLabel}>Country</Text>
      <SelectField
        value={form.country}
        onChange={(v) => set("country", v || "")}
        options={COUNTRIES}
        placeholder="Select Country"
        allowClear
      />
    </Modal>
  );
}

function EditSidePanel({ user, onClose, onSave, roles }) {
  const original = {
    username: user.username || "",
    fullName: user.fullName || "",
    email: user.email || "",
    phone: user.phone || "",
    gender: user.gender || "",
    country: user.country || "",
    role: user.role || "customer",
  };
  const [form, setForm] = useState({ ...original });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const getChangedFields = () => {
    const payload = {};
    if (form.username.trim() !== original.username) payload.username = form.username.trim();
    if (form.fullName.trim() !== original.fullName) payload.fullName = form.fullName.trim();
    if (form.email.trim() !== original.email) payload.email = form.email.trim();
    if (form.phone.trim() !== original.phone) payload.phone = form.phone.trim();
    if (form.role !== original.role) payload.role = form.role;
    if (form.gender !== original.gender) payload.gender = form.gender;
    if (form.country !== original.country) payload.country = form.country;
    return payload;
  };

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const payload = getChangedFields();
      if (payload.error) { setError(payload.error); setSaving(false); return; }
      delete payload.error;
      if (Object.keys(payload).length === 0) { setError("No changes made"); setSaving(false); return; }
      await api.put(`/users/${user.id}`, payload);
      onSave();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Update failed";
      setError(typeof msg === "string" ? msg : "Update failed");
    } finally { setSaving(false); }
  };

  return (
    <Modal visible onClose={onClose} title="Edit User" actions={[
      <Button key="cancel" title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />,
      <Button key="save" title={saving ? "Updating..." : "Update"} onPress={handleSave} disabled={saving} style={{ flex: 1 }} />,
    ]}>
      <Text style={styles.formSubtitle}>@{user.username} — modify only what you want to change</Text>

      {!!error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorBarText}>{error}</Text>
        </View>
      )}

      <TextField label="Username" value={form.username} onChangeText={(v) => set("username", v)} placeholder="Username" autoCapitalize="none" />
      <TextField label="Full Name" value={form.fullName} onChangeText={(v) => set("fullName", v)} placeholder="Full Name" />
      <TextField label="Email Address" value={form.email} onChangeText={(v) => set("email", v)} placeholder="Email Address" keyboardType="email-address" autoCapitalize="none" />
      <TextField label="Phone Number" value={form.phone} onChangeText={(v) => set("phone", v)} placeholder="Phone Number" keyboardType="phone-pad" />

      <Text style={styles.fieldLabel}>Gender</Text>
      <GenderChips value={form.gender} onChange={(g) => set("gender", g)} />

      <Text style={styles.fieldLabel}>Role</Text>
      <RoleChips value={form.role} onChange={(r) => set("role", r)} roles={roles} />

      <Text style={styles.fieldLabel}>Country</Text>
      <SelectField
        value={form.country}
        onChange={(v) => set("country", v || "")}
        options={COUNTRIES}
        placeholder="Select Country"
        allowClear
      />
    </Modal>
  );
}

const COL = { checkbox: 34, user: 190, contact: 160, role: 130, perms: 130, status: 100, actions: 170 };

export default function User() {
  useLanguage();
  const { notifyUndo } = useUndo() || {};
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [msg, setMsg] = useState("");
  const [showContract, setShowContract] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [customRoles, setCustomRoles] = useState([]);
  const [rolePerms, setRolePerms] = useState({});

  const defaultValues = new Set(DEFAULT_ROLES.map((r) => r.value));
  const allRoles = [
    ...DEFAULT_ROLES,
    ...customRoles.filter((cr) => !defaultValues.has(cr.name.toLowerCase())).map((cr) => ({ value: cr.name.toLowerCase(), label: cr.name, color: cr.color || "#64748b" })),
  ];

  const currentRole = localStorage.getItem("shop_role") || "";
  const canManageUsers = isStaffRole(currentRole);
  // The super_admin role is only exposed to the current super admin.
  const isSuper = isSuperAdmin(currentRole);
  const visibleRoles = isSuper ? allRoles : allRoles.filter((r) => r.value !== SUPER_ADMIN_ROLE);
  // Super admin users are invisible to everyone except another super admin.
  const scopedUsers = isSuper ? users : users.filter((u) => (u.role || "").toLowerCase() !== SUPER_ADMIN_ROLE);

  useEffect(() => {
    api.get("/users").then(({ data }) => setUsers(Array.isArray(data) ? data : [])).catch(() => {}).finally(() => setLoading(false));
    api.get("/custom-roles").then(({ data }) => setCustomRoles(Array.isArray(data) ? data : [])).catch(() => {});
    api.get("/role-permissions").then(({ data }) => {
      const map = {};
      (Array.isArray(data) ? data : []).forEach((p) => {
        const role = (p.roleName || "").toLowerCase();
        if (!map[role]) map[role] = { modules: new Set(), totalPerms: 0 };
        map[role].modules.add(p.moduleId);
        if (p.canRead) map[role].totalPerms++;
        if (p.canWrite) map[role].totalPerms++;
        if (p.canEdit) map[role].totalPerms++;
        if (p.canDelete) map[role].totalPerms++;
        if (p.canExport) map[role].totalPerms++;
      });
      Object.keys(map).forEach((r) => { map[r].moduleCount = map[r].modules.size; map[r].modules = undefined; });
      setRolePerms(map);
    }).catch(() => {});
  }, []);

  const reload = () => api.get("/users").then(({ data }) => setUsers(Array.isArray(data) ? data : []));

  const restoreUser = async (u) => {
    const payload = {
      username: u.username || "", fullName: u.fullName || "", email: u.email || null,
      phone: u.phone || null, role: u.role || "customer", status: u.status || "active",
      password: u.password || "restored-password", hireDate: u.hireDate || "",
      contractType: u.contractType || "full-time", department: u.department || "",
      salary: Number(u.salary) || 0, emergencyContact: u.emergencyContact || "",
      address: u.address || "", notes: u.notes || "", isEnabled: u.isEnabled ?? true,
    };
    await api.post("/users", payload).catch(() => {});
    await reload();
    if (notifyUndo) notifyUndo("User restored", () => {}, { timeout: 2500, undo: false });
  };

  const deleteUser = async (id) => {
    if (!(await confirmDialog("Delete this user?"))) return;
    const target = scopedUsers.find((u) => u.id === id);
    try {
      await api.delete(`/users/${id}`);
      await reload();
      setMsg("User deleted");
      setTimeout(() => setMsg(""), 2000);
      if (target) notifyUndo?.(`User deleted: ${target.fullName || target.username}`, () => restoreUser(target));
    } catch (err) { setMsg("Failed to delete"); setTimeout(() => setMsg(""), 2000); }
  };

  const toggleUser = async (u) => {
    try {
      await api.put(`/users/${u.id}`, { isEnabled: !u.isEnabled });
      await reload();
      setMsg(u.isEnabled ? "User disabled" : "User enabled");
      setTimeout(() => setMsg(""), 2000);
    } catch { setMsg("Failed"); setTimeout(() => setMsg(""), 2000); }
  };

  let items = [...scopedUsers];
  if (search) { const s = search.toLowerCase(); items = items.filter((u) => (u.username || "").toLowerCase().includes(s) || (u.fullName || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s)); }
  if (roleFilter !== "all") items = items.filter((u) => u.role === roleFilter);

  const bulk = useBulkSelect(items, (u) => u.id);

  const deleteSelected = async () => {
    if (bulk.selected.length === 0) return;
    if (!(await confirmDialog(`Delete ${bulk.selected.length} selected user(s)?`))) return;
    try {
      const deleted = bulk.selected.map((id) => scopedUsers.find((u) => u.id === id)).filter(Boolean);
      for (const id of bulk.selected) await api.delete(`/users/${id}`);
      bulk.clear();
      await reload();
      setMsg("User deleted");
      setTimeout(() => setMsg(""), 2000);
      notifyUndo?.(`${deleted.length} user(s) deleted`, () => { deleted.forEach((u) => restoreUser(u)); });
    } catch (err) { setMsg("Failed to delete"); setTimeout(() => setMsg(""), 2000); }
  };

  const roleCounts = { all: scopedUsers.length };
  allRoles.forEach((r) => { roleCounts[r.value] = scopedUsers.filter((u) => u.role === r.value).length; });

  if (loading) return (
    <View style={styles.loadingWrap}>
      <Spinner size={28} text="Loading..." />
    </View>
  );

  const contractFields = showContract ? [
    { l: "Username", v: showContract.username },
    { l: "Full Name", v: showContract.fullName },
    { l: "Role", v: allRoles.find((r) => r.value === showContract.role)?.label || showContract.role },
    { l: "Status", v: showContract.status },
    { l: "Email", v: showContract.email || "—" },
    { l: "Phone", v: showContract.phone || "—" },
    { l: "Department", v: showContract.department || "—" },
    { l: "Contract Type", v: showContract.contractType || "—" },
    { l: "Hire Date", v: showContract.hireDate || "—" },
    { l: "Salary", v: showContract.salary ? `TZS ${Number(showContract.salary).toLocaleString()}` : "—" },
    { l: "Emergency Contact", v: showContract.emergencyContact || "—" },
    { l: "Address", v: showContract.address || "—" },
  ] : [];

  const headers = canManageUsers
    ? ["User", "Contact", "Role", "Permissions", "Status", "Actions"]
    : ["User", "Contact", "Role", "Permissions", "Status"];

  const tableMinWidth =
    (bulk.mode ? COL.checkbox : 0) +
    COL.user + COL.contact + COL.role + COL.perms + COL.status +
    (canManageUsers ? COL.actions : 0);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {showAddForm && <AddUserForm onClose={() => setShowAddForm(false)} onSave={async () => { setShowAddForm(false); await reload(); setMsg("User registered!"); setTimeout(() => setMsg(""), 2000); }} roles={visibleRoles} />}
      {editUser && <EditSidePanel user={editUser} onClose={() => setEditUser(null)} onSave={async () => { setEditUser(null); await reload(); setMsg("User updated!"); setTimeout(() => setMsg(""), 2000); }} roles={visibleRoles} />}

      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="people-outline" size={22} color={colors.primary} />
          <Text style={styles.pageTitle}>User Management</Text>
          <Text style={styles.countLabel}>({scopedUsers.length})</Text>
        </View>
        {canManageUsers && (
          <Pressable style={styles.addBtn} onPress={() => setShowAddForm(true)}>
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={styles.addBtnText}>Add User</Text>
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          {visibleRoles.map((r) => {
            const active = roleFilter === r.value;
            return (
              <Pressable key={r.value} style={[styles.statCard, { borderColor: active ? r.color : colors.slate200, borderTopColor: r.color }]} onPress={() => setRoleFilter(active ? "all" : r.value)}>
                <Text numberOfLines={1} style={[styles.statLabel, { color: active ? r.color : colors.slate500 }]}>{r.label}</Text>
                <Text style={[styles.statValue, { color: r.color }]}>{roleCounts[r.value] || 0}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={14} color={colors.slate400} style={styles.searchIcon} />
          <TextField
            value={search}
            onChangeText={setSearch}
            placeholder="Search username, name, email..."
            containerStyle={styles.searchField}
          />
        </View>
        {bulk.mode && <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected}
          onSelectAll={bulk.toggleAll} onDelete={deleteSelected} deleteLabel="Delete Selected" />}
      </View>

      {!!msg && (
        <View style={[styles.msgBar, { backgroundColor: msg.includes("Failed") ? colors.dangerLight : colors.successLight }]}>
          <Text style={{ color: msg.includes("Failed") ? "#991b1b" : colors.success, fontSize: font.xs }}>{msg}</Text>
        </View>
      )}

      <Modal
        visible={!!showContract}
        onClose={() => setShowContract(null)}
        title={showContract ? `Profile — ${showContract.fullName || showContract.username}` : ""}
      >
        <View style={styles.contractGrid}>
          {contractFields.map((r, i) => (
            <View key={i} style={styles.contractCell}>
              <Text style={styles.contractLabel}>{r.l}</Text>
              <Text style={styles.contractValue}>{r.v}</Text>
            </View>
          ))}
        </View>
      </Modal>

      <View style={styles.tableCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ minWidth: tableMinWidth }}>
            <View style={styles.theadRow}>
              {bulk.mode && (
                <View style={[styles.th, styles.thCenter, { width: COL.checkbox }]}>
                  <Pressable onPress={bulk.toggleAll} hitSlop={8}>
                    <Ionicons name={bulk.allSelected ? "checkbox" : "square-outline"} size={18} color={bulk.allSelected ? colors.primary : colors.slate400} />
                  </Pressable>
                </View>
              )}
              {headers.map((h) => (
                <View key={h} style={[styles.th, { width: headerCellWidth(h, bulk.mode) }]}>
                  <Text style={styles.thText}>{h}</Text>
                </View>
              ))}
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyRowText}>No users found</Text>
              </View>
            ) : (
              items.map((u) => {
                const role = allRoles.find((r) => r.value === u.role) || allRoles.find((r) => r.value === "customer");
                const status = STATUSES.find((s) => s.value === u.status) || STATUSES[0];
                const rp = rolePerms[(u.role || "").toLowerCase()];
                const score = rp && rp.moduleCount > 0 ? Math.round((rp.totalPerms / (rp.moduleCount * 5)) * 100) : 0;
                return (
                  <View key={u.id} style={[styles.tr, { opacity: u.isEnabled === false ? 0.5 : 1 }]} {...bulk.rowProps(u.id)}>
                    {bulk.mode && (
                      <View style={[styles.td, styles.tdCenter, { width: COL.checkbox }]}>
                        <Pressable onPress={() => bulk.toggle(u.id)} hitSlop={8}>
                          <Ionicons name={bulk.selectedSet.has(u.id) ? "checkbox" : "square-outline"} size={18} color={bulk.selectedSet.has(u.id) ? colors.primary : colors.slate400} />
                        </Pressable>
                      </View>
                    )}
                    <View style={[styles.td, { width: COL.user }]}>
                      <View style={styles.userCell}>
                        <View style={[styles.userAvatar, { backgroundColor: hexToRgba(role.color, 0.08) }]}>
                          <Ionicons name="shield-outline" size={14} color={role.color} />
                        </View>
                        <View>
                          <Text numberOfLines={1} style={styles.usernameText}>{u.username}</Text>
                          {!!u.fullName && <Text numberOfLines={1} style={styles.fullNameText}>{u.fullName}</Text>}
                        </View>
                      </View>
                    </View>
                    <View style={[styles.td, { width: COL.contact }]}>
                      <View style={styles.contactCell}>
                        {!!u.email && <Text style={styles.contactLine}><Ionicons name="mail-outline" size={10} color={colors.slate400} /> {u.email}</Text>}
                        {!!u.phone && <Text style={styles.contactLine}><Ionicons name="call-outline" size={10} color={colors.slate400} /> {u.phone}</Text>}
                        {!u.email && !u.phone && <Text style={styles.mutedText}>—</Text>}
                      </View>
                    </View>
                    <View style={[styles.td, { width: COL.role }]}>
                      <SelectField
                        value={u.role}
                        onChange={async (newRole) => {
                          try {
                            await api.put(`/users/${u.id}`, { role: newRole });
                            await reload();
                          } catch {}
                        }}
                        options={visibleRoles.map((r) => ({ value: r.value, label: r.label }))}
                        containerStyle={styles.roleSelect}
                      />
                    </View>
                    { /* permissions */ }
                    <View style={[styles.td, { width: COL.perms }]}>
                      {!rp ? (
                        <Text style={styles.mutedText}>—</Text>
                      ) : (
                        <View style={styles.permsCell}>
                          <Ionicons name="key-outline" size={10} color={role.color} />
                          <View>
                            <Text style={[styles.permsModules, { color: role.color }]}>{rp.moduleCount} modules</Text>
                            <View style={styles.progressTrack}>
                              <View style={[styles.progressFill, { width: `${score}%`, backgroundColor: role.color }]} />
                            </View>
                            <Text style={styles.mutedTextSmall}>{score}% access</Text>
                          </View>
                        </View>
                      )}
                    </View>
                    <View style={[styles.td, { width: COL.status }]}>
                      <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                        <Text style={{ color: status.color, fontSize: font.xs, fontWeight: "600" }}>{status.label}</Text>
                      </View>
                    </View>
                    {canManageUsers && (
                      <View style={[styles.td, { width: COL.actions }]}>
                        <Pressable onPress={() => setEditUser(u)} style={[styles.iconBtn, { color: colors.primary }]} hitSlop={4}>
                          <Ionicons name="create-outline" size={13} color={colors.primary} />
                        </Pressable>
                        <Pressable onPress={() => setShowContract(u)} style={[styles.iconBtn, { color: "#7c3aed" }]} hitSlop={4}>
                          <Ionicons name="document-text-outline" size={13} color="#7c3aed" />
                        </Pressable>
                        <Pressable onPress={() => toggleUser(u)} style={[styles.iconBtn, { color: u.isEnabled === false ? colors.success : colors.warning }]} hitSlop={4}>
                          <Text style={{ fontSize: font.xs, fontWeight: "700", color: u.isEnabled === false ? colors.success : colors.warning }}>
                            {u.isEnabled === false ? "ON" : "OFF"}
                          </Text>
                        </Pressable>
                        {bulk.mode && (
                          <Pressable onPress={() => deleteUser(u.id)} style={[styles.iconBtn, { color: colors.danger }]} hitSlop={4}>
                            <Ionicons name="trash-outline" size={13} color={colors.danger} />
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const headerCellWidth = (h, bulkMode) => {
  if (h === "Actions") return COL.actions;
  if (h === "Status") return COL.status;
  if (h === "Role") return COL.role;
  if (h === "Permissions") return COL.perms;
  if (h === "Contact") return COL.contact;
  return COL.user;
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  container: { gap: spacing.md, padding: spacing.sm, paddingBottom: 40 },
  loadingWrap: { height: 400, alignItems: "center", justifyContent: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, flexWrap: "wrap" },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pageTitle: { fontSize: font.lg, fontWeight: "700", color: colors.slate900 },
  countLabel: { color: colors.slate400, fontSize: font.xs },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: radius.sm },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: font.xs },

  statsGrid: { flexDirection: "row", gap: spacing.sm, paddingVertical: 2 },
  statCard: {
    width: 120, backgroundColor: colors.white, borderWidth: 1, borderRadius: radius.md,
    paddingVertical: 10, paddingHorizontal: 10, borderTopWidth: 3, justifyContent: "center",
  },
  statLabel: { fontSize: font.xs, fontWeight: "600", textTransform: "uppercase" },
  statValue: { fontSize: 18, fontWeight: "700", marginTop: 2 },

  toolbar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  searchWrap: { flex: 1, flexDirection: "row", alignItems: "center" },
  searchIcon: { position: "absolute", left: 8, zIndex: 1 },
  searchField: { flex: 1, marginBottom: 0 },
  msgBar: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.sm },

  contractGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  contractCell: { width: "48%", paddingVertical: 6, paddingHorizontal: 8, backgroundColor: colors.slate50, borderRadius: radius.sm },
  contractLabel: { fontSize: 10, color: colors.slate400, textTransform: "uppercase", marginBottom: 2 },
  contractValue: { fontWeight: "600", fontSize: font.xs },

  tableCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.slate200, overflow: "hidden" },
  theadRow: { flexDirection: "row", backgroundColor: colors.slate50, borderBottomWidth: 2, borderBottomColor: colors.slate200 },
  th: { paddingVertical: 8, paddingHorizontal: 10, justifyContent: "center" },
  thCenter: { alignItems: "center" },
  thText: { fontSize: 10, fontWeight: "700", color: colors.slate500, textTransform: "uppercase" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  td: { paddingVertical: 8, paddingHorizontal: 10, justifyContent: "center" },
  tdCenter: { alignItems: "center" },
  emptyRow: { paddingVertical: 32, alignItems: "center" },
  emptyRowText: { color: colors.slate400, fontSize: font.sm },

  userCell: { flexDirection: "row", alignItems: "center", gap: 6 },
  userAvatar: { width: 28, height: 28, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  usernameText: { fontWeight: "700", fontSize: font.xs, color: colors.slate900 },
  fullNameText: { fontSize: 10, color: colors.slate500 },
  contactCell: { flexDirection: "column", gap: 1 },
  contactLine: { fontSize: font.xs, color: colors.slate700 },
  mutedText: { fontSize: 10, color: colors.slate400 },
  mutedTextSmall: { fontSize: 9, color: colors.slate400 },
  roleSelect: { marginBottom: 0 },
  permsCell: { flexDirection: "row", alignItems: "center", gap: 4 },
  permsModules: { fontSize: 10, fontWeight: "600" },
  progressTrack: { width: 50, height: 3, backgroundColor: colors.slate100, borderRadius: 2, overflow: "hidden", marginTop: 2 },
  progressFill: { height: "100%", borderRadius: 2 },
  statusPill: { alignSelf: "flex-start", paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.pill },
  iconBtn: { padding: 4 },

  fieldLabel: { fontSize: font.xs, fontWeight: "700", color: colors.slate500, textTransform: "uppercase", marginBottom: 6, marginTop: 4 },
  formSubtitle: { fontSize: font.sm, color: colors.slate400, marginBottom: spacing.md },
  errorBar: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: "#fecaca", marginBottom: spacing.md },
  errorBarText: { fontSize: font.xs, fontWeight: "600", color: "#991b1b" },
  genderRow: { flexDirection: "row", gap: 18, marginBottom: spacing.md },
  genderOption: { flexDirection: "row", alignItems: "center", gap: 6 },
  genderText: { fontSize: font.sm, color: colors.slate500 },
  roleChips: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", marginBottom: spacing.md },
  roleChip: {
    flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: radius.md, borderWidth: 2,
  },
});