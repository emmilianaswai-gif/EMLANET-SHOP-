import { useEffect, useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { t, useLanguage } from "../i18n";
import { confirmDialog } from "../utils/confirm";
import { exportCsv } from "../utils/export";
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

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
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

  if (loading) return (
    <View style={styles.centerBox}>
      <Spinner size={28} text={t("loading")} />
    </View>
  );

  const statCards = analytics ? [
    { f: "all", value: analytics.totalMovements, label: t("movements30"), color: colors.primary, bg: "#eff6ff", ion: "bar-chart", filter: "all" },
    { f: "received", value: analytics.receivedRecordsCount, label: t("receivedUnits", { units: analytics.totalReceivedAll }), color: colors.success, bg: "#f0fdf4", ion: "arrow-up-circle", filter: "received" },
    { f: "sold", value: analytics.soldRecordsCount, label: t("soldUnits", { units: analytics.totalSoldAll }), color: colors.danger, bg: "#fef2f2", ion: "arrow-down-circle", filter: "sold" },
    { f: "stockout", value: analytics.totalStockoutEvents, label: t("stockouts"), color: colors.warning, bg: "#fffbeb", ion: "alert-triangle", filter: "stockout" },
    { f: null, value: analytics.recent7Count, label: t("thisWeek"), color: "#7c3aed", bg: "#f5f3ff", ion: "time", filter: null },
  ] : [];

  const typeChips = [
    { v: "all", l: t("all"), count: filterCounts.all, color: colors.primary },
    { v: "received", l: t("received"), count: filterCounts.received, color: colors.success },
    { v: "sold", l: t("sold"), count: filterCounts.sold, color: colors.danger },
    { v: "stockout", l: t("stockouts"), count: filterCounts.stockout, color: colors.warning },
  ];

  const fmtDateTime = (s) => (s ? new Date(s).toLocaleString() : "—");

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60, gap: 16 }}>
      <View style={styles.headerRow}>
        <View style={styles.titleLeft}>
          <Ionicons name="time" size={26} color={colors.primary} />
          <View>
            <Text style={styles.title}>{t("stockHistoryTitle")}</Text>
            <Text style={styles.subtitle}>{t("stockHistorySubtitle", { m: records.length, p: products.length })}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Pressable onPress={exportCSV} style={styles.csvBtn}>
            <Ionicons name="download" size={14} color={colors.slate500} />
            <Text style={styles.csvBtnText}>{t("exportCsv")}</Text>
          </Pressable>
          {bulk.mode && (
            <Pressable onPress={deleteAll} disabled={records.length === 0} style={[styles.deleteAllBtn, records.length === 0 && styles.deleteAllBtnDisabled]}>
              <Ionicons name="trash" size={14} color={records.length === 0 ? colors.slate400 : colors.danger} />
              <Text style={[styles.deleteAllBtnText, { color: records.length === 0 ? colors.slate400 : colors.danger }]}>{t("deleteAllRecords")}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {analytics && (
        <>
          <View style={styles.statGrid}>
            {statCards.map((s) => {
              const isActive = s.f && typeFilter === s.f;
              return (
                <Pressable
                  key={s.label}
                  disabled={!s.filter}
                  onPress={() => s.filter && setTypeFilter(s.filter)}
                  style={[styles.statCard, isActive && { backgroundColor: s.bg }]}
                >
                  <View style={[styles.statTop, { background: isActive ? s.color : colors.slate200 }]} />
                  <View style={[styles.statIconBox, { background: s.bg }]}>
                    <Ionicons name={s.ion} size={18} color={s.color} />
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.miniRow}>
            <MiniTable
              title={t("frequentlyOutOfStock")}
              ion="flame"
              ionColor={colors.danger}
              items={analytics.frequentOut}
              columns={[
                { key: "name", label: t("product") },
                { key: "outOfStockEvents", label: t("stockouts"), align: "center", render: (v) => <Text style={{ color: colors.danger, fontWeight: "700" }}>{v}</Text> },
                { key: "sold", label: t("totalSold"), align: "center" },
              ]}
              emptyText={t("noStockoutEvents")}
            />
            <MiniTable
              title={t("topMovingProducts")}
              ion="trending-down"
              ionColor={colors.primary}
              items={analytics.topMovers}
              columns={[
                { key: "name", label: t("product") },
                { key: "sold", label: t("sold"), align: "center", render: (v) => <Text style={{ color: colors.danger, fontWeight: "600" }}>-{v}</Text> },
                { key: "received", label: t("incoming"), align: "center", render: (v) => <Text style={{ color: colors.success, fontWeight: "600" }}>+{v}</Text> },
              ]}
              emptyText={t("noMovementData")}
            />
          </View>

          <View style={styles.miniRow}>
            <MiniTable
              title={t("expiredProducts")}
              ion="close-circle"
              ionColor="#7c1d1e"
              items={analytics.expiredProducts}
              columns={[
                { key: "name", label: t("product") },
                { key: "currentQty", label: t("qty"), align: "center", render: (v) => <Text style={{ color: "#7c1d1e", fontWeight: "700" }}>{v}</Text> },
                { key: "daysOverdue", label: t("overdue"), align: "center", render: (v) => <Text style={{ color: colors.danger, fontWeight: "600" }}>{v}d</Text> },
                { key: "expiryDate", label: t("expiry"), align: "center", render: (v) => <Text style={styles.miniDateText}>{v ? new Date(v).toLocaleDateString() : "—"}</Text> },
              ]}
              emptyText={t("noExpiredProducts")}
            />
            <MiniTable
              title={t("expiringSoon7days")}
              ion="calendar"
              ionColor={colors.warning}
              items={analytics.expiringSoon}
              columns={[
                { key: "name", label: t("product") },
                { key: "currentQty", label: t("qty"), align: "center", render: (v) => <Text style={{ fontWeight: "600" }}>{v}</Text> },
                { key: "daysLeft", label: t("daysLeft"), align: "center", render: (v) => <Text style={{ color: colors.warning, fontWeight: "600" }}>{v}d</Text> },
                { key: "expiryDate", label: t("expiry"), align: "center", render: (v) => <Text style={styles.miniDateText}>{v ? new Date(v).toLocaleDateString() : "—"}</Text> },
              ]}
              emptyText={t("noExpiringSoon")}
            />
          </View>
        </>
      )}

      <View style={styles.toolbar}>
        <View style={{ flex: 1, minWidth: 180, maxWidth: 400, position: "relative" }}>
          <View style={{ position: "absolute", left: 12, top: 13, zIndex: 1 }}>
            <Ionicons name="search" size={15} color={colors.slate400} />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("searchProductsOrTypes")}
            placeholderTextColor={colors.slate400}
            style={styles.searchInput}
          />
        </View>
        <View style={styles.chipRow}>
          {typeChips.map((f) => (
            <Pressable
              key={f.v}
              onPress={() => setTypeFilter(f.v)}
              style={[styles.chip, { borderColor: typeFilter === f.v ? f.color : colors.slate200, background: typeFilter === f.v ? `${f.color}10` : "#fff" }]}
            >
              <Text style={{ fontSize: font.xs, fontWeight: "600", color: typeFilter === f.v ? f.color : colors.slate500 }}>
                {f.l} ({f.count})
              </Text>
            </Pressable>
          ))}
        </View>
        {bulk.mode && (
          <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected} onSelectAll={bulk.toggleAll} onDelete={deleteSelected} deleteLabel={t("deleteSelected")} />
        )}
      </View>

      <View style={styles.tableCard}>
        <ScrollView horizontal>
          <View style={{ minWidth: 640 }}>
            <View style={styles.thead}>
              {bulk.mode && (
                <Pressable style={[styles.th, styles.centerCell, { width: 32 }]} onPress={bulk.toggleAll}>
                  <Ionicons name={bulk.allSelected ? "checkbox" : "square-outline"} size={16} color={bulk.allSelected ? colors.primary : colors.slate400} />
                </Pressable>
              )}
              <View style={[styles.th, { flex: 1.4 }]}><Text style={styles.thText}>{t("product")}</Text></View>
              <View style={[styles.th, styles.centerCell, { flex: 0.7 }]}><Text style={styles.thText}>{t("change")}</Text></View>
              <View style={[styles.th, styles.centerCell, { flex: 0.7 }]}><Text style={styles.thText}>{t("resulting")}</Text></View>
              <View style={[styles.th, styles.centerCell, { flex: 0.8 }]}><Text style={styles.thText}>{t("type")}</Text></View>
              <View style={[styles.th, styles.centerCell, { flex: 0.8 }]}><Text style={styles.thText}>{t("status")}</Text></View>
              <View style={[styles.th, { flex: 1.1 }]}><Text style={styles.thText}>{t("date")}</Text></View>
            </View>

            {filteredRecords.length === 0 ? (
              <View style={[styles.emptyCell, { alignItems: "center", flexDirection: "column", gap: 6 }]}>
                <Ionicons name="cube-outline" size={32} style={{ opacity: 0.4 }} color={colors.slate400} />
                <Text style={styles.emptyText}>{records.length === 0 ? t("noStockHistoryYet") : t("noRecordsMatchFilter")}</Text>
              </View>
            ) : paginatedRecords.map((r) => {
                const isOut = r.resultingQuantity <= 0;
                const isLow = r.resultingQuantity > 0 && r.resultingQuantity <= 5;
                const isSold = r.transactionType === "Sold";
                return (
                  <View key={r.id} style={[styles.tr, isOut && { background: "#fef2f2" }]} {...bulk.rowProps(r.id)}>
                    {bulk.mode && (
                      <Pressable style={[styles.td, styles.centerCell, { width: 32 }]} onPress={() => bulk.toggle(r.id)}>
                        <Ionicons name={bulk.selectedSet.has(r.id) ? "checkbox" : "square-outline"} size={16} color={bulk.selectedSet.has(r.id) ? colors.primary : colors.slate400} />
                      </Pressable>
                    )}
                    <View style={[styles.td, { flex: 1.4 }]}>
                      <Text style={styles.nameCell}>{getProductName(r)}</Text>
                    </View>
                    <View style={[styles.td, styles.centerCell, { flex: 0.7 }]}>
                      <Text style={[styles.delta, { color: isSold ? colors.danger : colors.success }]}>
                        {isSold ? `-${Math.abs(r.quantityChange)}` : `+${Math.abs(r.quantityChange)}`}
                      </Text>
                    </View>
                    <View style={[styles.td, styles.centerCell, { flex: 0.7 }]}>
                      <Text style={[styles.resulting, { color: isOut ? colors.danger : isLow ? colors.warning : colors.slate700, fontWeight: isOut || isLow ? "700" : "400" }]}>
                        {r.resultingQuantity}
                      </Text>
                    </View>
                    <View style={[styles.td, styles.centerCell, { flex: 0.8 }]}>
                      <View style={[styles.typePill, { background: isSold ? "#fef2f2" : "#f0fdf4" }]}>
                        <Text style={[styles.typePillText, { color: isSold ? colors.danger : colors.success }]}>{r.transactionType || "—"}</Text>
                      </View>
                    </View>
                    <View style={[styles.td, styles.centerCell, { flex: 0.8 }]}>
                      {isOut ? (
                        <View style={[styles.statusPill, { background: "#fef2f2" }]}>
                          <Ionicons name="close-circle" size={10} color={colors.danger} />
                          <Text style={[styles.statusPillText, { color: colors.danger }]}>{t("statusOut")}</Text>
                        </View>
                      ) : isLow ? (
                        <View style={[styles.statusPill, { background: "#fffbeb" }]}>
                          <Ionicons name="alert-triangle" size={10} color={colors.warning} />
                          <Text style={[styles.statusPillText, { color: colors.warning }]}>{t("statusLow")}</Text>
                        </View>
                      ) : (
                        <View style={[styles.statusPill, { background: "#f0fdf4" }]}>
                          <Ionicons name="checkmark-circle" size={10} color={colors.success} />
                          <Text style={[styles.statusPillText, { color: colors.success }]}>{t("statusOk")}</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.td, { flex: 1.1 }]}>
                      <Text style={styles.dateCell}>{fmtDateTime(r.createdAt)}</Text>
                    </View>
                  </View>
                );
              })}
          </View>
        </ScrollView>
        {totalPages > 1 && (
          <View style={styles.paginationBar}>
            <Pressable onPress={() => setPage((p) => p - 1)} disabled={page <= 1} style={[styles.pageNav, page <= 1 && styles.pageNavDisabled]}>
              <Ionicons name="chevron-back" size={14} color={page <= 1 ? colors.slate400 : colors.slate700} />
              <Text style={[styles.pageNavText, { color: page <= 1 ? colors.slate400 : colors.slate700 }]}>{t("prev")}</Text>
            </Pressable>
            {(() => {
              const pages = [];
              const start = Math.max(1, page - 2);
              const end = Math.min(totalPages, page + 2);
              for (let i = start; i <= end; i++) pages.push(i);
              return pages.map((i) => (
                <Pressable key={i} onPress={() => setPage(i)} style={[styles.pageNum, page === i && styles.pageNumActive]}>
                  <Text style={{ fontSize: font.sm, fontWeight: page === i ? "700" : "500", color: page === i ? "#fff" : colors.slate700 }}>{i}</Text>
                </Pressable>
              ));
            })()}
            <Pressable onPress={() => setPage((p) => p + 1)} disabled={page >= totalPages} style={[styles.pageNav, page >= totalPages && styles.pageNavDisabled]}>
              <Text style={[styles.pageNavText, { color: page >= totalPages ? colors.slate400 : colors.slate700 }]}>{t("next")}</Text>
              <Ionicons name="chevron-forward" size={14} color={page >= totalPages ? colors.slate400 : colors.slate700} />
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function MiniTable({ title, ion, ionColor, items, columns, emptyText }) {
  return (
    <View style={styles.miniTable}>
      <View style={styles.miniTableHeader}>
        <Ionicons name={ion} size={15} color={ionColor} />
        <Text style={styles.miniTableTitle}>{title}</Text>
      </View>
      {items.length === 0 ? (
        <View style={styles.miniEmpty}><Text style={styles.miniEmptyText}>{emptyText}</Text></View>
      ) : (
        <View style={{ width: "100%" }}>
          <View style={[styles.tr, { background: colors.slate50 }]}>
            {columns.map((c) => (
              <Text key={c.key} style={[styles.miniTh, c.align === "center" && { textAlign: "center" }, { flex: c.align === "center" ? 0.8 : 1.4 }]}>{c.label}</Text>
            ))}
          </View>
          {items.map((item, i) => (
            <View key={i} style={[styles.tr, { background: "transparent", minHeight: 34 }]}>
              {columns.map((c) => (
                <View key={c.key} style={[styles.miniTd, c.align === "center" && styles.centerCell, { flex: c.align === "center" ? 0.8 : 1.4 }]}>
                  {c.render ? c.render(item[c.key]) : <Text style={{ fontWeight: c.key === "name" ? "600" : "400", color: colors.slate700 }}>{item[c.key]}</Text>}
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 90 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.md },
  titleLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 22, fontWeight: "700", color: colors.slate900 },
  subtitle: { fontSize: font.xs, color: colors.slate400 },
  csvBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, background: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md },
  csvBtnText: { fontSize: font.xs, fontWeight: "600", color: colors.slate500 },
  deleteAllBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, background: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: radius.md },
  deleteAllBtnDisabled: { background: "#f3f4f6", borderColor: colors.slate200 },
  deleteAllBtnText: { fontSize: font.xs, fontWeight: "600" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  statCard: { background: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, padding: 16, flexBasis: "45%", flexGrow: 1, minWidth: 150, flexDirection: "row", alignItems: "center", gap: spacing.md, overflow: "hidden" },
  statTop: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  statIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: font.xs, color: colors.slate400, fontWeight: "500" },
  miniRow: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  miniTable: { flex: 1, minWidth: 260, background: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, overflow: "hidden" },
  miniTableHeader: { paddingVertical: 12, paddingHorizontal: 16, background: colors.slate50, borderBottomWidth: 1, borderBottomColor: colors.slate200, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  miniTableTitle: { fontSize: font.sm, fontWeight: "700", color: colors.slate900 },
  miniEmpty: { padding: 24, alignItems: "center" },
  miniEmptyText: { color: colors.slate400, fontSize: font.xs },
  miniTh: { paddingVertical: 8, paddingHorizontal: 12, fontSize: font.xs, fontWeight: "700", color: colors.slate500, textTransform: "uppercase" },
  miniTd: { paddingVertical: 8, paddingHorizontal: 12 },
  miniDateText: { fontSize: font.xs, color: colors.slate500 },
  toolbar: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.md },
  searchInput: { flex: 1, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md, fontSize: font.sm, paddingVertical: 8, paddingLeft: 36, paddingRight: 12, background: "#fff" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.sm, borderWidth: 1, minWidth: 70, alignItems: "center" },
  tableCard: { background: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, overflow: "hidden", flexGrow: 0 },
  thead: { flexDirection: "row", background: "#f8fafc", borderBottomWidth: 2, borderBottomColor: colors.slate200 },
  th: { paddingVertical: 8, paddingHorizontal: 12, flexDirection: "row", alignItems: "center" },
  thText: { fontSize: font.xs, fontWeight: "700", color: colors.slate500, textTransform: "uppercase" },
  tr: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", minHeight: 46 },
  td: { paddingVertical: 8, paddingHorizontal: 12, justifyContent: "center" },
  centerCell: { alignItems: "center" },
  nameCell: { fontWeight: "600", color: colors.slate800, fontSize: font.sm },
  delta: { fontWeight: "700", fontSize: font.sm },
  resulting: { fontSize: font.sm },
  typePill: { paddingVertical: 2, paddingHorizontal: 10, borderRadius: 99 },
  typePillText: { fontSize: font.xs, fontWeight: "600" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99 },
  statusPillText: { fontSize: font.xs, fontWeight: "600" },
  dateCell: { fontSize: font.xs, color: colors.slate400 },
  emptyCell: { padding: 40, justifyContent: "center" },
  emptyText: { color: colors.slate400, fontSize: font.sm },
  paginationBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14 },
  pageNav: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: "#d1d5db", borderRadius: radius.sm, background: "#fff" },
  pageNavDisabled: { background: "#f3f4f6" },
  pageNavText: { fontSize: font.sm, fontWeight: "500" },
  pageNum: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#d1d5db", borderRadius: radius.sm, background: "#fff" },
  pageNumActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});