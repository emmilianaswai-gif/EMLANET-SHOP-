import { useEffect, useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { Modal, TextField, SelectField, Button, Card } from "../components/ui";
import { confirmDialog, alertMessage } from "../utils/confirm";
import { useLanguage } from "../i18n";
import { colors, font, radius, spacing } from "../theme";

const money = (v) => `TZS ${Number(v || 0).toLocaleString()}`;

const PLATFORMS = [
  { id: "nmb", name: "NMB Bank", type: "bank", color: "#1e40af", bg: "#eff6ff", icon: "business-outline", code: "NMB" },
  { id: "crdb", name: "CRDB Bank", type: "bank", color: "#047857", bg: "#ecfdf5", icon: "business-outline", code: "CRDB" },
  { id: "tigopesa", name: "TigoPesa", type: "mobile", color: "#dc2626", bg: "#fef2f2", icon: "phone-portrait-outline", code: "Tigo" },
  { id: "mpesa", name: "M-Pesa (Vodacom)", type: "mobile", color: "#059669", bg: "#f0fdf4", icon: "phone-portrait-outline", code: "M-Pesa" },
  { id: "airtel", name: "Airtel Money", type: "mobile", color: "#dc2626", bg: "#fef2f2", icon: "phone-portrait-outline", code: "Airtel" },
  { id: "halopesa", name: "HaloPesa (TTCL)", type: "mobile", color: "#7c3aed", bg: "#ede9fe", icon: "phone-portrait-outline", code: "Halo" },
  { id: "ezypesa", name: "EzyPesa (Tadadom)", type: "mobile", color: "#2563eb", bg: "#eff6ff", icon: "phone-portrait-outline", code: "Ezy" },
  { id: "cash", name: "Cash Hand", type: "cash", color: "#92400e", bg: "#fef3c7", icon: "cash-outline", code: "Cash" },
];

export default function MyPocket() {
  useLanguage();
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [collections, setCollections] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [capitals, setCapitals] = useState([]);
  const [products, setProducts] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showCapitalModal, setShowCapitalModal] = useState(false);

  const loadCapital = (capData) => {
    if (Array.isArray(capData)) return capData;
    try { return JSON.parse(localStorage.getItem("shop_pocket_capital") || "[]"); } catch { return []; }
  };

  const addCapital = async (payload) => {
    try {
      const res = await api.post("/pocket/capital", payload);
      if (res.data) return res.data;
    } catch { /* backend endpoint missing — fallback to local storage */ }
    const items = loadCapital();
    const rec = { id: `local-${Date.now()}`, ...payload, createdAt: new Date().toISOString(), local: true };
    items.push(rec);
    localStorage.setItem("shop_pocket_capital", JSON.stringify(items));
    return rec;
  };

  const deleteCapital = async (id) => {
    try {
      await api.delete(`/pocket/capital/${id}`);
      return;
    } catch { /* fallback to local storage */ }
    const items = loadCapital().filter((c) => String(c.id) !== String(id));
    localStorage.setItem("shop_pocket_capital", JSON.stringify(items));
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadData();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fetchAll = () => [
    api.get("/sales").catch(() => ({ data: [] })),
    api.get("/purchases").catch(() => ({ data: [] })),
    api.get("/customers").catch(() => ({ data: [] })),
    api.get("/pocket/collections").catch(() => ({ data: [] })),
    api.get("/pocket/withdrawals").catch(() => ({ data: [] })),
    api.get("/pocket/capital").catch(() => ({ data: null })),
    api.get("/products").catch(() => ({ data: [] })),
    api.get("/stocks").catch(() => ({ data: [] })),
  ];

  const applyData = ([sr, pr, cr, colRes, wdRes, capRes, prodRes, stRes]) => {
    setSales(Array.isArray(sr.data) ? sr.data : []);
    setPurchases(Array.isArray(pr.data) ? pr.data : []);
    setCustomers(Array.isArray(cr.data) ? cr.data : []);
    setCollections(Array.isArray(colRes.data) ? colRes.data : []);
    setWithdrawals(Array.isArray(wdRes.data) ? wdRes.data : []);
    setCapitals(loadCapital(capRes.data));
    setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
    setStocks(Array.isArray(stRes.data) ? stRes.data : []);
  };

  const loadData = async () => {
    const results = await Promise.all(fetchAll());
    applyData(results);
  };

  const deleteEndpointFor = (t) => {
    if (t.id?.startsWith("col-")) return `/pocket/collections/${t.id.slice(4)}`;
    if (t.id?.startsWith("wd-")) return `/pocket/withdrawals/${t.id.slice(3)}`;
    if (t.id?.startsWith("purchase-")) return `/purchases/${t.id.slice(9)}`;
    if (t.id?.startsWith("sale-")) return `/sales/${t.id.slice(5)}`;
    return null;
  };

  const deleteTransaction = async (t) => {
    if (t.id?.startsWith("cap-")) {
      if (!(await confirmDialog(`Delete this record?\n\n${t.description} — TZS ${Number(t.amount || 0).toLocaleString()}`))) return;
      try {
        await deleteCapital(t.id.slice(4));
        await loadData();
      } catch { alertMessage("Failed to delete record"); }
      return;
    }
    const endpoint = deleteEndpointFor(t);
    if (!endpoint) return;
    if (!(await confirmDialog(`Delete this record?\n\n${t.description} — TZS ${Number(t.amount || 0).toLocaleString()}`))) return;
    try {
      await api.delete(endpoint);
      await loadData();
    } catch { alertMessage("Failed to delete record"); }
  };

  const deleteAllTransactions = async () => {
    const total = sales.length + purchases.length + collections.length + withdrawals.length + capitals.length;
    if (total === 0) return;
    if (!(await confirmDialog(`Delete ALL ${total} transaction record(s) (sales, purchases, collections, withdrawals and capital)? This cannot be undone.`))) return;
    const attempts = [
      ...collections.map((c) => api.delete(`/pocket/collections/${c.id}`)),
      ...withdrawals.map((w) => api.delete(`/pocket/withdrawals/${w.id}`)),
      ...capitals.map((c) => deleteCapital(c.id)),
      ...purchases.map((p) => api.delete(`/purchases/${p.id}`)),
      ...sales.map((s) => api.delete(`/sales/${s.id}`)),
    ];
    const results = await Promise.allSettled(attempts);
    const failed = results.filter((r) => r.status === "rejected").length;
    await loadData();
    if (failed > 0) alertMessage(`Deleted most records — ${failed} failed.`);
  };

  const transactions = useMemo(() => {
    const items = [];
    collections.forEach((c) => {
      items.push({
        id: `col-${c.id}`, type: "income", source: "Collection",
        description: `${c.customerName} - ${c.purpose || "Payment"}`,
        amount: Number(c.amount) || 0, date: c.createdAt || c.date,
        status: c.status || "Completed", paymentMethod: "collection",
        platform: "cash",
      });
    });
    sales.forEach((s) => {
      const ps = (s.paymentStatus || "").toUpperCase();
      items.push({
        id: `sale-${s.id}`, type: ps === "UNPAID" ? "debt" : "income", source: "Sale",
        description: s.description || `Sale #${s.id}`,
        amount: Number(s.grandTotal) || Number(s.price) || 0,
        date: s.saleDate || s.createdAt, status: s.paymentStatus || "PAID",
        paymentMethod: s.paymentMethod || "cash", platform: "cash",
      });
    });
    purchases.filter((p) => (p.status || "Pending") === "Approved").forEach((p) => {
      items.push({
        id: `purchase-${p.id}`, type: "expense", source: "Purchase",
        description: p.productName || `Order #${p.id}`,
        amount: (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0),
        date: p.purchaseDate || p.createdAt, status: p.status || "Approved",
        paymentMethod: "order", platform: "cash",
      });
    });
    withdrawals.forEach((w) => {
      items.push({
        id: `wd-${w.id}`, type: "withdrawal", source: `Withdrawal`,
        description: `To ${w.platformName || w.platformId} - ${w.accountName || w.accountNumber || ""}`,
        amount: Number(w.amount) || 0, date: w.createdAt || w.date,
        status: w.status || "Completed", paymentMethod: w.platformId,
        platform: w.platformId, accountNumber: w.accountNumber,
      });
    });
    capitals.forEach((c) => {
      items.push({
        id: `cap-${c.id}`, type: "capital", source: "Capital",
        description: c.notes || c.description || "Capital injected",
        amount: Number(c.amount) || 0, date: c.createdAt || c.date,
        status: c.status || "Completed", paymentMethod: "cash",
        platform: "cash",
      });
    });
    items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return items;
  }, [sales, purchases, collections, withdrawals, capitals]);

  const stats = useMemo(() => {
    const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const totalDebt = transactions.filter((t) => t.type === "debt").reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawn = transactions.filter((t) => t.type === "withdrawal").reduce((sum, t) => sum + t.amount, 0);
    const manualCapital = capitals.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const priceById = {};
    products.forEach((p) => { priceById[p.id] = Number(p.buyingPrice) || 0; });
    const inventoryCapital = stocks.reduce((sum, s) => {
      const pid = s.productId ?? s.product?.id;
      return sum + (Number(s.quantity) || 0) * (priceById[pid] || 0);
    }, 0);
    const totalCapital = manualCapital + inventoryCapital;
    const totalCollected = collections.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const balance = totalCapital + totalIncome + totalCollected - totalExpense - totalWithdrawn;
    const availableProfit = Math.max(0, balance - totalCapital);
    return {
      totalIncome, totalExpense, totalWithdrawn, totalDebt, totalCapital, manualCapital, inventoryCapital,
      balance, availableProfit,
      totalCollected,
      incomeCount: transactions.filter((t) => t.type === "income").length,
      expenseCount: transactions.filter((t) => t.type === "expense").length,
      withdrawalCount: transactions.filter((t) => t.type === "withdrawal").length,
      capitalCount: transactions.filter((t) => t.type === "capital").length,
    };
  }, [transactions, collections, capitals, products, stocks]);

  const filtered = useMemo(() => {
    let list = filter === "all" ? transactions : transactions.filter((t) => t.type === filter);
    list = [...list].sort((a, b) => {
      let va, vb;
      if (sortField === "date") { va = a.date || ""; vb = b.date || ""; }
      else if (sortField === "amount") { va = Number(a.amount || 0); vb = Number(b.amount || 0); return sortDir === "asc" ? va - vb : vb - va; }
      else if (sortField === "type") { va = a.type || ""; vb = b.type || ""; return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va); }
      else { va = a.date || ""; vb = b.date || ""; }
      return sortDir === "asc" ? new Date(va) - new Date(vb) : new Date(vb) - new Date(va);
    });
    return list;
  }, [transactions, filter, sortField, sortDir]);

  const toggleSort = (field) => { if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc"); else { setSortField(field); setSortDir("desc"); } };

  const bulk = useBulkSelect(filtered, (t) => t.id);

  const deleteSelectedTransactions = async () => {
    if (bulk.selected.length === 0) return;
    if (!(await confirmDialog(`Delete ${bulk.selected.length} selected transaction record(s)?`))) return;
    const selected = bulk.selected.map((id) => filtered.find((t) => t.id === id)).filter(Boolean);
    if (selected.length === 0) return;
    try {
      const endpoint = (t) => (t.id?.startsWith("cap-") ? null : deleteEndpointFor(t));
      const results = await Promise.allSettled(selected.map((t) =>
        t.id?.startsWith("cap-") ? deleteCapital(t.id.slice(4)) : api.delete(endpoint(t))
      ));
      const failed = results.filter((r) => r.status === "rejected").length;
      bulk.clear();
      await loadData();
      if (failed > 0) alertMessage(`Deleted most records — ${failed} failed.`);
    } catch { bulk.clear(); alertMessage("Failed to delete records"); }
  };

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <Spinner size={28} text="Loading..." />
      </View>
    );
  }

  const statCards = [
    { label: "Balance", value: money(stats.balance), color: stats.balance >= 0 ? "#2563eb" : "#dc2626", icon: "cash-outline", bg: stats.balance >= 0 ? "#eff6ff" : "#fef2f2" },
    { label: "Capital", value: money(stats.totalCapital), color: "#b45309", icon: "add", bg: "#fef3c7", sub: `Products: TZS ${stats.inventoryCapital.toLocaleString()}` },
    { label: "Profit", value: money(stats.availableProfit), color: stats.availableProfit > 0 ? "#059669" : "#94a3b8", icon: "trending-up-outline", bg: stats.availableProfit > 0 ? "#ecfdf5" : "#f8fafc" },
    { label: "Total Income", value: money(stats.totalIncome), color: "#16a34a", icon: "trending-up-outline", bg: "#f0fdf4" },
    { label: "Total Expenses", value: money(stats.totalExpense), color: "#dc2626", icon: "trending-down-outline", bg: "#fef2f2" },
    { label: "Total Withdrawn", value: money(stats.totalWithdrawn), color: "#7c3aed", icon: "upload-outline", bg: "#ede9fe" },
    { label: "Cash Collected", value: money(stats.totalCollected), color: "#059669", icon: "arrow-up", bg: "#ecfdf5" },
    { label: "Transactions", value: `${stats.incomeCount + stats.expenseCount + stats.withdrawalCount}`, color: "#64748b", icon: "time-outline", bg: "#f8fafc" },
  ];

  const FILTERS = [{ k: "all", l: "All" }, { k: "income", l: "Income" }, { k: "expense", l: "Expenses" }, { k: "withdrawal", l: "Withdrawals" }, { k: "capital", l: "Capital" }];

  const TypeBadge = ({ t }) => {
    const isIncome = t.type === "income";
    const isWithdrawal = t.type === "withdrawal";
    const isCapital = t.type === "capital";
    const bg = isIncome ? "#f0fdf4" : isWithdrawal ? "#ede9fe" : isCapital ? "#fef3c7" : "#fef2f2";
    const c = isIncome ? "#16a34a" : isWithdrawal ? "#7c3aed" : isCapital ? "#b45309" : "#dc2626";
    const icon = isIncome ? "arrow-up" : isWithdrawal ? "upload-outline" : isCapital ? "add" : "arrow-down";
    const label = isIncome ? "Income" : isWithdrawal ? "Withdrawal" : isCapital ? "Capital" : "Expense";
    return (
      <View style={[s.badge, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={10} color={c} />
        <Text style={[s.badgeText, { color: c }]}>{label}</Text>
      </View>
    );
  };

  const sortHead = (label, field) => (
    <Pressable style={[s.thPressable]} onPress={() => toggleSort(field)} hitSlop={4}>
      <Text style={s.th}>{label}</Text>
      <Ionicons name="swap-vertical-outline" size={10} color="#94a3b8" />
    </Pressable>
  );

  return (
    <View style={s.root}>
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Ionicons name="wallet-outline" size={22} color={colors.primary} />
          <Text style={s.headerTitle}>My Pocket</Text>
          <Text style={s.headerSub}>(Cash Collection & Withdrawal)</Text>
        </View>
        <View style={s.actionRow}>
          <Button title={bulk.mode ? "Cancel" : "Select"} icon={<Ionicons name="checkbox-outline" size={14} color={bulk.mode ? "#fff" : "#334155"} />} variant={bulk.mode ? "primary" : "outline"} size="sm" onPress={() => (bulk.mode ? bulk.clear() : bulk.startMode())} />
          <Button title="Collect" icon={<Ionicons name="download-outline" size={14} color="#fff" />} variant="success" size="sm" onPress={() => { setShowCollectModal(true); setShowWithdrawModal(false); setShowCapitalModal(false); }} />
          <Button title="Withdraw" icon={<Ionicons name="upload-outline" size={14} color="#fff" />} variant="primary" size="sm" onPress={() => { setShowWithdrawModal(true); setShowCollectModal(false); setShowCapitalModal(false); }} />
          <Button title="Add Capital" icon={<Ionicons name="add" size={14} color="#fff" />} size="sm" style={{ backgroundColor: "#b45309" }} onPress={() => { setShowCapitalModal(true); setShowCollectModal(false); setShowWithdrawModal(false); }} />
          <Button title="Delete All" icon={<Ionicons name="trash-outline" size={14} color="#fff" />} variant="danger" size="sm" onPress={deleteAllTransactions} />
        </View>
      </View>

      <View style={s.statGrid}>
        {statCards.map((st) => (
          <View key={st.label} style={[s.statCard, { backgroundColor: st.bg, borderTopColor: st.color }]}>
            <View style={s.statLabelRow}>
              <Ionicons name={st.icon} size={12} color={st.color} />
              <Text style={[s.statLabel, { color: st.color }]}>{st.label}</Text>
            </View>
            <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
            {!!st.sub && <Text style={s.statSub}>{st.sub}</Text>}
          </View>
        ))}
      </View>

      <View style={s.filterRow}>
        <View style={s.filterGroup}>
          {FILTERS.map((f) => {
            const active = filter === f.k;
            return (
              <Pressable key={f.k} onPress={() => setFilter(f.k)} style={[s.filterChip, active && s.filterChipActive]} hitSlop={4}>
                <Text style={[s.filterChipText, { color: active ? colors.primary : "#64748b" }]}>{f.l}</Text>
              </Pressable>
            );
          })}
        </View>
        {bulk.mode && <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected} onSelectAll={bulk.toggleAll} onDelete={deleteSelectedTransactions} deleteLabel="Delete Selected" />}
      </View>

      <Card padded={false} style={s.tableCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.tableInner}>
            <View style={s.trHead}>
              {bulk.mode && (
                <View style={[s.td, s.colCheck]}>
                  <Pressable onPress={bulk.toggleAll} hitSlop={8}>
                    <Ionicons name={bulk.allSelected ? "checkbox" : "square-outline"} size={16} color={bulk.allSelected ? colors.primary : colors.slate400} />
                  </Pressable>
                </View>
              )}
              {sortHead("Type", "type")}
              <Text style={s.th}>Source</Text>
              <Text style={[s.th, s.colDesc]}>Description</Text>
              {sortHead("Amount", "amount")}
              <Text style={s.th}>Status</Text>
              <Text style={s.th}>Platform</Text>
              {sortHead("Date", "date")}
              <Text style={[s.th, s.colActions]}>Actions</Text>
            </View>
            {filtered.length === 0 ? (
              <View style={s.emptyRow}>
                <Ionicons name="time-outline" size={32} color={colors.slate300} style={{ marginBottom: 8 }} />
                <Text style={s.emptyText}>No transactions yet</Text>
              </View>
            ) : filtered.map((t) => {
              const isIncome = t.type === "income";
              const isWithdrawal = t.type === "withdrawal";
              const isCapital = t.type === "capital";
              const platform = PLATFORMS.find((p) => p.id === t.platform);
              const amountColor = isIncome ? "#16a34a" : isWithdrawal ? "#7c3aed" : isCapital ? "#b45309" : "#dc2626";
              return (
                <View key={t.id} style={s.tr}>
                  {bulk.mode && (
                    <View style={[s.td, s.colCheck]}>
                      <Pressable onPress={() => bulk.toggle(t.id)} hitSlop={8}>
                        <Ionicons name={bulk.selectedSet.has(t.id) ? "checkbox" : "square-outline"} size={16} color={bulk.selectedSet.has(t.id) ? colors.primary : colors.slate400} />
                      </Pressable>
                    </View>
                  )}
                  <View style={[s.td, s.colType]}>
                    <TypeBadge t={t} />
                  </View>
                  <Text style={[s.td, s.colSource, { fontWeight: "600" }]}>{t.source}</Text>
                  <Text style={[s.td, s.colDesc, s.descText]} numberOfLines={1}>{t.description}</Text>
                  <Text style={[s.td, s.colAmount, { color: amountColor, fontWeight: "700" }]}>
                    {isIncome || isCapital ? "+" : "-"} TZS {t.amount.toLocaleString()}
                  </Text>
                  <View style={[s.td, s.colStatus]}>
                    <View style={[s.badge, { backgroundColor: t.status === "Completed" || t.status === "Paid" || t.status === "paid" ? "#f0fdf4" : "#fef9c3" }]}>
                      <Text style={[s.badgeText, { color: t.status === "Completed" || t.status === "Paid" || t.status === "paid" ? "#16a34a" : "#a16207" }]}>{t.status}</Text>
                    </View>
                  </View>
                  <View style={[s.td, s.colPlatform]}>
                    {platform ? (
                      <View style={[s.badge, { backgroundColor: platform.bg }]}>
                        <Ionicons name={platform.icon} size={10} color={platform.color} />
                        <Text style={[s.badgeText, { color: platform.color }]}>{platform.code}</Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 11, color: "#94a3b8", textTransform: "capitalize" }}>{t.paymentMethod}</Text>
                    )}
                  </View>
                  <Text style={[s.td, s.colDate, { color: "#94a3b8", fontSize: 11 }]}>{t.date ? new Date(t.date).toLocaleDateString() : "—"}</Text>
                  <Pressable style={[s.td, s.colActions, s.actBtn]} onPress={() => deleteTransaction(t)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={13} color="#ef4444" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Card>

      <CollectModal visible={showCollectModal} customers={customers} onClose={() => setShowCollectModal(false)} onSaved={() => { setShowCollectModal(false); loadData(); }} />
      <WithdrawModal visible={showWithdrawModal} balance={stats.balance} profit={stats.availableProfit} capital={stats.totalCapital} onClose={() => setShowWithdrawModal(false)} onSaved={() => { setShowWithdrawModal(false); loadData(); }} />
      <CapitalModal visible={showCapitalModal} onAdd={addCapital} onClose={() => setShowCapitalModal(false)} onSaved={() => { setShowCapitalModal(false); loadData(); }} />
    </View>
  );
}

function CollectModal({ visible, customers, onClose, onSaved }) {
  const [form, setForm] = useState({ customerId: "", customerName: "", amount: "", purpose: "", phone: "", notes: "" });
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);

  const filtered = search ? customers.filter((c) => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)) : [];

  const selectCustomer = (c) => {
    setForm((p) => ({ ...p, customerId: c.id, customerName: c.name, phone: c.phone || "" }));
    setSearch("");
  };

  const handleSubmit = async () => {
    if (!form.customerName || !form.amount) { setMsg("Customer and amount required"); setTimeout(() => setMsg(""), 2000); return; }
    setSending(true);
    try {
      await api.post("/pocket/collections", {
        customerId: form.customerId || null,
        customerName: form.customerName,
        phone: form.phone,
        amount: Number(form.amount),
        purpose: form.purpose || "Payment collection",
        notes: form.notes,
        collectedBy: localStorage.getItem("shop_username") || "Staff",
      });
      setMsg("Collection recorded!");
      setTimeout(() => onSaved(), 1000);
    } catch { setMsg("Failed to record"); }
    finally { setSending(false); }
  };

  return (
    <Modal visible={visible} onClose={onClose}
      actions={[
        <Button key="c" title="Cancel" variant="ghost" onPress={onClose} />,
        <Button key="s" title={sending ? "Recording..." : "Record Collection"} icon={<Ionicons name="download-outline" size={14} color="#fff" />} variant="success" loading={sending} disabled={sending} onPress={handleSubmit} />,
      ]}>
      {!!msg && (
        <View style={[s.msgBar, msg.includes("Failed") ? s.msgBarError : s.msgBarSuccess]}>
          <Text style={[s.msgText, { color: msg.includes("Failed") ? "#991b1b" : "#166534" }]}>{msg}</Text>
        </View>
      )}
      <View style={s.formCol}>
        <Text style={s.label}>Search Customer</Text>
        <TextField value={search} onChangeText={setSearch} placeholder="Type name or phone..." rightIcon={<Ionicons name="search" size={14} color="#94a3b8" />} />
        {filtered.length > 0 && (
          <View style={s.searchList}>
            {filtered.map((c) => (
              <Pressable key={c.id} onPress={() => selectCustomer(c)} style={s.searchItem}>
                <Text style={{ fontWeight: "600", flex: 1 }}>{c.name}</Text>
                <Text style={{ color: "#94a3b8" }}>{c.phone}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {!!form.customerName && (
          <View style={s.selectedCust}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", fontSize: 12 }}>{form.customerName}</Text>
              {!!form.phone && <Text style={{ color: "#64748b", fontSize: 12 }}>{form.phone}</Text>}
            </View>
            <Pressable onPress={() => setForm((p) => ({ ...p, customerId: "", customerName: "", phone: "" }))} hitSlop={8}>
              <Ionicons name="close" size={14} color="#ef4444" />
            </Pressable>
          </View>
        )}
        <Text style={s.label}>Customer Name *</Text>
        <TextField value={form.customerName} onChangeText={(v) => setForm((p) => ({ ...p, customerName: v }))} placeholder="Customer name" />
        <Text style={s.label}>Phone Number</Text>
        <TextField value={form.phone} onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))} placeholder="+255..." keyboardType="phone-pad" />
        <Text style={s.label}>Amount (TZS) *</Text>
        <TextField value={form.amount} onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))} placeholder="0" keyboardType="numeric" inputStyle={{ fontSize: 16, fontWeight: "700" }} />
        <Text style={s.label}>Purpose</Text>
        <SelectField value={form.purpose} onChange={(v) => setForm((p) => ({ ...p, purpose: v }))} options={[
          { value: "", label: "Select purpose..." },
          { value: "Debt Payment", label: "Debt Payment" },
          { value: "Advance Payment", label: "Advance Payment" },
          { value: "Deposit", label: "Deposit" },
          { value: "Partial Payment", label: "Partial Payment" },
          { value: "Full Settlement", label: "Full Settlement" },
          { value: "Other", label: "Other" },
        ]} />
        <Text style={s.label}>Notes</Text>
        <TextField value={form.notes} onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))} placeholder="Optional notes..." />
      </View>
    </Modal>
  );
}

