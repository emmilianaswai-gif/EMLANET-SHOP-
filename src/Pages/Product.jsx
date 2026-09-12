import { useEffect, useState, useMemo } from "react";
import { View, Text, Pressable, TextInput, Image, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import BulkBar from "../components/BulkBar";
import { t, useLanguage } from "../i18n";
import { canViewProfit } from "../utils/roleChecks";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { useUndo } from "../UndoContext";
import { useNav } from "../navigation/nav";
import { confirmDialog } from "../utils/confirm";
import SelectField from "../components/ui/SelectField";
import PermGate from "../Layout/PermGate";
import { colors, font, radius, spacing, shadow } from "../theme";

const getStatus = (p) => {
  if (!p.expiryDate) return { label: t("noExpiry"), color: "#64748b", bg: "#f1f5f9", Icon: "time-outline" };
  const diff = Math.ceil((new Date(p.expiryDate) - new Date()) / 86400000);
  if (diff < 0) return { label: t("expired"), color: "#dc2626", bg: "#fef2f2", Icon: "close-circle-outline" };
  if (diff <= 14) return { label: t("expiring"), color: "#f59e0b", bg: "#fffbeb", Icon: "alert-circle-outline" };
  return { label: t("active"), color: "#16a34a", bg: "#f0fdf4", Icon: "checkmark-circle-outline" };
};

export default function Product() {
  useLanguage();
  const { notifyUndo } = useUndo() || {};
  const showProfit = canViewProfit();
  const nav = useNav();
  const userRole = localStorage.getItem("shop_role") || "customer";
  const isCustomer = userRole === "customer";
  const [products, setProducts] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const [totalSalesRevenue, setTotalSalesRevenue] = useState(0);
  const [prodPage, setProdPage] = useState(1);
  const PROD_PAGE_SIZE = 10;

  useEffect(() => {
    const load = async () => {
      try {
        const [pr, cr, sr, slr] = await Promise.all([
          api.get("/products").catch(() => ({ data: [] })),
          api.get("/categories").catch(() => ({ data: [] })),
          api.get("/stocks").catch(() => ({ data: [] })),
          api.get("/sales").catch(() => ({ data: [] })),
        ]);
        setProducts(Array.isArray(pr.data) ? pr.data : []);
        setCategories(Array.isArray(cr.data) ? cr.data : []);
        const smap = {};
        (Array.isArray(sr.data) ? sr.data : []).forEach((s) => { smap[s.productId ?? s.product?.id] = s.quantity; });
        setStockMap(smap);
        const salesData = Array.isArray(slr.data) ? slr.data : [];
        const today = new Date().toISOString().slice(0, 10);
        const todaySales = salesData
          .filter((s) => s.saleDate && s.saleDate.slice(0, 10) === today)
          .reduce((sum, s) => sum + (Number(s.grandTotal) || Number(s.price) || 0), 0);
        setTotalSalesRevenue(todaySales);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const reload = async () => {
    const [pr, sr] = await Promise.all([
      api.get("/products").catch(() => ({ data: [] })),
      api.get("/stocks").catch(() => ({ data: [] })),
    ]);
    const data = Array.isArray(pr.data) ? pr.data : [];
    setProducts(data);
    const smap = {};
    (Array.isArray(sr.data) ? sr.data : []).forEach((s) => { smap[s.productId ?? s.product?.id] = s.quantity; });
    setStockMap(smap);
  };

  const getQty = (p) => stockMap[p.id] ?? (Number(p.quantity) || 0);

  const stats = useMemo(() => {
    let a = 0, e = 0, x = 0, l = 0;
    products.forEach((p) => {
      const qty = getQty(p);
      if (qty < 10) l++;
      if (!p.expiryDate) { a++; return; }
      const d = Math.ceil((new Date(p.expiryDate) - new Date()) / 86400000);
      if (d < 0) x++; else if (d <= 14) e++; else a++;
    });
    let totalProfit = 0;
    products.forEach((p) => {
      const qty = getQty(p);
      const sp = Number(p.price) || 0;
      const bp = Number(p.buyingPrice) || 0;
      totalProfit += (sp - bp) * qty;
    });
    return { total: products.length, active: a, expiring: e, expired: x, lowStock: l, totalValue: totalSalesRevenue, potentialProfit: totalProfit };
  }, [products, stockMap, totalSalesRevenue]);

  const filtered = useMemo(() => {
    let items = [...products];
    if (search) { const s = search.toLowerCase(); items = items.filter((p) => p.name?.toLowerCase().includes(s)); }
    if (statusFilter !== "all") items = items.filter((p) => {
      const qty = getQty(p);
      if (statusFilter === "lowstock") return qty < 10;
      if (!p.expiryDate) return statusFilter === "active";
      const d = Math.ceil((new Date(p.expiryDate) - new Date()) / 86400000);
      if (d < 0) return statusFilter === "expired";
      if (d <= 14) return statusFilter === "expiring";
      return statusFilter === "active" && d > 30;
    });
    if (isCustomer) items = items.filter((p) => {
      if (!p.expiryDate) return true;
      return Math.ceil((new Date(p.expiryDate) - new Date()) / 86400000) >= 0;
    });
    if (categoryFilter !== "all") items = items.filter((p) => String(p.category?.id || "") === String(categoryFilter));
    items.sort((a, b) => {
      let va, vb;
      if (sortField === "price") { va = Number(a.price) || 0; vb = Number(b.price) || 0; }
      else if (sortField === "quantity") { va = getQty(a); vb = getQty(b); }
      else if (sortField === "dateAdded") { va = a.createdAt || ""; vb = b.createdAt || ""; }
      else { va = (a.name || "").toLowerCase(); vb = (b.name || "").toLowerCase(); }
      return typeof va === "string" ? (sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)) : (sortDir === "asc" ? va - vb : vb - va);
    });
    return items;
  }, [products, stockMap, search, statusFilter, categoryFilter, sortField, sortDir]);

  const totalProdPages = Math.ceil(filtered.length / PROD_PAGE_SIZE);
  const paginatedProducts = filtered.slice((prodPage - 1) * PROD_PAGE_SIZE, prodPage * PROD_PAGE_SIZE);
  useEffect(() => { setProdPage(1); }, [search, statusFilter, categoryFilter, sortField, sortDir]);

  const bulk = useBulkSelect(filtered, (p) => p.id);

  const restoreProduct = async (p) => {
    const payload = {
      name: p.name, price: p.price, buyingPrice: p.buyingPrice || 0,
      expiryDate: p.expiryDate, unit: p.unit || "piece",
      piecesPerUnit: p.piecesPerUnit ?? null, quantity: p.quantity || 0,
      discount: p.discount || 0, discountType: p.discountType || "percent",
      image: p.image || "",
    };
    if (p.category?.id) payload.categoryId = p.category.id;
    if (p.supplier?.id) payload.supplierId = p.supplier.id;
    await api.post("/products", payload).catch(() => {});
    await reload();
    if (notifyUndo) notifyUndo(t("productRestored"), () => {}, { timeout: 2500, undo: false });
  };

  const deleteProduct = async (p) => {
    if (!(await confirmDialog(t("deleteProductConfirm", { name: p.name }), "", { destructive: true }))) return;
    await api.delete(`/products/${p.id}`);
    await reload();
    notifyUndo?.(t("productDeletedNotify", { name: p.name }), () => restoreProduct(p));
  };

  const deleteSelected = async () => {
    if (bulk.selected.length === 0) return;
    if (!(await confirmDialog(t("deleteSelectedProductsConfirm", { count: bulk.selected.length }), "", { destructive: true }))) return;
    const deleted = bulk.selected.map((id) => products.find((p) => p.id === id)).filter(Boolean);
    for (const id of bulk.selected) await api.delete(`/products/${id}`).catch(() => {});
    bulk.clear();
    await reload();
    notifyUndo?.(t("productsDeletedNotify", { count: deleted.length }), () => { deleted.forEach((p) => restoreProduct(p)); });
  };

  if (loading) return <View style={styles.centerBox}><Spinner size={28} text={t("loading")} /></View>;

  const toggleSort = (f) => sortField === f ? setSortDir((d) => d === "asc" ? "desc" : "asc") : (setSortField(f), setSortDir("asc"));

  const statCards = [
    { l: t("total"), v: stats.total, c: "#0f172a", i: "cube-outline", f: "all" },
    ...(!isCustomer ? [
      { l: t("active"), v: stats.active, c: "#16a34a", i: "checkmark-circle-outline", f: "active" },
      { l: t("expiring"), v: stats.expiring, c: "#f59e0b", i: "alert-circle-outline", f: "expiring" },
      { l: t("expired"), v: stats.expired, c: "#dc2626", i: "close-circle-outline", f: "expired" },
      { l: t("lowStock"), v: stats.lowStock, c: stats.lowStock > 0 ? "#dc2626" : "#16a34a", i: "hash-outline", f: "lowstock" },
      { l: t("stockValue"), v: `TZS ${stats.totalValue.toFixed(0)}`, c: "#2563eb", i: "cash-outline", f: null },
      ...(showProfit ? [{ l: t("potentialProfit"), v: `TZS ${stats.potentialProfit.toFixed(0)}`, c: "#16a34a", i: "trending-up-outline", f: null }] : []),
    ] : []),
  ];

  const filterTabs = [
    { k: "all", l: t("all") },
    ...(!isCustomer ? [
      { k: "active", l: t("active") },
      { k: "expiring", l: t("expiring") },
      { k: "expired", l: t("expired") },
      { k: "lowstock", l: t("lowStock") },
    ] : []),
  ];

  const cols = [
    { f: "name", l: t("name") },
    { f: "cat", l: t("category") },
    { f: "price", l: isCustomer ? t("price") : t("sellingPrice") },
    ...(!isCustomer ? [{ f: "buyingPrice", l: t("buyingPrice") }, ...(showProfit ? [{ f: "profit", l: t("profit") }] : [])] : []),
    { f: "unit", l: t("unit") },
    ...(!isCustomer ? [{ f: "quantity", l: t("qty") }] : []),
    { f: "status", l: t("status") },
    { f: "dateAdded", l: t("dateAdded") },
    ...(!isCustomer ? [{ f: "expiry", l: t("expiry") }, { f: "actions", l: "" }] : []),
    ...(isCustomer ? [{ f: "buy", l: "" }] : []),
  ];

  const renderHeaderCell = (h) => {
    const align = h.f === "price" || h.f === "buyingPrice" || h.f === "profit" ? "flex-end" : h.f === "quantity" || h.f === "dateAdded" || h.f === "actions" || h.f === "buy" ? "center" : "flex-start";
    return (
      <Pressable key={h.f || h.l} style={[styles.th, { alignItems: align, flex: h.f === "name" ? 1.6 : 1 }]} onPress={() => h.f && toggleSort(h.f)}>
        <Text style={styles.thText}>{h.l} </Text>
        {!!h.f && (
          <Ionicons name="swap-vertical" size={10} style={{ opacity: sortField === h.f ? 1 : 0.3 }} color={sortField === h.f ? "#2563eb" : "#94a3b8"} />
        )}
      </Pressable>
    );
  };

  const renderCell = (p) => {
    const qty = getQty(p);
    const s = getStatus(p);
    const low = qty < 10;
    const profit = (Number(p.price) || 0) - (Number(p.buyingPrice) || 0);
    return (
      <>
        {bulk.mode && (
          <Pressable style={[styles.td, styles.centerCell, { width: 32 }]} onPress={() => bulk.toggle(p.id)}>
            <Ionicons name={bulk.selectedSet.has(p.id) ? "checkbox" : "square-outline"} size={16} color={bulk.selectedSet.has(p.id) ? colors.primary : colors.slate400} />
          </Pressable>
        )}
        <View style={[styles.td, { flex: 1.6, flexDirection: "row", alignItems: "center", gap: 6 }]}>
          {p.image ? (
            <Image source={{ uri: p.image }} style={styles.thumb} />
          ) : (
            <View style={[styles.iconBox, { background: s.bg }]}>
              <Ionicons name={s.Icon} size={13} color={s.color} />
            </View>
          )}
          <Text style={styles.nameText} numberOfLines={1}>{p.name}</Text>
        </View>
        <View style={[styles.td, { flex: 1 }]}>
          <Text style={styles.chip}>{p.category?.name || "—"}</Text>
        </View>
        <View style={[styles.td, { flex: 1, alignItems: "flex-end" }]}>
          <Text style={[styles.priceText]}>TZS {Number(p.price).toLocaleString()}</Text>
        </View>
        {!isCustomer && (
          <>
            <View style={[styles.td, { flex: 1, alignItems: "flex-end" }]}>
              <Text style={styles.buyingText}>TZS {Number(p.buyingPrice || 0).toFixed(2)}</Text>
            </View>
            {showProfit && (
              <View style={[styles.td, { flex: 1, alignItems: "flex-end" }]}>
                <Text style={[styles.profitText, { color: profit > 0 ? "#16a34a" : profit < 0 ? "#dc2626" : "#64748b" }]}>
                  {profit >= 0 ? "+" : ""}TZS {profit.toFixed(2)}
                </Text>
              </View>
            )}
          </>
        )}
        <View style={[styles.td, { flex: 1 }]}>
          <Text style={styles.unitText}>{p.unit || t("piece")}</Text>
          {Number(p.piecesPerUnit) > 0 && <Text style={styles.piecesText}>{p.piecesPerUnit} {t("pieces")}</Text>}
        </View>
        {!isCustomer && (
          <View style={[styles.td, styles.centerCell, { flex: 0.7 }]}>
            <Text style={[styles.qtyText, { color: low ? "#dc2626" : "#0f172a" }]}>{qty}</Text>
          </View>
        )}
        <View style={[styles.td, { flex: 1 }]}>
          <View style={[styles.statusBadge, { background: s.bg }]}>
            <Ionicons name={s.Icon} size={10} color={s.color} />
            <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
          </View>
        </View>
        <View style={[styles.td, styles.centerCell, { flex: 0.7 }]}>
          <Text style={styles.dateText}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}</Text>
        </View>
        {!isCustomer && (
          <>
            <View style={[styles.td, styles.centerCell, { flex: 0.7 }]}>
              <Text style={styles.dateText}>{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : "—"}</Text>
            </View>
            <View style={[styles.td, styles.centerCell, { flex: 0.7 }]}>
              <Pressable onPress={() => nav("/products/add", { edit: p.id })} style={styles.actionBtn}>
                <Ionicons name="pencil-outline" size={14} color={colors.primary} />
              </Pressable>
              <Pressable onPress={() => deleteProduct(p)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
              </Pressable>
            </View>
          </>
        )}
        {isCustomer && (
          <View style={[styles.td, styles.centerCell, { flex: 0.7 }]}>
            <Pressable style={styles.buyBtn} onPress={() => nav("/customer-purchase", { product: p.id })}>
              <Text style={styles.buyText}>{t("buy")}</Text>
            </Pressable>
          </View>
        )}
      </>
    );
  };

  const renderPagination = () => {
    if (totalProdPages <= 1) return null;
    const pages = [];
    const start = Math.max(1, prodPage - 2);
    const end = Math.min(totalProdPages, prodPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return (
      <View style={styles.pagination}>
        <Pressable disabled={prodPage <= 1} onPress={() => setProdPage((p) => p - 1)} style={[styles.pageNav, prodPage <= 1 && styles.pageNavDisabled]}>
          <Ionicons name="chevron-back" size={14} color={prodPage <= 1 ? "#9ca3af" : "#374151"} />
          <Text style={{ fontSize: 13, fontWeight: "500", color: prodPage <= 1 ? "#9ca3af" : "#374151" }}>{t("prev")}</Text>
        </Pressable>
        {pages.map((i) => (
          <Pressable key={i} onPress={() => setProdPage(i)} style={[styles.pageNum, prodPage === i && styles.pageNumActive]}>
            <Text style={{ fontSize: 13, fontWeight: prodPage === i ? 700 : 500, color: prodPage === i ? "#fff" : "#374151" }}>{i}</Text>
          </Pressable>
        ))}
        <Pressable disabled={prodPage >= totalProdPages} onPress={() => setProdPage((p) => p + 1)} style={[styles.pageNav, prodPage >= totalProdPages && styles.pageNavDisabled]}>
          <Text style={{ fontSize: 13, fontWeight: "500", color: prodPage >= totalProdPages ? "#9ca3af" : "#374151" }}>{t("next")}</Text>
          <Ionicons name="chevron-forward" size={14} color={prodPage >= totalProdPages ? "#9ca3af" : "#374151"} />
        </Pressable>
      </View>
    );
  };

  const main = (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing.sm, gap: 8 }}>
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <Ionicons name="cube-outline" size={22} color="#2563eb" />
          <Text style={styles.title}>{t("products")}</Text>
          <Text style={styles.count}>({products.length})</Text>
        </View>
        {!isCustomer && (
          <Pressable onPress={() => (bulk.mode ? bulk.clear() : bulk.startMode())} style={[styles.selectBtn, bulk.mode && styles.selectBtnActive]}>
            <Ionicons name="checkbox-outline" size={14} color="#2563eb" />
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#2563eb" }}>{bulk.mode ? t("cancel") : t("select")}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.statsRow}>
        {statCards.map((s) => {
          const isActive = s.f && statusFilter === s.f;
          return (
            <Pressable key={s.l} onPress={() => s.f && setStatusFilter(s.f)} style={[styles.statCard, isActive && styles.statCardActive]}>
              <View style={[styles.statTopBorder, { background: s.c }]} />
              <Text style={[styles.statLabel, { color: "#64748b" }]}>
                <Ionicons name={s.i} size={12} color={s.c} /> {s.l}
              </Text>
              <Text style={[styles.statValue, { color: s.c }]}>{s.v}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.filtersRow}>
        <View style={{ flex: 1, minWidth: 160, position: "relative" }}>
          <View style={{ position: "absolute", left: 8, top: 12, zIndex: 1 }}>
            <Ionicons name="search" size={14} color="#94a3b8" />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("searchProducts")}
            placeholderTextColor={colors.slate400}
            style={styles.searchInput}
          />
        </View>
        <View style={{ minWidth: 140 }}>
          <SelectField
            value={categoryFilter}
            onChange={(v) => setCategoryFilter(String(v))}
            options={[{ value: "all", label: t("allCategories") }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
            searchable
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
        <View style={styles.tabWrap}>
          {filterTabs.map((f) => (
            <Pressable key={f.k} onPress={() => setStatusFilter(f.k)} style={[styles.tab, statusFilter === f.k && styles.tabActive]}>
              <Text style={[styles.tabText, statusFilter === f.k && styles.tabTextActive]}>{f.l}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {bulk.mode && (
        <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected} onSelectAll={bulk.toggleAll} onDelete={deleteSelected} deleteLabel={t("deleteSelected")} />
      )}

      <View style={styles.tableCard}>
        <ScrollView horizontal>
          <View style={{ minWidth: isCustomer ? 640 : 1000 }}>
            <View style={styles.thead}>
              {bulk.mode && (
                <Pressable style={[styles.th, styles.centerCell, { width: 32 }]} onPress={bulk.toggleAll}>
                  <Ionicons name={bulk.allSelected ? "checkbox" : "square-outline"} size={16} color={bulk.allSelected ? colors.primary : colors.slate400} />
                </Pressable>
              )}
              {cols.map(renderHeaderCell)}
            </View>
            {filtered.length === 0 ? (
              <View style={[styles.emptyCell, { alignItems: "center" }]}>
                <Text style={styles.emptyText}>{t("noProductsFound")}</Text>
              </View>
            ) : (
              paginatedProducts.map((p) => (
                <View key={p.id} style={styles.tr} {...bulk.rowProps(p.id)}>
                  {renderCell(p)}
                </View>
              ))
            )}
            </View>
        </ScrollView>
        {renderPagination()}
      </View>
    </ScrollView>
  );

  return isCustomer ? main : <PermGate module="products">{main}</PermGate>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 90 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  titleLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 18, fontWeight: "700", color: colors.slate900 },
  count: { color: "#94a3b8", fontSize: 12 },
  selectBtn: {
    flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, backgroundColor: "#fff",
  },
  selectBtnActive: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8,
    padding: 12, minWidth: 130, flexBasis: "30%", flexGrow: 1, overflow: "hidden", ...shadow.card,
  },
  statCardActive: { backgroundColor: "#eff6ff" },
  statTopBorder: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  statLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  statValue: { fontSize: 17, fontWeight: "700", marginTop: 2 },
  filtersRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  searchInput: {
    borderWidth: 1, borderColor: colors.slate200, borderRadius: 6, fontSize: 12,
    paddingVertical: 8, paddingLeft: 28, paddingRight: 8, backgroundColor: "#fff",
  },
  tabWrap: { flexDirection: "row", gap: 2, backgroundColor: "#f1f5f9", padding: 2, borderRadius: 6 },
  tab: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 4 },
  tabActive: { backgroundColor: "#fff" },
  tabText: { fontSize: 11, fontWeight: "600", color: "#64748b" },
  tabTextActive: { color: "#2563eb" },
  tableCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: 8,
    overflow: "hidden", flexGrow: 0,
  },
  thead: { flexDirection: "row", backgroundColor: "#f8fafc", borderBottomWidth: 2, borderBottomColor: colors.slate200 },
  th: {
    paddingVertical: 8, paddingHorizontal: 10, flexDirection: "row", alignItems: "center",
  },
  thText: { fontSize: 10, fontWeight: "700", color: "#64748b", textTransform: "uppercase" },
  tr: {
    flexDirection: "row", alignItems: "center", borderBottomWidth: 1,
    borderBottomColor: colors.slate100, minHeight: 52,
  },
  td: { paddingVertical: 8, paddingHorizontal: 10, justifyContent: "center" },
  centerCell: { alignItems: "center" },
  thumb: { width: 30, height: 30, borderRadius: 4, borderWidth: 1, borderColor: colors.slate200 },
  iconBox: { width: 26, height: 26, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  nameText: { fontWeight: "600", fontSize: 12, flexShrink: 1, color: colors.slate800 },
  chip: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 99, overflow: "hidden", fontSize: 10, backgroundColor: "#f1f5f9", color: "#475569", alignSelf: "flex-start" },
  priceText: { fontWeight: "600", color: "#16a34a", fontSize: 12 },
  buyingText: { color: "#64748b", fontSize: 12 },
  profitText: { fontWeight: "700", fontSize: 12 },
  unitText: { fontSize: 11, color: "#64748b" },
  piecesText: { fontSize: 9, color: "#94a3b8" },
  qtyText: { fontWeight: "700", fontSize: 12 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99, alignSelf: "flex-start" },
  statusText: { fontSize: 10, fontWeight: "600" },
  dateText: { fontSize: 11, color: "#64748b" },
  actionBtn: { padding: 3 },
  buyBtn: { backgroundColor: "#2563eb", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 5 },
  buyText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  pageNav: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, backgroundColor: "#fff" },
  pageNavDisabled: { backgroundColor: "#f3f4f6" },
  pageNum: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, backgroundColor: "#fff" },
  pageNumActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  emptyCell: { padding: 32, flexDirection: "row", justifyContent: "center" },
  emptyText: { color: "#94a3b8", fontSize: 13 },
});