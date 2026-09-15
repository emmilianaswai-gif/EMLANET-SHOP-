import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { getSaleRemainingDebt, isFullyPaidDebtSale, isOutstandingDebtSale } from "../utils/debtUtils";
import { useUndo } from "../UndoContext";
import { useLanguage } from "../i18n";
import { TextField, Button, SelectField, Modal } from "../components/ui";
import { confirmDialog } from "../utils/confirm";
import { exportPdf } from "../utils/export";
import { colors, spacing, shadow, radius } from "../theme";

const role = () => localStorage.getItem("shop_role") || "customer";
const isStaff = () => ["admin", "manager", "employee", "cashier", "clerk"].includes(role());

const CUSTOMER_TYPES = [
  { value: "regular", label: "Regular", color: "#2563eb", bg: "#eff6ff", icon: "person-outline" },
  { value: "wholesale", label: "Wholesale", color: "#7c3aed", bg: "#ede9fe", icon: "cart-outline" },
  { value: "vip", label: "VIP", color: "#f59e0b", bg: "#fef3c7", icon: "shield-outline" },
];

const init = { name: "", phone: "", email: "", type: "regular" };

export default function Customer() {
  useLanguage();
  const { notifyUndo } = useUndo() || {};
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [form, setForm] = useState(init);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [msg, setMsg] = useState("");
  const [smsMsg, setSmsMsg] = useState("");
  const [smsTarget, setSmsTarget] = useState(null);
  const [sending, setSending] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [sortF, setSortF] = useState("name");
  const [sortD, setSortD] = useState("asc");
  const [editingName, setEditingName] = useState(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [viewHistory, setViewHistory] = useState(null);
  const [expandedDebt, setExpandedDebt] = useState({});
  const [debtSearch, setDebtSearch] = useState("");
  const [mainTab, setMainTab] = useState("outstanding");
  const [itemsPage, setItemsPage] = useState(1);
  const [outPage, setOutPage] = useState(1);
  const ITEMS_PAGE_SIZE = 10;
  const OUT_PAGE_SIZE = 10;

  useEffect(() => {
    Promise.all([
      api.get("/customers").catch(() => ({ data: [] })),
      api.get("/sales").catch(() => ({ data: [] })),
    ]).then(([cr, sr]) => {
      setCustomers(Array.isArray(cr.data) ? cr.data : []);
      setSales(Array.isArray(sr.data) ? sr.data : []);
    }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { setItemsPage(1); }, [search, filter, sortF, sortD]);
  useEffect(() => { setOutPage(1); }, [debtSearch]);

  const reload = async () => {
    const [cr, sr] = await Promise.all([
      api.get("/customers").catch(() => ({ data: [] })),
      api.get("/sales").catch(() => ({ data: [] })),
    ]);
    setCustomers(Array.isArray(cr.data) ? cr.data : []);
    setSales(Array.isArray(sr.data) ? sr.data : []);
  };

  const getCustomerSales = (custId) => sales.filter((s) => String(s.customer?.id) === String(custId));
  const getCustomerTotalSpent = (custId) => getCustomerSales(custId).reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
  const getCustomerSaleCount = (custId) => getCustomerSales(custId).length;
  const isSaleDebt = (s) => s.paymentMethod === "debt" || s.paymentMethod === "DEBT" || s.paymentStatus === "unpaid" || s.paymentStatus === "debt" || s.paymentStatus === "UNPAID";
  const getCustomerDebtTotal = (custId) => getCustomerSales(custId).reduce((sum, s) => sum + getSaleRemainingDebt(s), 0);
  const getCustomerPaidTotal = (custId) => getCustomerSales(custId).filter((s) => isSaleDebt(s)).reduce((sum, s) => sum + (Number(s.paidAmount) || 0), 0);

  const exportCustomerPdf = (c) => {
    const moneyFmt = (v) => `TZS ${(Number(v) || 0).toLocaleString()}`;
    const cSales = getCustomerSales(c.id);
    const totalSpent = getCustomerTotalSpent(c.id);
    const totalPaid = getCustomerPaidTotal(c.id);
    const debt = getCustomerDebtTotal(c.id);
    const rows = cSales.map((s) => {
      const sPaid = Number(s.paidAmount) || 0;
      const grand = Number(s.grandTotal) || 0;
      const remaining = Math.max(0, grand - sPaid);
      const debtSale = isSaleDebt(s);
      return [
        s.saleDate ? new Date(s.saleDate).toLocaleDateString() : "—",
        s.description || `Sale #${s.id}`,
        debtSale ? (isFullyPaidDebtSale(s) ? "PAID" : "UNPAID") : "PAID",
        moneyFmt(grand),
        debtSale ? moneyFmt(sPaid) : moneyFmt(grand),
        debtSale ? moneyFmt(remaining) : "—",
      ];
    });
    exportPdf({
      title: "Customer Payment Statement",
      filename: `customer-${(c.name || "customer").replace(/\s+/g, "-")}-statement-${new Date().toISOString().slice(0, 10)}.pdf`,
      columns: ["Date", "Description", "Payment", "Total", "Paid", "Remaining"],
      rows,
      footerNote: [
        `${c.name || ""}${c.phone ? ` — ${c.phone}` : ""}  ·  Generated: ${new Date().toLocaleString()}`,
        `Summary — Supposed to Pay (Total Billed): ${moneyFmt(totalSpent)}  ·  Total Paid: ${moneyFmt(totalPaid)}  ·  Remaining Balance: ${moneyFmt(debt)}  ·  Total Sales: ${String(cSales.length)}`,
      ].join("  ·  "),
    });
  };

  const [collectSale, setCollectSale] = useState(null);
  const [collectAmount, setCollectAmount] = useState("");

  const openCollect = (sale) => {
    setCollectSale(sale);
    const remaining = Math.max(0, (Number(sale.grandTotal) || 0) - (Number(sale.paidAmount) || 0));
    setCollectAmount(String(remaining));
  };

  const payDebt = (saleId) => {
    const sale = sales.find((s) => s.id === saleId);
    if (sale) openCollect(sale);
  };

  const submitCollection = async () => {
    if (!collectSale) return;
    const payAmt = Number(collectAmount) || 0;
    const debtAmt = Number(collectSale.grandTotal) || 0;
    const alreadyPaid = Number(collectSale.paidAmount) || 0;
    if (payAmt <= 0) { setMsg("Enter a valid amount"); setTimeout(() => setMsg(""), 2000); return; }
    try {
      const newPaid = alreadyPaid + payAmt;
      const remaining = Math.max(0, debtAmt - newPaid);
      const isFullyPaid = newPaid >= debtAmt;
      await api.put(`/sales/${collectSale.id}`, {
        paidAmount: newPaid,
        paymentStatus: isFullyPaid ? "PAID" : collectSale.paymentStatus,
      });
      const productNames = (collectSale.saleItems || [])
        .map((si) => si.product?.name || si.productName || "")
        .filter(Boolean);
      await api.post("/payments", {
        amount: payAmt,
        paymentMethod: "CASH",
        status: "COMPLETED",
        notes: productNames.length ? `Debt payment for: ${productNames.join(", ")}` : "Debt payment",
        sale: { id: collectSale.id },
      }).catch(() => {});
      await reload();
      setCollectSale(null);
      setCollectAmount("");
      setMsg(isFullyPaid ? "Debt fully collected!" : `TZS ${payAmt.toLocaleString()} collected — TZS ${remaining.toLocaleString()} remaining`);
      setTimeout(() => setMsg(""), 2000);
    } catch { setMsg("Failed to process payment"); setTimeout(() => setMsg(""), 2000); }
  };

  const setField = (field) => (value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async () => {
    try {
      const payload = { ...form, amount: 0, paid: 0, paymentMethod: "cash", address: "", notes: "", product: "" };
      if (editingId) await api.put(`/customers/${editingId}`, payload);
      else await api.post("/customers", payload);
      setForm(init); setEditingId(null); setShowPanel(false);
      await reload();
      setMsg(editingId ? "Customer updated!" : "Customer added!");
      setTimeout(() => setMsg(""), 2000);
    } catch { setMsg("Failed to save"); setTimeout(() => setMsg(""), 2000); }
  };

  const openAddPanel = () => {
    setEditingId(null);
    setForm(init);
    setShowPanel(true);
  };

  const editCustomer = (c) => {
    setEditingId(c.id);
    setForm({ name: c.name || "", phone: c.phone || "", email: c.email || "", type: c.type || "regular" });
    setShowPanel(true);
  };

  const deleteCustomer = async (id) => {
    if (!(await confirmDialog("Delete this customer?", "", { destructive: true }))) return;
    const cust = customers.find((c) => c.id === id);
    await api.delete(`/customers/${id}`);
    await reload();
    notifyUndo?.(`Customer deleted${cust?.name ? `: ${cust.name}` : ""}`, () => restoreCustomers(cust ? [cust] : []));
  };

  const restoreCustomers = async (list) => {
    for (const c of list) {
      await api.post("/customers", {
        name: c.name, phone: c.phone || "", email: c.email || "", type: c.type || "regular",
        amount: 0, paid: 0, paymentMethod: "cash", address: "", notes: "", product: "",
      }).catch(() => {});
    }
    await reload();
    if (notifyUndo) notifyUndo(`Restored ${list.length} customer(s)`, () => {}, { timeout: 2500, undo: false });
  };

  const saveInlineName = async (c) => {
    if (!editNameValue.trim() || editNameValue.trim() === c.name) { setEditingName(null); return; }
    try {
      await api.put(`/customers/${c.id}`, { ...c, name: editNameValue.trim() });
      setEditingName(null);
      await reload();
    } catch { setMsg("Failed to rename"); setTimeout(() => setMsg(""), 2000); }
  };

  const sendSMS = async () => {
    if (!smsTarget || !smsMsg.trim()) return;
    setSending(true);
    try {
      await api.post("/messages", {
        phone: smsTarget.phone,
        message: smsMsg,
        customerId: smsTarget.id,
        senderName: localStorage.getItem("shop_username") || "Shop",
      });
      setSmsMsg("");
      setSmsTarget(null);
      setMsg("SMS sent!");
      setTimeout(() => setMsg(""), 2000);
    } catch { setMsg("SMS failed"); }
    finally { setSending(false); }
  };

  const debtCustomerCount = useMemo(() => customers.filter((c) => getCustomerDebtTotal(c.id) > 0).length, [customers, sales]);

  const stats = {
    all: customers.length,
    regular: customers.filter((c) => c.type === "regular").length,
    wholesale: customers.filter((c) => c.type === "wholesale").length,
    vip: customers.filter((c) => c.type === "vip").length,
    debt: debtCustomerCount,
    totalSpent: sales.filter((s) => !isOutstandingDebtSale(s)).reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0),
    totalDebt: sales.reduce((sum, s) => sum + getSaleRemainingDebt(s), 0),
  };

  let items = [...customers];
  if (search) { const s = search.toLowerCase(); items = items.filter((c) => c.name?.toLowerCase().includes(s) || c.phone?.includes(s) || c.email?.toLowerCase().includes(s)); }
  if (filter === "debt") items = items.filter((c) => getCustomerDebtTotal(c.id) > 0);
  else if (filter !== "all") items = items.filter((c) => c.type === filter);
  items.sort((a, b) => {
    let va, vb;
    if (sortF === "spent") { va = getCustomerTotalSpent(a.id); vb = getCustomerTotalSpent(b.id); }
    else if (sortF === "sales") { va = getCustomerSaleCount(a.id); vb = getCustomerSaleCount(b.id); }
    else if (sortF === "debt") { va = getCustomerDebtTotal(a.id); vb = getCustomerDebtTotal(b.id); }
    else { va = (a.name || "").toLowerCase(); vb = (b.name || "").toLowerCase(); }
    return typeof va === "string" ? (sortD === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)) : (sortD === "asc" ? va - vb : vb - va);
  });
  const itemsTotalPages = Math.ceil(items.length / ITEMS_PAGE_SIZE);
  const paginatedItems = items.slice((itemsPage - 1) * ITEMS_PAGE_SIZE, itemsPage * ITEMS_PAGE_SIZE);

  const bulk = useBulkSelect(items, (c) => c.id);

  const deleteSelectedCustomers = async () => {
    if (bulk.selected.length === 0) return;
    if (!(await confirmDialog(`Delete ${bulk.selected.length} selected customer(s)?`, "", { destructive: true }))) return;
    setMsg("");
    const deleted = bulk.selected.map((id) => customers.find((c) => c.id === id)).filter(Boolean);
    try {
      for (const id of bulk.selected) await api.delete(`/customers/${id}`);
      await reload();
      bulk.clear();
      setMsg("Customers deleted!");
      setTimeout(() => setMsg(""), 2000);
      notifyUndo?.(`${deleted.length} customer(s) deleted`, () => restoreCustomers(deleted));
    } catch { setMsg("Failed to delete"); setTimeout(() => setMsg(""), 2000); }
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <Spinner size={28} text="Loading customers..." />
      </View>
    );
  }

  const toggleSort = (f) => {
    if (sortF === f) setSortD((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortF(f); setSortD("asc"); }
  };

  const statCards = [
    { label: "Total Customers", value: stats.all, icon: "people-outline", color: "#2563eb", bg: "#eff6ff" },
    { label: "Total Spent", value: stats.totalSpent.toLocaleString(), icon: "cash-outline", color: "#059669", bg: "#ecfdf5" },
    { label: "Outstanding Debt", value: stats.totalDebt.toLocaleString(), icon: "alert-circle-outline", color: "#dc2626", bg: "#fef2f2" },
    { label: "Debt Customers", value: stats.debt, icon: "warning-outline", color: "#d97706", bg: "#fffbeb" },
  ];

  const mainTabs = [
    { key: "outstanding", label: "Outstanding", count: stats.debt },
    { key: "all", label: "All Customers", count: stats.all },
  ];

  const filterTabs = [
    { key: "all", label: "All", count: stats.all },
    { key: "regular", label: "Regular", count: stats.regular },
    { key: "wholesale", label: "Wholesale", count: stats.wholesale },
    { key: "vip", label: "VIP", count: stats.vip },
    { key: "debt", label: "In Debt", count: stats.debt },
  ];

  const headerCells = bulk.mode
    ? [
        { key: "check", label: <View style={styles.checkHead}><Text>{"\u2713"}</Text></View>, width: 32, onPress: () => bulk.toggleAll(), sortable: false },
        { key: "name", label: "Name", width: 190, onPress: () => toggleSort("name") },
        { key: "type", label: "Type", width: 110, onPress: () => null, sortable: false },
        { key: "contact", label: "Contact", width: 200, onPress: () => null, sortable: false },
        { key: "purchases", label: "Purchases", width: 90, onPress: () => toggleSort("sales") },
        { key: "amount", label: "Total Spent", width: 130, onPress: () => toggleSort("spent") },
        { key: "debt", label: "Debt", width: 120, onPress: () => toggleSort("debt") },
        { key: "actions", label: "", width: 150, onPress: () => null, sortable: false },
      ]
    : [
        { key: "name", label: "Name", width: 190, onPress: () => toggleSort("name") },
        { key: "type", label: "Type", width: 110, onPress: () => null, sortable: false },
        { key: "contact", label: "Contact", width: 200, onPress: () => null, sortable: false },
        { key: "purchases", label: "Purchases", width: 90, onPress: () => toggleSort("sales") },
        { key: "amount", label: "Total Spent", width: 130, onPress: () => toggleSort("spent") },
        { key: "debt", label: "Debt", width: 120, onPress: () => toggleSort("debt") },
        { key: "actions", label: "", width: 150, onPress: () => null, sortable: false },
      ];

  const renderHeaderCell = (cell) => (
    <Pressable
      key={cell.key}
      onPress={cell.sortable === false ? cell.onPress : () => toggleSort(cell.key)}
      style={[styles.th, { width: cell.width }]}
    >
      <Text style={styles.thText}>{cell.label}</Text>
      {["name", "type", "contact", "purchases", "amount", "debt"].includes(cell.key) && (
        <Ionicons
          name={sortF === cell.key ? (sortD === "asc" ? "arrow-up" : "arrow-down") : "chevron-forward"}
          size={11}
          color={sortF === cell.key ? "#2563eb" : "#94a3b8"}
          style={styles.sortIcon}
        />
      )}
    </Pressable>
  );

  const renderPagination = (page, setPage, totalPages, itemCount) => {
    const start = itemCount === 0 ? 0 : (page - 1) * ITEMS_PAGE_SIZE + 1;
    const end = Math.min(page * ITEMS_PAGE_SIZE, itemCount);
    return (
      <View style={styles.pagination}>
        <Text style={styles.pageInfo}>
          Showing {start}–{end} of {itemCount}
        </Text>
        <View style={styles.pageNav}>
          <Pressable disabled={page <= 1} onPress={() => setPage((p) => Math.max(1, p - 1))} style={[styles.pageNav, page <= 1 && styles.pageNavDisabled]}>
            <Ionicons name="chevron-back" size={13} color={page <= 1 ? "#cbd5e1" : "#334155"} />
            <Text style={[styles.pageNavText, { color: page <= 1 ? "#cbd5e1" : "#334155" }]}>Prev</Text>
          </Pressable>
          <Text style={styles.pageNum}>{page} / {Math.max(1, totalPages)}</Text>
          <Pressable disabled={page >= totalPages} onPress={() => setPage((p) => Math.min(totalPages, p + 1))} style={[styles.pageNav, page >= totalPages && styles.pageNavDisabled]}>
            <Text style={[styles.pageNavText, { color: page >= totalPages ? "#cbd5e1" : "#334155" }]}>Next</Text>
            <Ionicons name="chevron-forward" size={13} color={page >= totalPages ? "#cbd5e1" : "#334155"} />
          </Pressable>
        </View>
      </View>
    );
  };

  const toggleDebtExpanded = (id) => setExpandedDebt((p) => ({ ...p, [id]: !p[id] }));

  const renderDebtCard = (c) => {
    const cDebt = c.debt || getCustomerDebtTotal(c.id);
    const cSales = getCustomerSales(c.id).filter((s) => isSaleDebt(s) && !isFullyPaidDebtSale(s));
    const paidAmount = getCustomerPaidTotal(c.id);
    const totalBilled = cSales.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
    const paidPct = totalBilled > 0 ? Math.min(100, Math.round((paidAmount / totalBilled) * 100)) : 0;
    const isExpanded = !!expandedDebt[c.id];
    return (
      <View style={styles.debtCard}>
        <View style={styles.debtCardHead}>
          <View style={styles.debtCardInfo}>
            <Text style={styles.debtCardName}>{c.name || "Unnamed"} {c.phone ? <Text style={styles.debtCardPhone}>· {c.phone}</Text> : null}</Text>
            <Text style={styles.debtCardMeta}>{cSales.length} unpaid sale{cSales.length === 1 ? "" : "s"} · TZS {paidAmount.toLocaleString()} paid so far</Text>
          </View>
          <Text style={styles.debtCardAmount}>TZS {cDebt.toLocaleString()}</Text>
          <Pressable onPress={() => toggleDebtExpanded(c.id)} hitSlop={8} style={styles.debtExpandBtn}>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#64748b" />
          </Pressable>
        </View>
        <View style={styles.debtProgressWrap}>
          <View style={styles.debtProgressTrack}>
            <View style={[styles.debtProgressFill, { width: `${paidPct}%`, backgroundColor: paidPct >= 100 ? "#059669" : "#f59e0b" }]} />
          </View>
          <Text style={styles.debtProgressLabel}>{paidPct}% paid</Text>
        </View>
        {isExpanded && (
          <View style={styles.debtSalesBox}>
            <Text style={styles.debtSalesTitle}>Unpaid Purchases</Text>
            {cSales.length === 0 ? (
              <Text style={styles.debtSalesEmpty}>No unpaid purchases</Text>
            ) : (
              cSales.map((s) => {
                const remaining = getSaleRemainingDebt(s);
                return (
                  <View key={s.id} style={styles.debtSaleRow}>
                    <View style={styles.debtSaleMain}>
                      <Text style={styles.debtSaleDesc}>{s.description || `Sale #${s.id}`}</Text>
                      <Text style={styles.debtSaleDate}>{s.saleDate ? new Date(s.saleDate).toLocaleDateString() : "—"} · {s.paymentStatus === "PAID" ? "Paid in full" : "Unpaid"}</Text>
                    </View>
                    <Text style={styles.debtSaleRemaining}>TZS {remaining.toLocaleString()}</Text>
                    <Pressable style={styles.collectBtn} onPress={() => payDebt(s.id)} hitSlop={6}>
                      <Text style={styles.collectBtnText}>Collect</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        )}
      </View>
    );
  };

  const renderOutstanding = () => {
    let debtCustomers = customers
      .map((c) => ({ ...c, debt: getCustomerDebtTotal(c.id) }))
      .filter((c) => c.debt > 0);
    if (debtSearch) {
      const s = debtSearch.toLowerCase();
      debtCustomers = debtCustomers.filter((c) => c.name?.toLowerCase().includes(s) || c.phone?.includes(s));
    }
    const outTotal = debtCustomers.reduce((sum, c) => sum + c.debt, 0);
    const outTotalPages = Math.max(1, Math.ceil(debtCustomers.length / OUT_PAGE_SIZE));
    const pageCustomers = debtCustomers.slice((outPage - 1) * OUT_PAGE_SIZE, outPage * OUT_PAGE_SIZE);
    return (
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionHeadLeft}>
            <Text style={styles.sectionTitle}>Outstanding Debt Customers</Text>
            <Text style={styles.sectionSub}>{debtCustomers.length} customer{debtCustomers.length === 1 ? "" : "s"} owe a total of TZS {outTotal.toLocaleString()}</Text>
          </View>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={14} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search debt customers..."
              placeholderTextColor="#94a3b8"
              value={debtSearch}
              onChangeText={setDebtSearch}
            />
          </View>
        </View>
        {pageCustomers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="ribbon-outline" size={36} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No outstanding debt</Text>
            <Text style={styles.emptySub}>All customer payments are settled</Text>
          </View>
        ) : (
          pageCustomers.map(renderDebtCard)
        )}
        {renderPagination(outPage, setOutPage, outTotalPages, debtCustomers.length)}
      </View>
    );
  };

  const renderCustomerRow = (c) => {
    const debt = getCustomerDebtTotal(c.id);
    const totalSpent = getCustomerTotalSpent(c.id);
    const count = getCustomerSaleCount(c.id);
    const typeDef = CUSTOMER_TYPES.find((t) => t.value === c.type) || CUSTOMER_TYPES[0];
    const selected = bulk.mode && bulk.selected.includes(c.id);
    return (
      <View style={[styles.row, bulk.mode && styles.rowBulk, selected && styles.rowSelected]}>
        {bulk.mode && (
          <Pressable style={styles.checkCell} onPress={() => bulk.toggle(c.id)} hitSlop={6}>
            <View style={[styles.checkBox, selected && styles.checkBoxSel]}>
              {selected ? (
                <Ionicons name="checkmark" size={12} color="#fff" />
              ) : (
                <Text style={styles.checkBoxEmpty}>{"\u2013"}</Text>
              )}
            </View>
          </Pressable>
        )}
        <View style={[styles.nameCell, { width: 190 }]}>
          {editingName === c.id ? (
            <View style={styles.inlineEdit}>
              <TextInput
                autoFocus
                style={styles.inlineInput}
                value={editNameValue}
                onChangeText={setEditNameValue}
                onSubmitEditing={() => saveInlineName(c)}
                returnKeyType="done"
              />
              <Pressable onPress={() => saveInlineName(c)} hitSlop={6}><Ionicons name="checkmark" size={16} color="#059669" /></Pressable>
              <Pressable onPress={() => setEditingName(null)} hitSlop={6}><Ionicons name="close" size={16} color="#94a3b8" /></Pressable>
            </View>
          ) : (
            <View style={styles.nameWrap}>
              <View style={[styles.avatar, { backgroundColor: typeDef.bg }]}>
                <Ionicons name={typeDef.icon} size={13} color={typeDef.color} />
              </View>
              <View style={styles.nameMain}>
                <Text style={styles.cellStrong}>{c.name || "Unnamed"}</Text>
                {isStaff() && (
                  <Text style={styles.cellLink} onPress={() => { setEditingName(c.id); setEditNameValue(c.name || ""); }}>
                    rename
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
        <View style={{ width: 110, alignItems: "center" }}>
          <View style={[styles.typeBadge, { backgroundColor: typeDef.bg }]}>
            <Text style={[styles.typeBadgeText, { color: typeDef.color }]}>{typeDef.label}</Text>
          </View>
        </View>
        <View style={[styles.cell, { width: 200 }]}>
          <Text style={styles.cellText} numberOfLines={1}>
            {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
          </Text>
        </View>
        <View style={{ width: 90, alignItems: "center" }}>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{count}</Text>
          </View>
        </View>
        <View style={[styles.cell, { width: 130 }]}>
          <Text style={[styles.cellStrong, { color: "#334155" }]}>TZS {totalSpent.toLocaleString()}</Text>
        </View>
        <View style={[styles.cell, { width: 120 }]}>
          {debt > 0 ? (
            <View style={styles.debtBadge}>
              <Text style={styles.debtBadgeText}>TZS {debt.toLocaleString()}</Text>
            </View>
          ) : (
            <Text style={styles.settledText}>Settled</Text>
          )}
        </View>
        <View style={[styles.actionsCell, { width: 150 }]}>
          {isStaff() && (
            <Pressable
              style={styles.iconBtn}
              onPress={() => {
                const ds = getCustomerSales(c.id).filter((s) => isSaleDebt(s) && !isFullyPaidDebtSale(s));
                if (ds.length) openCollect(ds[0]);
              }}
              hitSlop={6}
            >
              <Ionicons name="wallet-outline" size={13} color="#059669" />
            </Pressable>
          )}
          <Pressable style={styles.iconBtn} onPress={() => exportCustomerPdf(c)} hitSlop={6}>
            <Ionicons name="download-outline" size={13} color="#2563eb" />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => setViewHistory(c)} hitSlop={6}>
            <Ionicons name="receipt-outline" size={13} color="#7c3aed" />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => editCustomer(c)} hitSlop={6}>
            <Ionicons name="pencil-outline" size={13} color="#d97706" />
          </Pressable>
          {isStaff() && (
            <Pressable style={styles.iconBtnDanger} onPress={() => deleteCustomer(c.id)} hitSlop={6}>
              <Ionicons name="trash-outline" size={13} color="#dc2626" />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Customers</Text>
          <Text style={styles.subtitle}>Manage customers, view purchase history, and track outstanding debts</Text>
        </View>
        <View style={styles.headerRight}>
          {!bulk.mode && isStaff() && (
            <Button title="+ Add Customer" variant="primary" onPress={openAddPanel} />
          )}
        </View>
      </View>

      {msg ? (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={16} color="#059669" />
          <Text style={styles.successText}>{msg}</Text>
        </View>
      ) : null}

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        <View style={styles.statGrid}>
          {statCards.map((s) => (
            <View key={s.label} style={[styles.statCard, shadow.card]}>
              <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={15} color={s.color} />
              </View>
              <View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.mainTabs}>
          {mainTabs.map((tab) => (
            <Pressable key={tab.key} onPress={() => setMainTab(tab.key)} style={[styles.mainTab, mainTab === tab.key && styles.mainTabActive]}>
              <Text style={[styles.mainTabText, mainTab === tab.key && styles.mainTabTextActive]}>{tab.label}</Text>
              <View style={[styles.mainTabCount, mainTab === tab.key && styles.mainTabCountActive]}>
                <Text style={[styles.mainTabCountText, mainTab === tab.key && styles.mainTabCountTextActive]}>{tab.count}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {mainTab === "outstanding" ? (
          renderOutstanding()
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionHeadLeft}>
                <Text style={styles.sectionTitle}>All Customers</Text>
                <Text style={styles.sectionSub}>Manage customer profiles and their activity</Text>
              </View>
              <View style={styles.filterTabs}>
                {filterTabs.map((tab) => (
                  <Pressable key={tab.key} onPress={() => setFilter(tab.key)} style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}>
                    <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>{tab.label} ({tab.count})</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.toolbar}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={14} color="#94a3b8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search customers..."
                  placeholderTextColor="#94a3b8"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <View style={styles.sortToggle}>
                <Text style={styles.sortLabel}>Sort</Text>
                <SelectField
                  value={sortF}
                  onChange={(v) => { setSortF(v); setItemsPage(1); }}
                  options={[
                    { label: "Name", value: "name" },
                    { label: "Total Spent", value: "spent" },
                    { label: "Sales Count", value: "sales" },
                    { label: "Outstanding Debt", value: "debt" },
                  ]}
                  containerStyle={{ width: 150 }}
                />
                <Pressable onPress={() => toggleSort(sortF)} style={styles.sortDirBtn} hitSlop={6}>
                  <Ionicons name={sortD === "asc" ? "arrow-up" : "arrow-down"} size={14} color="#334155" />
                </Pressable>
              </View>
            </View>

            {bulk.selected.length > 0 && (
              <View style={styles.bulkWrap}>
                <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected} onSelectAll={() => bulk.toggleAll()} onDelete={deleteSelectedCustomers} deleteLabel="Customers" />
              </View>
            )}
            <Pressable onPress={() => bulk.toggleAll()} style={styles.selectToggle}>
              <Text style={styles.selectToggleText}>{bulk.mode ? "Done" : "Select"}</Text>
            </Pressable>

            {items.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="people-outline" size={36} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No customers found</Text>
                <Text style={styles.emptySub}>Try adjusting your search or filters</Text>
              </View>
            ) : (
              <View style={styles.tableCard}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ minWidth: bulk.mode ? 932 : 900 }}>
                    <View style={styles.thead}>
                      {headerCells.map(renderHeaderCell)}
                    </View>
                    <View>
                      {paginatedItems.map(renderCustomerRow)}
                    </View>
                  </View>
                </ScrollView>
              </View>
            )}
            {items.length > 0 && renderPagination(itemsPage, setItemsPage, itemsTotalPages, items.length)}
          </View>
        )}
      </ScrollView>

      <Modal visible={showPanel} onClose={() => setShowPanel(false)} title={editingId ? "Edit Customer" : "Add Customer"}>
        <TextField label="Name *" value={form.name} onChangeText={setField("name")} placeholder="Full name" />
        <View style={styles.formRow}>
          <View style={styles.formCol}>
            <TextField label="Phone" value={form.phone} onChangeText={setField("phone")} placeholder="Phone number" keyboardType="phone-pad" />
          </View>
          <View style={styles.formCol}>
            <TextField label="Email" value={form.email} onChangeText={setField("email")} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" />
          </View>
        </View>
        <SelectField
          label="Customer Type"
          value={form.type}
          onChange={(v) => setForm((p) => ({ ...p, type: v }))}
          options={CUSTOMER_TYPES.map((t) => ({ label: t.label, value: t.value }))}
        />
        <View style={styles.formActions}>
          <Button title="Cancel" variant="ghost" onPress={() => setShowPanel(false)} />
          <Button title={editingId ? "Save Changes" : "Add Customer"} variant="primary" onPress={handleSubmit} />
        </View>
      </Modal>

      <Modal visible={!!smsTarget} onClose={() => { setSmsTarget(null); setSmsMsg(""); }} title={`Send SMS${smsTarget?.name ? ` — ${smsTarget.name}` : ""}`}>
        <View style={styles.smsInfo}>
          <Ionicons name="call-outline" size={14} color="#2563eb" />
          <Text style={styles.smsInfoText}>To: {smsTarget?.phone || "—"}</Text>
        </View>
        <TextField
          label="Message"
          value={smsMsg}
          onChangeText={setSmsMsg}
          placeholder="Type your message..."
          multiline
          numberOfLines={5}
        />
        <View style={styles.formActions}>
          <Button title="Cancel" variant="ghost" onPress={() => { setSmsTarget(null); setSmsMsg(""); }} />
          <Button title="Send SMS" variant="primary" onPress={sendSMS} loading={sending} disabled={!smsMsg.trim()} />
        </View>
      </Modal>

      <Modal visible={!!viewHistory} onClose={() => setViewHistory(null)} title={`Purchase History${viewHistory?.name ? ` — ${viewHistory.name}` : ""}`}>
        {viewHistory && (() => {
          const hSales = getCustomerSales(viewHistory.id).slice(0, 10);
          const hDebt = getCustomerDebtTotal(viewHistory.id);
          const hPaid = getCustomerPaidTotal(viewHistory.id);
          const hTotal = getCustomerTotalSpent(viewHistory.id);
          return (
            <View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryValue}>TZS {hTotal.toLocaleString()}</Text>
                  <Text style={styles.summaryLabel}>Total Spent</Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryValue}>TZS {hPaid.toLocaleString()}</Text>
                  <Text style={styles.summaryLabel}>Total Paid</Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={[styles.summaryValue, { color: hDebt > 0 ? "#dc2626" : "#059669" }]}>{hDebt > 0 ? `TZS ${hDebt.toLocaleString()}` : "Settled"}</Text>
                  <Text style={styles.summaryLabel}>Balance</Text>
                </View>
              </View>
              <View style={styles.histTable}>
                <View style={styles.histRowHead}>
                  <Text style={[styles.histCell, styles.histDateCol]}>Date</Text>
                  <Text style={[styles.histCell, styles.histDescCol]}>Description</Text>
                  <Text style={[styles.histCell, styles.histAmtCol]}>Amount</Text>
                  <Text style={[styles.histCell, styles.histPaidCol]}>Paid</Text>
                  <Text style={[styles.histCell, styles.histRemCol]}>Remaining</Text>
                </View>
                {hSales.length === 0 ? (
                  <View style={styles.histEmpty}>
                    <Text style={styles.histEmptyText}>No purchases yet</Text>
                  </View>
                ) : (
                  hSales.map((s) => {
                    const rem = Math.max(0, (Number(s.grandTotal) || 0) - (Number(s.paidAmount) || 0));
                    return (
                      <View key={s.id} style={styles.histRow}>
                        <Text style={[styles.histCell, styles.histDateCol]}>{s.saleDate ? new Date(s.saleDate).toLocaleDateString() : "—"}</Text>
                        <Text style={[styles.histCell, styles.histDescCol]} numberOfLines={1}>{s.description || `Sale #${s.id}`}</Text>
                        <Text style={[styles.histCell, styles.histAmtCol]}>TZS {(Number(s.grandTotal) || 0).toLocaleString()}</Text>
                        <Text style={[styles.histCell, styles.histPaidCol]}>TZS {(Number(s.paidAmount) || 0).toLocaleString()}</Text>
                        <Text style={[styles.histCell, styles.histRemCol, { color: rem > 0 ? "#dc2626" : "#059669" }]}>{rem > 0 ? `TZS ${rem.toLocaleString()}` : "—"}</Text>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          );
        })()}
        <View style={styles.formActions}>
          <Button title="Close" variant="ghost" onPress={() => setViewHistory(null)} />
          <Button title="Export PDF" variant="primary" onPress={() => { if (viewHistory) exportCustomerPdf(viewHistory); }} />
        </View>
      </Modal>

      <Modal visible={!!collectSale} onClose={() => { setCollectSale(null); setCollectAmount(""); }} title="Collect Payment">
        {collectSale && (() => {
          const totalForThis = Number(collectSale.grandTotal) || 0;
          const already = Number(collectSale.paidAmount) || 0;
          const remaining = Math.max(0, totalForThis - already);
          const cur = Number(collectAmount) || 0;
          const prospective = Math.min(totalForThis, already + cur);
          return (
            <View>
              <View style={styles.collectInfoBox}>
                <Text style={styles.collectInfoLabel}>{collectSale.description || `Sale #${collectSale.id}`}</Text>
                <Text style={styles.collectInfoText}>Total {totalForThis.toLocaleString()} · Paid {already.toLocaleString()} · Remaining {remaining.toLocaleString()}</Text>
              </View>
              <TextField
                label="Payment Amount"
                value={collectAmount}
                onChangeText={setCollectAmount}
                placeholder="0"
                keyboardType="numeric"
              />
              <View style={styles.quickRow}>
                {[25, 50, 75, 100].map((pct) => (
                  <Pressable key={pct} style={styles.quickBtn} onPress={() => setCollectAmount(String(Math.round((remaining * pct) / 100)))}>
                    <Text style={styles.quickBtnText}>{pct}%</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.collectSummaryBox}>
                <Text style={styles.collectSummaryText}>Pay {cur.toLocaleString()} ({prospective.toLocaleString()} total) — {Math.max(0, totalForThis - prospective).toLocaleString()} remaining</Text>
              </View>
              <View style={styles.formActions}>
                <Button title="Cancel" variant="ghost" onPress={() => { setCollectSale(null); setCollectAmount(""); }} />
                <Button title="Collect" variant="primary" onPress={submitCollection} disabled={!(Number(collectAmount) > 0)} />
              </View>
            </View>
          );
        })()}
      </Modal>
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
  successBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8, marginHorizontal: spacing.xl, marginBottom: spacing.sm },
  successText: { fontSize: 13, fontWeight: "600", color: "#15803d" },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },

  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { flexDirection: "row", alignItems: "center", gap: 10, flexBasis: "45%", flexGrow: 1, minWidth: 150, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, padding: spacing.md, overflow: "hidden" },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 15, fontWeight: "700", color: colors.slate800 },
  statLabel: { fontSize: 11, color: colors.slate500, marginTop: 2 },

  mainTabs: { flexDirection: "row", gap: 8 },
  mainTab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.lg, backgroundColor: colors.slate200 },
  mainTabActive: { backgroundColor: "#1e293b" },
  mainTabText: { fontSize: 13, fontWeight: "600", color: colors.slate600 },
  mainTabTextActive: { color: "#fff" },
  mainTabCount: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(100,116,139,0.35)", alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  mainTabCountActive: { backgroundColor: "#334155" },
  mainTabCountText: { fontSize: 10, fontWeight: "700", color: colors.slate600 },
  mainTabCountTextActive: { color: "#fff" },

  section: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: spacing.md, flexWrap: "wrap" },
  sectionHeadLeft: { flex: 1, minWidth: 200 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.slate800 },
  sectionSub: { fontSize: 12, color: colors.slate500, marginTop: 2 },

  filterTabs: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  filterTab: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.lg, backgroundColor: colors.slate100, borderWidth: 1, borderColor: "transparent" },
  filterTabActive: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  filterTabText: { fontSize: 12, fontWeight: "500", color: colors.slate600 },
  filterTabTextActive: { color: "#2563eb", fontWeight: "700" },

  toolbar: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" },
  searchBox: { flex: 1, minWidth: 200, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6 },
  searchInput: { flex: 1, fontSize: 13, color: colors.slate800, padding: 0 },
  sortToggle: { flexDirection: "row", alignItems: "center", gap: 6 },
  sortLabel: { fontSize: 12, fontWeight: "600", color: colors.slate500 },
  sortDirBtn: { width: 30, height: 34, borderRadius: radius.md, borderWidth: 1, borderColor: colors.slate200, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  bulkWrap: { marginBottom: 10 },
  selectToggle: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.lg, backgroundColor: colors.slate200, marginBottom: 10 },
  selectToggleText: { fontSize: 12, fontWeight: "700", color: colors.slate600 },

  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.slate700 },
  emptySub: { fontSize: 12, color: colors.slate500 },

  tableCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md, overflow: "hidden" },
  thead: { flexDirection: "row", backgroundColor: colors.slate50, borderBottomWidth: 1, borderBottomColor: colors.slate200 },
  th: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 10 },
  thText: { fontSize: 11, fontWeight: "700", color: colors.slate500, letterSpacing: 0.3, textTransform: "uppercase" },
  sortIcon: { marginLeft: 2 },

  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, flexWrap: "wrap", gap: 8 },
  pageInfo: { fontSize: 12, color: colors.slate500 },
  pageNav: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.md },
  pageNavDisabled: { opacity: 0.6 },
  pageNavText: { fontSize: 12, fontWeight: "600" },
  pageNum: { fontSize: 12, fontWeight: "600", color: colors.slate700 },

  checkCell: { width: 32, alignItems: "center", justifyContent: "center", paddingVertical: 10 },
  checkBox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: colors.slate300, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  checkBoxSel: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  checkBoxEmpty: { fontSize: 12, color: colors.slate400, lineHeight: 16 },
  checkHead: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: colors.slate300, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" },

  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  rowBulk: { backgroundColor: "#f8fafc" },
  rowSelected: { backgroundColor: "#eff6ff" },
  nameCell: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8 },
  inlineEdit: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  inlineInput: { flex: 1, fontSize: 13, color: colors.slate800, borderWidth: 1, borderColor: colors.slate300, borderRadius: radius.md, paddingHorizontal: 8, paddingVertical: 4, marginRight: 4 },
  nameWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  nameMain: { flex: 1 },
  cellStrong: { fontSize: 13, fontWeight: "700", color: colors.slate800 },
  cellLink: { fontSize: 11, color: "#2563eb", fontWeight: "600", marginTop: 2 },
  cell: { paddingHorizontal: 10, paddingVertical: 8, justifyContent: "center" },
  cellText: { fontSize: 12, color: colors.slate600 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.lg },
  typeBadgeText: { fontSize: 11, fontWeight: "700" },
  countBadge: { backgroundColor: colors.slate100, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.lg },
  countBadgeText: { fontSize: 12, fontWeight: "700", color: colors.slate700 },
  debtBadge: { backgroundColor: "#fef2f2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.lg },
  debtBadgeText: { fontSize: 12, fontWeight: "700", color: "#dc2626" },
  settledText: { fontSize: 12, fontWeight: "600", color: "#059669" },
  actionsCell: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8 },
  iconBtn: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.slate100, alignItems: "center", justifyContent: "center" },
  iconBtnDanger: { width: 26, height: 26, borderRadius: 8, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" },

  debtCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, padding: spacing.md, marginBottom: 12, ...shadow.card },
  debtCardHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  debtCardInfo: { flex: 1 },
  debtCardName: { fontSize: 14, fontWeight: "700", color: colors.slate800 },
  debtCardPhone: { fontSize: 12, fontWeight: "400", color: colors.slate500 },
  debtCardMeta: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  debtCardAmount: { fontSize: 16, fontWeight: "800", color: "#dc2626" },
  debtExpandBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.slate100, alignItems: "center", justifyContent: "center" },
  debtProgressWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  debtProgressTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.slate100, overflow: "hidden" },
  debtProgressFill: { height: "100%", borderRadius: 4 },
  debtProgressLabel: { fontSize: 11, fontWeight: "600", color: colors.slate600 },
  debtSalesBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.slate100, paddingTop: 10 },
  debtSalesTitle: { fontSize: 12, fontWeight: "700", color: colors.slate600, marginBottom: 6 },
  debtSalesEmpty: { fontSize: 12, color: colors.slate500, paddingVertical: 8 },
  debtSaleRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.slate200 },
  debtSaleMain: { flex: 1 },
  debtSaleDesc: { fontSize: 12, fontWeight: "600", color: colors.slate700 },
  debtSaleDate: { fontSize: 11, color: colors.slate500, marginTop: 1 },
  debtSaleRemaining: { fontSize: 13, fontWeight: "700", color: "#dc2626" },
  collectBtn: { backgroundColor: "#059669", paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.md },
  collectBtnText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  formRow: { flexDirection: "row", gap: 10 },
  formCol: { flex: 1 },
  formActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 16 },
  smsInfo: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#eff6ff", padding: 10, borderRadius: radius.md, marginBottom: 12 },
  smsInfoText: { fontSize: 13, fontWeight: "600", color: "#2563eb" },

  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  summaryCell: { flex: 1, backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md, padding: 10, alignItems: "center" },
  summaryValue: { fontSize: 14, fontWeight: "700", color: colors.slate800 },
  summaryLabel: { fontSize: 10, color: colors.slate500, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.4 },
  histTable: { borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md, overflow: "hidden" },
  histRowHead: { flexDirection: "row", backgroundColor: colors.slate50, paddingVertical: 8, paddingHorizontal: 8 },
  histRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: colors.slate100 },
  histCell: { fontSize: 11, paddingHorizontal: 6 },
  histDateCol: { width: 90 },
  histDescCol: { flex: 1 },
  histAmtCol: { width: 100, textAlign: "right" },
  histPaidCol: { width: 100, textAlign: "right" },
  histRemCol: { width: 110, textAlign: "right" },
  histEmpty: { paddingVertical: 20, alignItems: "center" },
  histEmptyText: { fontSize: 13, color: colors.slate500 },

  collectInfoBox: { backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a", borderRadius: radius.md, padding: 10, marginBottom: 12 },
  collectInfoLabel: { fontSize: 13, fontWeight: "700", color: colors.slate800, marginBottom: 2 },
  collectInfoText: { fontSize: 12, color: colors.slate600 },
  quickRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  quickBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.slate100, alignItems: "center" },
  quickBtnText: { fontSize: 12, fontWeight: "700", color: colors.slate700 },
  collectSummaryBox: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: radius.md, padding: 10, marginTop: 12 },
  collectSummaryText: { fontSize: 12, fontWeight: "600", color: "#15803d" },
});