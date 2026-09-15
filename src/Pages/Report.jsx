import { useState, useEffect, useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import { canViewProfit } from "../utils/roleChecks";
import { useSystemSettings } from "../SystemSettingsContext";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { useUndo } from "../UndoContext";
import { exportPdf } from "../utils/export";
import { confirmDialog } from "../utils/confirm";
import { BarChart, ChartCard, Card } from "../components/ui";
import { colors, font, radius, spacing } from "../theme";

const money = (v) => `TZS ${(Number(v) || 0).toLocaleString()}`;

export default function Report() {
  const showProfit = canViewProfit();
  const { settings } = useSystemSettings();
  const systemLowStock = Number(settings.lowStockThreshold) || 5;
  const { notifyUndo } = useUndo() || {};
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [stockPage, setStockPage] = useState(1);
  const [msg, setMsg] = useState("");

  const loadData = () => {
    setLoading(true);
    return Promise.all([
      api.get("/sales").catch(() => ({ data: [] })),
      api.get("/purchases").catch(() => ({ data: [] })),
      api.get("/products").catch(() => ({ data: [] })),
      api.get("/customers").catch(() => ({ data: [] })),
      api.get("/stock-history").catch(() => ({ data: [] })),
    ]).then(([s, p, pr, c, sh]) => {
      setSales(Array.isArray(s.data) ? s.data : []);
      setPurchases(Array.isArray(p.data) ? p.data : []);
      setProducts(Array.isArray(pr.data) ? pr.data : []);
      setCustomers(Array.isArray(c.data) ? c.data : []);
      setStockHistory(Array.isArray(sh.data) ? sh.data : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const restoreStockEntry = async (h) => {
    await api.post("/stock-history", {
      product: { id: h.product?.id },
      quantityChange: h.quantityChange,
      resultingQuantity: h.resultingQuantity,
      transactionType: h.transactionType || "Added",
    }).catch(() => {});
    await loadData();
    if (notifyUndo) notifyUndo("Stock history entry restored", () => {}, { timeout: 2500, undo: false });
  };

  const restoreCustomers = async (list) => {
    for (const c of list) {
      await api.post("/customers", {
        name: c.name, phone: c.phone || "", email: c.email || "", type: c.type || "regular",
        amount: 0, paid: 0, paymentMethod: "cash", address: "", notes: "", product: "",
      }).catch(() => {});
    }
    await loadData();
    if (notifyUndo) notifyUndo(`Restored ${list.length} customer(s)`, () => {}, { timeout: 2500, undo: false });
  };

  const deleteStockEntry = async (id) => {
    if (!(await confirmDialog("Delete this stock history entry?"))) return;
    const target = stockHistory.find((h) => h.id === id);
    try {
      await api.delete(`/stock-history/${id}`);
      await loadData();
      setMsg("Entry deleted!");
      if (target) notifyUndo?.(`Stock history entry deleted: ${target.product?.name || `#${target.id}`}`, () => restoreStockEntry(target));
    } catch {
      setMsg("Failed to delete");
    }
    setTimeout(() => setMsg(""), 2000);
  };

  const deleteCustomer = async (id) => {
    if (!(await confirmDialog("Delete this customer?"))) return;
    const target = customers.find((c) => c.id === id);
    try {
      await api.delete(`/customers/${id}`);
      await loadData();
      setMsg("Customer deleted!");
      if (target) notifyUndo?.(`Customer deleted${target.name ? `: ${target.name}` : ""}`, () => restoreCustomers([target]));
    } catch {
      setMsg("Failed to delete customer");
    }
    setTimeout(() => setMsg(""), 2000);
  };

  const now = new Date();
  const isInRange = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (period === "today") return d.toDateString() === now.toDateString();
    if (period === "week") { const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7); return d >= weekAgo; }
    if (period === "month") { const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1); return d >= monthAgo; }
    if (period === "year") { const yearAgo = new Date(now); yearAgo.setFullYear(yearAgo.getFullYear() - 1); return d >= yearAgo; }
    return true;
  };

  const filteredSales = useMemo(() => sales.filter((s) => isInRange(s.saleDate || s.createdAt)), [sales, period]);
  const filteredPurchases = useMemo(() => purchases.filter((p) => isInRange(p.purchaseDate || p.createdAt)), [purchases, period]);
  const filteredStock = useMemo(() => stockHistory.filter((h) => isInRange(h.createdAt)), [stockHistory, period]);

  const totalRevenue = useMemo(() => filteredSales.reduce((sum, s) => sum + (Number(s.grandTotal) || Number(s.price) || 0), 0), [filteredSales]);
  const cashSales = useMemo(() => filteredSales.filter((s) => s.paymentMethod === "cash").reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0), [filteredSales]);
  const debtSales = useMemo(() => filteredSales.filter((s) => s.paymentMethod === "debt").reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0), [filteredSales]);
  const totalCost = useMemo(() => filteredPurchases.reduce((sum, p) => sum + ((Number(p.quantity) || 0) * (Number(p.unitPrice) || 0)), 0), [filteredPurchases]);
  const totalProfit = useMemo(() => {
    return filteredSales.reduce((sum, s) => {
      const items = s.saleItems || [];
      return sum + items.reduce((isum, item) => {
        const selling = Number(item.price) || 0;
        const buying = Number(item.costPrice) || 0;
        const qty = Number(item.quantity) || 0;
        return isum + (selling - buying) * qty;
      }, 0);
    }, 0);
  }, [filteredSales]);
  const stockItems = useMemo(() => filteredStock.filter((h) => h.transactionType === "Added" || h.quantityChange > 0).length, [filteredStock]);
  const soldItems = useMemo(() => filteredStock.filter((h) => h.transactionType === "Sold" || h.quantityChange < 0).length, [filteredStock]);
  const outOfStockCount = useMemo(() => products.filter((p) => (Number(p.quantity) || 0) <= 0).length, [products]);
  const lowStockCount = useMemo(() => products.filter((p) => { const q = Number(p.quantity) || 0; return q > 0 && q <= (p.lowStockThreshold || systemLowStock); }).length, [products, systemLowStock]);

  const topProducts = useMemo(() => {
    const map = {};
    filteredSales.forEach((s) => {
      (s.saleItems || []).forEach((item) => {
        const pid = item.product?.id || item.productId;
        const name = item.product?.name || item.productName || `Product #${pid}`;
        if (!map[pid]) map[pid] = { name, qty: 0, revenue: 0 };
        map[pid].qty += Number(item.quantity) || 0;
        map[pid].revenue += Number(item.price) || 0;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filteredSales]);

  const topCustomers = useMemo(() => {
    const map = {};
    filteredSales.forEach((s) => {
      const cname = s.customer?.name || s.customerName || "Walk-in";
      const cid = s.customer?.id || "walk-in";
      if (!map[cid]) map[cid] = { name: cname, total: 0, count: 0 };
      map[cid].total += Number(s.grandTotal) || 0;
      map[cid].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [filteredSales]);

  const dailyRevenue = useMemo(() => {
    const map = {};
    filteredSales.forEach((s) => {
      const date = (s.saleDate || s.createdAt || "").split("T")[0];
      if (!date) return;
      if (!map[date]) map[date] = 0;
      map[date] += Number(s.grandTotal) || 0;
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
  }, [filteredSales]);

  const recentSales = useMemo(() => filteredSales.slice(0, 10), [filteredSales]);

  const STOCK_PER_PAGE = 10;
  const stockPageCount = Math.max(1, Math.ceil(filteredStock.length / STOCK_PER_PAGE));
  const safeStockPage = Math.min(stockPage, stockPageCount);
  const paginatedStock = useMemo(() => {
    const start = (safeStockPage - 1) * STOCK_PER_PAGE;
    return filteredStock.slice(start, start + STOCK_PER_PAGE);
  }, [filteredStock, safeStockPage]);

  const customerRows = useMemo(() => {
    const map = {};
    sales.forEach((s) => {
      const cid = s.customer?.id || "walk";
      const cname = s.customer?.name || s.customerName || "Walk-in";
      if (!map[cid]) map[cid] = { id: cid !== "walk" ? cid : null, name: cname, total: 0, count: 0, debt: 0 };
      map[cid].total += Number(s.grandTotal) || 0;
      map[cid].count += 1;
      if (s.paymentMethod === "debt") {
        map[cid].debt += Math.max(0, (Number(s.grandTotal) || 0) - (Number(s.paidAmount) || 0));
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [sales]);

  const bulkStock = useBulkSelect(filteredStock, (r) => r.id);
  const bulkCustomers = useBulkSelect(customerRows.filter((c) => c.id), (c) => c.id);

  const deleteBulkStock = async () => {
    if (bulkStock.selected.length === 0) return;
    if (!(await confirmDialog(`Delete ${bulkStock.selected.length} stock history entr${bulkStock.selected.length === 1 ? "y" : "ies"}?`))) return;
    setMsg("");
    try {
      const deleted = bulkStock.selected.map((id) => stockHistory.find((h) => h.id === id)).filter(Boolean);
      for (const id of bulkStock.selected) {
        await api.delete(`/stock-history/${id}`);
      }
      bulkStock.clear();
      await loadData();
      setMsg("Entries deleted!");
      if (deleted.length) notifyUndo?.(`${deleted.length} stock history entr${deleted.length === 1 ? "y" : "ies"} deleted`, () => { deleted.forEach((h) => restoreStockEntry(h)); });
    } catch {
      setMsg("Failed to delete");
    }
    setTimeout(() => setMsg(""), 2000);
  };

  const deleteBulkCustomers = async () => {
    if (bulkCustomers.selected.length === 0) return;
    if (!(await confirmDialog(`Delete ${bulkCustomers.selected.length} customer${bulkCustomers.selected.length === 1 ? "" : "s"}?`))) return;
    setMsg("");
    try {
      const deleted = bulkCustomers.selected.map((id) => customers.find((c) => c.id === id)).filter(Boolean);
      for (const id of bulkCustomers.selected) {
        await api.delete(`/customers/${id}`);
      }
      bulkCustomers.clear();
      await loadData();
      setMsg("Customers deleted!");
      if (deleted.length) notifyUndo?.(`${deleted.length} customer${deleted.length === 1 ? "" : "s"} deleted`, () => restoreCustomers(deleted));
    } catch {
      setMsg("Failed to delete customers");
    }
    setTimeout(() => setMsg(""), 2000);
  };

  const exportReport = () => {
    const periodLabel = PERIODS.find((p) => p.k === period)?.l || period;
    const summary = [
      ["Total Revenue", money(totalRevenue)],
      ["Total Cost", money(totalCost)],
      ...(showProfit ? [["Net Profit", `${money(totalProfit)} (${totalProfit >= 0 ? "Profit" : "Loss"})`]] : []),
      ["Cash Sales", money(cashSales)],
      ["Debt Sales", money(debtSales)],
      ["Total Transactions", String(filteredSales.length)],
      ["Total Products", String(products.length)],
      ["Total Customers", String(customers.length)],
      ["Stock Entries", String(filteredStock.length)],
    ];
    const footerNote = `Period: ${periodLabel}\nGenerated: ${new Date().toLocaleString()}\n\n${summary.map(([k, v]) => `${k}: ${v}`).join("\n")}`;
    exportPdf({
      title: "Sales Report",
      filename: `report-${period}-${new Date().toISOString().slice(0, 10)}.pdf`,
      columns: ["Date", "Description", "Payment", "Status", "Amount"],
      rows: filteredSales.map((s) => [
        s.saleDate ? new Date(s.saleDate).toLocaleDateString() : "\u2014",
        s.description || `Sale #${s.id}`,
        s.paymentMethod === "cash" ? "Cash" : "Debt",
        s.paymentStatus || "\u2014",
        money(s.grandTotal),
      ]),
      footerNote,
    });
  };

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <Spinner size={28} text="Loading reports..." />
      </View>
    );
  }

  const TABS = [
    { k: "overview", l: "Overview", icon: "bar-chart-outline" },
    { k: "sales", l: "Sales", icon: "trending-up-outline" },
    { k: "inventory", l: "Inventory", icon: "cube-outline" },
    { k: "customers", l: "Customers", icon: "people-outline" },
  ];

  const PERIODS = [
    { k: "all", l: "All Time" }, { k: "today", l: "Today" },
    { k: "week", l: "This Week" }, { k: "month", l: "This Month" }, { k: "year", l: "This Year" },
  ];

  const overviewStats = [
    { label: "Total Revenue", value: money(totalRevenue), color: "#16a34a", icon: "trending-up-outline", bg: "#f0fdf4" },
    { label: "Total Cost", value: money(totalCost), color: "#dc2626", icon: "trending-down-outline", bg: "#fef2f2" },
    ...(showProfit ? [{ label: "Net Profit", value: money(totalProfit), color: totalProfit >= 0 ? "#2563eb" : "#dc2626", icon: "cash-outline", bg: totalProfit >= 0 ? "#eff6ff" : "#fef2f2" }] : []),
    { label: "Cash Sales", value: money(cashSales), color: "#059669", icon: "arrow-up-circle-outline", bg: "#ecfdf5" },
    { label: "Debt Sales", value: money(debtSales), color: "#f59e0b", icon: "arrow-down-circle-outline", bg: "#fffbeb" },
    { label: "Total Sales", value: String(filteredSales.length), color: "#7c3aed", icon: "cart-outline", bg: "#ede9fe" },
    { label: "Total Products", value: String(products.length), color: "#0891b2", icon: "cube-outline", bg: "#ecfeff" },
    { label: "Total Customers", value: String(customers.length), color: "#4f46e5", icon: "people-outline", bg: "#eef2ff" },
  ];

  return (
    <View style={s.root}>
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Ionicons name="bar-chart" size={22} color={colors.primary} />
          <Text style={s.headerTitle}>Reports</Text>
        </View>
        <View style={s.headerActions}>
          <Pressable onPress={exportReport} style={s.exportBtn} hitSlop={6}>
            <Ionicons name="document-text-outline" size={13} color={colors.white} />
            <Text style={s.exportBtnText}>Export PDF</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.periodRow}>
        {PERIODS.map((p) => {
          const active = period === p.k;
          return (
            <Pressable key={p.k} onPress={() => setPeriod(p.k)} style={[s.periodChip, active && { backgroundColor: colors.white }]} hitSlop={4}>
              <Text style={[s.periodChipText, { color: active ? colors.primary : "#64748b" }]}>{p.l}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
        {TABS.map((tab) => {
          const active = activeTab === tab.k;
          return (
            <Pressable key={tab.k} onPress={() => setActiveTab(tab.k)} style={[s.tabChip, active && { backgroundColor: colors.white }]} hitSlop={4}>
              <Ionicons name={tab.icon} size={13} color={active ? colors.primary : "#64748b"} />
              <Text style={[s.tabChipText, { color: active ? colors.primary : "#64748b" }]}>{tab.l}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollBody} showsVerticalScrollIndicator={false}>

        {activeTab === "overview" && (
          <>
            <View style={s.statGrid}>
              {overviewStats.map((st) => (
                <View key={st.label} style={[s.statCard, { backgroundColor: st.bg, borderTopColor: st.color }]}>
                  <View style={s.statLabelRow}>
                    <Ionicons name={st.icon} size={12} color={st.color} />
                    <Text style={[s.statLabel, { color: st.color }]}>{st.label}</Text>
                  </View>
                  <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
                </View>
              ))}
            </View>

            <View style={s.miniRow}>
              <View style={s.miniCard}>
                <View style={s.miniHead}>
                  <Ionicons name="trending-up-outline" size={14} color="#16a34a" />
                  <Text style={s.miniTitle}>Top Products</Text>
                </View>
                {topProducts.length === 0 ? (
                  <Text style={s.miniEmpty}>No data</Text>
                ) : (
                  <View>
                    <View style={s.miniRowHeader}>
                      <Text style={[s.miniTh, { flex: 1.5 }]}>Product</Text>
                      <Text style={[s.miniTh, s.mc]}>Qty</Text>
                      <Text style={[s.miniTh, s.mr]}>Revenue</Text>
                    </View>
                    {topProducts.map((p, i) => (
                      <View key={i} style={s.miniRow}>
                        <Text style={[s.miniTd, s.miniName, { flex: 1.5 }]} numberOfLines={1}>{p.name}</Text>
                        <Text style={[s.miniTd, s.mc]}>{p.qty}</Text>
                        <Text style={[s.miniTd, s.mr, { color: "#16a34a", fontWeight: "700" }]}>{money(p.revenue)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={s.miniCard}>
                <View style={s.miniHead}>
                  <Ionicons name="people-outline" size={14} color="#4f46e5" />
                  <Text style={s.miniTitle}>Top Customers</Text>
                </View>
                {topCustomers.length === 0 ? (
                  <Text style={s.miniEmpty}>No data</Text>
                ) : (
                  <View>
                    <View style={s.miniRowHeader}>
                      <Text style={[s.miniTh, { flex: 1.5 }]}>Customer</Text>
                      <Text style={[s.miniTh, s.mc]}>Sales</Text>
                      <Text style={[s.miniTh, s.mr]}>Total</Text>
                    </View>
                    {topCustomers.map((c, i) => (
                      <View key={i} style={s.miniRow}>
                        <Text style={[s.miniTd, s.miniName, { flex: 1.5 }]} numberOfLines={1}>{c.name}</Text>
                        <Text style={[s.miniTd, s.mc]}>{c.count}</Text>
                        <Text style={[s.miniTd, s.mr, { color: "#2563eb", fontWeight: "700" }]}>{money(c.total)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {dailyRevenue.length > 0 && (
              <ChartCard title="Daily Revenue (Last 7 Days)">
                <BarChart
                  data={dailyRevenue.map(([date, amt]) => ({ label: date.slice(5), value: amt }))}
                  height={150}
                  barColor="#2563eb"
                />
              </ChartCard>
            )}
          </>
        )}

        {activeTab === "sales" && (
          <>
            <View style={s.statGrid}>
              <View style={[s.statCard, { backgroundColor: "#f0fdf4", borderTopColor: "#16a34a" }]}>
                <Text style={[s.statLabel, { color: "#16a34a" }]}>Cash Revenue</Text>
                <Text style={[s.statValue, { color: "#16a34a" }]}>{money(cashSales)}</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: "#fef2f2", borderTopColor: "#dc2626" }]}>
                <Text style={[s.statLabel, { color: "#dc2626" }]}>Debt Revenue</Text>
                <Text style={[s.statValue, { color: "#dc2626" }]}>{money(debtSales)}</Text>
              </View>
              {showProfit && (
                <View style={[s.statCard, { backgroundColor: "#eff6ff", borderTopColor: "#2563eb" }]}>
                  <Text style={[s.statLabel, { color: "#2563eb" }]}>Net Profit</Text>
                  <Text style={[s.statValue, { color: "#2563eb" }]}>{money(totalProfit)}</Text>
                </View>
              )}
              <View style={[s.statCard, { backgroundColor: "#ede9fe", borderTopColor: "#7c3aed" }]}>
                <Text style={[s.statLabel, { color: "#7c3aed" }]}>Total Transactions</Text>
                <Text style={[s.statValue, { color: "#7c3aed" }]}>{filteredSales.length}</Text>
              </View>
            </View>

            <Card padded={false} style={s.tableCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.tableInnerSales}>
                  <View style={s.trHead}>
                    <Text style={[s.th, s.colDateSales]}>Date</Text>
                    <Text style={[s.th, s.colDesc]}>Description</Text>
                    <Text style={[s.th, s.colPay]}>Payment</Text>
                    <Text style={[s.th, s.colStatus]}>Status</Text>
                    <Text style={[s.th, s.colAmt, s.mr]}>Amount</Text>
                  </View>
                  {recentSales.length === 0 ? (
                    <View style={s.emptyRow}>
                      <Ionicons name="cart-outline" size={32} color={colors.slate300} style={{ marginBottom: 8 }} />
                      <Text style={s.emptyText}>No sales</Text>
                    </View>
                  ) : recentSales.map((sl) => (
                    <View key={sl.id} style={s.tr}>
                      <Text style={[s.td, s.colDateSales]}>{sl.saleDate ? new Date(sl.saleDate).toLocaleDateString() : "\u2014"}</Text>
                      <Text style={[s.td, s.colDesc, s.descText]} numberOfLines={1}>{sl.description || `Sale #${sl.id}`}</Text>
                      <View style={[s.td, s.colPay]}>
                        <View style={[s.pill, sl.paymentMethod === "cash" ? s.pillCash : s.pillDebt]}>
                          <Text style={[s.pillText, { color: sl.paymentMethod === "cash" ? "#16a34a" : "#dc2626" }]}>
                            {sl.paymentMethod === "cash" ? "Cash" : "Debt"}
                          </Text>
                        </View>
                      </View>
                      <View style={[s.td, s.colStatus]}>
                        <View style={[s.pill, (sl.paymentStatus === "PAID" || sl.paymentStatus === "paid") ? s.pillCash : s.pillWarn]}>
                          <Text style={[s.pillText, { color: (sl.paymentStatus === "PAID" || sl.paymentStatus === "paid") ? "#16a34a" : "#a16207" }]}>
                            {sl.paymentStatus || "\u2014"}
                          </Text>
                        </View>
                      </View>
                      <Text style={[s.td, s.colAmt, s.mr, s.amtText]}>{money(sl.grandTotal)}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </Card>
          </>
        )}

        {activeTab === "inventory" && (
          <>
            <View style={s.statGrid}>
              <View style={[s.statCard, { backgroundColor: "#fef2f2", borderTopColor: "#dc2626" }]}>
                <View style={s.statLabelRow}>
                  <Ionicons name="alert-circle-outline" size={12} color="#dc2626" />
                  <Text style={[s.statLabel, { color: "#dc2626" }]}>Out of Stock</Text>
                </View>
                <Text style={[s.statValue, { color: "#dc2626" }]}>{outOfStockCount}</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: "#fef9c3", borderTopColor: "#a16207" }]}>
                <View style={s.statLabelRow}>
                  <Ionicons name="alert-circle-outline" size={12} color="#a16207" />
                  <Text style={[s.statLabel, { color: "#a16207" }]}>Low Stock</Text>
                </View>
                <Text style={[s.statValue, { color: "#a16207" }]}>{lowStockCount}</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: "#f0fdf4", borderTopColor: "#16a34a" }]}>
                <Text style={[s.statLabel, { color: "#16a34a" }]}>Items Received</Text>
                <Text style={[s.statValue, { color: "#16a34a" }]}>{stockItems}</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: "#eff6ff", borderTopColor: "#2563eb" }]}>
                <Text style={[s.statLabel, { color: "#2563eb" }]}>Items Sold</Text>
                <Text style={[s.statValue, { color: "#2563eb" }]}>{soldItems}</Text>
              </View>
            </View>

            {bulkStock.mode && (
              <BulkBar count={bulkStock.selected.length} allSelected={bulkStock.allSelected}
                onSelectAll={bulkStock.toggleAll} onDelete={deleteBulkStock} deleteLabel="Delete Selected" />
            )}
            {!!msg && (
              <View style={[s.msgBar, msg.includes("Failed") ? s.msgBarError : s.msgBarSuccess]}>
                <Text style={[s.msgText, msg.includes("Failed") ? s.msgErrorText : s.msgSuccessText]}>{msg}</Text>
              </View>
            )}

            <Card padded={false} style={s.tableCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.tableInnerStock}>
                  <View style={s.trHead}>
                    {bulkStock.mode && (
                      <View style={[s.td, s.colCheck]}>
                        <Pressable onPress={bulkStock.toggleAll} hitSlop={8}>
                          <Ionicons name={bulkStock.allSelected ? "checkbox" : "square-outline"} size={16} color={bulkStock.allSelected ? colors.primary : colors.slate400} />
                        </Pressable>
                      </View>
                    )}
                    <Text style={[s.th, s.colDateStock]}>Date</Text>
                    <Text style={[s.th, s.colProdStock]}>Product</Text>
                    <Text style={[s.th, s.colTypeStock]}>Type</Text>
                    <Text style={[s.th, s.colQtyStock, s.mc]}>Qty Change</Text>
                    <Text style={[s.th, s.colResultStock, s.mc]}>Result</Text>
                    <Text style={[s.th, s.colActStock, s.mc]}>Action</Text>
                  </View>
                  {paginatedStock.length === 0 ? (
                    <View style={s.emptyRow}>
                      <Ionicons name="time-outline" size={32} color={colors.slate300} style={{ marginBottom: 8 }} />
                      <Text style={s.emptyText}>No stock history</Text>
                    </View>
                  ) : paginatedStock.map((h) => {
                    const positive = (h.quantityChange || 0) > 0;
                    return (
                      <View key={h.id} style={[s.tr, positive ? null : s.trOut]} {...bulkStock.rowProps(h.id)}>
                        {bulkStock.mode && (
                          <View style={[s.td, s.colCheck]}>
                            <Pressable onPress={() => bulkStock.toggle(h.id)} hitSlop={8}>
                              <Ionicons name={bulkStock.selectedSet.has(h.id) ? "checkbox" : "square-outline"} size={16} color={bulkStock.selectedSet.has(h.id) ? colors.primary : colors.slate400} />
                            </Pressable>
                          </View>
                        )}
                        <Text style={[s.td, s.colDateStock, s.dateText]}>{h.createdAt ? new Date(h.createdAt).toLocaleDateString() : "\u2014"}</Text>
                        <Text style={[s.td, s.colProdStock, s.prodText]} numberOfLines={1}>{h.product?.name || "\u2014"}</Text>
                        <View style={[s.td, s.colTypeStock]}>
                          <View style={[s.pill, positive ? s.pillCash : s.pillDebt]}>
                            <Text style={[s.pillText, { color: positive ? "#16a34a" : "#dc2626" }]}>
                              {h.transactionType || (positive ? "Added" : "Sold")}
                            </Text>
                          </View>
                        </View>
                        <Text style={[s.td, s.colQtyStock, s.mc, { fontWeight: "700", color: positive ? "#16a34a" : "#dc2626" }]}>
                          {positive ? "+" : ""}{h.quantityChange || 0}
                        </Text>
                        <Text style={[s.td, s.colResultStock, s.mc]}>{h.resultingQuantity ?? "\u2014"}</Text>
                        <View style={[s.td, s.colActStock, s.mc]}>
                          {bulkStock.mode && (
                            <Pressable onPress={() => deleteStockEntry(h.id)} hitSlop={8}>
                              <Ionicons name="trash-outline" size={13} color="#ef4444" />
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={s.footerRow}>
                <Text style={s.footerInfo}>
                  {filteredStock.length === 0 ? "0 entries" : `Showing ${(safeStockPage - 1) * STOCK_PER_PAGE + 1}-${Math.min(safeStockPage * STOCK_PER_PAGE, filteredStock.length)} of ${filteredStock.length}`}
                </Text>
                <View style={s.pagerBtns}>
                  <Pressable onPress={() => setStockPage((p) => Math.max(1, p - 1))} disabled={safeStockPage <= 1} style={[s.pageNav, safeStockPage <= 1 && s.pageNavDisabled]} hitSlop={6}>
                    <Ionicons name="chevron-back" size={13} color={safeStockPage <= 1 ? colors.slate300 : colors.slate700} />
                    <Text style={[s.pageNavText, safeStockPage <= 1 && s.pageNavTextDisabled]}>Prev</Text>
                  </Pressable>
                  <Text style={s.footerInfo}>{safeStockPage} / {stockPageCount}</Text>
                  <Pressable onPress={() => setStockPage((p) => Math.min(stockPageCount, p + 1))} disabled={safeStockPage >= stockPageCount} style={[s.pageNav, safeStockPage >= stockPageCount && s.pageNavDisabled]} hitSlop={6}>
                    <Text style={[s.pageNavText, safeStockPage >= stockPageCount && s.pageNavTextDisabled]}>Next</Text>
                    <Ionicons name="chevron-forward" size={13} color={safeStockPage >= stockPageCount ? colors.slate300 : colors.slate700} />
                  </Pressable>
                </View>
              </View>
            </Card>
          </>
        )}

        {activeTab === "customers" && (
          <>
            {bulkCustomers.mode && (
              <BulkBar count={bulkCustomers.selected.length} allSelected={bulkCustomers.allSelected}
                onSelectAll={bulkCustomers.toggleAll} onDelete={deleteBulkCustomers} deleteLabel="Delete Selected" />
            )}
            <Card padded={false} style={s.tableCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.tableInnerCustomers}>
                  <View style={s.trHead}>
                    {bulkCustomers.mode && (
                      <View style={[s.td, s.colCheck]}>
                        <Pressable onPress={bulkCustomers.toggleAll} hitSlop={8}>
                          <Ionicons name={bulkCustomers.allSelected ? "checkbox" : "square-outline"} size={16} color={bulkCustomers.allSelected ? colors.primary : colors.slate400} />
                        </Pressable>
                      </View>
                    )}
                    <Text style={[s.th, s.colNameCust]}>Customer</Text>
                    <Text style={[s.th, s.colSalesCust, s.mc]}>Sales</Text>
                    <Text style={[s.th, s.colTotalCust, s.mr]}>Total Spent</Text>
                    <Text style={[s.th, s.colDebtCust, s.mr]}>Debt</Text>
                    <Text style={[s.th, s.colActCust, s.mc]}>Action</Text>
                  </View>
                  {customerRows.length === 0 ? (
                    <View style={s.emptyRow}>
                      <Ionicons name="people-outline" size={32} color={colors.slate300} style={{ marginBottom: 8 }} />
                      <Text style={s.emptyText}>No customer data</Text>
                    </View>
                  ) : customerRows.map((c, i) => {
                    const selectable = !!c.id;
                    return (
                      <View key={i} style={[s.tr, selectable && bulkCustomers.mode && bulkCustomers.selectedSet.has(c.id) && s.trSelected]} {...(selectable ? bulkCustomers.rowProps(c.id) : {})}>
                        <View style={[s.td, s.colCheck]}>
                          {bulkCustomers.mode && selectable ? (
                            <Pressable onPress={() => bulkCustomers.toggle(c.id)} hitSlop={8}>
                              <Ionicons name={bulkCustomers.selectedSet.has(c.id) ? "checkbox" : "square-outline"} size={16} color={bulkCustomers.selectedSet.has(c.id) ? colors.primary : colors.slate400} />
                            </Pressable>
                          ) : null}
                        </View>
                        <Text style={[s.td, s.colNameCust, s.custName]} numberOfLines={1}>{c.name}</Text>
                        <Text style={[s.td, s.colSalesCust, s.mc]}>{c.count}</Text>
                        <Text style={[s.td, s.colTotalCust, s.mr, s.totalText]}>{money(c.total)}</Text>
                        <Text style={[s.td, s.colDebtCust, s.mr, { color: c.debt > 0 ? "#dc2626" : "#94a3b8" }]}>
                          {c.debt > 0 ? money(c.debt) : "\u2014"}
                        </Text>
                        <View style={[s.td, s.colActCust, s.mc]}>
                          {selectable ? (
                            bulkCustomers.mode && (
                              <Pressable onPress={() => deleteCustomer(c.id)} hitSlop={8}>
                                <Ionicons name="trash-outline" size={13} color="#ef4444" />
                              </Pressable>
                            )
                          ) : (
                            <Text style={{ color: "#cbd5e1" }}>\u2014</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", height: 400 },
  root: { flex: 1, backgroundColor: colors.slate50, padding: spacing.sm, gap: spacing.sm },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.slate900 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.primary, borderRadius: radius.sm },
  exportBtnText: { fontSize: 11, fontWeight: "600", color: colors.white },

  periodRow: { flexDirection: "row", gap: 2, backgroundColor: "#f1f5f9", padding: 2, borderRadius: radius.sm, alignSelf: "flex-start", flexShrink: 0 },
  periodChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.sm },
  periodChipText: { fontSize: 11, fontWeight: "600" },

  tabsRow: { flexDirection: "row", gap: 2, backgroundColor: "#f1f5f9", padding: 2, borderRadius: radius.sm, alignSelf: "flex-start", flexShrink: 0 },
  tabChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.sm },
  tabChipText: { fontSize: 11, fontWeight: "600" },

  scroll: { flex: 1 },
  scrollBody: { paddingBottom: spacing.xl, gap: spacing.lg },

  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statCard: { flexBasis: "46%", flexGrow: 1, borderRadius: radius.md, borderWidth: 1, borderTopWidth: 3, borderColor: "#e2e8f0", padding: spacing.md },
  statLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  statValue: { fontSize: 18, fontWeight: "700", marginTop: 2 },

  miniRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  miniCard: { flex: 1, minWidth: 300, backgroundColor: colors.white, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: radius.md, padding: spacing.md },
  miniHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  miniTitle: { fontSize: 13, fontWeight: "700", color: "#334155" },
  miniEmpty: { color: "#94a3b8", fontSize: 12 },
  miniRowHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  miniRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f8fafc", paddingVertical: 6 },
  miniTh: { paddingVertical: 6, fontSize: 10, fontWeight: "700", color: colors.slate500, textTransform: "uppercase" },
  miniTd: { paddingVertical: 2, fontSize: 12, color: "#334155" },
  miniName: { fontWeight: "600" },
  mc: { textAlign: "center", minWidth: 60 },
  mr: { textAlign: "right", minWidth: 90 },

  tableCard: { flex: 1, minHeight: 0, overflow: "hidden" },
  tableInnerSales: { minWidth: 700 },
  tableInnerStock: { minWidth: 760 },
  tableInnerCustomers: { minWidth: 640 },
  trHead: { flexDirection: "row", backgroundColor: "#f8fafc", borderBottomWidth: 2, borderBottomColor: "#e2e8f0" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", alignItems: "center" },
  trOut: { backgroundColor: "#f8fafc" },
  trSelected: { backgroundColor: colors.primaryLight },
  th: { fontSize: 10, fontWeight: "700", color: colors.slate500, textTransform: "uppercase", letterSpacing: 0.4, paddingVertical: 8, paddingHorizontal: 8 },
  td: { paddingVertical: 8, paddingHorizontal: 8 },
  colCheck: { width: 36, alignItems: "center", justifyContent: "center" },
  colDateSales: { width: 110 },
  colDesc: { flex: 1.6, minWidth: 170 },
  colPay: { width: 90 },
  colStatus: { width: 110 },
  colAmt: { width: 120 },
  colDateStock: { width: 110 },
  colProdStock: { flex: 1.4, minWidth: 160 },
  colTypeStock: { width: 110 },
  colQtyStock: { width: 100 },
  colResultStock: { width: 90 },
  colActStock: { width: 70 },
  colNameCust: { flex: 1.4, minWidth: 160 },
  colSalesCust: { width: 80 },
  colTotalCust: { width: 120 },
  colDebtCust: { width: 110 },
  colActCust: { width: 70 },
  descText: { color: colors.slate700 },
  dateText: { color: colors.slate400, fontSize: font.xs },
  prodText: { fontWeight: "600" },
  custName: { fontWeight: "600" },
  totalText: { fontWeight: "600" },
  amtText: { fontWeight: "700" },
  pill: { alignSelf: "flex-start", paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99 },
  pillCash: { backgroundColor: "#f0fdf4" },
  pillDebt: { backgroundColor: "#fef2f2" },
  pillWarn: { backgroundColor: "#fef9c3" },
  pillText: { fontSize: 10, fontWeight: "600" },

  emptyRow: { paddingVertical: 40, alignItems: "center" },
  emptyText: { color: colors.slate400, fontSize: font.sm },

  msgBar: { padding: spacing.sm, borderRadius: radius.sm, flexShrink: 0 },
  msgBarSuccess: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  msgBarError: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca" },
  msgText: { fontSize: 11 },
  msgSuccessText: { color: "#166534" },
  msgErrorText: { color: "#991b1b" },

  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  footerInfo: { fontSize: 11, color: "#64748b" },
  pagerBtns: { flexDirection: "row", alignItems: "center", gap: 6 },
  pageNav: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: radius.sm, backgroundColor: "#f1f5f9" },
  pageNavDisabled: { opacity: 0.4 },
  pageNavText: { fontSize: 11, fontWeight: "600", color: "#334155" },
  pageNavTextDisabled: { color: "#9ca3af" },
});