import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { View, Text, Pressable, FlatList, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { Card, TextField, SelectField, Button, Badge } from "../components/ui";
import { confirmDialog } from "../utils/confirm";
import { exportCsv } from "../utils/export";
import { useNav } from "../navigation/nav";
import { t, useLanguage } from "../i18n";
import { colors, font, radius, spacing, shadow, statusColor } from "../theme";

const TYPE_OPTIONS = [
  "All",
  "Added",
  "Sold",
  "Sell",
  "Delivered",
  "Returned",
  "Expired",
  "Damaged",
  "Restock",
  "Wasted",
];

function RowCheckBox({ checked, onToggle }) {
  return (
    <Pressable onPress={onToggle} hitSlop={6}>
      <Ionicons
        name={checked ? "checkbox" : "square-outline"}
        size={18}
        color={checked ? colors.primary : colors.slate400}
      />
    </Pressable>
  );
}

export default function StockHistory() {
  useLanguage();
  const navigate = useNav();
  const [allItems, setAllItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortF, setSortF] = useState("date");
  const [sortD, setSortD] = useState("desc");
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState("");
  const [showStats, setShowStats] = useState(true);
  const PAGE_SIZE = 10;

  const loadData = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [hr, pr] = await Promise.all([
        api.get("/stock-history").catch(() => ({ data: [] })),
        api.get("/products").catch(() => ({ data: [] })),
      ]);
      setAllItems(Array.isArray(hr.data) ? hr.data : []);
      setProducts(Array.isArray(pr.data) ? pr.data : []);
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const reload = async () => {
    setLoadError(false);
    try {
      const res = await api.get("/stock-history").catch(() => ({ data: [] }));
      setAllItems(Array.isArray(res.data) ? res.data : []);
    } catch { setLoadError(true); }
  };

  const getProductName = (h) => {
    const pid = h.product?.id || h.productId;
    const p = products.find((x) => x.id === pid);
    return p?.name || h.productName || h.product?.name || "\u2014";
  };

  const getProductUnit = (h) => {
    const pid = h.product?.id || h.productId;
    const p = products.find((x) => x.id === pid);
    return p?.unit || "piece";
  };

  const decorated = useMemo(() => {
    const items = allItems.map((h) => {
      const q = Number(h.quantityChange) || 0;
      const type = (h.transactionType || "").trim() || "Unknown";
      const ts = h.createdAt || h.date || "";
      return {
        id: `hist-${h.id}`,
        historyId: h.id,
        productId: h.product?.id || h.productId,
        name: getProductName(h),
        unit: getProductUnit(h),
        quantityChange: q,
        direction: q > 0 ? "in" : q < 0 ? "out" : "zero",
        resultingQuantity: Number(h.resultingQuantity) || 0,
        transactionType: type,
        transactionKey: type === "Added" ? "added" : type === "Sold" || type === "Sell" ? "sold" : type.toLowerCase(),
        date: ts,
        dateLabel: ts ? new Date(ts).toLocaleDateString() : "\u2014",
        timeLabel: ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--",
      };
    });

    return items;
  }, [allItems, products]);

  const filtered = useMemo(() => {
    let items = decorated;
    if (typeFilter !== "All") {
      items = items.filter((r) => r.transactionType === typeFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((r) => r.name.toLowerCase().includes(q));
    }
    items.sort((a, b) => {
      let va, vb;
      if (sortF === "name") { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortF === "qty") { va = a.quantityChange; vb = b.quantityChange; }
      else { va = a.date; vb = b.date; }
      return typeof va === "string" ? (sortD === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)) : (sortD === "asc" ? va - vb : vb - va);
    });
    return items;
  }, [decorated, search, typeFilter, sortF, sortD]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, typeFilter, sortF, sortD]);

  const bulk = useBulkSelect(filtered, (r) => r.id);

  const analytics = useMemo(() => {
    const added = {};
    const sold = {};
    const deleted = {};
    const wasted = {};
    const low = {};
    const byType = {};

    decorated.forEach((r) => {
      byType[r.transactionKey] = (byType[r.transactionKey] || 0) + r.quantityChange;
      const type = r.transactionKey;
      if (type === "added") added[r.name] = (added[r.name] || 0) + r.quantityChange;
      if (type === "sold") sold[r.name] = (sold[r.name] || 0) + Math.abs(r.quantityChange);
      if (type === "delivered" || type === "returned") deleted[r.name] = (deleted[r.name] || 0) + Math.abs(r.quantityChange);
      if (type === "expired" || type === "damaged" || type === "restock" || type === "wasted") wasted[r.name] = (wasted[r.name] || 0) + Math.abs(r.quantityChange);
      if (r.resultingQuantity > 0 && r.resultingQuantity <= 10) low[r.name] = r.resultingQuantity;
    });

    const toSorted = (obj, desc) => Object.entries(obj).sort((a, b) => (desc ? b[1] - a[1] : a[1] - b[1]) || a[0].localeCompare(b[0]));

    return {
      byType,
      topAdded: toSorted(added, true).slice(0, 8),
      topSold: toSorted(sold, true).slice(0, 8),
      topDeleted: toSorted(deleted, true).slice(0, 8),
      topWasted: toSorted(wasted, true).slice(0, 8),
      low: Object.entries(low).sort((a, b) => a[1] - b[1]).slice(0, 8),
    };
  }, [decorated]);

  const deleteSelected = async () => {
    if (bulk.selected.length === 0) return;
    if (!(await confirmDialog(t("deleteSelectedCount", { count: bulk.selected.length, type: t("entries") })))) return;
    setMsg("");
    try {
      if (bulk.allSelected) {
        await api.post("/stock-history/bulk-delete", { ids: filtered.map((r) => r.historyId) }).catch(() => {});
        for (const r of filtered) { try { await api.delete(`/stock-history/${r.historyId}`); } catch {} }
      } else {
        for (const id of bulk.selected) {
          const r = filtered.find((x) => x.id === id);
          if (r) { try { await api.delete(`/stock-history/${r.historyId}`); } catch {} }
        }
      }
      bulk.clear();
      await reload();
      setMsg(t("deleted"));
      setTimeout(() => setMsg(""), 2000);
    } catch { setMsg(t("failed")); setTimeout(() => setMsg(""), 2000); }
  };

  const deleteSingle = async (r) => {
    if (!(await confirmDialog(t("deleteHistoryEntryConfirm")))) return;
    try {
      await api.delete(`/stock-history/${r.historyId}`);
      await reload();
      setMsg(t("deleted"));
      setTimeout(() => setMsg(""), 2000);
    } catch { setMsg(t("failed")); setTimeout(() => setMsg(""), 2000); }
  };

  const doExport = () => {
    if (decorated.length === 0) {
      setMsg(t("noRecords"));
      setTimeout(() => setMsg(""), 2000);
      return;
    }
    const rows = decorated.map((r) => ({
      Date: r.dateLabel,
      Time: r.timeLabel,
      Product: r.name,
      Unit: r.unit,
      change: r.quantityChange > 0 ? `+${r.quantityChange}` : `${r.quantityChange}`,
      "Resulting Qty": r.resultingQuantity,
      Type: r.transactionType,
    }));
    exportCsv(`stock-history-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    setMsg(t("exported"));
    setTimeout(() => setMsg(""), 2000);
  };

  const toggleSort = useCallback((field) => {
    if (sortF === field) setSortD((d) => d === "asc" ? "desc" : "asc");
    else { setSortF(field); setSortD("desc"); }
  }, [sortF]);

  if (loading) return (
    <View style={s.loadingWrap}>
      <Spinner size={28} text={t("loading")} />
    </View>
  );

  if (loadError) return (
    <View style={s.errorWrap}>
      <Ionicons name="warning" size={40} color="#f59e0b" style={{ opacity: 0.6 }} />
      <Text style={s.errorTitle}>{t("failedToLoadStockData")}</Text>
      <Text style={s.errorSub}>{t("checkBackendEndpoint")}</Text>
      <Pressable onPress={loadData} style={s.retryBtn}>
        <Ionicons name="refresh" size={14} color={colors.white} />
        <Text style={s.retryBtnText}>{t("retry")}</Text>
      </Pressable>
    </View>
  );

  const typeTone = (type) => {
    const t = (type || "").toLowerCase();
    if (t === "added") return "success";
    if (t === "sold" || t === "sell") return "danger";
    if (t === "expired" || t === "damaged") return "warning";
    return "info";
  };

  const typeColor = {
    success: colors.success,
    danger: colors.danger,
    warning: colors.warning,
    info: colors.info,
    "in": colors.success,
    "out": colors.danger,
  };

  const statCardKeys = [
    { label: t("totalAdded"), key: "added", iconName: "add-circle", tone: "success" },
    { label: t("totalSold"), key: "sold", iconName: "cart", tone: "danger" },
    { label: "Delivered", key: "delivered", iconName: "checkmark-circle", tone: "info" },
    { label: "Returned", key: "returned", iconName: "return-down-back", tone: "warning" },
    { label: "Expired", key: "expired", iconName: "time", tone: "warning" },
    { label: "Damaged", key: "damaged", iconName: "warning", tone: "danger" },
  ];

  return (
    <View style={s.root}>
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Ionicons name="time-outline" size={22} color={colors.primary} />
          <Text style={s.headerTitle}>{t("stockHistory")}</Text>
          <Text style={s.headerCount}>({filtered.length} {t("entries")})</Text>
        </View>
        <View style={s.headerRight}>
          <Pressable onPress={() => bulk.mode ? bulk.clear() : bulk.startMode()} style={[s.bulkBtn, bulk.mode && s.bulkBtnActive]}>
            <Ionicons name="checkbox" size={14} color={colors.primary} />
            <Text style={s.bulkBtnText}>{bulk.mode ? t("cancelSelect") : t("select")}</Text>
          </Pressable>
          <Pressable onPress={() => setShowStats(!showStats)} style={[s.bulkBtn, showStats && s.bulkBtnActive]}>
            <Ionicons name="bar-chart" size={14} color={colors.primary} />
            <Text style={s.bulkBtnText}>{showStats ? t("hideStats") : t("showStats")}</Text>
          </Pressable>
          <Pressable onPress={doExport} style={s.exportBtn}>
            <Ionicons name="download" size={14} color={colors.white} />
            <Text style={s.addBtnText}>{t("export")}</Text>
          </Pressable>
        </View>
      </View>

      {showStats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsRow}>
          {statCardKeys.map((c) => {
            const val = analytics.byType[c.key] || 0;
            const color = typeColor[c.tone];
            return (
              <View key={c.key} style={[s.statCard, { borderTopColor: color, borderColor: colors.slate200, backgroundColor: colors.white }]}>
                <View style={s.statLabelRow}>
                  <Ionicons name={c.iconName} size={12} color={color} />
                  <Text style={[s.statLabel, { color }]}>{c.label}</Text>
                </View>
                <Text style={[s.statValue, { color }]}>{val > 0 ? `+${val}` : val}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={s.controlsRow}>
        <View style={s.searchWrap}>
          <Ionicons name="search" size={14} color={colors.slate400} style={s.searchIcon} />
          <TextField value={search} onChangeText={setSearch} placeholder={t("searchProducts")} containerStyle={s.searchField} />
        </View>
        <View style={s.typeFilter}>
          <SelectField
            label=""
            value={typeFilter}
            onChange={setTypeFilter}
            options={TYPE_OPTIONS.map((o) => ({ value: o, label: o }))}
            placeholder={t("filterByType")}
            containerStyle={{ marginBottom: 0, minWidth: 150 }}
          />
        </View>
        {bulk.mode && <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected} onSelectAll={bulk.toggleAll} onDelete={deleteSelected} deleteLabel={t("deleteSelected")} />}
      </View>

      {msg !== "" && (
        <View style={[s.msgBar, msg.includes("Failed") ? s.msgBarError : s.msgBarSuccess]}>
          <Text style={[s.msgText, msg.includes("Failed") ? s.msgTextError : s.msgTextSuccess]}>{msg}</Text>
        </View>
      )}

      {showStats && analytics.topSold.length > 0 && (
        <Card padded={false} style={s.analyticsCard}>
          <View style={s.analyticsHeader}>
            <Ionicons name="trending-up" size={12} color={colors.success} />
            <Text style={s.analyticsTitle}>{t("topProductsActivity")}</Text>
          </View>
          <View style={s.analyticsGrid}>
            {[
              { label: t("topAdded"), items: analytics.topAdded, tone: colors.success },
              { label: t("topSold"), items: analytics.topSold, tone: colors.danger },
              { label: t("topWasted"), items: analytics.topWasted, tone: colors.warning },
              { label: t("lowProducts"), items: analytics.low, tone: "#a16207" },
            ].map((sec, i) => (
              <View key={i} style={s.analyticsCol}>
                <Text style={[s.analyticsColTitle, { color: sec.tone }]}>{sec.label}</Text>
                {sec.items.length === 0 ? (
                  <Text style={s.analyticsEmpty}>{"\u2014"}</Text>
                ) : sec.items.map(([name, val]) => (
                  <View key={name} style={s.analyticsItem}>
                    <Text style={s.analyticsName} numberOfLines={1}>{name}</Text>
                    <Text style={[s.analyticsVal, { color: sec.tone }]}>{val}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </Card>
      )}

      <Card padded={false} style={s.tableCard}>
        <View style={s.tableBody}>
          {filtered.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="time-outline" size={28} color={colors.slate300} />
              <Text style={s.noData}>{t("noRecordsFound")}</Text>
            </View>
          ) : (
            <FlatList
              data={pageItems}
              keyExtractor={(r) => r.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: spacing.sm }}
              renderItem={({ item: r }) => (
                <View key={r.id} style={s.row}>
                  {bulk.mode && (
                    <View style={s.rowCheck}>
                      <RowCheckBox checked={bulk.selectedSet.has(r.id)} onToggle={() => bulk.toggle(r.id)} />
                    </View>
                  )}
                  <View style={s.rowProduct}>
                    <View style={[s.rowChip, { backgroundColor: typeColor[typeTone(r.transactionType)] + "18" }]}>
                      <Ionicons
                        name={r.quantityChange >= 0 ? "arrow-up-circle" : "arrow-down-circle"}
                        size={14}
                        color={r.quantityChange >= 0 ? colors.success : colors.danger}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.rowName} numberOfLines={1}>{r.name}</Text>
                      <Text style={s.rowSub}>{r.unit}</Text>
                    </View>
                  </View>
                  <View style={[s.rowCenter, { width: 64 }]}>
                    {r.quantityChange !== 0 ? (
                      <Text style={[s.rowQty, { color: r.quantityChange > 0 ? colors.success : colors.danger }]}>
                        {r.quantityChange > 0 ? `+${r.quantityChange}` : r.quantityChange}
                      </Text>
                    ) : (
                      <Text style={s.rowQtyZero}>0</Text>
                    )}
                    <Text style={[s.rowSub, { fontSize: 9 }]}>{"\u2192"} {r.resultingQuantity}</Text>
                  </View>
                  <View style={s.rowType}>
                    <Badge text={r.transactionType} tone={typeTone(r.transactionType)} style={{ alignSelf: "flex-start" }} />
                  </View>
                  <Text style={s.rowDate}>{r.dateLabel}</Text>
                  <Text style={s.rowTime}>{r.timeLabel}</Text>
                  <View style={s.rowActions}>
                    <Pressable onPress={() => deleteSingle(r)} hitSlop={4}>
                      <Ionicons name="trash" size={13} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              )}
            />
          )}
        </View>
        {totalPages > 1 && (
          <View style={s.paginationBar}>
            <Text style={s.paginationText}>{t("pageXofY", { page: currentPage, total: totalPages, count: filtered.length, type: t("entries") })}</Text>
            <View style={s.paginationBtns}>
              <Pressable onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} style={[s.pageBtn, currentPage <= 1 && s.pageBtnDisabled]}>
                <Ionicons name="chevron-back" size={13} color={currentPage <= 1 ? colors.slate300 : colors.slate700} />
                <Text style={[s.pageBtnText, currentPage <= 1 && s.pageBtnTextDisabled]}>{t("prev")}</Text>
              </Pressable>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                const start = Math.max(1, currentPage - 5);
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <Pressable key={p} onPress={() => setPage(p)} style={[s.pageNumBtn, p === currentPage && s.pageNumBtnActive]}>
                    <Text style={[s.pageNumText, p === currentPage && s.pageNumTextActive]}>{p}</Text>
                  </Pressable>
                );
              })}
              <Pressable onPress={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} style={[s.pageBtn, currentPage >= totalPages && s.pageBtnDisabled]}>
                <Text style={[s.pageBtnText, currentPage >= totalPages && s.pageBtnTextDisabled]}>{t("next")}</Text>
                <Ionicons name="chevron-forward" size={13} color={currentPage >= totalPages ? colors.slate300 : colors.slate700} />
              </Pressable>
            </View>
          </View>
        )}
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50, padding: spacing.sm, gap: spacing.sm },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", height: 400 },
  errorWrap: { flex: 1, alignItems: "center", justifyContent: "center", height: 400, gap: spacing.md },
  errorTitle: { fontSize: 18, fontWeight: "700", color: colors.slate900, margin: 0 },
  errorSub: { fontSize: 13, color: colors.slate500, textAlign: "center", maxWidth: 400, margin: 0 },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.primary, borderRadius: radius.md },
  retryBtnText: { color: colors.white, fontWeight: "600", fontSize: 13 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexShrink: 0, flexWrap: "wrap", gap: spacing.sm },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.slate900 },
  headerCount: { color: colors.slate400, fontSize: 12 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bulkBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate300, backgroundColor: colors.white },
  bulkBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  bulkBtnText: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: radius.sm },
  addBtnText: { color: colors.white, fontWeight: "600", fontSize: 12 },
  statsRow: { flexDirection: "row", gap: spacing.sm, flexShrink: 0 },
  statCard: { minWidth: 130, flex: 1, borderRadius: radius.md, borderWidth: 1, borderTopWidth: 3, padding: spacing.md },
  statLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  statValue: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  controlsRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center", flexShrink: 0, flexWrap: "wrap" },
  searchWrap: { flex: 1, minWidth: 200, maxWidth: 320, position: "relative" },
  searchIcon: { position: "absolute", left: 8, top: 12, zIndex: 1 },
  searchField: { marginBottom: 0 },
  typeFilter: { flexShrink: 0 },
  msgBar: { padding: spacing.sm, borderRadius: radius.sm, flexShrink: 0 },
  msgBarSuccess: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  msgBarError: { backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: "#fecaca" },
  msgText: { fontSize: 11 },
  msgTextSuccess: { color: "#166534" },
  msgTextError: { color: colors.dangerDark },
  analyticsCard: { flexShrink: 0, maxHeight: 220 },
  analyticsHeader: { flexDirection: "row", alignItems: "center", gap: 6, padding: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.slate100 },
  analyticsTitle: { fontSize: 11, fontWeight: "700", color: colors.slate700, textTransform: "uppercase" },
  analyticsGrid: { flexDirection: "row", padding: spacing.sm, gap: spacing.sm },
  analyticsCol: { flex: 1, gap: 2, minWidth: 0 },
  analyticsColTitle: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", marginBottom: 2 },
  analyticsEmpty: { color: colors.slate300, fontSize: 12, paddingVertical: 10, textAlign: "center" },
  analyticsItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4, paddingVertical: 2 },
  analyticsName: { flex: 1, fontSize: 10, color: colors.slate600, minWidth: 0 },
  analyticsVal: { fontSize: 11, fontWeight: "700", minWidth: 28, textAlign: "right" },
  tableCard: { flex: 1, minHeight: 0 },
  tableBody: { flex: 1 },
  emptyWrap: { alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl * 2 },
  noData: { textAlign: "center", color: colors.slate400, fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.slate100, gap: spacing.xs, minHeight: 44 },
  rowCheck: { width: 28, alignItems: "center" },
  rowProduct: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, minWidth: 0 },
  rowChip: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  rowName: { fontWeight: "600", color: colors.slate900, fontSize: 12 },
  rowSub: { fontSize: 10, color: colors.slate400 },
  rowCenter: { width: 60, alignItems: "center" },
  rowQty: { fontSize: 12, fontWeight: "700" },
  rowQtyZero: { fontSize: 12, color: colors.slate400 },
  rowType: { width: 90 },
  rowDate: { width: 84, fontSize: 11, color: colors.slate500 },
  rowTime: { width: 64, fontSize: 11, color: colors.slate400, textAlign: "right" },
  rowActions: { flexDirection: "row", gap: spacing.sm },
  paginationBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.slate100, backgroundColor: colors.slate50 },
  paginationText: { fontSize: 11, color: colors.slate500 },
  paginationBtns: { flexDirection: "row", gap: 4, alignItems: "center" },
  pageBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate200 },
  pageBtnDisabled: { backgroundColor: colors.slate100 },
  pageBtnText: { fontSize: 11, fontWeight: "600", color: colors.slate700 },
  pageBtnTextDisabled: { color: colors.slate300 },
  pageNumBtn: { width: 26, height: 26, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate200, alignItems: "center", justifyContent: "center" },
  pageNumBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pageNumText: { fontSize: 11, fontWeight: "600", color: colors.slate700 },
  pageNumTextActive: { color: colors.white },
});