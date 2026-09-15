import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { useUndo } from "../UndoContext";
import { TextField, Button } from "../components/ui";
import { confirmDialog } from "../utils/confirm";
import { colors, spacing, shadow, radius } from "../theme";

const fields = [
  { name: "customerName", label: "Customer", type: "text", required: true, placeholder: "Customer name", minWidth: 200 },
  { name: "amount", label: "Amount (TZS)", type: "number", required: true, placeholder: "Amount", minWidth: 160 },
  { name: "method", label: "Method", type: "text", required: true, placeholder: "e.g. Cash / Card / Mobile", minWidth: 160 },
  { name: "paymentDate", label: "Payment Date", type: "text", required: false, placeholder: "YYYY-MM-DD (optional)", minWidth: 200 },
];

const createEmptyForm = () => Object.fromEntries(fields.map((f) => [f.name, ""]));

const colDefs = [
  { key: "customerName", label: "Customer", width: 200 },
  { key: "amount", label: "Amount (TZS)", width: 140 },
  { key: "method", label: "Method", width: 160 },
  { key: "paymentDate", label: "Payment Date", width: 150 },
  { key: "actions", label: "", width: 120 },
];

export default function Payment() {
  const { notifyUndo } = useUndo() || {};
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(createEmptyForm());
  const [editingId, setEditingId] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const bulk = useBulkSelect(records, (r) => r.id);

  useEffect(() => {
    const t = setTimeout(() => setLoadError(""), 4000);
    return () => clearTimeout(t);
  }, [loadError]);
  useEffect(() => {
    const t = setTimeout(() => setSuccessMsg(""), 4000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.get("/payments");
      const data = Array.isArray(res.data) ? res.data : [];
      setRecords([...data].sort((a, b) => String(b.id).localeCompare(String(a.id))));
    } catch (e) {
      const data = e?.data || e?.response?.data || {};
      if (data?.code === "NotFound") setLoadError("Payments not found");
      else if (data?.code === "Unavailable") setLoadError("Payments service unavailable");
      else setLoadError("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const parseError = (err) => {
    const e = err?.data || err?.response?.data || err || {};
    const title = e.title || "Payments";
    if (e.code === "NotFound") setLoadError(`${title} not found`);
    else if (e.code === "ValidationError") {
      const details = e.details || [];
      const first = Array.isArray(details) ? details[0] : null;
      if (first) {
        const field = typeof first === "object" ? first.field || first.label || "" : first;
        const message = typeof first === "object" ? first.message || first.error || "" : "";
        setLoadError(`${field ? `${field}: ` : ""}${message || "Validation failed"}`);
      } else setLoadError(`Validation failed for ${title}`);
    } else if (e.code === "DbError") setLoadError(`Database error saving ${title}`);
    else if (e.code === "Conflict") setLoadError(`A matching ${title.toLowerCase()} already exists`);
    else setLoadError(e.message || e.error || `Failed to save ${title}`);
  };

  const toPayload = () => {
    const p = {};
    fields.forEach((f) => {
      if (f.type === "number") p[f.name] = Number(form[f.name]) || 0;
      else p[f.name] = (form[f.name] || "").trim();
    });
    return p;
  };

  const setField = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const validate = () => {
    for (const f of fields) {
      if (f.required && !String(form[f.name]).trim()) {
        setLoadError(`${f.label} is required`);
        return false;
      }
    }
    return true;
  };

  const resetForm = () => {
    setForm(createEmptyForm());
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      const payload = toPayload();
      if (editingId) await api.put(`/payments/${editingId}`, payload);
      else await api.post("/payments", payload);
      resetForm();
      await fetchRecords();
      setSuccessMsg(editingId ? "Payment updated successfully" : "Payment added successfully");
    } catch (e) {
      parseError(e);
    } finally {
      setSaving(false);
    }
  };

  const editRecord = (record) => {
    setEditingId(record.id);
    setForm({
      customerName: record.customerName || "",
      amount: record.amount != null ? String(record.amount) : "",
      method: record.method || "",
      paymentDate: record.paymentDate || "",
    });
  };

  const restoreRecord = async (record) => {
    if (!record) return;
    try {
      await api.post("/payments", {
        customerName: record.customerName || "",
        amount: Number(record.amount) || 0,
        method: record.method || "",
        paymentDate: record.paymentDate || null,
      });
      await fetchRecords();
      setSuccessMsg("Payment restored");
    } catch { setLoadError("Failed to restore payment"); }
  };

  const restoreRecords = async (list) => {
    for (const r of list) {
      await api.post("/payments", {
        customerName: r.customerName || "",
        amount: Number(r.amount) || 0,
        method: r.method || "",
        paymentDate: r.paymentDate || null,
      }).catch(() => {});
    }
    await fetchRecords();
  };

  const deleteRecord = async (record) => {
    const label = record.customerName || record.method || `Payment #${record.id}`;
    if (!(await confirmDialog(`Delete payment for ${label}? This action is permanent.`, "", { destructive: true }))) return;
    try {
      await api.delete(`/payments/${record.id}`);
      await fetchRecords();
      setSuccessMsg("Payment deleted successfully");
      notifyUndo?.("Payment deleted", () => restoreRecord(record));
    } catch (e) {
      const data = e?.data || e?.response?.data || {};
      if (data.code === "ForeignConstraint" || /constraint|in use|referential/i.test(String(e.message || ""))) {
        setLoadError("Cannot delete — this payment is in use");
      } else parseError(e);
    }
  };

  const deleteSelected = async () => {
    if (bulk.selected.length === 0) return;
    if (!(await confirmDialog(`Delete ${bulk.selected.length} selected payments?`, "", { destructive: true }))) return;
    const deleted = bulk.selected.map((id) => records.find((r) => r.id === id)).filter(Boolean);
    try {
      for (const id of bulk.selected) await api.delete(`/payments/${id}`);
      await fetchRecords();
      bulk.clear();
      setSuccessMsg("Payments deleted successfully");
      notifyUndo?.(`${deleted.length} payment(s) deleted`, () => restoreRecords(deleted));
    } catch { setLoadError("Failed to delete payments"); }
  };

  const renderField = (f) => (
    <View key={f.name} style={[styles.fieldCol, { minWidth: f.minWidth || 200 }]}>
      <TextField
        label={`${f.label}${f.required ? " *" : ""}`}
        value={form[f.name]}
        onChangeText={setField(f.name)}
        placeholder={f.placeholder}
        keyboardType={f.type === "number" ? "numeric" : "default"}
      />
    </View>
  );

  const renderHeaderCell = (c) => (
    <View key={c.key} style={[styles.th, { width: c.width }]}>
      <Text style={styles.thText}>{c.label}</Text>
    </View>
  );

  const renderRow = (r) => {
    const selected = bulk.mode && bulk.selected.includes(r.id);
    return (
      <View style={[styles.row, selected && styles.rowSelected]}>
        {bulk.mode && (
          <Pressable style={styles.checkCell} onPress={() => bulk.toggle(r.id)} hitSlop={6}>
            <View style={[styles.checkBox, selected && styles.checkBoxSel]}>
              {selected ? (
                <Ionicons name="checkmark" size={12} color="#fff" />
              ) : (
                <Text style={styles.checkBoxEmpty}>{"\u2013"}</Text>
              )}
            </View>
          </Pressable>
        )}
        <View style={[styles.cell, { width: 200 }]}>
          <Text style={styles.cellStrong} numberOfLines={1}>{r.customerName || "—"}</Text>
        </View>
        <View style={[styles.cell, { width: 140 }]}>
          <Text style={styles.cellText}>TZS {(Number(r.amount) || 0).toLocaleString()}</Text>
        </View>
        <View style={[styles.cell, { width: 160 }]}>
          <Text style={styles.cellText} numberOfLines={1}>{r.method || "—"}</Text>
        </View>
        <View style={[styles.cell, { width: 150 }]}>
          <Text style={styles.cellText}>{r.paymentDate ? String(r.paymentDate).slice(0, 10) : "—"}</Text>
        </View>
        <View style={[styles.actionsCell, { width: 120 }]}>
          {!bulk.mode && (
            <View style={styles.actions}>
              <Pressable style={styles.iconBtn} onPress={() => editRecord(r)} hitSlop={6}>
                <Ionicons name="pencil-outline" size={13} color="#d97706" />
              </Pressable>
              <Pressable style={styles.iconBtnDanger} onPress={() => deleteRecord(r)} hitSlop={6}>
                <Ionicons name="trash-outline" size={13} color="#dc2626" />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <Spinner size={28} text="Loading payments..." />
      </View>
    );
  }

  const headerCols = bulk.mode ? [{ key: "check", label: "", width: 32 }, ...colDefs] : colDefs;

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Payments</Text>
          <Text style={styles.subtitle}>Manage payment records</Text>
        </View>
        <View style={styles.headerRight}>
          {!bulk.mode && (
            <Button title="+ Add Payment" variant="primary" onPress={resetForm} />
          )}
        </View>
      </View>

      {loadError ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color="#dc2626" />
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : null}
      {successMsg ? (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={16} color="#059669" />
          <Text style={styles.successText}>{successMsg}</Text>
        </View>
      ) : null}

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{editingId ? "Edit Payment" : "Add Payment"}</Text>
          <View style={styles.formWrap}>
            {fields.map(renderField)}
          </View>
          {!bulk.mode && (
            <View style={styles.formActions}>
              {editingId && <Button title="Cancel Edit" variant="ghost" onPress={resetForm} />}
              <Button title={editingId ? "Save Changes" : "Add Payment"} variant="primary" onPress={handleSubmit} loading={saving} />
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.tableHead}>
            <View style={styles.tableHeadLeft}>
              <Text style={styles.cardTitle}>Records</Text>
              <Text style={styles.tableSub}>{records.length} total</Text>
            </View>
            <Pressable onPress={() => bulk.toggleAll()} style={styles.selectToggle}>
              <Text style={styles.selectToggleText}>{bulk.mode ? "Done" : "Select"}</Text>
            </Pressable>
          </View>

          {bulk.selected.length > 0 && (
            <View style={styles.bulkWrap}>
              <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected} onSelectAll={() => bulk.toggleAll()} onDelete={deleteSelected} deleteLabel="Payments" />
            </View>
          )}

          {records.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="card-outline" size={36} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No payments yet</Text>
              <Text style={styles.emptySub}>Add your first payment above</Text>
            </View>
          ) : (
            <View style={styles.tableBox}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ minWidth: bulk.mode ? 802 : 770 }}>
                  <View style={styles.thead}>
                    {headerCols.map(renderHeaderCell)}
                  </View>
                  <View>
                    {records.map(renderRow)}
                  </View>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.slate50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm, flexWrap: "wrap", gap: 10 },
  headerLeft: { flex: 1, minWidth: 200 },
  title: { fontSize: 20, fontWeight: "800", color: colors.slate900 },
  subtitle: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8, marginHorizontal: spacing.xl, marginBottom: spacing.sm },
  errorText: { fontSize: 13, fontWeight: "600", color: "#dc2626", flex: 1 },
  successBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8, marginHorizontal: spacing.xl, marginBottom: spacing.sm },
  successText: { fontSize: 13, fontWeight: "600", color: "#15803d" },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.slate800 },
  tableSub: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  formWrap: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: spacing.md },
  fieldCol: { flexGrow: 1, maxWidth: 320 },
  formActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: spacing.md },
  tableHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  tableHeadLeft: {},
  selectToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.lg, backgroundColor: colors.slate200 },
  selectToggleText: { fontSize: 12, fontWeight: "700", color: colors.slate600 },
  bulkWrap: { marginBottom: 10 },
  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.slate700 },
  emptySub: { fontSize: 12, color: colors.slate500 },
  tableBox: { borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md, overflow: "hidden" },
  thead: { flexDirection: "row", backgroundColor: colors.slate50, borderBottomWidth: 1, borderBottomColor: colors.slate200 },
  th: { paddingHorizontal: 10, paddingVertical: 10 },
  thText: { fontSize: 11, fontWeight: "700", color: colors.slate500, letterSpacing: 0.3, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  rowSelected: { backgroundColor: "#eff6ff" },
  checkCell: { width: 32, alignItems: "center", justifyContent: "center", paddingVertical: 10 },
  checkBox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: colors.slate300, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  checkBoxSel: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  checkBoxEmpty: { fontSize: 12, color: colors.slate400, lineHeight: 16 },
  cell: { paddingHorizontal: 10, paddingVertical: 10, justifyContent: "center" },
  cellStrong: { fontSize: 13, fontWeight: "700", color: colors.slate800 },
  cellText: { fontSize: 12, color: colors.slate600 },
  actionsCell: { paddingVertical: 10 },
  actions: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.slate100, alignItems: "center", justifyContent: "center" },
  iconBtnDanger: { width: 26, height: 26, borderRadius: 8, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" },
});