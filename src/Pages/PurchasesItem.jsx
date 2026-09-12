import { useEffect, useState, useMemo, useCallback } from "react";
import { View, Text, Pressable, FlatList, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { Card, TextField, SelectField, Button, Modal, Badge } from "../components/ui";
import { confirmDialog } from "../utils/confirm";
import { exportCsv } from "../utils/export";
import { useNav } from "../navigation/nav";
import { t, useLanguage } from "../i18n";
import { colors, font, radius, spacing, shadow, money, statusColor } from "../theme";

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

function DateInput({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState("1");
  const [month, setMonth] = useState("01");
  const [year, setYear] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    if (open && value) {
      const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) { setYear(m[1]); setMonth(m[2]); setDay(String(Number(m[3]))); }
    }
  }, [open, value]);

  const dayOptions = Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, "0"),
    label: new Date(2000, i, 1).toLocaleString("default", { month: "short" }) + ` \u2014 ${String(i + 1).padStart(2, "0")}`,
  }));
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => ({
    value: String(currentYear - 4 + i),
    label: String(currentYear - 4 + i),
  }));

  const parsed = value ? value.match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
  const display = parsed ? `${parsed[3]}/${parsed[2]}/${parsed[1]}` : "\u2014";

  const applyDate = () => {
    onChange(`${year}-${month}-${day.padStart(2, "0")}`);
    setOpen(false);
  };

  const clearDate = () => {
    onChange("");
    setOpen(false);
  };

  return (
    <View style={{ flex: 1, minWidth: 140 }}>
      <Text style={s.dateLabel}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={s.dateTrigger}>
        <Ionicons name="calendar" size={13} color={colors.primary} />
        <Text style={[s.dateTriggerText, { color: value ? colors.slate900 : colors.slate400 }]}>{display}</Text>
        {value ? (
          <Pressable onPress={clearDate} hitSlop={6} style={s.dateClear}>
            <Ionicons name="close-circle" size={14} color={colors.slate400} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={13} color={colors.slate400} />
        )}
      </Pressable>
      <Modal visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={{ gap: spacing.sm }}>
          <SelectField label={t("day")} value={day} onChange={setDay} options={dayOptions} />
          <SelectField label={t("month")} value={month} onChange={setMonth} options={monthOptions} />
          <SelectField label={t("year")} value={year} onChange={setYear} options={yearOptions} />
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
            <Button title={t("clear")} variant="outline" size="sm" onPress={clearDate} />
            <View style={{ flex: 1 }}>
              <Button title={t("apply")} variant="primary" size="sm" onPress={applyDate} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function PurchasesItem() {
  useLanguage();
  const navigate = useNav();
  const [allItems, setAllItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortF, setSortF] = useState("date");
  const [sortD, setSortD] = useState("desc");
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState("");
  const [selectedDetail, setSelectedDetail] = useState(null);
  const PAGE_SIZE = 10;

  const loadData = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [ir, pr] = await Promise.all([
        api.get("/purchase-items").catch(() => ({ data: [] })),
        api.get("/products").catch(() => ({ data: [] })),
      ]);
      setAllItems(Array.isArray(ir.data) ? ir.data : []);
      setProducts(Array.isArray(pr.data) ? pr.data : []);
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const reload = async () => {
    setLoadError(false);
    try {
      const res = await api.get("/purchase-items").catch(() => ({ data: [] }));
      setAllItems(Array.isArray(res.data) ? res.data : []);
    } catch { setLoadError(true); }
  };

  const getProductName = (item) => {
    const pid = item.product?.id || item.productId;
    if (!pid) return item.productName || item.item || "\u2014";
    return products.find((p) => p.id === pid)?.name || item.productName || item.item || "\u2014";
  };

  const getProductUnit = (item) => {
    const pid = item.product?.id || item.productId;
    return products.find((p) => p.id === pid)?.unit || "piece";
  };

  const decorated = useMemo(() => {
    const items = allItems.map((it) => {
      const qty = Number(it.quantity) || 0;
      const total = Number(it.total) || Number(it.price) * qty || 0;
      const ts = it.createdAt || it.date || "";
      return {
        id: `item-${it.id}`,
        itemId: it.id,
        productId: it.product?.id || it.productId,
        name: it.product?.name || getProductName(it),
        unit: it.product?.unit || getProductUnit(it),
        quantity: qty,
        unitPrice: Number(it.price) || 0,
        total,
        category: it.category || it.itemCategory || "General",
        date: ts,
        dateLabel: ts ? new Date(ts).toLocaleDateString() : "\u2014",
        timeLabel: ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        raw: it,
      };
    });
    return items;
  }, [allItems, products]);

  const filtered = useMemo(() => {
    let items = decorated;
    if (typeFilter !== "All") {
      items = items.filter((r) => r.category === typeFilter);
    }
    if (fromDate) {
      items = items.filter((r) => (r.date || "").slice(0, 10) >= fromDate);
    }
    if (toDate) {
      items = items.filter((r) => (r.date || "").slice(0, 10) <= toDate);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((r) => r.name.toLowerCase().includes(q));
    }
    items.sort((a, b) => {
      let va, vb;
      if (sortF === "name") { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortF === "qty") { va = a.quantity; vb = b.quantity; }
      else if (sortF === "total") { va = a.total; vb = b.total; }
      else { va = a.date; vb = b.date; }
      return typeof va === "string" ? (sortD === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)) : (sortD === "asc" ? va - vb : vb - va);
    });
    return items;
  }, [decorated, search, fromDate, toDate, typeFilter, sortF, sortD]);

  const categories = useMemo(() => {
    const set = new Set(decorated.map((r) => r.category));
    return ["All", ...[...set].sort()];
  }, [decorated]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, fromDate, toDate, typeFilter, sortF, sortD]);

  const bulk = useBulkSelect(filtered, (r) => r.id);

  const overview = useMemo(() => {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const weekKey = startOfWeek.toISOString().slice(0, 10);
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let todaySpend = 0, weekSpend = 0, monthSpend = 0, totalSpend = 0;
    let todayCount = 0, weekCount = 0, monthCount = 0, totalCount = 0;
    const byCategory = {};
    const byDayOfWeek = [0, 0, 0, 0, 0, 0, 0];
    decorated.forEach((r) => {
      const d = (r.date || "").slice(0, 10);
      if (d === todayKey) { todaySpend += r.total; todayCount += r.quantity; }
      if (d >= weekKey) { weekSpend += r.total; weekCount += r.quantity; }
      if (d.slice(0, 7) === monthKey) { monthSpend += r.total; monthCount += r.quantity; }
      totalSpend += r.total;
      totalCount += r.quantity;
      byCategory[r.category] = (byCategory[r.category] || 0) + r.total;
      if (r.date) {
        const dow = new Date(r.date.slice(0, 10) + "T00:00:00").getDay();
        byDayOfWeek[dow] = (byDayOfWeek[dow] || 0) + r.total;
      }
    });
    const dayLabels = [t("sun"), t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat")];
    return {
      todaySpend, weekSpend, monthSpend, totalSpend,
      todayCount, weekCount, monthCount, totalCount,
      byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 6),
      byDayOfWeek,
      dayLabels,
      avgPerPurchase: totalCount > 0 ? totalSpend / totalCount : 0,
      itemsCount: decorated.length,
    };
  }, [decorated]);

  const deleteSelected = async () => {
    if (bulk.selected.length === 0) return;
    if (!(await confirmDialog(t("deleteSelectedCount", { count: bulk.selected.length, type: t("purchaseItems") })))) return;
    setMsg("");
    try {
      if (bulk.allSelected) {
        for (const r of filtered) { try { await api.delete(`/purchase-items/${r.itemId}`); } catch {} }
      } else {
        for (const id of bulk.selected) {
          const r = filtered.find((x) => x.id === id);
          if (r) { try { await api.delete(`/purchase-items/${r.itemId}`); } catch {} }
        }
      }
      bulk.clear();
      await reload();
      setMsg(t("deleted"));
      setTimeout(() => setMsg(""), 2000);
    } catch { setMsg(t("failed")); setTimeout(() => setMsg(""), 2000); }
  };

  const deleteSingle = async (r) => {
    if (!(await confirmDialog(t("deletePurchaseItemConfirm", { name: r.name })))) return;
    try {
      await api.delete(`/purchase-items/${r.itemId}`);
      await reload();
      setMsg(t("deleted"));
      setTimeout(() => setMsg(""), 2000);
    } catch { setMsg(t("failed")); setTimeout(() => setMsg(""), 2000); }
  };

  const doExport = () => {
    if (filtered.length === 0) {
      setMsg(t("noRecords"));
      setTimeout(() => setMsg(""), 2000);
      return;
    }
    const rows = filtered.map((r) => ({
      Date: r.dateLabel,
      Time: r.timeLabel,
      Item: r.name,
      Category: r.category,
      Qty: r.quantity,
      "Unit Price": r.unitPrice,
      Total: r.total,
    }));
    exportCsv(`purchase-items-${new Date().toISOString().slice(0, 10)}.csv`, rows);
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

  const currency = (v) => `TZS ${Number(v || 0).toLocaleString()}`;

  return (
    <View style={s.root}>
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Ionicons name="bag-handle" size={22} color={colors.primary} />
          <Text style={s.headerTitle}>{t("purchaseItems")}</Text>
          <Text style={s.headerCount}>({decorated.length})</Text>
        </View>
        <View style={s.headerRight}>
          <Pressable onPress={doExport} style={s.exportBtn}>
            <Ionicons name="download" size={14} color={colors.white} />
            <Text style={s.exportBtnText}>{t("export")}</Text>
          </Pressable>
          <Pressable onPress={() => bulk.mode ? bulk.clear() : bulk.startMode()} style={[s.bulkBtn, bulk.mode && s.bulkBtnActive]}>
            <Ionicons name="checkbox" size={14} color={colors.primary} />
            <Text style={s.bulkBtnText}>{bulk.mode ? t("cancelSelect") : t("select")}</Text>
          </Pressable>
        </View>
      </View>

      <View style={s.tabsRow}>
        <Pressable onPress={() => setTab("overview")} style={[s.tabBtn, tab === "overview" && s.tabBtnActive]}>
          <Ionicons name="stats-chart" size={13} color={tab === "overview" ? colors.primary : colors.slate500} />
          <Text style={[s.tabText, tab === "overview" && s.tabTextActive]}>{t("overview")}</Text>
        </Pressable>
        <Pressable onPress={() => setTab("items")} style={[s.tabBtn, tab === "items" && s.tabBtnActive]}>
          <Ionicons name="list" size={13} color={tab === "items" ? colors.primary : colors.slate500} />
          <Text style={[s.tabText, tab === "items" && s.tabTextActive]}>{t("items")}</Text>
        </Pressable>
      </View>

      {tab === "overview" ? (
        <ScrollView style={s.overviewScroll} contentContainerStyle={s.overviewBody} showsVerticalScrollIndicator={false}>
          <View style={s.statGrid}>
            {[
              { label: t("totalSpend"), value: currency(overview.totalSpend), color: colors.primary, iconName: "cash" },
              { label: t("todaySpend"), value: currency(overview.todaySpend), color: colors.success, iconName: "trending-up" },
              { label: t("weekSpend"), value: currency(overview.weekSpend), color: colors.info, iconName: "calendar" },
              { label: t("monthSpend"), value: currency(overview.monthSpend), color: colors.warning, iconName: "calendar" },
              { label: t("totalItems"), value: overview.totalCount.toLocaleString(), color: colors.success, iconName: "cube-outline" },
              { label: t("todayItems"), value: overview.todayCount.toLocaleString(), color: colors.info, iconName: "add-circle" },
            ].map((c, i) => (
              <View key={i} style={[s.statCard, { borderTopColor: c.color, backgroundColor: colors.white, borderColor: colors.slate200 }]}>
                <View style={s.statLabelRow}>
                  <Ionicons name={c.iconName} size={12} color={c.color} />
                  <Text style={[s.statLabel, { color: c.color }]}>{c.label}</Text>
                </View>
                <Text style={[s.statValue, { color: c.color }]}>{c.value}</Text>
              </View>
            ))}
          </View>

          <Card padded style={s.chartCard}>
            <View style={s.cardHeader}>
              <Ionicons name="bar-chart" size={14} color={colors.primary} />
              <Text style={s.cardTitle}>{t("spendByDay")}</Text>
            </View>
            <View style={s.bars}>
              {overview.byDayOfWeek.map((val, i) => {
                const max = Math.max(...overview.byDayOfWeek, 1);
                const h = Math.max(4, Math.round((val / max) * 56));
                return (
                  <View key={i} style={s.barCol}>
                    <Text style={s.barVal}>{val > 0 ? Math.round(val / 1000) + "k" : ""}</Text>
                    <View style={[s.bar, { height: h, backgroundColor: i === new Date().getDay() ? colors.primary : "#c7d2fe" }]} />
                    <Text style={s.barLabel}>{overview.dayLabels[i]}</Text>
                  </View>
                );
              })}
            </View>
          </Card>

          <Card padded={false} style={s.categoryCard}>
            <View style={s.cardHeader}>
              <Ionicons name="pie-chart" size={14} color={colors.primary} />
              <Text style={s.cardTitle}>{t("spendByCategory")}</Text>
            </View>
            {overview.byCategory.length === 0 ? (
              <Text style={s.noData}>{t("noData")}</Text>
            ) : overview.byCategory.map(([name, val]) => {
              const pct = overview.totalSpend > 0 ? Math.round((val / overview.totalSpend) * 100) : 0;
              return (
                <View key={name} style={s.categoryRow}>
                  <Text style={s.categoryName} numberOfLines={1}>{name}</Text>
                  <View style={s.categoryBarWrap}>
                    <View style={[s.categoryBar, { width: `${Math.max(2, pct)}%`, backgroundColor: colors.primary }]} />
                  </View>
                  <Text style={s.categoryPct}>{pct}%</Text>
                  <Text style={s.categoryVal}>{currency(val)}</Text>
                </View>
              );
            })}
          </Card>

          <Card padded>
            <View style={s.cardHeader}>
              <Ionicons name="pricetags" size={14} color={colors.primary} />
              <Text style={s.cardTitle}>{t("summary")}</Text>
            </View>
            <View style={s.summaryLine}>
              <Text style={s.summaryLabel}>{t("totalPurchases")}</Text>
              <Text style={s.summaryVal}>{overview.itemsCount}</Text>
            </View>
            <View style={s.summaryLine}>
              <Text style={s.summaryLabel}>{t("avgPerPurchase")}</Text>
              <Text style={s.summaryVal}>{currency(overview.avgPerPurchase)}</Text>
            </View>
            <View style={s.summaryLine}>
              <Text style={s.summaryLabel}>{t("totalCount")}</Text>
              <Text style={s.summaryVal}>{overview.totalCount.toLocaleString()}</Text>
            </View>
          </Card>
        </ScrollView>
      ) : (
        <>
          <View style={s.controlsRow}>
            <View style={s.searchWrap}>
              <Ionicons name="search" size={14} color={colors.slate400} style={s.searchIcon} />
              <TextField value={search} onChangeText={setSearch} placeholder={t("searchItems")} containerStyle={s.searchField} />
            </View>
          </View>
          <View style={s.dateRow}>
            <DateInput label={t("fromDate")} value={fromDate} onChange={setFromDate} />
            <DateInput label={t("toDate")} value={toDate} onChange={setToDate} />
            <View style={{ flex: 1, minWidth: 140 }}>
              <SelectField
                label={t("category")}
                value={typeFilter}
                onChange={setTypeFilter}
                options={categories.map((c) => ({ value: c, label: c }))}
                placeholder={t("allCategories")}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
            {(fromDate || toDate) && (
              <Pressable onPress={() => { setFromDate(""); setToDate(""); }} style={s.clearFilterBtn}>
                <Text style={s.clearFilterText}>{t("clearFilters")}</Text>
              </Pressable>
            )}
          </View>
          {bulk.mode && <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected} onSelectAll={bulk.toggleAll} onDelete={deleteSelected} deleteLabel={t("deleteSelected")} />}

          {msg !== "" && (
            <View style={[s.msgBar, msg.includes("Failed") ? s.msgBarError : s.msgBarSuccess]}>
              <Text style={[s.msgText, msg.includes("Failed") ? s.msgTextError : s.msgTextSuccess]}>{msg}</Text>
            </View>
          )}

          <Card padded={false} style={s.tableCard}>
            <View style={s.tableBody}>
              {filtered.length === 0 ? (
                <View style={s.emptyWrap}>
                  <Ionicons name="bag-handle" size={28} color={colors.slate300} />
                  <Text style={s.noDataBig}>{t("noRecordsFound")}</Text>
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
                      <Pressable style={s.rowMain} onPress={() => setSelectedDetail(r)}>
                        <View style={[s.rowIconWrap, { backgroundColor: colors.primaryLight }]}>
                          <Ionicons name="pricetag" size={14} color={colors.primary} />
                        </View>
                        <View style={s.rowProduct}>
                          <Text style={s.rowName} numberOfLines={1}>{r.name}</Text>
                          <Text style={s.rowSub} numberOfLines={1}>{r.category} \u00b7 {r.unit}</Text>
                        </View>
                        <View style={s.rowQtyWrap}>
                          <Text style={s.rowQty}>{r.quantity}</Text>
                          <Text style={[s.rowSub, { fontSize: 9 }]}>{t("pcs")}</Text>
                        </View>
                        <View style={s.rowTotalWrap}>
                          <Text style={s.rowTotal}>{currency(r.total)}</Text>
                          <Text style={[s.rowSub, { fontSize: 9 }]}>{currency(r.unitPrice)} {t("each")}</Text>
                        </View>
                        <Text style={s.rowDate}>{r.dateLabel}</Text>
                      </Pressable>
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
                <Text style={s.paginationText}>{t("pageXofY", { page: currentPage, total: totalPages, count: filtered.length, type: t("purchaseItems") })}</Text>
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
        </>
      )}

      {selectedDetail && (
        <Modal visible onClose={() => setSelectedDetail(null)} title={selectedDetail.name}>
          <View style={s.detailBody}>
            <DetailRow label={t("category")} value={selectedDetail.category} />
            <DetailRow label={t("quantity")} value={`${selectedDetail.quantity} ${selectedDetail.unit}`} />
            <DetailRow label={t("unitPrice")} value={currency(selectedDetail.unitPrice)} />
            <DetailRow label={t("total")} value={currency(selectedDetail.total)} />
            <DetailRow label={t("date")} value={`${selectedDetail.dateLabel} ${selectedDetail.timeLabel}`} />
            <DetailRow
              label={t("productId")}
              value={selectedDetail.productId ? String(selectedDetail.productId) : "\u2014"}
            />
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
              <Button title={t("close")} variant="outline" size="sm" onPress={() => setSelectedDetail(null)} />
              <Button
                title={t("deletePurchaseItem")}
                variant="danger"
                size="sm"
                icon={<Ionicons name="trash" size={14} color={colors.white} />}
                onPress={async () => { await deleteSingle(selectedDetail); setSelectedDetail(null); }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );

  function DetailRow({ label, value }) {
    return (
      <View style={s.detailLine}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value}</Text>
      </View>
    );
  }
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50, padding: spacing.sm, gap: spacing.sm },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", height: 400 },
  errorWrap: { flex: 1, alignItems: "center", justifyContent: "center", height: 400, gap: spacing.md },
  errorTitle: { fontSize: 18, fontWeight: "700", color: colors.slate900, margin: 0 },
  errorSub: { fontSize: 13, color: colors.slate500, textAlign: "center", maxWidth: 400, margin: 0 },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.primary, borderRadius: radius.md },
  retryBtnText: { color: colors.white, fontWeight: "600", fontSize: 13 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.slate900 },
  headerCount: { color: colors.slate400, fontSize: 12 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: radius.sm },
  exportBtnText: { color: colors.white, fontWeight: "600", fontSize: 12 },
  bulkBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate300, backgroundColor: colors.white },
  bulkBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  bulkBtnText: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  tabsRow: { flexDirection: "row", gap: spacing.sm, flexShrink: 0 },
  tabBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate200, backgroundColor: colors.white },
  tabBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  tabText: { fontSize: 12, fontWeight: "600", color: colors.slate500 },
  tabTextActive: { color: colors.primary },
  overviewScroll: { flex: 1 },
  overviewBody: { gap: spacing.sm, paddingBottom: spacing.lg },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statCard: { minWidth: 140, flexBasis: "46%", flexGrow: 1, borderRadius: radius.md, borderWidth: 1, borderTopWidth: 3, padding: spacing.md },
  statLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", flexShrink: 1 },
  statValue: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  chartCard: { flexShrink: 0 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  cardTitle: { fontSize: 13, fontWeight: "700", color: colors.slate800 },
  bars: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 90, gap: 6 },
  barCol: { flex: 1, alignItems: "center", gap: 3 },
  barVal: { fontSize: 8, color: colors.slate400 },
  bar: { width: "60%", minWidth: 8, borderRadius: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barLabel: { fontSize: 9, color: colors.slate500 },
  categoryCard: { flexShrink: 0 },
  categoryRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 6, paddingHorizontal: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.slate100 },
  categoryName: { width: 90, fontSize: 11, fontWeight: "600", color: colors.slate700, minWidth: 0 },
  categoryBarWrap: { flex: 1, height: 8, backgroundColor: colors.slate100, borderRadius: 4, overflow: "hidden" },
  categoryBar: { height: 8, borderRadius: 4 },
  categoryPct: { width: 36, fontSize: 10, color: colors.slate500, textAlign: "right" },
  categoryVal: { width: 84, fontSize: 11, fontWeight: "700", color: colors.slate800, textAlign: "right" },
  summaryLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  summaryLabel: { fontSize: 12, color: colors.slate500 },
  summaryVal: { fontSize: 12, fontWeight: "700", color: colors.slate900 },
  controlsRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center", flexShrink: 0 },
  searchWrap: { flex: 1, minWidth: 180, position: "relative" },
  searchIcon: { position: "absolute", left: 8, top: 12, zIndex: 1 },
  searchField: { marginBottom: 0 },
  dateRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-end", flexShrink: 0, flexWrap: "wrap" },
  dateLabel: { fontSize: 11, fontWeight: "600", color: colors.slate600, marginBottom: 4 },
  dateTrigger: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.slate300, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, backgroundColor: colors.white },
  dateTriggerText: { fontSize: 12, flex: 1 },
  dateClear: { padding: 0 },
  clearFilterBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate200, backgroundColor: colors.white },
  clearFilterText: { fontSize: 11, fontWeight: "600", color: colors.slate500 },
  msgBar: { padding: spacing.sm, borderRadius: radius.sm, flexShrink: 0 },
  msgBarSuccess: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  msgBarError: { backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: "#fecaca" },
  msgText: { fontSize: 11 },
  msgTextSuccess: { color: "#166534" },
  msgTextError: { color: colors.dangerDark },
  tableCard: { flex: 1, minHeight: 0 },
  tableBody: { flex: 1 },
  emptyWrap: { alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl * 2 },
  noData: { textAlign: "center", color: colors.slate400, fontSize: 13, paddingVertical: spacing.lg },
  noDataBig: { textAlign: "center", color: colors.slate400, fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.slate100, gap: spacing.xs, minHeight: 52 },
  rowCheck: { width: 28, alignItems: "center" },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.xs, minWidth: 0, paddingVertical: 2 },
  rowIconWrap: { width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  rowProduct: { flex: 1, minWidth: 0 },
  rowName: { fontWeight: "600", color: colors.slate900, fontSize: 12 },
  rowSub: { fontSize: 10, color: colors.slate400 },
  rowQtyWrap: { width: 48, alignItems: "center" },
  rowQty: { fontSize: 12, fontWeight: "700", color: colors.slate800 },
  rowTotalWrap: { width: 92, alignItems: "flex-end" },
  rowTotal: { fontSize: 11, fontWeight: "700", color: colors.slate800 },
  rowDate: { width: 90, fontSize: 10, color: colors.slate500, textAlign: "right" },
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
  detailBody: { gap: spacing.xs },
  detailLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.slate100 },
  detailLabel: { fontSize: 12, color: colors.slate500 },
  detailValue: { fontSize: 13, fontWeight: "600", color: colors.slate900 },
});