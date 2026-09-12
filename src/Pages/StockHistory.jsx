import { useEffect, useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { t, useLanguage } from "../i18n";
import { confirmDialog } from "../utils/confirm";
import { exportCsv } from "../utils/export";
import { TextField } from "../components/ui";
import { colors, font, radius, spacing, shadow } from "../theme";

export default function StockHistory() {
  useLanguage();
  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    Promise.all([
      api.get("/stock-history").catch(() => ({ data: [] })),
      api.get("/products").catch(() => ({ data: [] })),
      api.get("/stocks").catch(() => ({ data: [] })),
    ]).then(([hr, pr, sr]) => {
      setRecords(Array.isArray(hr.data) ? hr.data : []);
      setProducts(Array.isArray(pr.data) ? pr.data : []);
      setStocks(Array.isArray(sr.data) ? sr.data : []);
    }).finally(() => setLoading(false));
  }, []);

  const productMap = useMemo(() => {
    const m = {};
    products.forEach((p) => { m[p.id] = p; });
    return m;
  }, [products]);

  const stockMap = useMemo(() => {
    const m = {};
    stocks.forEach((s) => { m[s.product?.id] = s; });
    return m;
  }, [stocks]);

  const getProductName = (r) => {
    const p = productMap[r.product?.id || r.productId];
    return p?.name || r.product?.name || "—";
  };

  const getStockQty = (productId) => {
    const s = stockMap[productId];
    if (s) return s.quantity;
    const p = productMap[productId];
    return p?.quantity ?? 0;
  };

  const analytics = useMemo(() => {
    if (records.length === 0) return null;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recent30 = records.filter((r) => r.createdAt && new Date(r.createdAt) >= thirtyDaysAgo);
    const recent7 = records.filter((r) => r.createdAt && new Date(r.createdAt) >= sevenDaysAgo);

    const soldRecords = records.filter((r) => r.transactionType === "Sold");
    const receivedRecords = records.filter((r) => r.transactionType !== "Sold");
    const stockoutRecords = records.filter((r) => r.resultingQuantity <= 0);

    const totalSold = recent30.filter((r) => r.transactionType === "Sold").reduce((s, r) => s + Math.abs(r.quantityChange), 0);
    const totalReceived = recent30.filter((r) => r.transactionType !== "Sold").reduce((s, r) => s + Math.abs(r.quantityChange), 0);
    const totalSoldAll = soldRecords.reduce((s, r) => s + Math.abs(r.quantityChange), 0);
    const totalReceivedAll = receivedRecords.reduce((s, r) => s + Math.abs(r.quantityChange), 0);

    const productStats = {};
    records.forEach((r) => {
      const pid = r.product?.id || r.productId;
      if (!pid) return;
      if (!productStats[pid]) {
        productStats[pid] = { sold: 0, received: 0, movements: 0, lastDate: null, outOfStockEvents: 0 };
      }
      const ps = productStats[pid];
      ps.movements++;
      if (r.transactionType === "Sold") {
        ps.sold += Math.abs(r.quantityChange);
      } else {
        ps.received += Math.abs(r.quantityChange);
      }
      if (r.resultingQuantity <= 0) ps.outOfStockEvents++;
      if (r.createdAt && (!ps.lastDate || new Date(r.createdAt) > new Date(ps.lastDate))) {
        ps.lastDate = r.createdAt;
      }
    });

    const frequentOut = Object.entries(productStats)
      .filter(([_, s]) => s.outOfStockEvents > 0)
      .map(([pid, s]) => ({ productId: Number(pid), ...s, name: productMap[Number(pid)]?.name || "—" }))
      .sort((a, b) => b.outOfStockEvents - a.outOfStockEvents)
      .slice(0, 5);

    const topMovers = Object.entries(productStats)
      .map(([pid, s]) => ({ productId: Number(pid), ...s, net: s.received - s.sold, name: productMap[Number(pid)]?.name || "—" }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    const expiredProducts = products
      .filter((p) => p.expiryDate && new Date(p.expiryDate) < now)
      .map((p) => ({ ...p, currentQty: getStockQty(p.id), daysOverdue: Math.floor((now - new Date(p.expiryDate)) / (1000 * 60 * 60 * 24)) }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    const expiringSoon = products
      .filter((p) => {
        if (!p.expiryDate) return false;
        const d = new Date(p.expiryDate);
        return d >= now && d <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      })
      .map((p) => ({ ...p, currentQty: getStockQty(p.id), daysLeft: Math.floor((new Date(p.expiryDate) - now) / (1000 * 60 * 60 * 24)) }))
      .sort((a, b) => a.daysLeft - b.daysLeft);

    return {
      totalMovements: recent30.length,
      totalSold,
      totalReceived,
      totalProducts: products.length,
      recent7Count: recent7.length,
      totalSoldAll,
      totalReceivedAll,
      totalStockoutEvents: stockoutRecords.length,
      soldRecordsCount: soldRecords.length,
      receivedRecordsCount: receivedRecords.length,
      productStats,
      frequentOut,
      topMovers,
      expiredProducts,
      expiringSoon,
    };
  }, [records, products, stocks, productMap, stockMap]);

  const filteredRecords = useMemo(() => {
    let list = [...records];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) => {
        const name = getProductName(r).toLowerCase();
        const type = (r.transactionType || "").toLowerCase();
        return name.includes(q) || type.includes(q);
      });
    }
    if (typeFilter === "sold") list = list.filter((r) => r.transactionType === "Sold");
    else if (typeFilter === "received") list = list.filter((r) => r.transactionType !== "Sold");
    else if (typeFilter === "stockout") list = list.filter((r) => r.resultingQuantity <= 0);
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  }, [records, search, typeFilter, productMap]);

  const filterCounts = useMemo(() => ({
    all: records.length,
    sold: records.filter((r) => r.transactionType === "Sold").length,
    received: records.filter((r) => r.transactionType !== "Sold").length,
    stockout: records.filter((r) => r.resultingQuantity <= 0).length,
  }), [records]);

  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
  const paginatedRecords = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, typeFilter]);

  const bulk = useBulkSelect(filteredRecords, (r) => r.id);

  const deleteSelected = async () => {
    if (bulk.selected.length === 0) return;
    if (!(await confirmDialog(t("deleteSelectedRecordsConfirm", { count: bulk.selected.length })))) return;
    setLoading(true);
    try {
      for (const id of bulk.selected) await api.delete(`/stock-history/${id}`).catch(() => {});
      const hr = await api.get("/stock-history");
      setRecords(Array.isArray(hr.data) ? hr.data : []);
      bulk.clear();
    } finally { setLoading(false); }
  };

  const deleteAll = async () => {
    if (records.length === 0) return;
    if (!(await confirmDialog(t("deleteAllRecordsConfirm", { count: records.length })))) return;
    setLoading(true);
    try {
      for (const r of records) await api.delete(`/stock-history/${r.id}`).catch(() => {});
      setRecords([]);
      bulk.clear();
    } finally { setLoading(false); }
  };

  const exportCSV = () => {
    const header = "Product,Quantity Change,Resulting Qty,Type,Date\n";
    const rows = filteredRecords.map((r) =>
      `${getProductName(r)},${r.quantityChange},${r.resultingQuantity},${r.transactionType || ""},${r.createdAt || ""}`
    ).join("\n");
    exportCsv("stock-history.csv", header + rows);
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <Spinner size={28} text={t("loading")} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="time-outline" size={24} color={colors.primary} />
          <View>
            <Text style={styles.headerTitle}>{t("stockHistoryTitle")}</Text>
            <Text style={styles.headerSub}>{t("stockHistorySubtitle", { m: records.length, p: products.length })}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={exportCSV} style={styles.exportBtn} hitSlop={6}>
            <Ionicons name="download" size={14} color={colors.slate500} />
            <Text style={styles.exportBtnText}>{t("exportCsv")}</Text>
          </Pressable>
          {bulk.mode && (
            <Pressable onPress={deleteAll} disabled={records.length === 0} style={[styles.deleteAllBtn, records.length === 0 && styles.deleteAllBtnDisabled]} hitSlop={6}>
              <Ionicons name="trash-outline" size={14} color={records.length === 0 ? colors.slate300 : colors.danger} />
              <Text style={[styles.deleteAllText, records.length === 0 && styles.deleteAllTextDisabled]}>{t("deleteAllRecords")}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {analytics && (
          <>
            <View style={styles.statGrid}>
              <IconStat
                icon="bar-chart" iconBg="#eff6ff" iconColor="#2563eb"
                value={analytics.totalMovements} label={t("movements30")}
                topColor={typeFilter === "all" ? "#2563eb" : "#e2e8f0"}
                onPress={() => setTypeFilter("all")}
              />
              <IconStat
                icon="arrow-up-circle" iconBg="#f0fdf4" iconColor="#16a34a"
                value={analytics.receivedRecordsCount} label={t("receivedUnits", { units: analytics.totalReceivedAll })}
                topColor={typeFilter === "received" ? "#16a34a" : "#e2e8f0"}
                onPress={() => setTypeFilter("received")}
              />
              <IconStat
                icon="arrow-down-circle" iconBg="#fef2f2" iconColor="#dc2626"
                value={analytics.soldRecordsCount} label={t("soldUnits", { units: analytics.totalSoldAll })}
                topColor={typeFilter === "sold" ? "#dc2626" : "#e2e8f0"}
                onPress={() => setTypeFilter("sold")}
              />
              <IconStat
                icon="alert-triangle" iconBg="#fffbeb" iconColor="#f59e0b"
                value={analytics.totalStockoutEvents} label={t("stockouts")}
                topColor={typeFilter === "stockout" ? "#f59e0b" : "#e2e8f0"}
                onPress={() => setTypeFilter("stockout")}
              />
              <IconStat
                icon="time-outline" iconBg="#f5f3ff" iconColor="#7c3aed"
                value={analytics.recent7Count} label={t("thisWeek")}
                topColor="#e2e8f0"
              />
            </View>

            <View style={styles.miniRow}>
              <MiniTable
                title={t("frequentlyOutOfStock")} icon="flame" iconColor="#dc2626"
                items={analytics.frequentOut} emptyText={t("noStockoutEvents")}
                columns={[
                  { key: "name", label: t("product"), flex: 1.4 },
                  { key: "outOfStockEvents", label: t("stockouts"), align: "center", render: (v) => <Text style={[styles.miniTdValue, styles.redStrong]}>{v}</Text> },
                  { key: "sold", label: t("totalSold"), align: "center" },
                ]}
              />
              <MiniTable
                title={t("topMovingProducts")} icon="trending-down" iconColor="#2563eb"
                items={analytics.topMovers} emptyText={t("noMovementData")}
                columns={[
                  { key: "name", label: t("product"), flex: 1.4 },
                  { key: "sold", label: t("sold"), align: "center", render: (v) => <Text style={[styles.miniTdValue, styles.soldSign]}>-{v}</Text> },
                  { key: "received", label: t("incoming"), align: "center", render: (v) => <Text style={[styles.miniTdValue, styles.receivedSign]}>+{v}</Text> },
                ]}
              />
            </View>

            <View style={styles.miniRow}>
              <MiniTable
                title={t("expiredProducts")} icon="close-circle" iconColor="#7c1d1e"
                items={analytics.expiredProducts} emptyText={t("noExpiredProducts")}
                columns={[
                  { key: "name", label: t("product"), flex: 1.2 },
                  { key: "currentQty", label: t("qty"), align: "center", render: (v) => <Text style={[styles.miniTdValue, styles.redStrong]}>{v}</Text> },
                  { key: "daysOverdue", label: t("overdue"), align: "center", render: (v) => <Text style={[styles.miniTdValue, styles.overdueText]}>{v}d</Text> },
                  { key: "expiryDate", label: t("expiry"), align: "center", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
                ]}
              />
              <MiniTable
                title={t("expiringSoon7days")} icon="calendar" iconColor="#d97706"
                items={analytics.expiringSoon} emptyText={t("noExpiringSoon")}
                columns={[
                  { key: "name", label: t("product"), flex: 1.2 },
                  { key: "currentQty", label: t("qty"), align: "center", render: (v) => <Text style={[styles.miniTdValue, styles.slateText]}>{v}</Text> },
                  { key: "daysLeft", label: t("daysLeft"), align: "center", render: (v) => <Text style={[styles.miniTdValue, styles.daysLeftText]}>{v}d</Text> },
                  { key: "expiryDate", label: t("expiry"), align: "center", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
                ]}
              />
            </View>
          </>
        )}

        <View style={styles.filterRow}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={15} color={colors.slate400} style={styles.searchIcon} />
            <TextField
              value={search}
              onChangeText={setSearch}
              placeholder={t("searchProductsOrTypes")}
              containerStyle={styles.searchInput}
              inputStyle={styles.searchInputField}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {[
              { v: "all", l: t("all"), count: filterCounts.all, color: "#2563eb" },
              { v: "received", l: t("received"), count: filterCounts.received, color: "#16a34a" },
              { v: "sold", l: t("sold"), count: filterCounts.sold, color: "#dc2626" },
              { v: "stockout", l: t("stockouts"), count: filterCounts.stockout, color: "#f59e0b" },
            ].map((f) => {
              const active = typeFilter === f.v;
              return (
                <Pressable key={f.v} onPress={() => setTypeFilter(f.v)} style={[styles.chip, active ? { borderWidth: 2, borderColor: f.color } : { borderWidth: 1, borderColor: colors.slate200 }]} hitSlop={4}>
                  <Text style={[styles.chipText, { color: active ? f.color : colors.slate500 }]}>
                    {f.l} ({f.count})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {bulk.mode && (
            <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected} onSelectAll={bulk.toggleAll} onDelete={deleteSelected} deleteLabel={t("deleteSelected")} />
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
                <Text style={[styles.th, styles.colProduct]}>{t("product")}</Text>
                <Text style={[styles.th, styles.colCenter]}>{t("change")}</Text>
                <Text style={[styles.th, styles.colCenter]}>{t("resulting")}</Text>
                <Text style={[styles.th, styles.colCenter]}>{t("type")}</Text>
                <Text style={[styles.th, styles.colCenter]}>{t("status")}</Text>
                <Text style={[styles.th, styles.colDate]}>{t("date")}</Text>
              </View>

              {filteredRecords.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Ionicons name="cube-outline" size={32} color={colors.slate300} style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyText}>{records.length === 0 ? t("noStockHistoryYet") : t("noRecordsMatchFilter")}</Text>
                </View>
              ) : paginatedRecords.map((r) => {
                const isOut = r.resultingQuantity <= 0;
                const isLow = r.resultingQuantity > 0 && r.resultingQuantity <= 5;
                const isSold = r.transactionType === "Sold";
                return (
                  <View key={r.id} style={[styles.tr, isOut && styles.trOut]} {...bulk.rowProps(r.id)}>
                    {bulk.mode && (
                      <View style={[styles.td, styles.colCheck]}>
                        <Pressable onPress={() => bulk.toggle(r.id)} hitSlop={8}>
                          <Ionicons name={bulk.selectedSet.has(r.id) ? "checkbox" : "square-outline"} size={16} color={bulk.selectedSet.has(r.id) ? colors.primary : colors.slate400} />
                        </Pressable>
                      </View>
                    )}
                    <Text style={[styles.td, styles.colProduct, styles.productName]} numberOfLines={1}>{getProductName(r)}</Text>
                    <Text style={[styles.td, styles.colCenter, styles.changeQty, isSold ? styles.soldSign : styles.receivedSign]}>
                      {isSold ? `-${Math.abs(r.quantityChange)}` : `+${Math.abs(r.quantityChange)}`}
                    </Text>
                    <Text style={[styles.td, styles.colCenter, isOut ? styles.outStrong : isLow ? styles.lowStrong : styles.resultNormal]}>
                      {r.resultingQuantity}
                    </Text>
                    <View style={[styles.tdWrap, styles.colCenter]}>
                      <View style={[styles.typePill, isSold ? styles.typeSold : styles.typeReceived]}>
                        <Text style={[styles.typePillText, { color: isSold ? "#dc2626" : "#16a34a" }]}>{r.transactionType || "—"}</Text>
                      </View>
                    </View>
                    <View style={[styles.tdWrap, styles.colCenter]}>
                      {isOut ? (
                        <View style={[styles.statusPill, styles.statusByBlendOut]}>
                          <Ionicons name="close-circle" size={10} color="#dc2626" />
                          <Text style={[styles.statusPillText, { color: "#dc2626" }]}>{t("statusOut")}</Text>
                        </View>
                      ) : isLow ? (
                        <View style={[styles.statusPill, styles.statusByBlendWarn]}>
                          <Ionicons name="alert-triangle" size={10} color="#d97706" />
                          <Text style={[styles.statusPillText, { color: "#d97706" }]}>{t("statusLow")}</Text>
                        </View>
                      ) : (
                        <View style={[styles.statusPill, styles.statusByBlendOk]}>
                          <Ionicons name="checkmark-circle" size={10} color="#16a34a" />
                          <Text style={[styles.statusPillText, { color: "#16a34a" }]}>{t("statusOk")}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.td, styles.colDate, styles.dateText]}>
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {totalPages > 1 && (
            <View style={styles.pager}>
              <Pressable disabled={page <= 1} onPress={() => setPage((p) => p - 1)} style={[styles.pageNav, page <= 1 && styles.pageNavDisabled]} hitSlop={6}>
                <Ionicons name="chevron-back" size={14} color={page <= 1 ? colors.slate300 : colors.slate700} />
                <Text style={[styles.pageNavText, page <= 1 && styles.pageNavTextDisabled]}>{t("prev")}</Text>
              </Pressable>
              {(() => {
                const pages = [];
                const start = Math.max(1, page - 2);
                const end = Math.min(totalPages, page + 2);
                for (let i = start; i <= end; i++) {
                  pages.push(
                    <Pressable key={i} onPress={() => setPage(i)} style={[styles.pageNum, page === i && styles.pageNumActive]} hitSlop={4}>
                      <Text style={[styles.pageNumText, page === i && styles.pageNumTextActive]}>{i}</Text>
                    </Pressable>
                  );
                }
                return pages;
              })()}
              <Pressable disabled={page >= totalPages} onPress={() => setPage((p) => p + 1)} style={[styles.pageNav, page >= totalPages && styles.pageNavDisabled]} hitSlop={6}>
                <Text style={[styles.pageNavText, page >= totalPages && styles.pageNavTextDisabled]}>{t("next")}</Text>
                <Ionicons name="chevron-forward" size={14} color={page >= totalPages ? colors.slate300 : colors.slate700} />
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function IconStat({ icon, iconBg, iconColor, value, label, topColor, onPress }) {
  const content = (
    <>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.statTextWrap}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      </View>
    </>
  );
  if (onPress) {
    return <Pressable onPress={onPress} style={[styles.statCard, { borderTopColor: topColor }]}>{content}</Pressable>;
  }
  return <View style={[styles.statCard, { borderTopColor: topColor }]}>{content}</View>;
}

function MiniTable({ title, icon, iconColor, items, columns, emptyText }) {
  return (
    <View style={styles.miniCard}>
      <View style={styles.miniHead}>
        <Ionicons name={icon} size={15} color={iconColor} />
        <Text style={styles.miniTitle} numberOfLines={1}>{title}</Text>
      </View>
      {items.length === 0 ? (
        <View style={styles.miniEmpty}>
          <Text style={styles.miniEmptyText}>{emptyText}</Text>
        </View>
      ) : (
        <View>
          <View style={styles.miniRowHeader}>
            {columns.map((c) => (
              <Text key={c.key} style={[styles.miniTh, c.align === "center" && styles.mc, c.flex ? { flex: c.flex } : null]} numberOfLines={1}>{c.label}</Text>
            ))}
          </View>
          {items.map((item, i) => (
            <View key={i} style={styles.miniRow}>
              {columns.map((c) => (
                <Text key={c.key} style={[styles.miniTd, c.align === "center" && styles.mc, c.key === "name" && styles.miniName, c.flex ? { flex: c.flex } : null]} numberOfLines={1}>
                  {c.render ? c.render(item[c.key]) : item[c.key]}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", height: 400 },

  root: { flex: 1, padding: spacing.lg, backgroundColor: colors.slate50 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: font.xl, fontWeight: "700", color: colors.slate900 },
  headerSub: { fontSize: font.xs, color: colors.slate400 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md },
  exportBtnText: { fontSize: font.xs, fontWeight: "600", color: colors.slate500 },
  deleteAllBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: radius.md },
  deleteAllBtnDisabled: { backgroundColor: colors.slate100, borderColor: colors.slate300 },
  deleteAllText: { fontSize: font.xs, fontWeight: "600", color: colors.danger },
  deleteAllTextDisabled: { color: colors.slate300 },

  scroll: { flex: 1 },
  scrollBody: { paddingBottom: spacing.xl, gap: spacing.lg },

  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { flex: 1, minWidth: "30%", backgroundColor: colors.white, borderWidth: 1, borderTopWidth: 3, borderColor: colors.slate200, borderRadius: 10, padding: spacing.lg, flexDirection: "row", alignItems: "center", gap: 12 },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statTextWrap: { flexShrink: 1 },
  statValue: { fontSize: 20, fontWeight: "800", color: colors.slate900 },
  statLabel: { fontSize: font.xs, color: colors.slate400, fontWeight: "500" },

  miniRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg },
  miniCard: { flex: 1, minWidth: "46%", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: 10, overflow: "hidden" },
  miniHead: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.slate50, borderBottomWidth: 1, borderBottomColor: colors.slate200 },
  miniTitle: { fontSize: font.sm, fontWeight: "700", color: colors.slate900, flex: 1, marginRight: 8 },
  miniEmpty: { padding: spacing.xl, alignItems: "center" },
  miniEmptyText: { color: colors.slate400, fontSize: font.xs, textAlign: "center" },
  miniRowHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  miniRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.slate50 },
  miniTh: { paddingVertical: 8, paddingHorizontal: 8, fontSize: 10, fontWeight: "700", color: colors.slate500, textTransform: "uppercase", letterSpacing: 0.4 },
  miniTd: { paddingVertical: 8, paddingHorizontal: 8, fontSize: font.xs, color: colors.slate700 },
  miniName: { fontWeight: "600" },
  miniTdValue: { fontWeight: "600" },
  mc: { textAlign: "center", minWidth: 74 },
  redStrong: { color: "#dc2626", fontWeight: "700" },
  soldSign: { color: "#dc2626", fontWeight: "600" },
  receivedSign: { color: "#16a34a", fontWeight: "600" },
  overdueText: { color: "#dc2626", fontWeight: "600" },
  daysLeftText: { color: "#d97706", fontWeight: "600" },
  slateText: { color: colors.slate700, fontWeight: "600" },

  filterRow: { gap: spacing.sm },
  searchWrap: { position: "relative", maxWidth: 400 },
  searchIcon: { position: "absolute", left: 12, top: 13, zIndex: 1 },
  searchInput: { marginBottom: 0 },
  searchInputField: { paddingLeft: 34 },
  chipsRow: { flexDirection: "row", gap: 6 },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.sm, backgroundColor: colors.white },
  chipText: { fontSize: font.xs, fontWeight: "600" },

  tableCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, overflow: "hidden" },
  tableInner: { minWidth: 720 },
  trHead: { flexDirection: "row", backgroundColor: colors.slate50, borderBottomWidth: 2, borderBottomColor: colors.slate200 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.slate100, alignItems: "center" },
  trOut: { backgroundColor: colors.dangerLight },
  th: { fontSize: 10, fontWeight: "700", color: colors.slate500, textTransform: "uppercase", letterSpacing: 0.4, paddingVertical: 10, paddingHorizontal: 8 },
  td: { paddingVertical: 10, paddingHorizontal: 8 },
  tdWrap: { paddingVertical: 10, paddingHorizontal: 8, justifyContent: "center" },
  colCheck: { width: 36, alignItems: "center", justifyContent: "center" },
  colProduct: { flex: 1.4, minWidth: 150 },
  colCenter: { width: 96, textAlign: "center" },
  colDate: { width: 170 },
  productName: { fontWeight: "600" },
  changeQty: { fontWeight: "700" },
  outStrong: { color: "#dc2626", fontWeight: "700", textAlign: "center" },
  lowStrong: { color: "#d97706", fontWeight: "700", textAlign: "center" },
  resultNormal: { color: colors.slate700, textAlign: "center" },
  typePill: { alignSelf: "center", paddingVertical: 2, paddingHorizontal: 10, borderRadius: 99 },
  typeSold: { backgroundColor: "#fef2f2" },
  typeReceived: { backgroundColor: "#f0fdf4" },
  typePillText: { fontSize: 10, fontWeight: "600" },
  statusPill: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99 },
  statusByBlendOut: { backgroundColor: "#fef2f2" },
  statusByBlendWarn: { backgroundColor: "#fffbeb" },
  statusByBlendOk: { backgroundColor: "#f0fdf4" },
  statusPillText: { fontSize: 10, fontWeight: "600" },
  dateText: { color: colors.slate400, fontSize: font.xs },
  emptyRow: { paddingVertical: 48, alignItems: "center" },
  emptyText: { color: colors.slate400, fontSize: font.sm },

  pager: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14 },
  pageNav: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.slate300, borderRadius: radius.sm, backgroundColor: colors.white },
  pageNavDisabled: { backgroundColor: colors.slate100 },
  pageNavText: { fontSize: font.sm, fontWeight: "500", color: colors.slate700 },
  pageNavTextDisabled: { color: colors.slate300 },
  pageNum: { width: 32, height: 32, borderWidth: 1, borderColor: colors.slate300, borderRadius: radius.sm, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  pageNumActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pageNumText: { fontSize: font.sm, fontWeight: "500", color: colors.slate700 },
  pageNumTextActive: { color: colors.white, fontWeight: "700" },
});