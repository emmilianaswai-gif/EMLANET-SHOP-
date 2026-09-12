import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { useUndo } from "../UndoContext";
import { TextField, Button, SelectField, Modal } from "../components/ui";
import { confirmDialog } from "../utils/confirm";
import { exportPdf } from "../utils/export";
import { colors, font, radius, spacing, shadow } from "../theme";

const init = { name: "", phone: "", email: "", address: "", company: "", products: "" };
const PAYMENT_METHODS = ["Cash", "M-Pesa", "NMB Bank", "CRDB Bank", "Bank Transfer", "Other"];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const fmtDateTime = (d) => (d ? `${fmtDate(d)} · ${new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "");

export default function Supplier() {
  const { notifyUndo } = useUndo() || {};
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(init);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [sortF, setSortF] = useState("name");
  const [sortD, setSortD] = useState("asc");

  const [productInput, setProductInput] = useState("");
  const [formProducts, setFormProducts] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);

  const [payments, setPayments] = useState({});
  const [expandedPayments, setExpandedPayments] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [payNotes, setPayNotes] = useState("");
  const [payDiscountType, setPayDiscountType] = useState("percent");
  const [payDiscount, setPayDiscount] = useState("");
  const [showPayForm, setShowPayForm] = useState(null);
  const [expandedPaymentId, setExpandedPaymentId] = useState(null);

  const reloadPayments = async () => {
    try {
      const { data } = await api.get("/supplier-payments");
      const arr = Array.isArray(data) ? data : [];
      const grouped = {};
      arr.forEach((p) => {
        const sid = p.supplier?.id;
        if (!sid) return;
        if (!grouped[sid]) grouped[sid] = [];
        grouped[sid].push({ id: p.id, amount: p.amount, method: p.method, notes: p.notes, date: p.date, discount: p.discount || 0, discountType: p.discountType || "percent" });
      });
      setPayments(grouped);
    } catch {}
  };

  useEffect(() => {
    api.get("/suppliers").then(({ data }) => setSuppliers(Array.isArray(data) ? data : [])).catch(() => {}).finally(() => setLoading(false));
    reloadPayments();
    reloadCatalog();
  }, []);

  const reload = () => api.get("/suppliers").then(({ data }) => setSuppliers(Array.isArray(data) ? data : []));

  const reloadCatalog = async () => {
    try {
      const { data } = await api.get("/products");
      setCatalog(Array.isArray(data) ? data : []);
    } catch {}
  };

  const productsBySupplier = useMemo(() => {
    const m = {};
    catalog.forEach((p) => {
      const sid = p.supplier?.id || p.supplierId;
      if (sid && p.name) {
        if (!m[sid]) m[sid] = [];
        m[sid].push(p.name);
      }
    });
    return m;
  }, [catalog]);

  const getSupplierProducts = (s) => {
    const tags = s.products ? s.products.split(",").map((t) => t.trim()).filter(Boolean) : [];
    (productsBySupplier[s.id] || []).forEach((n) => { if (!tags.includes(n)) tags.push(n); });
    return tags;
  };

  const setField = (field) => (value) => setForm((p) => ({ ...p, [field]: value }));

  const addProductTag = () => {
    const val = productInput.trim();
    if (val && !formProducts.includes(val)) {
      setFormProducts((p) => [...p, val]);
      setSuggestions((prev) => prev.filter((p) => p.name !== val));
    }
    setProductInput("");
    setShowSugg(false);
  };

  const handleProductInputChange = (val) => {
    setProductInput(val);
    const q = val.trim().toLowerCase();
    setSuggestions(q ? catalog.filter((p) => p.name && p.name.toLowerCase().includes(q) && !formProducts.includes(p.name)) : []);
    setShowSugg(true);
  };

  const selectSuggestion = (name) => {
    if (name && !formProducts.includes(name)) setFormProducts((p) => [...p, name]);
    setProductInput("");
    setSuggestions([]);
    setShowSugg(false);
  };

  const removeProductTag = (tag) => setFormProducts((p) => p.filter((t) => t !== tag));

  const handleSubmit = async () => {
    try {
      const names = [...formProducts];
      const typed = productInput.trim();
      if (typed && !names.includes(typed)) names.push(typed);
      const payload = { ...form, products: names.join(", ") };
      const wasEditing = editingId;
      let saved;
      if (wasEditing) saved = await api.put(`/suppliers/${editingId}`, payload);
      else saved = await api.post("/suppliers", payload);
      const sid = wasEditing || saved?.data?.id;
      const missing = names.filter((p) => !catalog.some((c) => c.name && c.name.toLowerCase() === p.toLowerCase()));
      for (const name of missing) {
        try { await api.post("/products", { name, supplierId: sid }); } catch {}
      }
      if (sid && payAmount && Number(payAmount) > 0) {
        const discount = computeDiscount(payAmount, payDiscountType, payDiscount);
        await api.post("/supplier-payments", {
          supplier: { id: sid },
          amount: Number(payAmount),
          method: payMethod,
          notes: payNotes,
          date: new Date().toISOString(),
          discount,
          discountType: payDiscountType,
        }).catch(() => {});
      }
      setForm(init); setFormProducts([]); setEditingId(null); setShowPanel(false);
      setPayAmount(""); setPayNotes(""); setPayDiscount(""); setPayDiscountType("percent");
      await reload(); await reloadPayments(); await reloadCatalog();
      setMsg(wasEditing ? "Supplier updated!" : "Supplier added!" + (payAmount ? " Payment recorded." : ""));
      setTimeout(() => setMsg(""), 2500);
    } catch { setMsg("Failed to save"); setTimeout(() => setMsg(""), 2000); }
  };

  const editSupplier = (s) => {
    setEditingId(s.id); setShowPanel(true);
    setForm({ name: s.name || "", phone: s.phone || "", email: s.email || "", address: s.address || "", company: s.company || "", products: s.products || "" });
    setFormProducts(getSupplierProducts(s));
    setProductInput(""); setShowSugg(false); setPayAmount(""); setPayNotes(""); setPayMethod("Cash"); setPayDiscount(""); setPayDiscountType("percent");
  };

  const openAddPanel = () => {
    setEditingId(null); setForm(init); setFormProducts([]); setPayAmount(""); setPayNotes(""); setPayMethod("Cash"); setPayDiscount(""); setPayDiscountType("percent"); setShowPanel(true);
  };

  const closePanel = () => {
    setShowPanel(false); setEditingId(null); setForm(init); setFormProducts([]); setPayAmount(""); setPayNotes(""); setPayDiscount(""); setPayDiscountType("percent");
  };

  const restoreSupplier = async (s) => {
    await api.post("/suppliers", {
      name: s.name || "", phone: s.phone || "", email: s.email || "", address: s.address || "", company: s.company || "", products: s.products || "",
    }).catch(() => {});
    await reload(); await reloadPayments(); await reloadCatalog();
    if (notifyUndo) notifyUndo("Supplier restored", () => {}, { timeout: 2500, undo: false });
  };

  const deleteSupplier = async (id) => {
    const ok = await confirmDialog("Delete supplier?", "Delete", { destructive: true });
    if (!ok) return;
    const target = suppliers.find((s) => s.id === id);
    try {
      try { await api.delete(`/supplier-payments/supplier/${id}`); } catch {}
      await api.delete(`/suppliers/${id}`);
      setPayments((prev) => { const p = { ...prev }; delete p[id]; return p; });
      await reload();
      setMsg("Supplier deleted!"); setTimeout(() => setMsg(""), 2000);
      if (target) notifyUndo?.(`Supplier deleted: ${target.name}`, () => restoreSupplier(target));
    } catch {
      setMsg("Failed to delete — supplier is in use"); setTimeout(() => setMsg(""), 2000);
    }
  };

  const togglePayments = (id) => setExpandedPayments((prev) => prev === id ? null : id);

  const getSupplierPayments = (sid) => payments[sid] || [];
  const getTotalPaid = (sid) => (payments[sid] || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const getTotalDiscount = (sid) => (payments[sid] || []).reduce((sum, p) => sum + (Number(p.discount) || 0), 0);
  const getNetPaid = (sid) => getTotalPaid(sid) - getTotalDiscount(sid);

  const getSupplierStockValue = (sid) => catalog
    .filter((p) => String(p.supplier?.id || p.supplierId) === String(sid))
    .reduce((sum, p) => sum + (Number(p.quantity) || 0) * (Number(p.buyingPrice) || 0), 0);

  const computeDiscount = (amount, type, value) => {
    const amt = Number(amount) || 0;
    const val = Number(value) || 0;
    if (val <= 0 || amt <= 0) return 0;
    return type === "percent" ? Math.round((amt * val) / 100) : Math.min(val, amt);
  };

  const addPayment = async (supplierId) => {
    if (!payAmount || Number(payAmount) <= 0) return;
    try {
      const discount = computeDiscount(payAmount, payDiscountType, payDiscount);
      await api.post("/supplier-payments", {
        supplier: { id: supplierId },
        amount: Number(payAmount),
        method: payMethod,
        notes: payNotes,
        date: new Date().toISOString(),
        discount,
        discountType: payDiscountType,
      });
      setPayAmount(""); setPayNotes(""); setPayDiscount(""); setPayDiscountType("percent"); setShowPayForm(null);
      setMsg("Payment recorded!"); setTimeout(() => setMsg(""), 2000);
      await reloadPayments();
    } catch {
      setMsg("Failed to record payment"); setTimeout(() => setMsg(""), 2000);
    }
  };

  const deletePayment = async (paymentId) => {
    try {
      await api.delete(`/supplier-payments/${paymentId}`);
      await reloadPayments();
    } catch {}
  };

  const exportSupplierPdf = (s) => {
    const sPayments = getSupplierPayments(s.id);
    const totalPaid = getTotalPaid(s.id);
    const totalDiscount = getTotalDiscount(s.id);
    const netPaid = getNetPaid(s.id);
    const supposed = getSupplierStockValue(s.id);
    const remaining = Math.max(0, supposed - netPaid);
    const money = (v) => `TZS ${Number(v || 0).toLocaleString()}`;
    exportPdf({
      title: "Supplier Payment Statement",
      filename: `supplier-${(s.name || "supplier").replace(/\s+/g, "-").toLowerCase()}-statement-${new Date().toISOString().slice(0, 10)}.pdf`,
      columns: ["Date", "Method", "Amount", "Discount", "Net Paid", "Notes"],
      rows: sPayments.map((p) => [
        p.date ? new Date(p.date).toLocaleDateString() : "—",
        p.method || "—",
        money(p.amount),
        (Number(p.discount) || 0) > 0 ? money(p.discount) : "—",
        money((Number(p.amount) || 0) - (Number(p.discount) || 0)),
        p.notes || "—",
      ]),
      footerNote: [
        `Supposed to Pay (Stock Value): ${money(supposed)}`,
        `Total Paid (Gross): ${money(totalPaid)}`,
        `Total Discount: ${money(totalDiscount)}`,
        `Total Paid (After Discount): ${money(netPaid)}`,
        `Remaining Balance: ${money(remaining)}`,
      ].join("  ·  "),
    });
  };

  let items = [...suppliers];
  if (search) { const s = search.toLowerCase(); items = items.filter((x) => x.name?.toLowerCase().includes(s) || x.company?.toLowerCase().includes(s) || x.phone?.includes(s)); }
  items.sort((a, b) => {
    let va, vb;
    if (sortF === "products") { va = getSupplierProducts(a).length; vb = getSupplierProducts(b).length; return sortD === "asc" ? va - vb : vb - va; }
    else { va = (a[sortF] || "").toLowerCase(); vb = (b[sortF] || "").toLowerCase(); }
    return sortD === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const bulk = useBulkSelect(items, (s) => s.id);

  const deleteSelectedSuppliers = async () => {
    if (bulk.selected.length === 0) return;
    const ok = await confirmDialog(`Delete ${bulk.selected.length} selected supplier(s)?`, "Delete", { destructive: true });
    if (!ok) return;
    setMsg("");
    try {
      const deleted = bulk.selected.map((id) => suppliers.find((s) => s.id === id)).filter(Boolean);
      for (const id of bulk.selected) {
        try { await api.delete(`/supplier-payments/supplier/${id}`); } catch {}
        await api.delete(`/suppliers/${id}`);
        setPayments((prev) => { const p = { ...prev }; delete p[id]; return p; });
      }
      await reload();
      bulk.clear();
      setMsg("Suppliers deleted!");
      setTimeout(() => setMsg(""), 2000);
      notifyUndo?.(`${deleted.length} supplier(s) deleted`, () => { deleted.forEach((s) => restoreSupplier(s)); });
    } catch { setMsg("Failed to delete"); setTimeout(() => setMsg(""), 2000); }
  };

  if (loading) return <View style={styles.centerBox}><Spinner size={28} text="Loading..." /></View>;

  const headerCells = [
    { f: "name", l: "Supplier", flex: 1.2 },
    { f: null, l: "Contact", flex: 1.1 },
    { f: "company", l: "Company", flex: 0.9 },
    { f: "products", l: "Products", flex: 1.4 },
    { f: null, l: "Payments", flex: 1.2 },
    { f: null, l: "Actions", flex: 0.7, center: true },
  ];

  const renderPaymentRow = (p) => (
    <View key={p.id} style={styles.payRow}>
      <Pressable style={styles.payRowTop} onPress={() => setExpandedPaymentId(expandedPaymentId === p.id ? null : p.id)}>
        <View style={styles.payRowInfo}>
          <Ionicons name="cash-outline" size={10} color="#16a34a" />
          <Text style={styles.payAmount}>TSh {(Number(p.amount) || 0).toLocaleString()}</Text>
          {(Number(p.discount) || 0) > 0 && <Text style={styles.payDiscount}>−{(Number(p.discount) || 0).toLocaleString()}</Text>}
          <Text style={styles.payMethod}>{p.method}</Text>
          {(Number(p.discount) || 0) > 0 && <Text style={styles.payNet}>= TSh {((Number(p.amount) || 0) - (Number(p.discount) || 0)).toLocaleString()}</Text>}
          <Text style={styles.payDate}>{fmtDateTime(p.date)}</Text>
          <Ionicons name={expandedPaymentId === p.id ? "chevron-up" : "chevron-down"} size={10} color="#94a3b8" />
        </View>
        <Pressable style={{ padding: 2 }} hitSlop={6} onPress={() => deletePayment(p.id)}>
          <Ionicons name="trash-outline" size={11} color="#ef4444" />
        </Pressable>
      </Pressable>
      {expandedPaymentId === p.id && (
        <View style={styles.payDetail}>
          <View style={styles.payDetailLine}>
            <Ionicons name="calendar-outline" size={9} color="#94a3b8" />
            <Text style={styles.payDetailText}>{fmtDate(p.date)} <Text style={{ fontWeight: "700", color: "#64748b" }}>{p.date ? new Date(p.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</Text></Text>
          </View>
          {p.notes ? <Text style={styles.payDetailText}>Note: {p.notes}</Text> : null}
        </View>
      )}
    </View>
  );

  const renderPaymentForm = (sid) => (
    <View style={styles.inlinePayForm}>
      <TextField value={payAmount} onChangeText={setPayAmount} placeholder="Amount" keyboardType="numeric" containerStyle={{ marginBottom: 4 }} inputStyle={{ fontSize: 11 }} />
      <SelectField value={payMethod} onChange={setPayMethod} options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} searchable={false} containerStyle={{ marginBottom: 4 }} />
      <View style={{ flexDirection: "row", gap: 4 }}>
        <View style={{ flex: 1 }}>
          <SelectField value={payDiscountType} onChange={setPayDiscountType} options={[{ value: "percent", label: "Discount %" }, { value: "fixed", label: "Discount TZS" }]} searchable={false} containerStyle={{ marginBottom: 4 }} />
        </View>
        <View style={{ flex: 1 }}>
          <TextField value={payDiscount} onChangeText={setPayDiscount} placeholder="Discount" keyboardType="numeric" containerStyle={{ marginBottom: 4 }} inputStyle={{ fontSize: 11 }} />
        </View>
      </View>
      <TextField value={payNotes} onChangeText={setPayNotes} placeholder="Note (optional)" containerStyle={{ marginBottom: 4 }} inputStyle={{ fontSize: 11 }} />
      <View style={{ flexDirection: "row", gap: 4 }}>
        <Button size="sm" variant="success" title="Save" onPress={() => addPayment(sid)} style={{ flex: 1 }} />
        <Button size="sm" variant="outline" title="Cancel" onPress={() => setShowPayForm(null)} />
      </View>
    </View>
  );

  const renderPaymentsCell = (s) => {
    const sPayments = getSupplierPayments(s.id);
    const totalPaid = getTotalPaid(s.id);
    const totalDiscount = getTotalDiscount(s.id);
    const isExpanded = expandedPayments === s.id;
    return (
      <View style={{ flexDirection: "column", gap: 2 }}>
        <Pressable style={styles.paymentsToggle} onPress={() => togglePayments(s.id)}>
          <View style={[styles.payBadge, totalPaid > 0 ? styles.payBadgeHas : styles.payBadgeNone]}>
            <Text style={{ color: totalPaid > 0 ? "#16a34a" : "#94a3b8", fontWeight: "700", fontSize: 10 }}>
              {totalPaid > 0 ? `TSh ${totalPaid.toLocaleString()}` : "No payments"}
            </Text>
          </View>
          {totalDiscount > 0 && <Text style={styles.discHint}>−{totalDiscount.toLocaleString()} disc</Text>}
          {sPayments.length > 0 && <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={12} color="#94a3b8" />}
        </Pressable>
        {isExpanded && (
          <View style={styles.paymentsBox}>
            {showPayForm === s.id ? (
              renderPaymentForm(s.id)
            ) : (
              <>
                {sPayments.length === 0 && <Text style={styles.noPayText}>No payments recorded</Text>}
                {sPayments.map(renderPaymentRow)}
                <Pressable style={styles.recordPayBtn} onPress={() => { setShowPayForm(s.id); setPayAmount(""); setPayNotes(""); setPayMethod("Cash"); setPayDiscount(""); setPayDiscountType("percent"); }}>
                  <Ionicons name="add" size={10} color="#2563eb" />
                  <Text style={styles.recordPayText}>Record Payment</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  const rows = items.map((s) => {
    const pTags = getSupplierProducts(s);
    const isProductsExpanded = expandedProducts === s.id;
    const visibleTags = isProductsExpanded ? pTags : pTags.slice(0, 3);
    return (
      <Pressable key={s.id} {...bulk.rowProps(s.id)} style={styles.row}>
        {bulk.mode && (
          <Pressable style={{ width: 26, alignItems: "center" }} onPress={() => bulk.toggle(s.id)} hitSlop={8}>
            <Ionicons name={bulk.selectedSet.has(s.id) ? "checkbox" : "square-outline"} size={17} color="#2563eb" />
          </Pressable>
        )}
        <View style={[styles.cell, { flex: 1.2 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={styles.supplierIcon}><Ionicons name="business-outline" size={13} color="#2563eb" /></View>
            <Text style={styles.supplierName}>{s.name}</Text>
          </View>
        </View>
        <View style={[styles.cell, { flex: 1.1 }]}>
          {s.phone && <Text style={styles.contactLine}><Ionicons name="call-outline" size={10} color="#94a3b8" /> {s.phone}</Text>}
          {s.email && <Text style={styles.contactLine} numberOfLines={1}><Ionicons name="mail-outline" size={10} color="#94a3b8" /> {s.email}</Text>}
          {!s.phone && !s.email && <Text style={{ color: colors.slate300 }}>—</Text>}
        </View>
        <View style={[styles.cell, { flex: 0.9 }]}>
          <Text style={styles.companyText} numberOfLines={1}>{s.company || "—"}</Text>
        </View>
        <View style={[styles.cell, { flex: 1.4 }]}>
          {pTags.length > 0 ? (
            <View style={styles.tagsWrap}>
              {visibleTags.map((tag, i) => (
                <Text key={i} style={styles.tagChip}>{tag}</Text>
              ))}
              {pTags.length > 3 && (
                <Pressable style={styles.moreBtn} onPress={() => setExpandedProducts(isProductsExpanded ? null : s.id)}>
                  <Text style={styles.moreText}>{isProductsExpanded ? "Less" : `+${pTags.length - 3} more`}</Text>
                  <Ionicons name={isProductsExpanded ? "chevron-up" : "chevron-down"} size={10} color="#64748b" />
                </Pressable>
              )}
            </View>
          ) : <Text style={{ color: colors.slate300 }}>—</Text>}
        </View>
        <View style={[styles.cell, { flex: 1.2 }]}>{renderPaymentsCell(s)}</View>
        <View style={[styles.cell, { flex: 0.7, flexDirection: "row", justifyContent: "center", gap: 6 }]}>
          <Pressable style={styles.iconBtn} onPress={() => exportSupplierPdf(s)} hitSlop={6}>
            <Ionicons name="document-text-outline" size={13} color="#2563eb" />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => editSupplier(s)} hitSlop={6}>
            <Ionicons name="create-outline" size={13} color="#2563eb" />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => deleteSupplier(s.id)} hitSlop={6}>
            <Ionicons name="trash-outline" size={13} color="#ef4444" />
          </Pressable>
        </View>
      </Pressable>
    );
  });

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <View style={styles.titleBox}>
          <Ionicons name="business-outline" size={20} color="#2563eb" />
          <Text style={styles.title}>Suppliers</Text>
          <Text style={styles.titleCount}>({suppliers.length})</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Button size="sm" variant={bulk.mode ? "outline" : "ghost"} title={bulk.mode ? "Cancel" : "Select"}
            onPress={() => (bulk.mode ? bulk.clear() : bulk.startMode())}
            icon={<Ionicons name="checkmark-circle-outline" size={13} color="#2563eb" />} />
          <Button size="sm" title="Add Supplier" onPress={openAddPanel}
            icon={<Ionicons name="person-add-outline" size={13} color="#fff" />} />
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={13} color="#94a3b8" style={styles.searchIcon} />
          <TextField value={search} onChangeText={setSearch} placeholder="Search suppliers..." containerStyle={{ marginBottom: 0 }} inputStyle={styles.searchInput} />
        </View>
        {bulk.mode && (
          <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected}
            onSelectAll={bulk.toggleAll} onDelete={deleteSelectedSuppliers} deleteLabel="Delete Selected" />
        )}
      </View>

      {msg && (
        <View style={[styles.msg, msg.includes("Failed") ? styles.msgError : styles.msgSuccess]}>
          <Text style={{ fontSize: 11, color: msg.includes("Failed") ? "#991b1b" : "#166534" }}>{msg}</Text>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.tableHeader}>
          {bulk.mode && (
            <Pressable style={{ width: 26, alignItems: "center" }} onPress={bulk.toggleAll} hitSlop={8}>
              <Ionicons name={bulk.allSelected ? "checkbox" : "square-outline"} size={17} color="#2563eb" />
            </Pressable>
          )}
          {headerCells.map((h) => (
            <Pressable
              key={h.l}
              style={[styles.headerCell, { flex: h.flex }, h.center && styles.centerCell]}
              onPress={() => h.f && (sortF === h.f ? setSortD((d) => d === "asc" ? "desc" : "asc") : (setSortF(h.f), setSortD("asc")))}
            >
              <Text style={styles.headerCellText}>{h.l}</Text>
              {h.f && <Ionicons name="swap-vertical" size={11} color={sortF === h.f ? "#2563eb" : "#94a3b8"} style={{ opacity: sortF === h.f ? 1 : 0.4 }} />}
            </Pressable>
          ))}
        </View>
        {rows.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="business-outline" size={26} color={colors.slate300} />
            <Text style={styles.emptyText}>No suppliers found</Text>
          </View>
        ) : (
          <FlatList data={rows} keyExtractor={(_, i) => String(i)} style={styles.list} renderItem={({ item }) => item} />
        )}
      </View>

      <Modal
        visible={showPanel}
        onClose={closePanel}
        title={editingId ? "Edit Supplier" : "New Supplier"}
        actions={[
          <Button key="cancel" variant="outline" title="Cancel" onPress={closePanel} style={{ flex: 1 }} />,
          <Button key="save" title={editingId ? "Update" : "Add Supplier"} onPress={handleSubmit} style={{ flex: 210 }}
            icon={<Ionicons name="save-outline" size={13} color="#fff" />} />,
        ]}
      >
        <TextField label="Supplier *" value={form.name} onChangeText={setField("name")} placeholder="Supplier name" containerStyle={{ marginBottom: spacing.sm }} />
        <TextField label="Contact" value={form.phone} onChangeText={setField("phone")} placeholder="+255..." keyboardType="phone-pad" containerStyle={{ marginBottom: spacing.sm }} />
        <TextField label="Company" value={form.company} onChangeText={setField("company")} placeholder="Company name" containerStyle={{ marginBottom: spacing.sm }} />
        <TextField label="Email" value={form.email} onChangeText={setField("email")} placeholder="email@example.com" keyboardType="email-address" containerStyle={{ marginBottom: spacing.sm }} />
        <TextField label="Address" value={form.address} onChangeText={setField("address")} placeholder="Street / area" containerStyle={{ marginBottom: spacing.sm }} />

        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}><Ionicons name="cube-outline" size={11} color={colors.slate500} /> Products</Text>
          <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <TextField value={productInput} onChangeText={handleProductInputChange} placeholder="Type or select from list"
                onSubmitEditing={addProductTag} returnKeyType="done" autoCapitalize="none" containerStyle={{ marginBottom: 0 }} />
            </View>
            <Pressable style={styles.addTagBtn} onPress={addProductTag}><Ionicons name="add" size={12} color="#475569" /></Pressable>
          </View>
          {showSugg && suggestions.length > 0 && (
            <View style={styles.suggList}>
              {suggestions.map((p) => (
                <Pressable key={p.id} style={styles.suggItem} onPress={() => selectSuggestion(p.name)}>
                  <Text style={styles.suggName}>{p.name}</Text>
                  <Text style={styles.suggAdd}>+ Add</Text>
                </Pressable>
              ))}
            </View>
          )}
          {formProducts.length > 0 && (
            <View style={styles.tagsWrap}>
              {formProducts.map((tag) => {
                const exists = catalog.some((c) => c.name && c.name.toLowerCase() === tag.toLowerCase());
                return (
                  <View key={tag} style={styles.formTag}>
                    <Text style={styles.formTagText}>{tag}</Text>
                    {!exists && <Text style={styles.newBadge}>NEW</Text>}
                    <Pressable onPress={() => removeProductTag(tag)} hitSlop={6}><Ionicons name="close" size={10} color="#2563eb" /></Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.paySection}>
          <Text style={styles.sectionLabel}><Ionicons name="cash-outline" size={11} color={colors.slate500} /> Payment (optional)</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <View style={{ flex: 1 }}>
              <TextField value={payAmount} onChangeText={setPayAmount} placeholder="Amount" keyboardType="numeric" containerStyle={{ marginBottom: 6 }} />
            </View>
            <View style={{ flex: 1 }}>
              <SelectField value={payMethod} onChange={setPayMethod} options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} searchable={false} containerStyle={{ marginBottom: 6 }} />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <View style={{ flex: 1 }}>
              <SelectField value={payDiscountType} onChange={setPayDiscountType} options={[{ value: "percent", label: "Discount %" }, { value: "fixed", label: "Discount TZS" }]} searchable={false} containerStyle={{ marginBottom: 6 }} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField value={payDiscount} onChangeText={setPayDiscount} placeholder="Discount" keyboardType="numeric" containerStyle={{ marginBottom: 6 }} />
            </View>
          </View>
          <TextField value={payNotes} onChangeText={setPayNotes} placeholder="Payment note (optional)" containerStyle={{ marginBottom: 0 }} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50, padding: spacing.sm, gap: 8 },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  titleBox: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 18, fontWeight: "700", color: colors.slate900 },
  titleCount: { color: "#94a3b8", fontSize: 12 },
  searchRow: { flexDirection: "row", gap: 8, alignItems: "center", flexShrink: 0 },
  searchWrap: { flexDirection: "row", alignItems: "center", flex: 1, maxWidth: 320 },
  searchIcon: { position: "absolute", left: 8, zIndex: 1 },
  searchInput: { paddingLeft: 28, fontSize: 12 },
  msg: { padding: 6, paddingHorizontal: 12, borderRadius: 4, flexShrink: 0 },
  msgError: { background: "#fef2f2", borderWidth: 1, borderColor: "#fecaca" },
  msgSuccess: { background: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  card: { flex: 1, background: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: 8, overflow: "hidden" },
  tableHeader: { flexDirection: "row", background: "#f8fafc", borderBottomWidth: 2, borderBottomColor: colors.slate200, paddingVertical: 9, paddingHorizontal: 10 },
  headerCell: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 2 },
  centerCell: { justifyContent: "center" },
  headerCellText: { fontSize: 10, fontWeight: "700", color: "#64748b", textTransform: "uppercase" },
  list: { flex: 1 },
  row: { flexDirection: "row", alignItems: "flex-start", borderBottomWidth: 1, borderBottomColor: colors.slate100, paddingVertical: 10, paddingHorizontal: 10, minHeight: 48 },
  cell: { paddingHorizontal: 2, justifyContent: "center" },
  supplierIcon: { width: 26, height: 26, borderRadius: 6, background: "#eff6ff", alignItems: "center", justifyContent: "center" },
  supplierName: { fontSize: 13, fontWeight: "600", color: colors.slate800 },
  contactLine: { fontSize: 11, color: "#334155", flexDirection: "row", alignItems: "center", gap: 4 },
  companyText: { fontSize: 12, color: "#334155" },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 3, alignItems: "center" },
  tagChip: { paddingVertical: 1, paddingHorizontal: 6, borderRadius: 4, background: "#eff6ff", color: "#2563eb", fontSize: 10, fontWeight: "600", overflow: "hidden" },
  moreBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 4, background: "#fff" },
  moreText: { color: "#64748b", fontSize: 10, fontWeight: "700" },
  paymentsToggle: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  payBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99 },
  payBadgeHas: { background: "#f0fdf4" },
  payBadgeNone: { background: "#f8fafc" },
  discHint: { fontSize: 9, fontWeight: "600", color: "#dc2626" },
  paymentsBox: { background: "#f8fafc", borderWidth: 1, borderColor: colors.slate200, borderRadius: 6, padding: 6, marginTop: 2 },
  noPayText: { fontSize: 10, color: "#94a3b8", textAlign: "center", padding: 4 },
  payRow: { borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  payRowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6, paddingVertical: 5 },
  payRowInfo: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, flexWrap: "wrap" },
  payAmount: { fontWeight: "700", color: "#0f172a", fontSize: 11 },
  payDiscount: { color: "#dc2626", fontSize: 9, fontWeight: "600" },
  payMethod: { color: "#64748b", fontSize: 10 },
  payNet: { fontWeight: "700", color: "#16a34a", fontSize: 10 },
  payDate: { color: "#94a3b8", fontSize: 9 },
  payDetail: { paddingLeft: 16, paddingBottom: 8, gap: 2 },
  payDetailLine: { flexDirection: "row", alignItems: "center", gap: 3 },
  payDetailText: { fontSize: 10, color: "#94a3b8" },
  recordPayBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, padding: 5, borderWidth: 1, borderStyle: "dashed", borderColor: "#d1d5db", borderRadius: 4, marginTop: 4 },
  recordPayText: { fontSize: 10, fontWeight: "600", color: "#2563eb" },
  inlinePayForm: { gap: 2 },
  iconBtn: { padding: 2, borderRadius: 4 },
  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 8 },
  emptyText: { color: "#94a3b8", fontSize: 13 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4, flexDirection: "row", alignItems: "center", gap: 3 },
  formSection: { borderWidth: 1, borderColor: colors.slate200, borderRadius: 8, padding: 10, marginTop: spacing.xs },
  addTagBtn: { paddingVertical: 7, paddingHorizontal: 10, background: "#f1f5f9", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6 },
  suggList: { borderWidth: 1, borderColor: colors.slate200, borderRadius: 6, marginTop: 4, maxHeight: 140, overflow: "hidden", background: "#fff", ...shadow.raised },
  suggItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 7, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  suggName: { fontSize: 12, color: "#334155" },
  suggAdd: { fontSize: 10, color: "#2563eb", fontWeight: "600" },
  formTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 8, background: "#eff6ff", borderRadius: 4 },
  formTagText: { color: "#2563eb", fontSize: 11, fontWeight: "600" },
  newBadge: { fontSize: 9, color: "#166534", fontWeight: "700", background: "#dcfce7", paddingHorizontal: 4, borderRadius: 3, overflow: "hidden" },
  paySection: { borderWidth: 1, borderColor: colors.slate200, borderRadius: 8, padding: 10, background: "#f8fafc", marginTop: spacing.sm },
});