function WithdrawModal({ visible, balance, profit, capital, onClose, onSaved }) {
  const [form, setForm] = useState({ platformId: "", accountNumber: "", accountName: "", amount: "", notes: "" });
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  const amount = Number(form.amount) || 0;
  const profitRemaining = Math.max(0, profit - amount);
  const touchesCapital = amount > profit;

  const selectPlatform = (p) => {
    setSelectedPlatform(p);
    setForm((prev) => ({ ...prev, platformId: p.id }));
  };

  const handleSubmit = async () => {
    if (!form.platformId || !form.accountNumber || !form.amount) {
      setMsg("Platform, account, and amount required"); setTimeout(() => setMsg(""), 2000); return;
    }
    if (Number(form.amount) > balance) {
      setMsg("Insufficient balance"); setTimeout(() => setMsg(""), 2000); return;
    }
    if (touchesCapital && !(await confirmDialog(
      `WARNING: You have TZS ${(profit || 0).toLocaleString()} profit. This withdrawal exceeds your profit and will deduct TZS ${Math.max(0, amount - (profit || 0)).toLocaleString()} from your CAPITAL (TZS ${(capital || 0).toLocaleString()}). Continue?`
    ))) return;
    setSending(true);
    try {
      await api.post("/pocket/withdrawals", {
        platformId: form.platformId,
        platformName: selectedPlatform?.name || "",
        accountNumber: form.accountNumber,
        accountName: form.accountName,
        amount: Number(form.amount),
        notes: form.notes,
        withdrawnBy: localStorage.getItem("shop_username") || "Staff",
      });
      setMsg("Withdrawal recorded!");
      setTimeout(() => onSaved(), 1000);
    } catch { setMsg("Failed to record"); }
    finally { setSending(false); }
  };

  return (
    <Modal visible={visible} onClose={onClose}
      actions={[
        <Button key="c" title="Cancel" variant="ghost" onPress={onClose} />,
        <Button key="s" title={sending ? "Processing..." : `Withdraw to ${selectedPlatform?.name || "Platform"}`} icon={<Ionicons name="send-outline" size={14} color="#fff" />} variant="primary" loading={sending} disabled={sending} onPress={handleSubmit} />,
      ]}>
      <View style={s.formCol}>
        <View style={[s.infoBox, { backgroundColor: "#eff6ff" }]}>
          <Text style={{ color: "#64748b", fontSize: 12 }}>Available Balance</Text>
          <Text style={{ fontWeight: "700", color: "#2563eb", fontSize: 12 }}>TZS {balance.toLocaleString()}</Text>
        </View>
        <View style={[s.infoBox, { backgroundColor: "#f0fdf4" }]}>
          <Text style={{ color: "#166534", fontSize: 12 }}>Available Profit</Text>
          <Text style={{ fontWeight: "700", color: "#16a34a", fontSize: 12 }}>TZS {(profit || 0).toLocaleString()}</Text>
        </View>
        {touchesCapital && amount > 0 && (
          <View style={s.warnBox}>
            <Text style={{ fontWeight: "700", fontSize: 12 }}>Capital warning!</Text>
            <Text style={{ fontSize: 12 }}>
              {"\u26A0\uFE0F "}Profit is {profit <= 0 ? "finished" : `low (TZS ${(profit || 0).toLocaleString()})`}. Withdrawing TZS {amount.toLocaleString()} will deduct TZS {Math.max(0, amount - (profit || 0)).toLocaleString()} from your capital presence. Profit left after withdrawal: TZS {profitRemaining.toLocaleString()}.
            </Text>
          </View>
        )}
        {!!msg && (
          <View style={[s.msgBar, msg.includes("Failed") || msg.includes("Insufficient") ? s.msgBarError : s.msgBarSuccess]}>
            <Text style={[s.msgText, { color: msg.includes("Failed") || msg.includes("Insufficient") ? "#991b1b" : "#166534" }]}>{msg}</Text>
          </View>
        )}
        <Text style={s.label}>Select Platform</Text>
        <View style={s.platformGrid}>
          {PLATFORMS.filter((p) => p.type !== "cash").map((p) => {
            const active = form.platformId === p.id;
            return (
              <Pressable key={p.id} onPress={() => selectPlatform(p)} style={[s.platformTile, { borderColor: active ? p.color : "#e2e8f0", backgroundColor: active ? p.bg : "#fff" }]}>
                <Ionicons name={p.icon} size={18} color={p.color} />
                <Text style={{ fontSize: 9, fontWeight: "600", color: p.color, textAlign: "center" }}>{p.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={s.label}>Account/Phone Number *</Text>
        <TextField value={form.accountNumber} onChangeText={(v) => setForm((p) => ({ ...p, accountNumber: v }))} placeholder={selectedPlatform?.type === "bank" ? "Account number..." : "Phone number..."} keyboardType={selectedPlatform?.type === "bank" ? "number-pad" : "phone-pad"} />
        <Text style={s.label}>Account Holder Name</Text>
        <TextField value={form.accountName} onChangeText={(v) => setForm((p) => ({ ...p, accountName: v }))} placeholder="Name on account" />
        <Text style={s.label}>Amount (TZS) *</Text>
        <TextField value={form.amount} onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))} placeholder="0" keyboardType="numeric" inputStyle={{ fontSize: 16, fontWeight: "700" }} />
        <Text style={s.label}>Notes</Text>
        <TextField value={form.notes} onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))} placeholder="Optional notes..." />
      </View>
    </Modal>
  );
}

