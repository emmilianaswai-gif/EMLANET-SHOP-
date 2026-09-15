import { useEffect, useState, useMemo, useCallback } from "react";
import { View, Text, Pressable, ScrollView, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { useUndo } from "../UndoContext";
import { t, useLanguage } from "../i18n";
import { canViewProfit } from "../utils/roleChecks";
import { confirmDialog, alertMessage } from "../utils/confirm";
import { TextField, Modal } from "../components/ui";
import { colors, font, radius, spacing, shadow, money } from "../theme";

const TABS = [
  { id: "overview", labelKey: "overviewTab", icon: "stats-chart" },
  { id: "items", labelKey: "itemsTab", icon: "cube-outline" },
];

function buildVirtualItems(realItems, products, stockHistory) {
  const realPids = new Set(realItems.map((i) => i.product?.id).filter((x) => x != null));
  const byProduct = {};
  (Array.isArray(stockHistory) ? stockHistory : []).forEach((h) => {
    const pid = h.product?.id || h.productId;
    if (pid == null || realPids.has(pid)) return;
    if (String(h.transactionType || "").toLowerCase() === "added" || (Number(h.quantityChange) || 0) > 0) {
      if (!byProduct[pid]) byProduct[pid] = { qty: 0, date: null };
      byProduct[pid].qty += Math.abs(Number(h.quantityChange) || 0);
      const d = h.createdAt || h.date;
      if (d && (!byProduct[pid].date || new Date(d) < new Date(byProduct[pid].date))) byProduct[pid].date = d;
    }
  });
  return Object.entries(byProduct).map(([pidStr, info]) => {
    const product = products.find((p) => p.id === Number(pidStr));
    if (!product) return null;
    return {
      id: `virtual-${product.id}`,
      virtual: true,
      product,
      quantity: info.qty,
      costPrice: Number(product.buyingPrice) || 0,
      purchase: { status: "Added", purchaseDate: info.date || undefined },
    };
  }).filter(Boolean);
}

export default function PurchasesItem() {
  useLanguage();
  const showProfit = canViewProfit();
  const { notifyUndo } = useUndo() || {};
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exchanges, setExchanges] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    try {
      const [piRes, prRes, stRes, shRes, xrRes] = await Promise.all([
        api.get("/purchase-items").catch(() => ({ data: [] })),
        api.get("/products").catch(() => ({ data: [] })),
        api.get("/stocks").catch(() => ({ data: [] })),
        api.get("/stock-history").catch(() => ({ data: [] })),
        api.get("/exchange-storing").catch(() => ({ data: [] })),
      ]);
      const products = Array.isArray(prRes.data) ? prRes.data : [];
      const realItems = Array.isArray(piRes.data) ? piRes.data : [];
      const stockHistory = Array.isArray(shRes.data) ? shRes.data : [];
      setProducts(products);
      setStocks(Array.isArray(stRes.data) ? stRes.data : []);
      setExchanges(Array.isArray(xrRes.data) ? xrRes.data : (xrRes?.data?.content || xrRes?.data?.records || []));
      setPurchaseItems([...realItems, ...buildVirtualItems(realItems, products, stockHistory)]);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      if (!silent) setError(null);
    } catch (e) {
      if (!silent) setError(e.message || "Failed to load data");
    }
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
    const id = setInterval(() => loadData({ silent: true }), 20000);
    return () => clearInterval(id);
  }, [loadData]);

  const productMap = useMemo(() => {
    const m = {};
    products.forEach((p) => { m[p.id] = p; });
    return m;
  }, [products]);

  const stockMap = useMemo(() => {
    const m = {};
    stocks.forEach((s) => {
      const pid = s.product?.id;
      if (pid) m[pid] = (m[pid] || 0) + (s.quantity || 0);
    });
    return m;
  }, [stocks]);

  const getItemCost = (item) =>
    Number(item.costPrice) ||
    Number(item.purchase?.unitPrice) ||
    Number(item.product?.buyingPrice) ||
    0;

  const getItemSellingPrice = (item) => Number(item.product?.price) || 0;

  const getItemDate = (item) => (item.purchase?.purchaseDate || item.purchaseDate || "").slice(0, 10);

  const getItemTime = (item) => {
    const raw = item.createdAt || item.purchase?.purchaseDate || "";
    if (!raw) return "";
    try { return new Date(raw).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
  };

  const getExchangedQty = useCallback((pid) => {
    const pidNum = Number(pid);
    return exchanges
      .filter((r) => {
        const st = (r.status || "").toLowerCase();
        if (st !== "approved" && st !== "active") return false;
        return Number(r.product?.id || r.productId) === pidNum;
      })
      .reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  }, [exchanges]);

  const restorePurchaseItem = async (item) => {
    await api.post("/purchase-items", {
      quantity: item.quantity,
      costPrice: item.costPrice,
      purchase: item.purchase?.id ? { id: item.purchase.id } : undefined,
      product: { id: item.product?.id },
    }).catch(() => {});
    await loadData({ silent: true });
    if (notifyUndo) notifyUndo(t("purchasedItemRestored"), () => {}, { timeout: 2500, undo: false });
  };

  const deletePurchaseItem = async (item) => {
    if (item.virtual) { alertMessage(t("stockHistoryRecordAlert")); return; }
    const pid = item.product?.id;
    const stockQty = pid ? (stockMap[pid] || 0) : 0;
    if (stockQty > 0) {
      alertMessage(t("cannotDeleteStockAvailable"));
      return;
    }
    if (!(await confirmDialog(t("deletePurchasedItemConfirm")))) return;
    try {
      await api.delete(`/purchase-items/${item.id}`);
      setPurchaseItems((prev) => prev.filter((x) => x.id !== item.id));
      notifyUndo?.(t("purchasedItemDeleted", { name: item.product?.name || `#${item.id}` }), () => restorePurchaseItem(item));
    } catch { alertMessage(t("failedToDelete")); }
  };

  const filtered = useMemo(() => {
    let items = [...purchaseItems];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((item) => (item.product?.name || "").toLowerCase().includes(q));
    }
    if (dateFrom) items = items.filter((item) => { const d = getItemDate(item); return d && d >= dateFrom; });
    if (dateTo) items = items.filter((item) => { const d = getItemDate(item); return d && d <= dateTo; });
    items.sort((a, b) => { const cmp = getItemDate(a).localeCompare(getItemDate(b)); return sortDir === "desc" ? -cmp : cmp; });
    return items;
  }, [purchaseItems, search, dateFrom, dateTo, sortDir]);

  const [itemPage, setItemPage] = useState(1);
  const ITEM_PAGE_SIZE = 10;
  const totalItemPages = Math.ceil(filtered.length / ITEM_PAGE_SIZE);
  const paginatedItems = filtered.slice((itemPage - 1) * ITEM_PAGE_SIZE, itemPage * ITEM_PAGE_SIZE);
  useEffect(() => { setItemPage(1); }, [search, dateFrom, dateTo, sortDir]);

  const bulk = useBulkSelect(filtered, (item) => item.id);

  const deleteSelected = async () => {
    if (bulk.selected.length === 0) return;
    const deletableIds = bulk.selected.filter((id) => {
      const item = filtered.find((x) => x.id === id);
      if (!item || item.virtual) return false;
      const pid = item?.product?.id;
      return !(pid && (stockMap[pid] || 0) > 0);
    });
    if (deletableIds.length === 0) { alertMessage(t("cannotDeleteStockAvailablePlural")); return; }
    if (!(await confirmDialog(t("deleteSelectedPurchasedItemsConfirm", { count: deletableIds.length })))) return;
    try {
      const deleted = deletableIds.map((id) => filtered.find((x) => x.id === id)).filter(Boolean);
      for (const id of deletableIds) await api.delete(`/purchase-items/${id}`);
      setPurchaseItems((prev) => prev.filter((x) => !deletableIds.includes(x.id)));
      bulk.clear();
      if (deleted.length) notifyUndo?.(t("purchasedItemsDeleted", { count: deleted.length }), () => { deleted.forEach((it) => restorePurchaseItem(it)); });
    } catch { alertMessage(t("failedToDelete")); }
  };

  const selectedDetail = useMemo(() => {
    if (!selectedItem) return null;
    const pid = selectedItem.product?.id;
    const product = productMap[pid];
    const items = purchaseItems.filter((i) => i.product?.id === pid);
    const qty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    const totalCost = items.reduce((s, i) => s + (Number(i.costPrice) || 0) * (Number(i.quantity) || 0), 0);
    const sellingPrice = Number(product?.price) || 0;
    const avgCost = qty ? totalCost / qty : 0;
    const exchangedQty = Math.min(qty, getExchangedQty(pid));
    const sellable = Math.max(0, qty - exchangedQty);
    return {
      pid,
      name: product?.name || selectedItem.product?.name || "Unknown",
      qty,
      totalCost,
      sellingPrice,
      avgCost,
      exchangedQty,
      predictedSales: sellingPrice * qty,
      predictedProfit: (sellingPrice - avgCost) * qty,
      salesAfter: sellingPrice * sellable,
      profitAfter: (sellingPrice - avgCost) * sellable,
    };
  }, [selectedItem, purchaseItems, productMap, getExchangedQty]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const yearStart = `${now.getFullYear()}-01-01`;
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - mondayOffset);
    const weekStartStr = weekStart.toISOString().split("T")[0];

    let totalCost = 0, totalQty = 0, totalRevenue = 0, totalProfit = 0;
    let todayCost = 0, todayQty = 0, weekCost = 0, weekQty = 0;
    let monthCost = 0, monthQty = 0, yearCost = 0, yearQty = 0;
    const productPurchases = {};

    purchaseItems.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const cost = getItemCost(item);
      const sellPrice = getItemSellingPrice(item);
      const lineCost = cost * qty;
      const date = getItemDate(item);
      const pid = item.product?.id;
      const productName = item.product?.name || "Unknown";
      const exchangedQty = Math.min(qty, getExchangedQty(pid));
      const sellableQty = qty - exchangedQty;

      totalCost += lineCost;
      totalQty += qty;
      totalRevenue += sellPrice * sellableQty;
      totalProfit += (sellPrice - cost) * sellableQty;

      if (date >= todayStr) { todayCost += lineCost; todayQty += qty; }
      if (date >= weekStartStr) { weekCost += lineCost; weekQty += qty; }
      if (date >= monthStart) { monthCost += lineCost; monthQty += qty; }
      if (date >= yearStart) { yearCost += lineCost; yearQty += qty; }

      if (pid) {
        if (!productPurchases[pid]) productPurchases[pid] = { name: productName, qty: 0, cost: 0, pid };
        productPurchases[pid].qty += qty;
        productPurchases[pid].cost += lineCost;
      }
    });

    const topProducts = Object.values(productPurchases).sort((a, b) => b.qty - a.qty).slice(0, 5);
    const remainingStock = Object.entries(stockMap).reduce((acc, [pid, qty]) => {
      const p = productMap[pid];
      if (p && qty > 0) {
        acc.stockQty += qty;
        acc.stockCost += (Number(p.buyingPrice) || 0) * qty;
        acc.stockRevenue += (Number(p.price) || 0) * qty;
      }
      return acc;
    }, { stockQty: 0, stockCost: 0, stockRevenue: 0 });

    return {
      totalCost, totalQty, totalRevenue, totalProfit,
      todayCost, todayQty, weekCost, weekQty,
      monthCost, monthQty, yearCost, yearQty,
      topProducts, remainingStock,
    };
  }, [purchaseItems, productMap, stockMap, getExchangedQty]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <Spinner size={28} text={t("loading")} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorWrap}>
        <Ionicons name="alert-circle" size={40} color={colors.danger} style={{ opacity: 0.8 }} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => loadData()} style={styles.retryBtn} hitSlop={8}>
          <Ionicons name="refresh" size={13} color={colors.white} />
          <Text style={styles.retryText}>{t("retry")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="cube" size={18} color={colors.white} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{t("purchasedItems")}</Text>
            <Text style={styles.headerSub}>{t("purchasedItemsSubtitle", { n: purchaseItems.length })}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {!!lastUpdated && (
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{t("liveUpdated", { time: lastUpdated })}</Text>
            </View>
          )}
          <Pressable
            onPress={() => { setRefreshing(true); loadData({ silent: true }).finally(() => setRefreshing(false)); }}
            disabled={refreshing}
            style={[styles.refreshBtn, refreshing && { opacity: 0.6 }]}
            hitSlop={6}
          >
            <Ionicons name="refresh" size={13} color={colors.white} />
            <Text style={styles.refreshText}>{t("refresh")}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tabsWrap}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={[styles.tabBtn, active && styles.tabBtnActive]}>
              <Ionicons name={tab.icon} size={13} color={active ? colors.primary : colors.slate500} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t(tab.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === "overview" ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryGrid}>
            <SummaryCard icon="calendar" iconColor="#3b82f6" label={t("today")} value={`TZS ${stats.todayCost.toFixed(0)}`} sub={`${stats.todayQty} ${t("units")}`} bg="#eff6ff" />
            <SummaryCard icon="calendar" iconColor="#0ea5e9" label={t("thisWeek")} value={`TZS ${stats.weekCost.toFixed(0)}`} sub={`${stats.weekQty} ${t("units")}`} bg="#f0f9ff" />
            <SummaryCard icon="calendar" iconColor="#8b5cf6" label={t("thisMonth")} value={`TZS ${stats.monthCost.toFixed(0)}`} sub={`${stats.monthQty} ${t("units")}`} bg="#f5f3ff" />
            <SummaryCard icon="calendar" iconColor="#a855f7" label={t("thisYear")} value={`TZS ${stats.yearCost.toFixed(0)}`} sub={`${stats.yearQty} ${t("units")}`} bg="#faf5ff" />
          </View>

          <View style={styles.bigStatGrid}>
            <BigStatCard icon="cash-outline" label={t("totalExpenses")} value={`TZS ${stats.totalCost.toFixed(0)}`} sub={`${stats.totalQty} ${t("units")} ${t("purchased")}`} color="#2563eb" bg="#eff6ff" />
            {showProfit && (
              <BigStatCard icon="trending-up" label={t("predictedProfit")} value={`TZS ${stats.totalProfit.toFixed(0)}`} sub={`${t("revenue")}: TZS ${stats.totalRevenue.toFixed(0)}`} color={stats.totalProfit >= 0 ? "#16a34a" : "#dc2626"} bg={stats.totalProfit >= 0 ? "#f0fdf4" : "#fef2f2"} />
            )}
            <BigStatCard icon="bar-chart" label={t("stockValue")} value={`TZS ${stats.remainingStock.stockCost.toFixed(0)}`} sub={`${stats.remainingStock.stockQty} ${t("units")} ${t("inStock")}`} color="#f59e0b" bg="#fffbeb" />
          </View>

          {stats.topProducts.length > 0 && (
            <View style={styles.topCard}>
              <View style={styles.topHeader}>
                <Ionicons name="bulb" size={15} color="#8b5cf6" />
                <Text style={styles.topTitle}>{t("topPurchasedProducts")}</Text>
              </View>
              <View style={styles.topList}>
                {stats.topProducts.map((p, i) => {
                  const maxQty = stats.topProducts[0]?.qty || 1;
                  const pct = (p.qty / maxQty) * 100;
                  return (
                    <View key={p.pid} style={styles.topRow}>
                      <Text style={styles.topRank}>{i + 1}</Text>
                      <View style={styles.topTrack}>
                        <View style={styles.topLabelRow}>
                          <Pressable
                            onPress={() => { const it = purchaseItems.find((x) => x.product?.id === p.pid); setSelectedItem(it || { product: productMap[p.pid], quantity: p.qty, costPrice: p.qty ? p.cost / p.qty : 0 }); }}
                            hitSlop={6}
                          >
                            <Text style={styles.topName} numberOfLines={1}>{p.name}</Text>
                          </Pressable>
                          <Text style={styles.topMeta}>{p.qty} {t("units")} · TZS {p.cost.toFixed(0)}</Text>
                        </View>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${pct}%` }]} />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <View style={styles.toolbar}>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={14} color={colors.slate400} style={styles.searchIcon} />
              <TextField
                value={search}
                onChangeText={setSearch}
                placeholder={t("searchProduct")}
                containerStyle={styles.searchInput}
                inputStyle={styles.searchInputField}
              />
            </View>
            <View style={styles.dateRow}>
              <TextField value={dateFrom} onChangeText={setDateFrom} placeholder="YYYY-MM-DD" containerStyle={styles.dateInput} inputStyle={styles.dateInputField} />
              <Text style={styles.dateDash}>—</Text>
              <TextField value={dateTo} onChangeText={setDateTo} placeholder="YYYY-MM-DD" containerStyle={styles.dateInput} inputStyle={styles.dateInputField} />
            </View>
            <Pressable onPress={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))} style={styles.sortBtn} hitSlop={6}>
              <Ionicons name="swap-vertical" size={13} color={colors.slate600} />
              <Text style={styles.sortText}>{sortDir === "desc" ? t("newest") : t("oldest")}</Text>
            </Pressable>
            {bulk.mode && (
              <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected} onSelectAll={bulk.toggleAll} onDelete={deleteSelected} deleteLabel={t("deleteSelected")} />
            )}
          </View>

          <View style={styles.miniGrid}>
            <MiniStat label={t("filtered")} value={filtered.length} suffix={t("units")} color="#64748b" />
            <MiniStat label={t("totalSpent")} value={money(filtered.reduce((s, i) => s + getItemCost(i) * (Number(i.quantity) || 0), 0).toFixed(0))} color="#2563eb" />
            {showProfit && (
              <MiniStat label={t("predictedProfit")} value={money(filtered.reduce((s, i) => { const q = Number(i.quantity) || 0; const exc = Math.min(q, getExchangedQty(i.product?.id)); return s + (getItemSellingPrice(i) - getItemCost(i)) * (q - exc); }, 0).toFixed(0))} color="#16a34a" />
            )}
            <MiniStat label={t("totalQty")} value={filtered.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} suffix={t("units")} color="#f59e0b" />
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
                  <Text style={[styles.th, styles.colQty]}>{t("qty")}</Text>
                  <Text style={[styles.th, styles.colRight]}>{t("unitCost")}</Text>
                  <Text style={[styles.th, styles.colRight]}>{t("totalCost")}</Text>
                  <Text style={[styles.th, styles.colRight]}>{t("sellPrice")}</Text>
                  {showProfit && <Text style={[styles.th, styles.colRight]}>{t("profit")}</Text>}
                  <Text style={[styles.th, styles.colDate]}>{t("date")}</Text>
                  <Text style={[styles.th, styles.colTime]}>{t("time")}</Text>
                  <Text style={[styles.th, styles.colStatus]}>{t("status")}</Text>
                  <Text style={[styles.th, styles.colActions]}>{t("actions")}</Text>
                </View>

                {filtered.length === 0 ? (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyText}>{t("noItemsFound")}</Text>
                  </View>
                ) : paginatedItems.map((item, idx) => {
                  const qty = Number(item.quantity) || 0;
                  const unitCost = getItemCost(item);
                  const totalCost = unitCost * qty;
                  const sellPrice = getItemSellingPrice(item);
                  const profit = (sellPrice - unitCost) * qty;
                  const date = getItemDate(item);
                  const name = item.product?.name || "Unknown";
                  const stockQty = stockMap[item.product?.id] || 0;
                  const approved = item.purchase?.status === "Approved";
                  return (
                    <View key={item.id || idx} style={styles.tr} {...bulk.rowProps(item.id)}>
                      {bulk.mode && (
                        <View style={[styles.td, styles.colCheck]}>
                          <Pressable onPress={() => bulk.toggle(item.id)} hitSlop={8}>
                            <Ionicons name={bulk.selectedSet.has(item.id) ? "checkbox" : "square-outline"} size={16} color={bulk.selectedSet.has(item.id) ? colors.primary : colors.slate400} />
                          </Pressable>
                        </View>
                      )}
                      <View style={[styles.td, styles.colProduct]}>
                        <Pressable onPress={() => setSelectedItem(item)} style={styles.productCell} hitSlop={6}>
                          {item.product?.image ? (
                            <Image source={{ uri: item.product.image }} style={styles.productImg} />
                          ) : (
                            <View style={styles.productAvatar}>
                              <Text style={styles.productAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                            </View>
                          )}
                          <View style={styles.productInfo}>
                            <Text style={styles.productName} numberOfLines={1}>{name}</Text>
                            {stockQty > 0 && <Text style={styles.stockQtyText}>{stockQty} {t("inStock")}</Text>}
                          </View>
                        </Pressable>
                      </View>
                      <Text style={[styles.td, styles.colQty, styles.qtyText]}>{qty}</Text>
                      <Text style={[styles.td, styles.colRight, styles.mutedText]}>TZS {unitCost.toFixed(0)}</Text>
                      <Text style={[styles.td, styles.colRight, styles.totalCostText]}>TZS {totalCost.toFixed(0)}</Text>
                      <Text style={[styles.td, styles.colRight, styles.mutedText]}>TZS {sellPrice.toFixed(0)}</Text>
                      {showProfit && (
                        <Text style={[styles.td, styles.colRight, profit >= 0 ? styles.profitPos : styles.profitNeg]}>
                          {profit >= 0 ? "+" : ""}TZS {profit.toFixed(0)}
                        </Text>
                      )}
                      <Text style={[styles.td, styles.colDate, styles.dateText]}>
                        {date ? new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </Text>
                      <Text style={[styles.td, styles.colTime, styles.dateText]}>
                        {getItemTime(item) || "—"}
                      </Text>
                      <View style={[styles.td, styles.colStatus]}>
                        <View style={[styles.statusPill, approved ? styles.statusApproved : styles.statusOther]}>
                          <Text style={[styles.statusPillText, { color: approved ? "#16a34a" : "#a16207" }]}>
                            {item.purchase?.status || "Added"}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.td, styles.colActions]}>
                        {bulk.mode && !item.virtual && (stockQty <= 0 ? (
                          <Pressable onPress={() => deletePurchaseItem(item)} hitSlop={8} style={styles.deleteBtn}>
                            <Ionicons name="trash-outline" size={14} color={colors.danger} />
                          </Pressable>
                        ) : (
                          <Text style={styles.dashCell}>-</Text>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {totalItemPages > 1 && (
              <View style={styles.pager}>
                <Text style={styles.pagerInfo}>{t("pageXofY", { page: itemPage, total: totalItemPages, count: filtered.length, type: t("items") })}</Text>
                <View style={styles.pagerBtns}>
                  <Pressable onPress={() => setItemPage((p) => Math.max(1, p - 1))} disabled={itemPage <= 1} style={[styles.pageNav, itemPage <= 1 && styles.pageNavDisabled]} hitSlop={6}>
                    <Ionicons name="chevron-back" size={12} color={itemPage <= 1 ? colors.slate300 : colors.slate700} />
                    <Text style={[styles.pageNavText, itemPage <= 1 && styles.pageNavTextDisabled]}>{t("prev")}</Text>
                  </Pressable>
                  {Array.from({ length: Math.min(totalItemPages, 10) }, (_, i) => {
                    const start = Math.max(1, itemPage - 5);
                    const p = start + i;
                    if (p > totalItemPages) return null;
                    return (
                      <Pressable key={p} onPress={() => setItemPage(p)} style={[styles.pageNum, p === itemPage && styles.pageNumActive]} hitSlop={4}>
                        <Text style={[styles.pageNumText, p === itemPage && styles.pageNumTextActive]}>{p}</Text>
                      </Pressable>
                    );
                  })}
                  <Pressable onPress={() => setItemPage((p) => Math.min(totalItemPages, p + 1))} disabled={itemPage >= totalItemPages} style={[styles.pageNav, itemPage >= totalItemPages && styles.pageNavDisabled]} hitSlop={6}>
                    <Text style={[styles.pageNavText, itemPage >= totalItemPages && styles.pageNavTextDisabled]}>{t("next")}</Text>
                    <Ionicons name="chevron-forward" size={12} color={itemPage >= totalItemPages ? colors.slate300 : colors.slate700} />
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <Modal visible={!!selectedDetail} onClose={() => setSelectedItem(null)} title={selectedDetail ? selectedDetail.name : ""}>
        <View style={styles.detailBody}>
          <View style={styles.detailGrid}>
            <DetailBox label={t("qtyPurchased")} value={`${selectedDetail.qty} ${t("units")}`} color="#0f172a" bg="#f8fafc" />
            <DetailBox label={t("unitCost")} value={`TZS ${selectedDetail.avgCost.toFixed(0)}`} color="#64748b" bg="#f8fafc" />
            <DetailBox label={t("sellingPrice")} value={`TZS ${selectedDetail.sellingPrice.toFixed(0)}`} color="#2563eb" bg="#eff6ff" />
            <DetailBox label={t("totalCost")} value={`TZS ${selectedDetail.totalCost.toFixed(0)}`} color="#64748b" bg="#f8fafc" />
          </View>

          <View style={styles.sectionBlue}>
            <View style={styles.sectionBlueHead}>
              <Text style={styles.sectionBlueTitle}>{selectedDetail.exchangedQty > 0 ? t("afterExchange") : t("predictedBeforeExchange")}</Text>
            </View>
            <View style={styles.sectionBlueBody}>
              <View style={styles.detailLine}>
                <Text style={styles.detailLineLabel}>{t("predictedSales")}</Text>
                <Text style={styles.detailLineValue}>TZS {selectedDetail.predictedSales.toFixed(0)}</Text>
              </View>
              <View style={styles.detailLine}>
                <Text style={styles.detailLineLabel}>{t("predictedProfit")}</Text>
                <Text style={[styles.detailLineValue, selectedDetail.predictedProfit >= 0 ? styles.profitPos : styles.profitNeg]}>
                  {selectedDetail.predictedProfit >= 0 ? "+" : ""}TZS {selectedDetail.predictedProfit.toFixed(0)}
                </Text>
              </View>
            </View>
          </View>

          {selectedDetail.exchangedQty > 0 && (
            <View style={styles.sectionAmber}>
              <View style={styles.sectionAmberHead}>
                <Text style={styles.sectionAmberTitle}>{t("afterExchangeCount", { n: selectedDetail.exchangedQty })}</Text>
              </View>
              <View style={styles.sectionAmberBody}>
                <View style={styles.detailLine}>
                  <Text style={styles.detailLineLabel}>{t("predictedSales")}</Text>
                  <Text style={styles.detailLineValue}>TZS {selectedDetail.salesAfter.toFixed(0)}</Text>
                </View>
                <View style={styles.detailLine}>
                  <Text style={styles.detailLineLabel}>{t("predictedProfit")}</Text>
                  <Text style={[styles.detailLineValue, selectedDetail.profitAfter >= 0 ? styles.profitPos : styles.profitNeg]}>
                    {selectedDetail.profitAfter >= 0 ? "+" : ""}TZS {selectedDetail.profitAfter.toFixed(0)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function SummaryCard({ icon, iconColor, label, value, sub, bg }) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: bg }]}>
      <View style={styles.summaryLabelRow}>
        <Ionicons name={icon} size={13} color={iconColor} />
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summarySub}>{sub}</Text>
    </View>
  );
}

function BigStatCard({ icon, label, value, sub, color, bg }) {
  return (
    <View style={[styles.bigStatCard, { backgroundColor: bg }]}>
      <View style={styles.bigStatLabelRow}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={styles.bigStatLabel}>{label}</Text>
      </View>
      <Text style={[styles.bigStatValue, { color }]}>{value}</Text>
      <Text style={styles.bigStatSub}>{sub}</Text>
    </View>
  );
}

function MiniStat({ label, value, suffix, color }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text style={[styles.miniStatValue, { color }]}>{value}{suffix ? <Text style={styles.miniStatSuffix}> {suffix}</Text> : null}</Text>
    </View>
  );
}

function DetailBox({ label, value, color, bg }) {
  return (
    <View style={[styles.detailBox, { backgroundColor: bg }]}>
      <Text style={styles.detailBoxLabel}>{label}</Text>
      <Text style={[styles.detailBoxValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 400 },
  errorWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.xl },
  errorText: { color: colors.slate500, fontSize: font.sm, textAlign: "center" },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: radius.md, marginTop: 4 },
  retryText: { color: colors.white, fontWeight: "600", fontSize: 13 },

  root: { flex: 1, padding: spacing.lg, backgroundColor: colors.slate50 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: font.xl, fontWeight: "700", color: colors.slate900 },
  headerSub: { fontSize: font.xs, color: colors.slate400 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  liveText: { fontSize: font.xs, color: colors.slate400 },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.primary, borderRadius: radius.md },
  refreshText: { color: colors.white, fontWeight: "600", fontSize: font.xs },

  tabsWrap: { flexDirection: "row", gap: 4, marginBottom: spacing.lg, backgroundColor: colors.slate100, padding: 4, borderRadius: 10, alignSelf: "flex-start" },
  tabBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.md },
  tabBtnActive: { backgroundColor: colors.white, ...shadow.card },
  tabText: { fontSize: font.xs, fontWeight: "600", color: colors.slate500 },
  tabTextActive: { color: colors.primary },

  scroll: { flex: 1 },
  scrollBody: { paddingBottom: spacing.xl, gap: spacing.lg },

  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  summaryCard: { flex: 1, minWidth: "46%", borderRadius: 10, padding: 14, gap: 6 },
  summaryLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryLabel: { fontSize: 11, color: colors.slate500, fontWeight: "600", textTransform: "uppercase" },
  summaryValue: { fontSize: 18, fontWeight: "700", color: colors.slate900 },
  summarySub: { fontSize: font.xs, color: colors.slate400 },

  bigStatGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  bigStatCard: { flex: 1, minWidth: "46%", borderRadius: radius.lg, padding: 20, gap: 8 },
  bigStatLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bigStatLabel: { fontSize: font.xs, fontWeight: "600", color: colors.slate500 },
  bigStatValue: { fontSize: 22, fontWeight: "800" },
  bigStatSub: { fontSize: font.xs, color: colors.slate400 },

  topCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, padding: 20 },
  topHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.lg },
  topTitle: { fontSize: font.sm, fontWeight: "700", color: colors.slate900 },
  topList: { gap: spacing.sm },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  topRank: { width: 18, fontSize: font.xs, fontWeight: "700", color: colors.slate400, textAlign: "right" },
  topTrack: { flex: 1, minWidth: 0 },
  topLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: spacing.sm },
  topName: { fontSize: font.xs, fontWeight: "600", color: colors.primary },
  topMeta: { fontSize: font.xs, color: colors.slate500 },
  barTrack: { height: 4, backgroundColor: colors.slate100, borderRadius: 2, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#8b5cf6", borderRadius: 2 },

  toolbar: { gap: spacing.sm },
  searchWrap: { position: "relative", maxWidth: 320 },
  searchIcon: { position: "absolute", left: 10, top: 13, zIndex: 1 },
  searchInput: { marginBottom: 0 },
  searchInputField: { paddingLeft: 30 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dateInput: { flex: 1, minWidth: 130, marginBottom: 0 },
  dateInputField: { fontSize: font.xs },
  dateDash: { color: colors.slate300 },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md, alignSelf: "flex-start" },
  sortText: { fontSize: font.xs, fontWeight: "600", color: colors.slate600 },

  miniGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  miniStat: { flex: 1, minWidth: "46%", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md, padding: 10, gap: 2 },
  miniStatLabel: { fontSize: 10, color: colors.slate400, fontWeight: "600", textTransform: "uppercase" },
  miniStatValue: { fontSize: font.base, fontWeight: "700" },
  miniStatSuffix: { fontSize: font.xs, fontWeight: "500", color: colors.slate400 },

  tableCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, overflow: "hidden" },
  tableInner: { minWidth: 720 },
  trHead: { flexDirection: "row", backgroundColor: colors.slate50, borderBottomWidth: 2, borderBottomColor: colors.slate200 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.slate100, alignItems: "center" },
  th: { fontSize: font.xs, fontWeight: "700", color: colors.slate500, textTransform: "uppercase", letterSpacing: 0.5, paddingVertical: 10, paddingHorizontal: 8 },
  td: { paddingVertical: 10, paddingHorizontal: 8 },
  colCheck: { width: 34, alignItems: "center", justifyContent: "center" },
  colProduct: { flex: 1.6, minWidth: 170 },
  colQty: { width: 44, textAlign: "center" },
  colRight: { width: 92, textAlign: "right" },
  colDate: { width: 108 },
  colTime: { width: 56, textAlign: "center" },
  colStatus: { width: 78 },
  colActions: { width: 40, alignItems: "center", justifyContent: "center" },
  productCell: { flexDirection: "row", alignItems: "center", gap: 8 },
  productImg: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: colors.slate200 },
  productAvatar: { width: 28, height: 28, borderRadius: 6, backgroundColor: colors.slate100, alignItems: "center", justifyContent: "center" },
  productAvatarText: { fontSize: font.xs, fontWeight: "700", color: colors.slate500 },
  productInfo: { flexShrink: 1 },
  productName: { fontWeight: "600", color: colors.primary, fontSize: font.xs },
  stockQtyText: { fontSize: 10, color: "#f59e0b" },
  qtyText: { fontWeight: "700", textAlign: "center" },
  mutedText: { color: colors.slate500 },
  totalCostText: { fontWeight: "700", color: colors.primary },
  profitPos: { color: "#16a34a", fontWeight: "700" },
  profitNeg: { color: "#dc2626", fontWeight: "700" },
  dateText: { color: colors.slate400, fontSize: font.xs },
  statusPill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99, alignSelf: "flex-start" },
  statusApproved: { backgroundColor: "#f0fdf4" },
  statusOther: { backgroundColor: "#fffbeb" },
  statusPillText: { fontSize: 10, fontWeight: "600" },
  deleteBtn: { padding: 2 },
  dashCell: { fontSize: 10, color: colors.slate400 },
  emptyRow: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.slate400, fontSize: font.sm },

  pager: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.slate200, backgroundColor: colors.slate50, flexWrap: "wrap", gap: spacing.sm },
  pagerInfo: { fontSize: font.xs, color: colors.slate500 },
  pagerBtns: { flexDirection: "row", alignItems: "center", gap: 4 },
  pageNav: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.slate200, borderRadius: 5, backgroundColor: colors.white },
  pageNavDisabled: { backgroundColor: colors.slate100 },
  pageNavText: { fontSize: font.xs, fontWeight: "600", color: colors.slate700 },
  pageNavTextDisabled: { color: colors.slate300 },
  pageNum: { width: 26, height: 26, borderWidth: 1, borderColor: colors.slate200, borderRadius: 5, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  pageNumActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pageNumText: { fontSize: font.xs, fontWeight: "600", color: colors.slate700 },
  pageNumTextActive: { color: colors.white },

  detailBody: { gap: spacing.lg },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detailBox: { width: "48%", borderRadius: radius.md, padding: 10, gap: 2 },
  detailBoxLabel: { fontSize: 10, color: colors.slate400, fontWeight: "600", textTransform: "uppercase" },
  detailBoxValue: { fontSize: font.base, fontWeight: "700" },
  sectionBlue: { borderWidth: 1, borderColor: "#dbeafe", borderRadius: 10, overflow: "hidden" },
  sectionBlueHead: { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: "#eff6ff" },
  sectionBlueTitle: { fontSize: font.xs, fontWeight: "700", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.4 },
  sectionBlueBody: { paddingVertical: 12, paddingHorizontal: 14, gap: spacing.sm },
  sectionAmber: { borderWidth: 1, borderColor: "#fde68a", borderRadius: 10, overflow: "hidden" },
  sectionAmberHead: { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: "#fffbeb" },
  sectionAmberTitle: { fontSize: font.xs, fontWeight: "700", color: "#b45309", textTransform: "uppercase", letterSpacing: 0.4 },
  sectionAmberBody: { paddingVertical: 12, paddingHorizontal: 14, gap: spacing.sm },
  detailLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailLineLabel: { fontSize: font.xs, color: colors.slate500 },
  detailLineValue: { fontSize: font.lg, fontWeight: "800", color: colors.slate900 },
});