import { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import ProductSelector from "../components/ProductSelector";
import { useSystemSettings } from "../SystemSettingsContext";
import { useUndo } from "../UndoContext";
import { Modal, SelectField, Button, Card, QuantityInput, TextField } from "../components/ui";
import { t, useLanguage } from "../i18n";
import { confirmDialog } from "../utils/confirm";
import { colors, font, radius, spacing } from "../theme";

const EXCHANGE_TYPES = [
  { value: "Wrong Purchase", labelKey: "wrongPurchase" },
  { value: "Expired", labelKey: "expiredType" },
  { value: "Destruction", labelKey: "destruction" },
  { value: "Exchange", labelKey: "exchange" },
  { value: "Storage", labelKey: "storage" },
];

const TYPE_COLORS = {
  "Wrong Purchase": { bg: "#fef2f2", c: "#dc2626" },
  "Expired": { bg: "#fff7ed", c: "#ea580c" },
  "Destruction": { bg: "#fef2f2", c: "#991b1b" },
  "Exchange": { bg: "#eff6ff", c: "#2563eb" },
  "Storage": { bg: "#fef3c7", c: "#a16207" },
};

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

export default function ExchangeStoring() {
  useLanguage();
  const { settings } = useSystemSettings();
  const systemLowStock = Number(settings.lowStockThreshold) || 5;
  const { notifyUndo } = useUndo() || {};
  const [records, setRecords] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("exchange");
  const [search, setSearch] = useState("");
  const localCache = useRef([]);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [exchangeType, setExchangeType] = useState("Wrong Purchase");
  const [reason, setReason] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState("Pending");
  const [exchangeDate, setExchangeDate] = useState(() => new Date().toISOString().split("T")[0]);

  const reloadAll = async () => {
    const [er, sr, pr] = await Promise.all([
      api.get("/exchange-storing").catch(() => ({ data: [] })),
      api.get("/stocks").catch(() => ({ data: [] })),
      api.get("/products").catch(() => ({ data: [] })),
    ]);
    let loadedRecords = Array.isArray(er.data) ? er.data : (er.data?.content || er.data?.records || []);
    if (!loadedRecords.length && typeof er.data === "object" && !Array.isArray(er.data)) {
      const vals = Object.values(er.data).filter((v) => Array.isArray(v)).flat();
      if (vals.length) loadedRecords = vals;
    }
    if (loadedRecords.length) {
      localCache.current = loadedRecords;
    } else {
      const cached = localStorage.getItem("exchangeCache");
      if (cached) localCache.current = JSON.parse(cached);
    }
    setRecords(loadedRecords);
    setStocks(Array.isArray(sr.data) ? sr.data : []);
    setProducts(Array.isArray(pr.data) ? pr.data : []);
  };

  useEffect(() => {
    reloadAll().catch(() => {}).finally(() => setLoading(false));
  }, []);

  const reloadStock = () => api.get("/stocks").then(({ data }) => setStocks(Array.isArray(data) ? data : []));

  const displayRecords = records.length > 0 ? records : localCache.current;

  const filteredRecords = (filter === "all" ? displayRecords : displayRecords.filter((r) => (r.type || "").toLowerCase() === filter.toLowerCase()))
    .sort((a, b) => {
      let va, vb;
      if (sortField === "date") { va = a.date || ""; vb = b.date || ""; }
      else if (sortField === "name") { va = a.productName || ""; vb = b.productName || ""; return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va); }
      else if (sortField === "qty") { va = Number(a.quantity || 0); vb = Number(b.quantity || 0); return sortDir === "asc" ? va - vb : vb - va; }
      else { va = a.date || ""; vb = b.date || ""; }
      return sortDir === "asc" ? new Date(va) - new Date(vb) : new Date(vb) - new Date(va);
    });

  const toggleSort = (field) => { if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc"); else { setSortField(field); setSortDir("desc"); } };

  const PAGE_SIZE = 8;
  const [recordsPage, setRecordsPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const currentPage = Math.min(recordsPage, totalPages);
  const pagedRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const bulk = useBulkSelect(filteredRecords, (r) => r.id);

  const PaginationBar = ({ total, page, setPage }) =>
    total <= 1 ? null : (
      <View style={s.pagerRow}>
        <Pressable disabled={page <= 1} onPress={() => setPage((p) => p - 1)} style={[s.pageNav, page <= 1 && s.pageNavDisabled]} hitSlop={4}>
          <Text style={[s.pageNavText, page <= 1 && s.pageNavTextDisabled]}>{t("prev")}</Text>
        </Pressable>
        <Text style={s.pageOf}>{t("pageOf", { page, totalPages: total })}</Text>
        <Pressable disabled={page >= total} onPress={() => setPage((p) => p + 1)} style={[s.pageNav, page >= total && s.pageNavDisabled]} hitSlop={4}>
          <Text style={[s.pageNavText, page >= total && s.pageNavTextDisabled]}>{t("next")}</Text>
        </Pressable>
      </View>
    );

  const fmtD = (d) => { if (!d) return "—"; const dt = new Date(String(d).replace(/\.\d+/, "")); return isNaN(dt) ? "—" : dt.toLocaleDateString(); };
  const fmtT = (d) => { if (!d) return "—"; const dt = new Date(String(d).replace(/\.\d+/, "")); return isNaN(dt) ? "—" : dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); };
  const statusBadge = (st) => {
    if (st === "Approved" || st === "Active") return { bg: "#f0fdf4", c: "#16a34a" };
    if (st === "Rejected") return { bg: "#fef2f2", c: "#dc2626" };
    return { bg: "#fef9c3", c: "#a16207" };
  };

  const getProductName = (s) => {
    const p = products.find((x) => x.id === (s.product?.id || s.productId));
    return p?.name || s.product?.name || "—";
  };

  let filteredStocks = [...stocks];
  if (search) { const s = search.toLowerCase(); filteredStocks = filteredStocks.filter((x) => getProductName(x).toLowerCase().includes(s)); }

  const bulkStock = useBulkSelect(filteredStocks, (s) => s.id);

  const outOfStock = stocks.filter((s) => (Number(s.quantity) || 0) <= 0).length;
  const lowStock = stocks.filter((s) => { const q = Number(s.quantity) || 0; return q > 0 && q <= (s.lowStockThreshold || systemLowStock); }).length;

  const applyStockDeduction = async (pid, qty, type, pname) => {
    try {
      const stockRes = await api.get(`/stocks/product/${pid}`).catch(() => null);
      let stockId, currentQty, threshold, date;
      if (stockRes?.data?.id) {
        stockId = stockRes.data.id;
        currentQty = Number(stockRes.data.quantity) || 0;
        threshold = stockRes.data.lowStockThreshold ?? 0;
        date = stockRes.data.date || "";
      } else {
        const newStock = await api.post("/stocks", {
          product: { id: pid },
          quantity: 0,
          productName: pname,
        }).catch(() => null);
        if (newStock?.data?.id) {
          stockId = newStock.data.id;
          currentQty = 0;
          threshold = 0;
          date = "";
        }
      }
      if (stockId !== undefined) {
        const newQty = Math.max(0, currentQty - Number(qty));
        const stockPayload = { product: { id: pid }, quantity: newQty, changeType: type, productName: pname, lowStockThreshold: threshold };
        if (date) stockPayload.date = date;
        await api.put(`/stocks/${stockId}`, stockPayload);
        const prodRes = await api.get(`/products/${pid}`).catch(() => null);
        if (prodRes?.data) {
          const newProdQty = Math.max(0, (Number(prodRes.data.quantity) || 0) - Number(qty));
          await api.put(`/products/${pid}`, { quantity: newProdQty });
        }
        await api.post("/stock-history", {
          product: { id: pid },
          quantityChange: -Number(qty),
          resultingQuantity: newQty,
          transactionType: type,
        });
      }
    } catch (stockErr) {
      console.error("Stock deduction failed:", stockErr);
    }
  };

  const handleExchangeSubmit = async () => {
    if (!productId) { setMsg({ text: t("selectProduct"), type: "error" }); setTimeout(() => setMsg({ text: "", type: "" }), 2000); return; }
    if (!quantity || Number(quantity) <= 0) { setMsg({ text: t("enterValidQuantity"), type: "error" }); setTimeout(() => setMsg({ text: "", type: "" }), 2000); return; }
    try {
      const pid = Number(productId);
      const pname = products.find((p) => p.id === pid)?.name || "";
      const payload = {
        product: { id: pid },
        productName: pname,
        type: exchangeType,
        quantity: Number(quantity),
        reason: reason || exchangeType,
        status,
        date: exchangeDate || new Date().toISOString().split("T")[0],
      };

      let savedId = null;
      if (editingId) {
        await api.put(`/exchange-storing/${editingId}`, payload);
        savedId = editingId;
      } else {
        const match = (records.length > 0 ? records : localCache.current).find(
          (r) => Number(r.product?.id || r.productId) === pid &&
            (r.type || "").toLowerCase() === exchangeType.toLowerCase() &&
            (r.status || "Pending") === status
        );
        if (match?.id) {
          const merged = { ...payload, quantity: Number(quantity) + Number(match.quantity || 0) };
          await api.put(`/exchange-storing/${match.id}`, merged);
          savedId = match.id;
        } else {
          const res = await api.post("/exchange-storing", payload);
          savedId = res?.data?.id;
          if (!savedId) throw new Error("Failed to create exchange record");
        }
      }

      if (status === "Approved") {
        let deductQty = Number(quantity);
        if (editingId) {
          const prev = (records.length ? records : localCache.current).find((x) => x.id === editingId);
          const prevStatus = prev?.status || "Pending";
          const prevQty = Number(prev?.quantity) || 0;
          if (prevStatus === "Approved") {
            deductQty = Math.max(0, Number(quantity) - prevQty);
          }
        }
        if (deductQty > 0) {
          await applyStockDeduction(pid, deductQty, exchangeType, pname);
        }
      }

      setProductId(""); setQuantity(""); setReason(""); setEditingId(null); setShowModal(false);
      setMsg(status === "Approved" ? { text: t("exchangeRecordedStockReduced", { type: exchangeType }), type: "success" } : { text: t("exchangeSavedStatusNoStock", { type: exchangeType, status }), type: "success" });
      setTimeout(() => setMsg({ text: "", type: "" }), 3000);
      await reloadAll();
    } catch (err) {
      const m = err?.response?.data?.message || err?.response?.data?.error || "Failed to save";
      setMsg({ text: typeof m === "string" ? m : t("failedToSave"), type: "error" }); setTimeout(() => setMsg({ text: "", type: "" }), 4000);
    }
  };

  const updateRecordStatus = async (r, newStatus) => {
    const oldStatus = r.status || "Pending";
    if (oldStatus === newStatus) return;
    try {
      await api.put(`/exchange-storing/${r.id}/status`, newStatus, { headers: { "Content-Type": "text/plain" } });
      if (newStatus === "Approved" && oldStatus !== "Approved") {
        await applyStockDeduction(Number(r.product?.id || r.productId), Number(r.quantity), r.type || "Exchange", r.productName || r.product?.name);
      }
      const updated = { ...r, status: newStatus };
      setRecords((prev) => prev.map((x) => x.id === r.id ? updated : x));
      localCache.current = localCache.current.map((x) => x.id === r.id ? updated : x);
      localStorage.setItem("exchangeCache", JSON.stringify(localCache.current));
      setMsg(
        newStatus === "Approved" ? { text: t("approvedStockReduced"), type: "success" } :
        oldStatus === "Approved" && newStatus !== "Approved" ? { text: t("statusSetNotRestored", { status: newStatus }), type: "success" } :
        { text: t("statusSet", { status: newStatus }), type: "success" }
      );
      setTimeout(() => setMsg({ text: "", type: "" }), 3500);
      await reloadAll();
    } catch (err) {
      setMsg({ text: t("failedToUpdateStatus"), type: "error" }); setTimeout(() => setMsg({ text: "", type: "" }), 3000);
    }
  };

  const openModal = () => {
    setEditingId(null); setProductId(""); setQuantity(""); setReason("");
    setStatus("Pending"); setExchangeDate(new Date().toISOString().split("T")[0]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false); setEditingId(null); setProductId(""); setQuantity(""); setReason(""); setStatus("Pending");
  };

  const renderStatus = (r) => {
    const sb = statusBadge(r.status);
    return (
      <View style={[s.cellBase, s.statusCell]}>
        <View style={[s.badge, { backgroundColor: sb.bg }]}>
          <Text style={[s.badgeText, { color: sb.c }]}>{r.status}</Text>
        </View>
        <SelectField
          value={r.status || "Pending"}
          onChange={(v) => updateRecordStatus(r, v)}
          options={STATUS_OPTIONS}
          containerStyle={{ marginBottom: 0 }}
        />
      </View>
    );
  };

  const openEditModal = (r) => {
    setEditingId(r.id);
    setProductId(r.product?.id || r.productId || "");
    setQuantity(String(r.quantity || ""));
    setExchangeType(r.type || "Wrong Purchase");
    setReason(r.reason || "");
    setStatus(r.status || "Pending");
    const d = r.date ? new Date(String(r.date).replace(/\.\d+/, "")) : new Date();
    setExchangeDate(isNaN(d) ? new Date().toISOString().split("T")[0] : d.toISOString().split("T")[0]);
    setShowModal(true);
  };

  const restoreRecord = async (r) => {
    await api.post("/exchange-storing", {
      product: { id: Number(r.product?.id || r.productId) },
      productName: r.productName || r.product?.name || "",
      type: r.type || "Exchange",
      quantity: Number(r.quantity) || 0,
      reason: r.reason || r.type || "Exchange",
      status: r.status || "Pending",
      date: String(r.date || new Date().toISOString().split("T")[0]).slice(0, 10),
    }).catch(() => {});
    await reloadAll();
    if (notifyUndo) notifyUndo(t("recordRestored"), () => {}, { timeout: 2500, undo: false });
  };

  const deleteRecord = async (r) => {
    if (!(await confirmDialog(t("deleteExchangeRecordConfirm", { name: r.productName || r.product?.name || t("thisProduct") })))) return;
    try {
      await api.delete(`/exchange-storing/${r.id}`);
      localCache.current = localCache.current.filter((x) => x.id !== r.id);
      localStorage.setItem("exchangeCache", JSON.stringify(localCache.current));
      setMsg({ text: t("recordDeleted"), type: "success" }); setTimeout(() => setMsg({ text: "", type: "" }), 2500);
      await reloadAll();
      notifyUndo?.(`${t("exchangeRecordDeleted")}: ${r.productName || r.product?.name || `#${r.id}`}`, () => restoreRecord(r));
    } catch {
      setMsg({ text: t("failedToDelete"), type: "error" }); setTimeout(() => setMsg({ text: "", type: "" }), 2500);
    }
  };

  const deleteSelected = async () => {
    if (bulk.selected.length === 0) return;
    const count = bulk.selected.length;
    if (!(await confirmDialog(t("deleteSelectedRecordsConfirm", { count })))) return;
    try {
      const all = records.length ? records : localCache.current;
      const deleted = bulk.selected.map((id) => all.find((x) => x.id === id)).filter(Boolean);
      for (const id of bulk.selected) {
        await api.delete(`/exchange-storing/${id}`);
        localCache.current = localCache.current.filter((x) => x.id !== id);
      }
      localStorage.setItem("exchangeCache", JSON.stringify(localCache.current));
      bulk.clear();
      setMsg({ text: t("recordsDeleted"), type: "success" }); setTimeout(() => setMsg({ text: "", type: "" }), 2500);
      await reloadAll();
      if (deleted.length) notifyUndo?.(`${deleted.length} ${t("recordsDeletedPlural")}`, () => { deleted.forEach((r) => restoreRecord(r)); });
    } catch {
      setMsg({ text: t("failedToDelete"), type: "error" }); setTimeout(() => setMsg({ text: "", type: "" }), 2500);
    }
  };

  const editStock = (s) => {
    setEditingId(s.id); setProductId(s.product?.id || ""); setQuantity(String(s.quantity || ""));
  };

  const restoreStock = async (s) => {
    await api.post("/stocks", {
      product: s.product?.id ? { id: s.product.id } : undefined,
      quantity: Number(s.quantity) || 0,
      productName: s.productName || s.product?.name || "",
      lowStockThreshold: s.lowStockThreshold ?? 0,
    }).catch(() => {});
    await reloadStock();
    if (notifyUndo) notifyUndo(t("stockRecordRestored"), () => {}, { timeout: 2500, undo: false });
  };

  const deleteStock = async (id) => {
    if (!(await confirmDialog(t("deleteStockRecordConfirm")))) return;
    const target = stocks.find((s) => s.id === id);
    try { await api.delete(`/stocks/${id}`); await reloadStock(); if (target) notifyUndo?.(`${t("stockRecordDeleted")}: ${target.product?.name || target.productName || `#${target.id}`}`, () => restoreStock(target)); } catch { setMsg({ text: t("failed"), type: "error" }); setTimeout(() => setMsg({ text: "", type: "" }), 2000); }
  };

  const deleteSelectedStocks = async () => {
    if (bulkStock.selected.length === 0) return;
    const count = bulkStock.selected.length;
    if (!(await confirmDialog(t("deleteSelectedStocksConfirm", { count })))) return;
    try {
      const deleted = bulkStock.selected.map((id) => stocks.find((s) => s.id === id)).filter(Boolean);
      for (const id of bulkStock.selected) await api.delete(`/stocks/${id}`).catch(() => {});
      bulkStock.clear();
      setMsg({ text: t("deleted"), type: "success" }); setTimeout(() => setMsg({ text: "", type: "" }), 2000);
      await reloadStock();
      if (deleted.length) notifyUndo?.(`${deleted.length} ${t("stockRecordsDeleted")}`, () => { deleted.forEach((s) => restoreStock(s)); });
    } catch {
      setMsg({ text: t("failed"), type: "error" }); setTimeout(() => setMsg({ text: "", type: "" }), 2000);
    }
  };

  const handleStockSubmit = async () => {
    if (!productId) { setMsg({ text: t("selectProduct"), type: "error" }); setTimeout(() => setMsg({ text: "", type: "" }), 2000); return; }
    try {
      const payload = { product: { id: Number(productId) }, quantity: Number(quantity) };
      if (editingId) await api.put(`/stocks/${editingId}`, payload);
      else await api.post("/stocks", payload);
      setProductId(""); setQuantity(""); setEditingId(null);
      setMsg({ text: t("stockSaved"), type: "success" }); setTimeout(() => setMsg({ text: "", type: "" }), 2000);
      await reloadStock();
    } catch (err) {
      const statusCode = err?.response?.status;
      const m = statusCode === 409 ? t("stockConflict") : t("failedToSave");
      setMsg({ text: m, type: "error" }); setTimeout(() => setMsg({ text: "", type: "" }), 3000);
    }
  };

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <Spinner size={28} text={t("loading")} />
      </View>
    );
  }

  const sortHeadCell = (label, field, extra) => (
    <Pressable style={[s.thPressable, extra]} onPress={() => toggleSort(field)} hitSlop={4}>
      <Text style={s.th}>{label}</Text>
      <Ionicons name="swap-vertical-outline" size={10} color="#94a3b8" />
    </Pressable>
  );

  const renderCheckCell = (selected) => (
    <Ionicons name={selected ? "checkbox" : "square-outline"} size={16} color={selected ? colors.primary : colors.slate400} />
  );

  const renderTableRow = (r, i, withIndex) => {
    const tc = TYPE_COLORS[r.type] || { bg: "#f1f5f9", c: "#475569" };
    return (
      <View key={r.id} style={s.tr}>
        {bulk.mode && (
          <View style={[s.cellBase, s.colCheck]}>
            <Pressable onPress={() => bulk.toggle(r.id)} hitSlop={8}>
              {renderCheckCell(bulk.selectedSet.has(r.id))}
            </Pressable>
          </View>
        )}
        {withIndex && <Text style={[s.cellBase, s.colIdx, { color: "#94a3b8", fontSize: 11 }]}>{i + 1}</Text>}
        <Text style={[s.cellBase, s.colName, { fontWeight: "600" }]}>{r.productName || r.product?.name || "—"}</Text>
        <Text style={[s.cellBase, s.colQty, { fontWeight: "700", color: "#dc2626" }]}>{r.quantity}</Text>
        <View style={[s.cellBase, s.colType]}>
          <View style={[s.badge, { backgroundColor: tc.bg }]}>
            <Text style={[s.badgeText, { color: tc.c }]}>{r.type}</Text>
          </View>
        </View>
        <Text style={[s.cellBase, s.colReason, { color: "#64748b", fontSize: 11 }]} numberOfLines={2}>{r.reason || "—"}</Text>
        {renderStatus(r)}
        <Text style={[s.cellBase, s.colDate, { color: "#94a3b8", fontSize: 11 }]}>{fmtD(r.date)}</Text>
        {withIndex && <Text style={[s.cellBase, s.colDate, { color: "#94a3b8", fontSize: 11 }]}>{fmtT(r.date)}</Text>}
        <View style={[s.cellBase, s.colActions, s.actRow]}>
          <Pressable onPress={() => openEditModal(r)} hitSlop={8} style={s.iconBtn}>
            <Ionicons name="pencil" size={13} color="#2563eb" />
          </Pressable>
          {bulk.mode && (
            <Pressable onPress={() => deleteRecord(r)} hitSlop={8} style={s.iconBtn}>
              <Ionicons name="trash-outline" size={13} color="#ef4444" />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const FILTERS = [{ v: "all", lk: "all" }, { v: "Wrong Purchase", lk: "wrongPurchase" }, { v: "Expired", lk: "expiredType" }, { v: "Destruction", lk: "destruction" }, { v: "Exchange", lk: "exchange" }, { v: "Storage", lk: "storage" }];

  return (
    <View style={s.root}>
      <View style={s.pageHead}>
        <Ionicons name="business-outline" size={22} color={colors.primary} />
        <Text style={s.pageTitle}>{t("exchangeAndStoring")}</Text>
      </View>

      <View style={s.statGrid}>
        {[
          { labelKey: "totalStockItems", value: stocks.length, color: "#2563eb", icon: "cube-outline", bg: "#eff6ff" },
          { labelKey: "outOfStock", value: outOfStock, color: "#dc2626", icon: "alert-circle-outline", bg: "#fef2f2" },
          { labelKey: "lowStock", value: lowStock, color: "#f59e0b", icon: "alert-circle-outline", bg: "#fef3c7" },
          { labelKey: "exchangeRecords", value: displayRecords.length, color: "#7c3aed", icon: "repeat", bg: "#ede9fe" },
        ].map((st) => (
          <View key={st.labelKey} style={[s.statCard, { backgroundColor: st.bg, borderTopColor: st.color }]}>
            <View style={s.statLabelRow}>
              <Ionicons name={st.icon} size={12} color={st.color} />
              <Text style={[s.statLabel, { color: st.color }]}>{t(st.labelKey)}</Text>
            </View>
            <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
          </View>
        ))}
      </View>

      <View style={s.tabsRow}>
        {[{ k: "exchange", lk: "exchange" }, { k: "log", lk: "activityLog" }, { k: "stock", lk: "stockMgmt" }].map((tab) => {
          const active = activeTab === tab.k;
          const icon = tab.k === "exchange" ? "repeat" : tab.k === "log" ? "swap-horizontal" : "cube-outline";
          return (
            <Pressable key={tab.k} onPress={() => setActiveTab(tab.k)} style={[s.tabChip, active && s.tabChipActive]} hitSlop={4}>
              <Ionicons name={icon} size={13} color={active ? colors.primary : "#64748b"} />
              <Text style={[s.tabChipText, { color: active ? colors.primary : "#64748b" }]}>{t(tab.lk)}</Text>
            </Pressable>
          );
        })}
      </View>

      {!!msg.text && (
        <View style={[s.msgBar, msg.type === "error" ? s.msgBarError : s.msgBarSuccess]}>
          <Text style={[s.msgText, { color: msg.type === "error" ? "#991b1b" : "#166534" }]}>{msg.text}</Text>
        </View>
      )}

      <ScrollView style={s.content} contentContainerStyle={s.contentBody} showsVerticalScrollIndicator={false}>

        {activeTab === "log" && (
          <View style={s.tabCard}>
            <View style={[s.tabHead, { justifyContent: "space-between" }]}>
              <Text style={s.tabHeadText}>{t("allExchangeStoringRecords")} ({displayRecords.length})</Text>
              {bulk.mode && <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected} onSelectAll={bulk.toggleAll} onDelete={deleteSelected} deleteLabel={t("deleteSelected")} />}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.tableInnerLog}>
                <View style={s.trHead}>
                  {bulk.mode && (
                    <View style={[s.cellBase, s.colCheck]}>
                      <Pressable onPress={bulk.toggleAll} hitSlop={8}>
                        {renderCheckCell(bulk.allSelected)}
                      </Pressable>
                    </View>
                  )}
                  <Text style={[s.cellBase, s.th, s.colIdx]}>#</Text>
                  <Text style={[s.cellBase, s.th, s.colName]}>{t("product")}</Text>
                  <Text style={[s.cellBase, s.th, s.colQty]}>{t("qty")}</Text>
                  <Text style={[s.cellBase, s.th, s.colType]}>{t("type")}</Text>
                  <Text style={[s.cellBase, s.th, s.colReason]}>{t("reason")}</Text>
                  <Text style={[s.cellBase, s.th, s.colStatus]}>{t("status")}</Text>
                  <Text style={[s.cellBase, s.th, s.colDate]}>{t("date")}</Text>
                  <Text style={[s.cellBase, s.th, s.colDate]}>{t("time")}</Text>
                  <Text style={[s.cellBase, s.th, s.colActions]}>{t("actions")}</Text>
                </View>
                {pagedRecords.length === 0 ? (
                  <View style={s.emptyRow}>
                    <Ionicons name="time-outline" size={30} color={colors.slate300} style={{ marginBottom: 8 }} />
                    <Text style={s.emptyText}>{t("noRecordsFound")}</Text>
                  </View>
                ) : pagedRecords.map((r, i) => renderTableRow(r, i, true))}
              </View>
            </ScrollView>
            <PaginationBar total={totalPages} page={currentPage} setPage={setRecordsPage} />
          </View>
        )}

        {activeTab === "exchange" && (
          <View style={{ gap: spacing.sm }}>
            <Card padded style={s.exchangeBar}>
              <Text style={s.exchangeCount}>{t("exchangeRecords")}</Text>
              <Button title={t("recordExchange")} icon={<Ionicons name="add" size={13} color="#fff" />} variant="primary" onPress={openModal} />
            </Card>

            <View style={s.tabCard}>
              <View style={[s.tabHead, s.filterWrap]}>
                {FILTERS.map((f) => {
                  const active = filter === f.v;
                  return (
                    <Pressable key={f.v} onPress={() => { setFilter(f.v); setRecordsPage(1); }} style={[s.filterChip, active && s.filterChipActiveSolid]} hitSlop={4}>
                      <Text style={[s.filterChipText, { color: active ? colors.white : "#64748b" }]}>{t(f.lk)}</Text>
                    </Pressable>
                  );
                })}
                {bulk.mode && <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected} onSelectAll={bulk.toggleAll} onDelete={deleteSelected} deleteLabel="Delete Selected" />}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.tableInnerExchange}>
                  <View style={s.trHead}>
                    {bulk.mode && (
                      <View style={[s.cellBase, s.colCheck]}>
                        <Pressable onPress={bulk.toggleAll} hitSlop={8}>
                          {renderCheckCell(bulk.allSelected)}
                        </Pressable>
                      </View>
                    )}
                    {sortHeadCell(t("product"), "name", { flex: 1, minWidth: 150 })}
                    {sortHeadCell(t("qty"), "qty", { width: 80, textAlign: "center" })}
                    <Text style={[s.cellBase, s.th, s.colType]}>{t("type")}</Text>
                    <Text style={[s.cellBase, s.th, s.colReason]}>{t("reason")}</Text>
                    <Text style={[s.cellBase, s.th, s.colStatus]}>{t("status")}</Text>
                    {sortHeadCell(t("date"), "date", s.colDate)}
                    <Text style={[s.cellBase, s.th, s.colActions]}>{t("actions")}</Text>
                  </View>
                  {pagedRecords.length === 0 ? (
                    <View style={s.emptyRow}>
                      <Ionicons name="repeat" size={30} color={colors.slate300} style={{ marginBottom: 8 }} />
                      <Text style={s.emptyText}>{t("noExchangeRecords2")}</Text>
                    </View>
                  ) : pagedRecords.map((r) => renderTableRow(r, 0, false))}
                </View>
              </ScrollView>
              <PaginationBar total={totalPages} page={currentPage} setPage={setRecordsPage} />
            </View>
          </View>
        )}

        {activeTab === "log" && (
          <View style={{ gap: spacing.sm }}>
            <View style={s.countGrid}>
              {EXCHANGE_TYPES.map((tp) => {
                const count = displayRecords.filter((r) => r.type === tp.value).length;
                const cl = TYPE_COLORS[tp.value] || { bg: "#f1f5f9", c: "#475569" };
                const active = filter === tp.value;
                return (
                  <Pressable key={tp.value} onPress={() => { setFilter(tp.value); setRecordsPage(1); }} style={[s.countCard, { borderColor: active ? cl.c : "#e2e8f0", backgroundColor: active ? cl.bg : colors.white, borderTopColor: cl.c }]} hitSlop={4}>
                    <Text style={[s.countLabel, { color: cl.c }]}>{t(tp.labelKey)}</Text>
                    <Text style={[s.countValue, { color: cl.c }]}>{count}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={s.tabCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.tableInnerLog}>
                  <View style={s.trHead}>
                    {bulk.mode && (
                      <View style={[s.cellBase, s.colCheck]}>
                        <Pressable onPress={bulk.toggleAll} hitSlop={8}>
                          {renderCheckCell(bulk.allSelected)}
                        </Pressable>
                      </View>
                    )}
                    <Text style={[s.cellBase, s.th, s.colIdx]}>#</Text>
                    {sortHeadCell(t("product"), "name", { flex: 1, minWidth: 150 })}
                    {sortHeadCell(t("qty"), "qty", { width: 80, textAlign: "center" })}
                    <Text style={[s.cellBase, s.th, s.colType]}>{t("type")}</Text>
                    <Text style={[s.cellBase, s.th, s.colReason]}>{t("reason")}</Text>
                    <Text style={[s.cellBase, s.th, s.colStatus]}>{t("status")}</Text>
                    <Text style={[s.cellBase, s.th, s.colDate]}>{t("date")}</Text>
                    <Text style={[s.cellBase, s.th, s.colDate]}>{t("recordedAt")}</Text>
                    <Text style={[s.cellBase, s.th, s.colActions]}>{t("actions")}</Text>
                  </View>
                  {pagedRecords.length === 0 ? (
                    <View style={s.emptyRow}>
                      <Ionicons name="time-outline" size={30} color={colors.slate300} style={{ marginBottom: 8 }} />
                      <Text style={s.emptyText}>{t("noRecordsFound")}</Text>
                    </View>
                  ) : pagedRecords.map((r, i) => renderTableRow(r, i, true))}
                </View>
              </ScrollView>
              <PaginationBar total={totalPages} page={currentPage} setPage={setRecordsPage} />
            </View>
          </View>
        )}

        {activeTab === "stock" && (
          <View style={{ gap: spacing.sm }}>
            <Card padded style={s.stockFormCard}>
              <View style={{ flex: 1, minWidth: 180 }}>
                <ProductSelector value={productId} onChange={setProductId} />
              </View>
              <View style={s.qtyField}>
                <Text style={s.label}>{t("qty")}</Text>
                {(() => { const sp = products.find((p) => String(p.id) === String(productId)); return (
                  <QuantityInput value={Number(quantity) || 0} onChange={(v) => setQuantity(v)}
                    piecesPerUnit={sp?.piecesPerUnit || 0} unit={sp?.unit || "piece"}
                    min={1} placeholder="0" />
                ); })()}
              </View>
              <Button title={editingId ? t("update") : t("add")} icon={<Ionicons name={editingId ? "save-outline" : "add"} size={14} color="#fff" />} variant="primary" onPress={handleStockSubmit} />
              {!!editingId && (
                <Button title={t("cancel")} variant="ghost" onPress={() => { setEditingId(null); setProductId(""); setQuantity(""); }} />
              )}
            </Card>

            <View style={s.stockToolbar}>
              <View style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
                <TextField value={search} onChangeText={setSearch} placeholder={t("searchProducts")} rightIcon={<Ionicons name="search" size={14} color="#94a3b8" />} />
              </View>
              {bulkStock.mode && <BulkBar count={bulkStock.selected.length} allSelected={bulkStock.allSelected} onSelectAll={bulkStock.toggleAll} onDelete={deleteSelectedStocks} deleteLabel={t("deleteSelected")} />}
            </View>

            <View style={s.tabCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.tableInnerStock}>
                  <View style={s.trHead}>
                    {bulkStock.mode && (
                      <View style={[s.cellBase, s.colCheck]}>
                        <Pressable onPress={bulkStock.toggleAll} hitSlop={8}>
                          {renderCheckCell(bulkStock.allSelected)}
                        </Pressable>
                      </View>
                    )}
                    <Text style={[s.cellBase, s.th, s.colName]}>{t("product")}</Text>
                    <Text style={[s.cellBase, s.th, s.colQtyStock]}>{t("quantity")}</Text>
                    <Text style={[s.cellBase, s.th, s.colQtyStock]}>{t("lowAlert")}</Text>
                    <Text style={[s.cellBase, s.th, s.colStatus]}>{t("status")}</Text>
                    <Text style={[s.cellBase, s.th, s.colActions]}>{t("actions")}</Text>
                  </View>
                  {filteredStocks.length === 0 ? (
                    <View style={s.emptyRow}>
                      <Ionicons name="cube-outline" size={30} color={colors.slate300} style={{ marginBottom: 8 }} />
                      <Text style={s.emptyText}>{t("noStockRecords")}</Text>
                    </View>
                  ) : filteredStocks.map((st) => {
                    const qty = Number(st.quantity) || 0;
                    const threshold = Number(st.lowStockThreshold) || 5;
                    const isOut = qty <= 0;
                    const isLow = qty > 0 && qty <= threshold;
                    return (
                      <View key={st.id} style={[s.tr, { backgroundColor: isOut ? "#fef2f2" : isLow ? "#fefce8" : colors.white }]}>
                        {bulkStock.mode && (
                          <View style={[s.cellBase, s.colCheck]}>
                            <Pressable onPress={() => bulkStock.toggle(st.id)} hitSlop={8}>
                              {renderCheckCell(bulkStock.selectedSet.has(st.id))}
                            </Pressable>
                          </View>
                        )}
                        <Text style={[s.cellBase, s.colName, { fontWeight: "600" }]}>{getProductName(st)}</Text>
                        <Text style={[s.cellBase, s.colQtyStock, { fontWeight: "700", color: isOut ? "#dc2626" : isLow ? "#a16207" : "#16a34a" }]}>{qty}</Text>
                        <Text style={[s.cellBase, s.colQtyStock]}>{threshold}</Text>
                        <View style={[s.cellBase, s.colStatus]}>
                          <View style={[s.badge, { backgroundColor: isOut ? "#fef2f2" : isLow ? "#fef9c3" : "#f0fdf4" }]}>
                            {isOut || isLow ? <Ionicons name="alert-circle-outline" size={10} color={isOut ? "#dc2626" : "#a16207"} /> : <Ionicons name="checkmark-circle-outline" size={10} color="#16a34a" />}
                            <Text style={[s.badgeText, { color: isOut ? "#dc2626" : isLow ? "#a16207" : "#16a34a" }]}>
                              {isOut ? t("outBadge") : isLow ? t("lowBadge") : t("okBadge")}
                            </Text>
                          </View>
                        </View>
                        <View style={[s.cellBase, s.colActions, s.actRow]}>
                          <Pressable onPress={() => editStock(st)} hitSlop={8} style={s.iconBtn}>
                            <Ionicons name="pencil" size={13} color="#2563eb" />
                          </Pressable>
                          {bulkStock.mode && (
                            <Pressable onPress={() => deleteStock(st.id)} hitSlop={8} style={s.iconBtn}>
                              <Ionicons name="trash-outline" size={13} color="#ef4444" />
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </ScrollView>

      {showModal && (
        <Modal visible={showModal} onClose={closeModal} title={editingId ? t("editExchangeRecord") : t("recordExchange")}
          actions={[
            <Button key="c" title={t("cancel")} variant="ghost" onPress={closeModal} />,
            <Button key="s" title={editingId ? t("update") : t("saveRecord")} icon={<Ionicons name="save-outline" size={14} color="#fff" />} variant="primary" onPress={handleExchangeSubmit} />,
          ]}>
          <View style={{ gap: spacing.md }}>
            <ProductSelector value={productId} onChange={setProductId} />
            <View style={s.modalRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{t("quantity")} *</Text>
                {(() => { const sp = products.find((p) => String(p.id) === String(productId)); return (
                  <QuantityInput value={Number(quantity) || 0} onChange={(v) => setQuantity(v)}
                    piecesPerUnit={sp?.piecesPerUnit || 0} unit={sp?.unit || "piece"}
                    min={1} placeholder={t("quantityExample")} />
                ); })()}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{t("date")}</Text>
                <TextField value={exchangeDate} onChangeText={setExchangeDate} placeholder="YYYY-MM-DD" />
              </View>
            </View>
            <View>
              <Text style={s.label}>{t("type")}</Text>
              <SelectField value={exchangeType} onChange={setExchangeType} options={EXCHANGE_TYPES.map((tp) => ({ value: tp.value, label: t(tp.labelKey) }))} />
            </View>
            <View>
              <Text style={s.label}>{t("reasonNote")}</Text>
              <TextField value={reason} onChangeText={setReason} placeholder={t("reasonNote")} />
            </View>
            <View>
              <Text style={s.label}>{t("status")}</Text>
              <SelectField value={status} onChange={setStatus} options={STATUS_OPTIONS} />
              <Text style={{ ...s.label, marginTop: 4, fontSize: 11, color: status === "Approved" ? "#16a34a" : "#94a3b8" }}>
                {status === "Approved" ? t("stockWillBeReduced") : t("stockNotAffected")}
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", height: 400 },
  root: { flex: 1, backgroundColor: colors.slate50, padding: spacing.sm, gap: spacing.sm },

  pageHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 0 },
  pageTitle: { fontSize: 18, fontWeight: "700", color: colors.slate900 },

  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, flexShrink: 0 },
  statCard: { flexBasis: "46%", flexGrow: 1, borderRadius: radius.md, borderWidth: 1, borderTopWidth: 3, borderColor: "#e2e8f0", padding: spacing.md },
  statLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  statValue: { fontSize: 18, fontWeight: "700", marginTop: 2 },

  tabsRow: { flexDirection: "row", gap: 2, backgroundColor: "#f1f5f9", padding: 2, borderRadius: radius.sm, alignSelf: "flex-start", flexShrink: 0 },
  tabChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.sm },
  tabChipActive: { backgroundColor: colors.white },
  tabChipText: { fontSize: 12, fontWeight: "600" },

  msgBar: { padding: spacing.sm, borderRadius: radius.sm, flexShrink: 0, borderWidth: 1 },
  msgBarSuccess: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  msgBarError: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  msgText: { fontSize: 11 },

  content: { flex: 1 },
  contentBody: { paddingBottom: spacing.xl, gap: spacing.sm },

  tabCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: radius.md, overflow: "hidden" },
  tabHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap", paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", backgroundColor: "#f8fafc" },
  tabHeadText: { fontSize: 12, fontWeight: "700", color: "#374151" },

  exchangeBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  exchangeCount: { fontSize: 12, fontWeight: "700", color: "#374151" },

  filterWrap: { flexDirection: "row", alignItems: "center", gap: 2, flexWrap: "wrap" },
  filterChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: radius.sm },
  filterChipActiveSolid: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 11, fontWeight: "600" },

  countGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  countCard: { flexBasis: "30%", flexGrow: 1, borderWidth: 1, borderTopWidth: 3, borderRadius: radius.md, padding: spacing.md },
  countLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  countValue: { fontSize: 20, fontWeight: "700", marginTop: 2 },

  stockFormCard: { flexDirection: "row", alignItems: "flex-end", gap: spacing.md, flexWrap: "wrap" },
  stockToolbar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  qtyField: { width: 160, flexDirection: "column", gap: 3 },
  label: { fontSize: 11, fontWeight: "700", color: colors.slate500, textTransform: "uppercase", marginTop: 2 },

  modalRow: { flexDirection: "row", gap: spacing.md, flexWrap: "wrap" },

  pagerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 10 },
  pageNav: { paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: "#d1d5db", borderRadius: radius.sm, backgroundColor: colors.white },
  pageNavDisabled: { backgroundColor: "#f3f4f6", opacity: 0.6 },
  pageNavText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  pageNavTextDisabled: { color: "#9ca3af" },
  pageOf: { fontSize: 12, color: "#64748b" },

  tableInnerLog: { minWidth: 980 },
  tableInnerExchange: { minWidth: 800 },
  tableInnerStock: { minWidth: 640 },
  trHead: { flexDirection: "row", backgroundColor: "#f8fafc", borderBottomWidth: 2, borderBottomColor: "#e2e8f0", alignItems: "center" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", alignItems: "center" },

  cellBase: { paddingVertical: 8, paddingHorizontal: 8 },
  th: { fontSize: 10, fontWeight: "700", color: colors.slate500, textTransform: "uppercase", letterSpacing: 0.4 },
  thPressable: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 8, paddingHorizontal: 8 },
  colIdx: { width: 34, textAlign: "center" },
  colCheck: { width: 36, alignItems: "center", justifyContent: "center" },
  colName: { flex: 1, minWidth: 150 },
  colQty: { width: 66, textAlign: "center" },
  colType: { width: 120 },
  colReason: { width: 150 },
  colStatus: { width: 130, minWidth: 130 },
  colDate: { width: 100 },
  colActions: { width: 70 },
  colQtyStock: { width: 90, textAlign: "center" },
  statusCell: { flexDirection: "column", gap: 4, alignItems: "flex-start" },

  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99, alignSelf: "flex-start" },
  badgeText: { fontSize: 10, fontWeight: "600" },

  emptyRow: { paddingVertical: 40, alignItems: "center" },
  emptyText: { color: colors.slate400, fontSize: font.sm },

  actRow: { flexDirection: "row", gap: 2, justifyContent: "center" },
  iconBtn: { padding: 2, marginHorizontal: 2 },
});