function CapitalModal({ visible, onAdd, onClose, onSaved }) {
  const [form, setForm] = useState({ amount: "", notes: "", source: "cash" });
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!form.amount || Number(form.amount) <= 0) { setMsg("Enter a valid amount"); setTimeout(() => setMsg(""), 2000); return; }
    setSending(true);
    try {
      await onAdd({
        amount: Number(form.amount),
        source: form.source,
        notes: form.notes,
        addedBy: localStorage.getItem("shop_username") || "Staff",
      });
      setMsg("Capital added!");
      setTimeout(() => onSaved(), 1000);
    } catch { setMsg("Failed to add capital"); }
    finally { setSending(false); }
  };

  return (
    <Modal visible={visible} onClose={onClose}
      actions={[
        <Button key="c" title="Cancel" variant="ghost" onPress={onClose} />,
        <Button key="s" title={sending ? "Adding..." : "Add Capital"} icon={<Ionicons name="add" size={14} color="#fff" />} loading={sending} disabled={sending} style={{ backgroundColor: "#b45309" }} onPress={handleSubmit} />,
      ]}>
      {!!msg && (
        <View style={[s.msgBar, msg.includes("Failed") ? s.msgBarError : s.msgBarSuccess]}>
          <Text style={[s.msgText, { color: msg.includes("Failed") ? "#991b1b" : "#166534" }]}>{msg}</Text>
        </View>
      )}
      <View style={s.formCol}>
        <Text style={s.label}>Amount (TZS) *</Text>
        <TextField value={form.amount} onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))} placeholder="0" keyboardType="numeric" inputStyle={{ fontSize: 16, fontWeight: "700" }} />
        <Text style={s.label}>Source</Text>
        <SelectField value={form.source} onChange={(v) => setForm((p) => ({ ...p, source: v }))} options={[
          { value: "cash", label: "Cash" },
          { value: "bank", label: "Bank" },
          { value: "mobile", label: "Mobile Money" },
          { value: "loan", label: "Loan" },
          { value: "other", label: "Other" },
        ]} />
        <Text style={s.label}>Notes</Text>
        <TextField value={form.notes} onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))} placeholder="Optional notes..." />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", height: 400 },
  root: { flex: 1, backgroundColor: colors.slate50, padding: spacing.sm, gap: spacing.sm },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.sm, flexShrink: 0 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.slate900 },
  headerSub: { color: "#94a3b8", fontSize: 12 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },

  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, flexShrink: 0 },
  statCard: { flexBasis: "46%", flexGrow: 1, borderRadius: radius.md, borderWidth: 1, borderTopWidth: 3, borderColor: "#e2e8f0", padding: spacing.md },
  statLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  statValue: { fontSize: 18, fontWeight: "700", marginTop: 2 },
  statSub: { fontSize: 10, color: "#94a3b8", fontWeight: "500", marginTop: 2 },

  filterRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap", flexShrink: 0 },
  filterGroup: { flexDirection: "row", gap: 2, backgroundColor: "#f1f5f9", padding: 2, borderRadius: radius.sm, alignSelf: "flex-start" },
  filterChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: radius.sm },
  filterChipActive: { backgroundColor: colors.white },
  filterChipText: { fontSize: 11, fontWeight: "600" },

  tableCard: { flex: 1, minHeight: 0, overflow: "hidden" },
  tableInner: { minWidth: 900 },
  trHead: { flexDirection: "row", backgroundColor: "#f8fafc", borderBottomWidth: 2, borderBottomColor: "#e2e8f0", alignItems: "center" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", alignItems: "center" },
  th: { fontSize: 10, fontWeight: "700", color: colors.slate500, textTransform: "uppercase", letterSpacing: 0.4, paddingVertical: 8, paddingHorizontal: 8 },
  thPressable: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 8, paddingHorizontal: 8 },
  td: { paddingVertical: 8, paddingHorizontal: 8 },
  colCheck: { width: 36, alignItems: "center", justifyContent: "center" },
  colType: { width: 110 },
  colSource: { width: 100 },
  colDesc: { flex: 1, minWidth: 200 },
  colAmount: { width: 130, minWidth: 130, textAlign: "right" },
  colStatus: { width: 110 },
  colPlatform: { width: 110 },
  colDate: { width: 100 },
  colActions: { width: 60, textAlign: "center" },
  descText: { color: colors.slate700 },
  actBtn: { alignItems: "center", justifyContent: "center" },

  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 99, alignSelf: "flex-start" },
  badgeText: { fontSize: 10, fontWeight: "600" },

  emptyRow: { paddingVertical: 40, alignItems: "center" },
  emptyText: { color: colors.slate400, fontSize: font.sm },

  formCol: { gap: spacing.md },
  label: { fontSize: 11, fontWeight: "700", color: colors.slate500, textTransform: "uppercase", marginTop: 2 },
  searchList: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: radius.sm, maxHeight: 120 },
  searchItem: { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  selectedCust: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: radius.sm, padding: spacing.md, flexDirection: "row", alignItems: "center" },
  msgBar: { padding: spacing.sm, borderRadius: radius.sm },
  msgBarSuccess: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  msgBarError: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca" },
  msgText: { fontSize: 11 },

  infoBox: { borderRadius: radius.sm, padding: spacing.md, flexDirection: "row", justifyContent: "space-between" },
  warnBox: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: radius.sm, padding: spacing.md, gap: 4 },

  platformGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  platformTile: { flexBasis: "23%", flexGrow: 1, alignItems: "center", gap: 4, paddingVertical: 10, paddingHorizontal: 4, borderWidth: 2, borderRadius: radius.md },
});