import { useEffect, useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import ProductSelector from "../components/ProductSelector";
import { canViewProfit } from "../utils/roleChecks";
import { isCashSale, isOutstandingDebtSale, isFullyPaidDebtSale, getSaleRemainingDebt } from "../utils/debtUtils";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { useUndo } from "../UndoContext";
import { QuantityInput, TextField, Button } from "../components/ui";
import { confirmDialog } from "../utils/confirm";
import { t, useLanguage } from "../i18n";
import { colors, font, radius, spacing, shadow } from "../theme";

export default function Sales() {
  useLanguage();
  const showProfit = canViewProfit();
  const { notifyUndo } = useUndo() || {};
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ description: "", quantity: "", price: "" });
  const [productId, setProductId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [viewMode, setViewMode] = useState("all");
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [exchanges, setExchanges] = useState([]);
  const [showExchanges, setShowExchanges] = useState(false);
  const [exchangePage, setExchangePage] = useState(1);
  const EXCHANGE_PAGE_SIZE = 10;

  const showMsg = (text, type, ms = 3000) => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), ms);
  };

  useEffect(() => {
    Promise.all([
      api.get("/sales").catch(() => ({ data: [] })),
      api.get("/products").catch(() => ({ data: [] })),
      api.get("/exchange-storing").catch(() => ({ data: [] })),
    ]).then(([sr, pr, er]) => {
      setSales(Array.isArray(sr.data) ? sr.data : []);
      setProducts(Array.isArray(pr.data) ? pr.data : []);
      let loaded = Array.isArray(er.data) ? er.data : (er.data?.content || er.data?.records || []);
      if (!loaded.length && typeof er.data === "object" && !Array.isArray(er.data)) {
        const vals = Object.values(er.data).filter(v => Array.isArray(v)).flat();
        if (vals.length) loaded = vals;
      }
      setExchanges(loaded);
    }).finally(() => setLoading(false));
  }, []);

  const reload = () => api.get("/sales").then(({ data }) => setSales(Array.isArray(data) ? data : []));

  const handleProductSelect = (pid) => {
    setProductId(pid);
    const p = products.find((x) => x.id === Number(pid));
    if (p) {
      setForm((f) => ({ ...f, description: p.name, price: p.price || "" }));
    }
  };

  const handleSubmit = async () => {
    if (!productId) { showMsg(t("selectProduct"), "error", 2000); return; }
    const p = products.find((x) => x.id === Number(productId));
    const payload = {
      description: form.description || p?.name,
      quantity: Number(form.quantity),
      grandTotal: Number(form.price),
      saleDate: new Date().toISOString(),
      status: "completed",
      paymentStatus: "paid",
      paymentMethod: "cash",
    };
    try {
      const { data: saved } = await api.post("/sales", payload);

      if (p) {
        await api.put(`/products/${p.id}`, { ...p, quantity: Math.max(0, (p.quantity || 0) - Number(form.quantity)) }).catch(() => {});
        const currentStock = await api.get(`/stocks/product/${p.id}`).catch(() => null);
        const currentQty = currentStock?.data?.quantity || 0;
        const newQty = Math.max(0, currentQty - Number(form.quantity));
        if (currentStock?.data?.id) {
          await api.put(`/stocks/${currentStock.data.id}`, {
            product: { id: p.id },
            quantity: newQty,
            lowStockThreshold: currentStock.data.lowStockThreshold || 10,
            date: new Date().toISOString(),
          }).catch(() => {});
        }
        await api.post("/stock-history", {
          product: { id: p.id },
          quantityChange: Number(form.quantity),
          resultingQuantity: newQty,
          transactionType: "Sold",
        }).catch(() => {});
      }

      setForm({ description: "", quantity: "", price: "" });
      setProductId("");
      setEditingId(null);
      showMsg(t("saleCompletedStockUpdated", { id: saved.id }), "success");
      await reload();
    } catch { showMsg(t("failedToSave"), "error", 2000); }
  };

  const editSale = (s) => {
    setEditingId(s.id);
    setForm({ description: s.description || "", quantity: s.quantity || "", price: s.price || "" });
  };

  const restoreSale = async (s) => {
    await api.post("/sales", {
      description: s.description || "",
      quantity: Number(s.quantity || 0),
      grandTotal: Number(s.grandTotal || s.price || 0),
      saleDate: s.saleDate || new Date().toISOString(),
      status: s.status || "completed",
      paymentStatus: s.paymentStatus || "paid",
      paymentMethod: s.paymentMethod || "cash",
    }).catch(() => {});
    await reload();
    if (notifyUndo) notifyUndo(t("transactionRestored"), () => {}, { timeout: 2500, undo: false });
  };

  const deleteSale = async (id) => {
    if (!(await confirmDialog(t("deleteRecordConfirm")))) return;
    const target = sales.find((s) => s.id === id);
    await api.delete(`/sales/${id}`);
    await reload();
    if (target) notifyUndo?.(`${t("transactionDeleted")}: ${target.description || `#${target.id}`}`, () => restoreSale(target));
  };

  const deleteAllSales = async () => {
    if (sales.length === 0) return;
    if (!(await confirmDialog(t("deleteAllTransactionsConfirm", { count: sales.length })))) return;
    const deleted = [...sales];
    let failed = 0;
    for (const s of deleted) {
      try { await api.delete(`/sales/${s.id}`); } catch { failed++; }
    }
    await reload();
    showMsg(failed > 0 ? t("deletedAllSomeFailed", { failed }) : t("allTransactionsDeleted"), failed > 0 ? "error" : "success");
    if (failed === 0) notifyUndo?.(`${deleted.length} ${t("transactionsDeleted")}`, () => { deleted.forEach((s) => restoreSale(s)); });
  };

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let totalCash = 0, totalDebt = 0, todayCash = 0, todayDebt = 0, totalCost = 0;
    sales.forEach((s) => {
      const amount = Number(s.price || s.grandTotal || 0);
      const qty = Number(s.quantity || 0);
      if (isOutstandingDebtSale(s)) {
        const remaining = getSaleRemainingDebt(s);
        totalDebt += remaining;
        if (s.saleDate && s.saleDate.slice(0, 10) === today) todayDebt += remaining;
      } else {
        totalCash += amount;
        if (s.saleDate && s.saleDate.slice(0, 10) === today) todayCash += amount;
      }
      const prod = products.find((p) => p.name === s.description);
      if (prod && prod.buyingPrice) totalCost += prod.buyingPrice * qty;
    });
    return { totalCash, totalDebt, todayCash, todayDebt, totalRevenue: totalCash, totalProfit: totalCash - totalCost };
  }, [sales, products]);

  const filteredSales = useMemo(() => {
    let list = viewMode === "all" ? sales : viewMode === "cash" ? sales.filter((s) => isCashSale(s)) : sales.filter((s) => isOutstandingDebtSale(s));
    list = [...list].sort((a, b) => {
      let va, vb;
      if (sortField === "date") { va = a.saleDate || ""; vb = b.saleDate || ""; }
      else if (sortField === "name") { va = a.description || ""; vb = b.description || ""; return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va); }
      else if (sortField === "amount") { va = Number(a.price || a.grandTotal || 0); vb = Number(b.price || b.grandTotal || 0); }
      else { va = a.saleDate || ""; vb = b.saleDate || ""; }
      return sortDir === "asc" ? new Date(va) - new Date(vb) : new Date(vb) - new Date(va);
    });
    return list;
  }, [sales, viewMode, sortField, sortDir]);

  const totalPages = Math.ceil(filteredSales.length / PAGE_SIZE);
  const paginatedSales = filteredSales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [viewMode, sortField, sortDir]);

  const toggleSort = (field) => { if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc"); else { setSortField(field); setSortDir("desc"); } };

  const bulk = useBulkSelect(filteredSales, (s) => s.id);

  const deleteSelectedSales = async () => {
    if (bulk.selected.length === 0) return;
    if (!(await confirmDialog(t("deleteSelectedTransactionsConfirm", { count: bulk.selected.length })))) return;
    let failed = 0;
    const count = bulk.selected.length;
    const deleted = bulk.selected.map((id) => sales.find((s) => s.id === id)).filter(Boolean);
    for (const id of bulk.selected) {
      try { await api.delete(`/sales/${id}`); } catch { failed++; }
    }
    bulk.clear();
    await reload();
    showMsg(failed > 0 ? t("deletedSelectedSomeFailed", { failed }) : t("deletedCountTransactions", { count }), failed > 0 ? "error" : "success");
    if (failed === 0) notifyUndo?.(`${deleted.length} ${t("transactionsDeleted")}`, () => { deleted.forEach((s) => restoreSale(s)); });
  };

  const selectedProduct = products.find((x) => x.id === Number(productId));

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <Spinner size={28} text={t("loading")} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="bag-handle" size={17} color={colors.white} />
          </View>
          <Text style={styles.headerTitle}>{t("transactions")}</Text>
          <Text style={styles.headerCount}>({sales.length})</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => (bulk.mode ? bulk.clear() : bulk.startMode())} style={[styles.selectBtn, bulk.mode && styles.selectBtnActive]} hitSlop={6}>
            <Ionicons name="checkbox-outline" size={13} color={colors.primary} />
            <Text style={styles.selectBtnText}>{bulk.mode ? t("cancel") : t("select")}</Text>
          </Pressable>
          {sales.length > 0 && (
            <Pressable onPress={deleteAllSales} style={styles.deleteAllBtn} hitSlop={6}>
              <Ionicons name="trash-outline" size={13} color={colors.danger} />
              <Text style={styles.deleteAllText}>{t("deleteAll")} ({sales.length})</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.statsGrid}>
        <Pressable onPress={() => setViewMode("all")} style={[styles.statCard, viewMode === "all" && styles.statCardActive]} hitSlop={6}>
          <View style={styles.statHead}>
            <Ionicons name="cash" size={12} color={colors.primary} />
            <Text style={styles.statLabel}>{t("totalSales")}</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.primary }]}>TZS {stats.totalRevenue.toLocaleString()}</Text>
          <Text style={styles.statSub}>{t("paidOnly")}</Text>
        </Pressable>
        {showProfit && (
          <Pressable onPress={() => setViewMode("cash")} style={[styles.statCard, viewMode === "cash" && styles.statCardProfitActive]} hitSlop={6}>
            <View style={styles.statHead}>
              <Ionicons name="trending-up" size={12} color="#16a34a" />
              <Text style={styles.statLabel}>{t("profit")}</Text>
            </View>
            <Text style={[styles.statValue, { color: stats.totalProfit >= 0 ? "#16a34a" : colors.danger }]}>TZS {stats.totalProfit.toLocaleString()}</Text>
            <Text style={styles.statSub}>{t("revenueMinusCost")}</Text>
          </Pressable>
        )}
        <Pressable onPress={() => setViewMode("debt")} style={[styles.statCard, viewMode === "debt" && styles.statCardDebtActive]} hitSlop={6}>
          <View style={styles.statHead}>
            <Ionicons name="card" size={12} color={colors.danger} />
            <Text style={styles.statLabel}>{t("outstandingDebt")}</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.danger }]}>TZS {stats.totalDebt.toLocaleString()}</Text>
          <Text style={styles.statSub}>{t("unpaidSales")}</Text>
        </Pressable>
      </View>

      <View style={styles.formCard}>
        <View style={styles.formProduct}>
          <ProductSelector value={productId} onChange={handleProductSelect} />
        </View>
        <View style={styles.formField}>
          <Text style={styles.formLabel}>{t("qty")}</Text>
          <QuantityInput
            value={Number(form.quantity) || 0}
            onChange={(v) => setForm({ ...form, quantity: v })}
            piecesPerUnit={selectedProduct?.piecesPerUnit || 0}
            unit={selectedProduct?.unit || "piece"}
            min={1}
            placeholder={t("quantityExample")}
          />
        </View>
        <View style={styles.formField}>
          <Text style={styles.formLabel}>{t("total")}</Text>
          <TextField value={form.price} onChangeText={(v) => setForm({ ...form, price: v })} keyboardType="decimal-pad" placeholder="0.00" containerStyle={{ marginBottom: 0 }} />
        </View>
        <Button
          title={editingId ? t("update") : t("add")}
          variant="primary"
          size="md"
          onPress={handleSubmit}
          icon={<Ionicons name={editingId ? "save" : "add"} size={13} color={colors.white} />}
        />
        {editingId && (
          <Button variant="outline" size="md" title={t("cancel")} onPress={() => { setEditingId(null); setForm({ description: "", quantity: "", price: "" }); }} />
        )}
      </View>

      {msg.text !== "" && (
        <View style={[styles.msgBar, msg.type === "error" ? styles.msgBarError : styles.msgBarSuccess]}>
          <Text style={msg.type === "error" ? styles.msgBarTextError : styles.msgBarTextSuccess}>{msg.text}</Text>
        </View>
      )}

      <View style={styles.filterRow}>
        {[{ v: "all", lk: "allSales", count: sales.length }, { v: "cash", lk: "cash", count: sales.filter((s) => isCashSale(s)).length }, { v: "debt", lk: "debt", count: sales.filter((s) => isOutstandingDebtSale(s)).length }].map((f) => (
          <Pressable key={f.v} onPress={() => setViewMode(f.v)} style={[styles.filterChip, viewMode === f.v && styles.filterChipActive]} hitSlop={6}>
            <Text style={[styles.filterChipText, viewMode === f.v && styles.filterChipTextActive]}>{t(f.lk)} ({f.count})</Text>
          </Pressable>
        ))}
        {bulk.mode && (
          <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected} onSelectAll={bulk.toggleAll} onDelete={deleteSelectedSales} deleteLabel={t("deleteSelected")} />
        )}
      </View>

      <View style={styles.tableCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tableInner}>
            <View style={styles.trHead}>
              {bulk.mode && (
                <View style={[styles.td, styles.colCheck]}>
                  <Pressable onPress={bulk.toggleAll} hitSlop={8}>
                    <Ionicons name={bulk.allSelected ? "checkbox" : "square-outline"} size={16} color={bulk.allSelected ? colors.primary : colors.slate400} />
                  </Pressable>
                </View>
              )}
              <Text style={[styles.th, styles.colDesc]}>{t("description")}</Text>
              <Text style={[styles.th, styles.colQty]}>{t("qty")}</Text>
              <Text style={[styles.th, styles.colRight]}>{t("cashAmount")}</Text>
              <Text style={[styles.th, styles.colRight]}>{t("debtAmount")}</Text>
              <Text style={[styles.th, styles.colStatus]}>{t("status")}</Text>
              <Pressable style={[styles.th, styles.colDate]} onPress={() => toggleSort("date")} hitSlop={6}>
                <View style={styles.thSortInner}>
                  <Text style={styles.thText}>{t("date")}</Text>
                  <Ionicons name="swap-vertical" size={10} color={colors.slate400} />
                </View>
              </Pressable>
              <Text style={[styles.th, styles.colActions]}>{t("actions")}</Text>
            </View>

            {filteredSales.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>{t("noTransactionsFound")}</Text>
              </View>
            ) : paginatedSales.map((s) => {
              const status = s.status || "completed";
              const isDebt = isOutstandingDebtSale(s);
              const isPaidDebt = isFullyPaidDebtSale(s);
              const remaining = getSaleRemainingDebt(s);
              const amount = Number(s.price || s.grandTotal || 0);
              const sColors = status === "pending" ? { bg: "#fef9c3", c: "#a16207" } : status === "cancelled" ? { bg: "#fef2f2", c: "#dc2626" } : { bg: "#f0fdf4", c: "#16a34a" };
              return (
                <View key={s.id} style={styles.tr}>
                  {bulk.mode && (
                    <View style={[styles.td, styles.colCheck]}>
                      <Pressable onPress={() => bulk.toggle(s.id)} hitSlop={8}>
                        <Ionicons name={bulk.selectedSet.has(s.id) ? "checkbox" : "square-outline"} size={16} color={bulk.selectedSet.has(s.id) ? colors.primary : colors.slate400} />
                      </Pressable>
                    </View>
                  )}
                  <View style={[styles.td, styles.colDesc]}>
                    <View style={styles.descCell} numberOfLines={2}>
                      <Text style={styles.descText}>{s.description || "—"}</Text>
                      {s.description && s.description.startsWith("Delivered Order") && (
                        <View style={styles.deliveredBadge}>
                          <Ionicons name="checkmark-circle" size={9} color="#2563eb" />
                          <Text style={styles.deliveredText}>{t("delivered")}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.td, styles.colQty, styles.qtyText]}>{s.quantity}</Text>
                  <Text style={[styles.td, styles.colRight, { fontWeight: "600", color: isCashSale(s) ? "#16a34a" : "#d1d5db" }]}>
                    {isCashSale(s) ? `TZS ${amount.toFixed(2)}` : "—"}
                  </Text>
                  <Text style={[styles.td, styles.colRight, { fontWeight: "600", color: isDebt ? colors.danger : "#d1d5db" }]}>
                    {isDebt ? `TZS ${remaining.toFixed(2)}` : "—"}
                  </Text>
                  <View style={[styles.td, styles.colStatus]}>
                    <View style={styles.statusWrap}>
                      <View style={[styles.payBadge, { backgroundColor: isDebt ? colors.dangerLight : "#f0fdf4" }]}>
                        <Text style={[styles.payBadgeText, { color: isDebt ? colors.danger : "#16a34a" }]}>
                          {isDebt ? t("debt") : isPaidDebt ? t("paid") : t("cash")}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: sColors.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: sColors.c }]}>{status}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.td, styles.colDate, styles.dateText]}>{s.saleDate ? new Date(s.saleDate).toLocaleDateString() : "—"}</Text>
                  <View style={[styles.td, styles.colActions, styles.actionsCell]}>
                    <Pressable onPress={() => editSale(s)} hitSlop={6} style={{ padding: 2 }}>
                      <Ionicons name="pencil" size={13} color={colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => deleteSale(s.id)} hitSlop={6} style={{ padding: 2 }}>
                      <Ionicons name="trash-outline" size={13} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
        {totalPages > 1 && (
          <View style={styles.pager}>
            <Pressable disabled={page <= 1} onPress={() => setPage((p) => p - 1)} style={[styles.pageNav, page <= 1 && styles.pageNavDisabled]} hitSlop={6}>
              <Ionicons name="chevron-back" size={14} color={page <= 1 ? colors.slate300 : colors.slate600} />
              <Text style={[styles.pageNavText, page <= 1 && styles.pageNavTextDisabled]}>{t("prev")}</Text>
            </Pressable>
            {(() => {
              const pages = [];
              const start = Math.max(1, page - 2);
              const end = Math.min(totalPages, page + 2);
              for (let i = start; i <= end; i++) {
                pages.push(
                  <Pressable key={i} onPress={() => setPage(i)} style={[styles.pageNum, page === i && styles.pageNumActive]} hitSlop={6}>
                    <Text style={[styles.pageNumText, page === i && styles.pageNumTextActive]}>{i}</Text>
                  </Pressable>
                );
              }
              return pages;
            })()}
            <Pressable disabled={page >= totalPages} onPress={() => setPage((p) => p + 1)} style={[styles.pageNav, page >= totalPages && styles.pageNavDisabled]} hitSlop={6}>
              <Text style={[styles.pageNavText, page >= totalPages && styles.pageNavTextDisabled]}>{t("next")}</Text>
              <Ionicons name="chevron-forward" size={14} color={page >= totalPages ? colors.slate300 : colors.slate600} />
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.exchangeCard}>
        <Pressable onPress={() => setShowExchanges((v) => !v)} style={styles.exchangeHeader} hitSlop={6}>
          <View style={styles.exchangeTitleRow}>
            <Ionicons name="swap-horizontal" size={16} color="#8b5cf6" />
            <Text style={styles.exchangeTitle}>{t("exchangeHistory")}</Text>
          </View>
          <View style={styles.exchangeMeta}>
            <View style={styles.exchangeCount}>
              <Text style={styles.exchangeCountText}>{exchanges.length} {t("records")}</Text>
            </View>
            <Ionicons name={showExchanges ? "chevron-up" : "chevron-down"} size={13} color={colors.slate400} />
          </View>
        </Pressable>
        {showExchanges && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.exchangeTableInner}>
              <View style={styles.trHead}>
                <Text style={[styles.th, styles.exColProduct]}>{t("product")}</Text>
                <Text style={[styles.th, styles.exColType]}>{t("type")}</Text>
                <Text style={[styles.th, styles.exColQty]}>{t("qty")}</Text>
                <Text style={[styles.th, styles.exColReason]}>{t("reason")}</Text>
                <Text style={[styles.th, styles.exColStatus]}>{t("status")}</Text>
                <Text style={[styles.th, styles.exColDate]}>{t("date")}</Text>
              </View>
              {exchanges.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>{t("noExchangeRecords")}</Text>
                </View>
              ) : (() => {
                const sorted = [...exchanges].sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
                const totalExPages = Math.ceil(sorted.length / EXCHANGE_PAGE_SIZE);
                const paginatedEx = sorted.slice((exchangePage - 1) * EXCHANGE_PAGE_SIZE, exchangePage * EXCHANGE_PAGE_SIZE);
                const statusColor = (st) => st === "Completed" || st === "Approved" ? { bg: "#f0fdf4", c: "#16a34a" } : st === "Pending" ? { bg: "#fef3c7", c: "#92400e" } : { bg: "#fef2f2", c: "#dc2626" };
                return (
                  <>
                    {paginatedEx.map((ex) => {
                      const productName = ex.productName || ex.product?.name || "—";
                      const typeColors = {
                        "Wrong Purchase": { bg: "#fef3c7", c: "#92400e" },
                        "Expired": { bg: "#fef2f2", c: "#dc2626" },
                        "Destruction": { bg: "#fef2f2", c: "#991b1b" },
                        "Exchange": { bg: "#eff6ff", c: "#2563eb" },
                        "Storage": { bg: "#f0fdf4", c: "#16a34a" },
                      };
                      const tc = typeColors[ex.type] || { bg: "#f8fafc", c: "#64748b" };
                      const sc = statusColor(ex.status);
                      return (
                        <View key={ex.id} style={styles.tr}>
                          <Text style={[styles.td, styles.exColProduct, styles.exProductName]} numberOfLines={1}>{productName}</Text>
                          <View style={[styles.td, styles.exColType, styles.cellCenter]}>
                            <View style={[styles.exBadge, { backgroundColor: tc.bg }]}>
                              <Text style={[styles.exBadgeText, { color: tc.c }]}>{ex.type}</Text>
                            </View>
                          </View>
                          <Text style={[styles.td, styles.exColQty, styles.cellCenter, { fontWeight: "600", color: colors.danger }]}>-{ex.quantity}</Text>
                          <Text style={[styles.td, styles.exColReason, { color: colors.slate600 }]} numberOfLines={1}>{ex.reason || "—"}</Text>
                          <View style={[styles.td, styles.exColStatus, styles.cellCenter]}>
                            <View style={[styles.exBadge, { backgroundColor: sc.bg }]}>
                              <Text style={[styles.exBadgeText, { color: sc.c }]}>{ex.status}</Text>
                            </View>
                          </View>
                          <Text style={[styles.td, styles.exColDate, styles.dateText]}>{ex.date ? new Date(ex.date).toLocaleDateString() : "—"}</Text>
                        </View>
                      );
                    })}
                    {totalExPages > 1 && (
                      <View style={styles.exPager}>
                        <Pressable disabled={exchangePage <= 1} onPress={() => setExchangePage((p) => p - 1)} style={styles.exPrevNext} hitSlop={6}>
                          <Text style={styles.exPrevNextText}>{t("prev")}</Text>
                        </Pressable>
                        <Text style={styles.exPageNow}>{exchangePage} / {totalExPages}</Text>
                        <Pressable disabled={exchangePage >= totalExPages} onPress={() => setExchangePage((p) => p + 1)} style={styles.exPrevNext} hitSlop={6}>
                          <Text style={styles.exPrevNextText}>{t("next")}</Text>
                        </Pressable>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50, padding: spacing.sm },
  body: { gap: spacing.sm, paddingBottom: 64 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", height: 400 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm, flexShrink: 0 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  headerIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: font.lg, fontWeight: "700", color: colors.slate900 },
  headerCount: { color: colors.slate400, fontSize: font.xs },
  headerActions: { flexDirection: "row", gap: 6, flexShrink: 0 },
  selectBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.slate300, borderRadius: 6, backgroundColor: colors.white },
  selectBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  selectBtnText: { fontSize: font.sm, fontWeight: "600", color: colors.primary },
  deleteAllBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: "#fecaca", borderRadius: 6 },
  deleteAllText: { color: colors.danger, fontSize: font.sm, fontWeight: "600" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, flexShrink: 0 },
  statCard: { flex: 1, minWidth: 150, backgroundColor: colors.white, borderWidth: 1, borderTopWidth: 3, borderTopColor: colors.primary, borderColor: colors.slate200, borderRadius: radius.md, padding: spacing.md, gap: 2, ...shadow.card },
  statCardActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  statCardProfitActive: { backgroundColor: "#f0fdf4", borderColor: "#16a34a" },
  statCardDebtActive: { backgroundColor: colors.dangerLight, borderColor: colors.danger },
  statHead: { flexDirection: "row", alignItems: "center", gap: 4 },
  statLabel: { fontSize: font.xs, color: colors.slate500, fontWeight: "600", textTransform: "uppercase" },
  statValue: { fontSize: font.xl, fontWeight: "700" },
  statSub: { fontSize: font.xs, color: colors.slate400 },

  formCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md, padding: spacing.md, flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, flexWrap: "wrap", flexShrink: 0 },
  formProduct: { flex: 1, minWidth: 180 },
  formField: { width: 130 },
  formLabel: { fontSize: font.xs, fontWeight: "700", color: colors.slate500, textTransform: "uppercase", marginBottom: 4 },

  msgBar: { padding: 6, paddingHorizontal: 10, borderRadius: 5, flexShrink: 0 },
  msgBarSuccess: { backgroundColor: "#f0fdf4" },
  msgBarError: { backgroundColor: colors.dangerLight },
  msgBarTextSuccess: { color: "#166534", fontSize: font.xs },
  msgBarTextError: { color: "#991b1b", fontSize: font.xs },

  filterRow: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6, borderWidth: 1, borderColor: colors.slate200, backgroundColor: colors.white },
  filterChipActive: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primaryLight },
  filterChipText: { fontSize: font.xs, fontWeight: "600", color: colors.slate500 },
  filterChipTextActive: { color: colors.primary },

  tableCard: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md, overflow: "hidden", minHeight: 120, flexShrink: 1 },
  tableInner: { minWidth: 640 },
  trHead: { flexDirection: "row", backgroundColor: colors.slate50, borderBottomWidth: 2, borderBottomColor: colors.slate200 },
  th: { paddingVertical: 8, paddingHorizontal: 10, flexDirection: "row", alignItems: "center" },
  thText: { fontSize: font.xs, fontWeight: "700", color: colors.slate500, textTransform: "uppercase" },
  thSortInner: { flexDirection: "row", alignItems: "center", gap: 3 },
  tr: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.slate100, minHeight: 44 },
  td: { paddingVertical: 8, paddingHorizontal: 10, justifyContent: "center" },
  colCheck: { width: 32, alignItems: "center", justifyContent: "center" },
  colDesc: { flex: 1.4, minWidth: 140 },
  colQty: { width: 60, textAlign: "center", alignItems: "center" },
  colRight: { width: 100, alignItems: "flex-end", textAlign: "right" },
  colStatus: { width: 110, alignItems: "center" },
  colDate: { width: 90 },
  colActions: { width: 70, alignItems: "center" },

  descCell: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  descText: { fontWeight: "600", color: colors.slate700, fontSize: font.xs },
  deliveredBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 1, paddingHorizontal: 6, borderRadius: radius.pill, backgroundColor: "#dbeafe", borderWidth: 1, borderColor: "#93c5fd" },
  deliveredText: { fontSize: 9, fontWeight: "700", color: colors.primary },
  qtyText: { fontWeight: "600" },
  statusWrap: { flexDirection: "row", alignItems: "center", gap: 3, flexWrap: "wrap", justifyContent: "center" },
  payBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.pill },
  payBadgeText: { fontSize: 10, fontWeight: "600" },
  statusBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.pill },
  statusBadgeText: { fontSize: 10, fontWeight: "600" },
  dateText: { color: colors.slate400, fontSize: font.xs },
  actionsCell: { flexDirection: "row", alignItems: "center", gap: 8 },

  emptyRow: { padding: 32, alignItems: "center" },
  emptyText: { color: colors.slate400, fontSize: font.sm },

  pager: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: spacing.md },
  pageNav: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.slate300, borderRadius: 6, backgroundColor: colors.white },
  pageNavDisabled: { backgroundColor: colors.slate100 },
  pageNavText: { fontSize: font.sm, fontWeight: "500", color: colors.slate600 },
  pageNavTextDisabled: { color: colors.slate400 },
  pageNum: { width: 32, height: 32, borderWidth: 1, borderColor: colors.slate300, borderRadius: 6, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  pageNumActive: { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary },
  pageNumText: { fontSize: font.sm, fontWeight: "500", color: colors.slate600 },
  pageNumTextActive: { color: colors.white, fontWeight: "700" },

  exchangeCard: { marginTop: spacing.sm, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md, overflow: "hidden", flexShrink: 0 },
  exchangeHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: 10, paddingHorizontal: 14, backgroundColor: colors.slate50 },
  exchangeTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  exchangeTitle: { fontSize: font.sm, fontWeight: "700", color: colors.slate900 },
  exchangeMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  exchangeCount: { backgroundColor: "#f3e8ff", borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 8 },
  exchangeCountText: { fontSize: 10, fontWeight: "600", color: "#7c3aed" },
  exchangeTableInner: { minWidth: 620 },
  exColProduct: { flex: 1.2, minWidth: 130 },
  exColType: { width: 120, alignItems: "center" },
  exColQty: { width: 60 },
  exColReason: { flex: 1.4, minWidth: 140 },
  exColStatus: { width: 100, alignItems: "center" },
  exColDate: { width: 90 },
  cellCenter: { alignItems: "center", justifyContent: "center" },
  exProductName: { fontWeight: "600" },
  exBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.pill },
  exBadgeText: { fontSize: 10, fontWeight: "600" },
  exPager: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, padding: 10 },
  exPrevNext: { paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.slate300, borderRadius: 4, backgroundColor: colors.white },
  exPrevNextText: { fontSize: font.xs, fontWeight: "500", color: colors.slate600 },
  exPageNow: { fontSize: font.xs, color: colors.slate500 },
});