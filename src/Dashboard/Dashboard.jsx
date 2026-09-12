import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import { Card, Screen } from "../components/ui";
import Spinner from "../components/Spinner";
import RevenueChart from "./RevenueChart";
import RevenueTrend from "./RevenueTrend";
import TopProductsChart from "./TopProductsChart";
import ExpenseBreakdown from "./ExpenseBreakdown";
import ExpiryAlertChart from "./ExpiryAlertChart";
import RecentSales from "./RecentSales";
import SaleItemsActivity from "./SaleItemsActivity";
import DailyProfitChart from "./DailyProfitChart";
import MonthlyProfitChart from "./MonthlyProfitChart";
import { canViewProfit } from "../utils/roleChecks";
import { isOutstandingDebtSale, getSaleRemainingDebt } from "../utils/debtUtils";
import {
  computeProfitTotals,
  computeProfitByProduct,
  computeDailyProfitSeries,
  computeMonthlyProfitSeries,
  buildMinimalSummary,
} from "../utils/offlineProfit";
import { useNav } from "../navigation/nav";
import { t, useLanguage } from "../i18n";
import { colors, font, radius, spacing, shadow } from "../theme";

const REFRESH_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "10s", value: 10000 },
  { label: "30s", value: 30000 },
  { label: "1m", value: 60000 },
  { label: "5m", value: 300000 },
];

const LOADING_TIPS = [
  "tipExpiring",
  "tipReports",
  "tipOffline",
  "tipRestock",
  "tipDelivered",
  "tipDebt",
  "tipAutoRefresh",
  "tipExpiryAlerts",
];

function DashboardLoading() {
  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTipIndex((i) => (i + 1) % LOADING_TIPS.length), 4500);
    return () => clearInterval(timer);
  }, []);
  return (
    <View style={styles.loadingWrap}>
      <Spinner size={36} color="#e63958" text={t("loadingDashboard")} />
      <Text style={styles.loadingHint}>{t("firstLoadMayTake")}</Text>
      <View style={styles.tipCard}>
        <Text style={styles.tipLabel}>{t("didYouKnow")}</Text>
        <Text style={styles.tipText}>{t(LOADING_TIPS[tipIndex])}</Text>
      </View>
    </View>
  );
}

export default function Dashboard() {
  const navigate = useNav();
  useLanguage();
  const showProfit = canViewProfit();
  const [summary, setSummary] = useState(null);
  const [weeklyRevenue, setWeeklyRevenue] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [expired, setExpired] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [showAllProfit, setShowAllProfit] = useState(false);
  const [profit, setProfit] = useState(null);
  const [profitByProduct, setProfitByProduct] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [offline, setOffline] = useState(() => !!window.__ms_offline);
  const [refreshInterval, setRefreshInterval] = useState(() => {
    const saved = localStorage.getItem("dashboard_refresh_interval");
    return saved ? Number(saved) : 30000;
  });
  const abortRef = useRef(null);

  const token = localStorage.getItem("shop_auth_token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  useEffect(() => {
    const onOffline = () => setOffline(!!window.__ms_offline);
    window.addEventListener("msOfflineChange", onOffline);
    return () => window.removeEventListener("msOfflineChange", onOffline);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    try {
      if (!summary) setIsLoading(true);
      setError(null);
      setErrorType(null);

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      const safeFetch = async (url, { batch = 1 } = {}) => {
        const timeout = batch === 1 ? 90000 : 60000;
        try {
          const r = await api.get(url, { timeout });
          return r.data;
        } catch (err) {
          if (err?.response?.status === 401) throw new Error("AUTH");
          if (batch === 1) {
            try {
              const r2 = await api.get(url, { timeout: 150000 });
              return r2.data;
            } catch (err2) {
              if (err2?.response?.status === 401) throw new Error("AUTH");
              return null;
            }
          }
          return null;
        }
      };

      // Batch 1: essential data for the top-of-page KPIs
      const [s, weekly, monthly, topProd, sales, saleItemsData, purchasesData] = await Promise.all([
        safeFetch("/dashboard/summary", { batch: 1 }),
        safeFetch("/dashboard/revenue/weekly", { batch: 1 }),
        safeFetch("/dashboard/revenue/monthly", { batch: 1 }),
        safeFetch("/dashboard/top-products", { batch: 1 }),
        safeFetch("/dashboard/recent-sales", { batch: 1 }),
        safeFetch("/sale-items", { batch: 1 }),
        safeFetch("/purchases", { batch: 1 }),
      ]);

      const items = Array.isArray(saleItemsData) ? saleItemsData : [];
      const allSales = Array.isArray(sales) ? sales : [];
      const purchasesArr = Array.isArray(purchasesData) ? purchasesData : [];
      const hasLocalData = items.length > 0 || allSales.length > 0;

      const profitData = hasLocalData ? computeProfitTotals(items) : (await safeFetch("/dashboard/profit", { batch: 1 })) || null;
      const profitByProductBatch =
        (await safeFetch("/dashboard/profit/by-product", { batch: 1 }));
      const profitByProduct =
        Array.isArray(profitByProductBatch) && profitByProductBatch.length > 0
          ? profitByProductBatch
          : hasLocalData ? computeProfitByProduct(items) : [];
      const weeklyData =
        Array.isArray(weekly) && weekly.length > 0
          ? weekly
          : hasLocalData ? computeDailyProfitSeries(items) : [];
      const monthlyData =
        Array.isArray(monthly) && monthly.length > 0
          ? monthly
          : hasLocalData ? computeMonthlyProfitSeries(items) : [];
      const summaryData = s || (hasLocalData ? buildMinimalSummary(items, allSales, purchasesArr) : null);

      if (!summaryData && !hasLocalData) {
        setError(t("couldNotReachServer"));
        setErrorType("cold-start");
        return;
      }

      setSummary(summaryData);
      setWeeklyRevenue(weeklyData);
      setMonthlyRevenue(monthlyData);
      setTopProducts(Array.isArray(topProd) ? topProd : []);
      setSaleItems(items);
      setSalesData(allSales);
      setProfit(profitData);
      setProfitByProduct(profitByProduct);
      setPurchases(purchasesArr);
      setOffline(!!window.__ms_offline);
      setLastUpdated(new Date());

      // Batch 2: secondary data (charts that aren't critical for initial render)
      Promise.all([
        safeFetch("/dashboard/expenses", { batch: 2 }),
        safeFetch("/dashboard/expiring-products", { batch: 2 }),
        safeFetch("/dashboard/expired-products", { batch: 2 }),
        safeFetch("/sales", { batch: 2 }),
      ]).then(([exp, expiringData, expiredData, salesDataAll]) => {
        setExpenses(Array.isArray(exp) ? exp : []);
        setExpiring(Array.isArray(expiringData) ? expiringData : []);
        setExpired(Array.isArray(expiredData) ? expiredData : []);
        if (Array.isArray(salesDataAll)) setSalesData(salesDataAll);
      }).catch(() => {});
    } catch (err) {
      if (err?.message === "AUTH") {
        localStorage.removeItem("shop_auth_token");
        localStorage.removeItem("shop_id");
        localStorage.removeItem("shop_name");
        setError(t("sessionExpiredMsg"));
        setErrorType("auth");
      } else {
        setError(t("failedToLoadDashboard"));
        setErrorType("network");
      }
    } finally {
      setIsLoading(false);
    }
  }, [summary, token]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Refetch straight away when the super admin switches shop, so the new
  // shop's data appears immediately instead of on the next auto-refresh.
  useEffect(() => {
    const onTenant = () => fetchDashboardData();
    window.addEventListener("tenantChanged", onTenant);
    return () => window.removeEventListener("tenantChanged", onTenant);
  }, [fetchDashboardData]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const interval = setInterval(fetchDashboardData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchDashboardData]);

  const cycleRefreshInterval = () => {
    const idx = REFRESH_OPTIONS.findIndex((o) => o.value === refreshInterval);
    const next = REFRESH_OPTIONS[(idx + 1) % REFRESH_OPTIONS.length];
    setRefreshInterval(next.value);
    localStorage.setItem("dashboard_refresh_interval", next.value);
  };

  const salesMap = useMemo(() => {
    const m = {};
    salesData.forEach((s) => { m[s.id] = s; });
    return m;
  }, [salesData]);

  const enrichedSaleItems = useMemo(() => {
    return saleItems.map((si) => {
      const saleId = si.sale?.id || si.saleId;
      const fullSale = saleId && salesMap[saleId];
      if (fullSale) return { ...si, sale: fullSale };
      if (si.sale) return si;
      return si;
    });
  }, [saleItems, salesMap]);

  const isDebtItem = (si) => {
    const sale = si.sale || si;
    return isOutstandingDebtSale(sale);
  };

  const debtStats = useMemo(() => {
    let totalDebt = 0, dayDebtProfit = 0, weekDebtProfit = 0, monthDebtProfit = 0, sixMonthDebtProfit = 0, yearDebtProfit = 0, totalDebtProfit = 0;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const yearStart = `${now.getFullYear()}-01-01`;
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - mondayOffset);
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    const sixMonthStartStr = sixMonthsAgo.toISOString().split("T")[0];

    enrichedSaleItems.forEach((si) => {
      if (isDebtItem(si)) {
        const amt = Number(si.price) || 0;
        const costPrice = Number(si.costPrice) || 0;
        const qty = Number(si.quantity) || 1;
        const debtProfit = (amt - costPrice) * qty;
        const sale = si.sale || si;
        totalDebt += getSaleRemainingDebt(sale);
        totalDebtProfit += debtProfit;
        const d = (si.sale?.saleDate || si.saleDate || "").slice(0, 10);
        if (d >= todayStr) dayDebtProfit += debtProfit;
        if (d >= weekStartStr) weekDebtProfit += debtProfit;
        if (d >= monthStart) monthDebtProfit += debtProfit;
        if (d >= sixMonthStartStr) sixMonthDebtProfit += debtProfit;
        if (d >= yearStart) yearDebtProfit += debtProfit;
      }
    });
    return { totalDebt, dayDebtProfit, weekDebtProfit, monthDebtProfit, sixMonthDebtProfit, yearDebtProfit, totalDebtProfit };
  }, [enrichedSaleItems]);

  const productDebtProfit = useMemo(() => {
    const map = {};
    const yearStart = `${new Date().getFullYear()}-01-01`;
    enrichedSaleItems.forEach((si) => {
      if (isDebtItem(si)) {
        const d = (si.sale?.saleDate || si.saleDate || "").slice(0, 10);
        if (d < yearStart) return;
        const name = si.product?.name || si.productName || "Unknown";
        const amt = Number(si.price) || 0;
        const costPrice = Number(si.costPrice) || 0;
        const qty = Number(si.quantity) || 1;
        map[name] = (map[name] || 0) + (amt - costPrice) * qty;
      }
    });
    return map;
  }, [enrichedSaleItems]);

  const saleKpis = useMemo(() => {
    if (!enrichedSaleItems.length) return [];
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const yearStart = `${now.getFullYear()}-01-01`;
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - mondayOffset);
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    const sixMonthStartStr = sixMonthsAgo.toISOString().split("T")[0];

    let daySales = 0, weekSales = 0, monthSales = 0, sixMonthSales = 0, yearSales = 0, totalSales = 0, totalProfit = 0;
    enrichedSaleItems.forEach((si) => {
      const d = (si.sale?.saleDate || si.saleDate || "").slice(0, 10);
      const amt = (Number(si.price) || 0) * (Number(si.quantity) || 1);
      const p = ((Number(si.price) || 0) - (Number(si.costPrice) || 0)) * (Number(si.quantity) || 1);
      totalSales += amt;
      totalProfit += p;
      if (d >= todayStr) daySales += amt;
      if (d >= weekStartStr) weekSales += amt;
      if (d >= monthStart) monthSales += amt;
      if (d >= sixMonthStartStr) sixMonthSales += amt;
      if (d >= yearStart) yearSales += amt;
    });

    const c = {
      emerald: { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
      cyan: { color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
      blue: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
      indigo: { color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
      purple: { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
      slate: { color: "#0f172a", bg: "#f8fafc", border: "#cbd5e1" },
    };

    return [
      { label: t("daySalesLabel"), sales: daySales, profit: profit?.today || 0, debtProfit: debtStats.dayDebtProfit, ...c.emerald },
      { label: t("weekSalesLabel"), sales: weekSales, profit: profit?.week || 0, debtProfit: debtStats.weekDebtProfit, ...c.cyan },
      { label: t("monthSalesLabel"), sales: monthSales, profit: profit?.month || 0, debtProfit: debtStats.monthDebtProfit, ...c.blue },
      { label: t("sixMonthsLabel"), sales: sixMonthSales, profit: profit?.sixMonths || 0, debtProfit: debtStats.sixMonthDebtProfit, ...c.indigo },
      { label: t("yearSalesLabel"), sales: yearSales, profit: profit?.year || 0, debtProfit: debtStats.yearDebtProfit, ...c.purple },
      { label: t("allTimeLabel"), sales: totalSales, profit: totalProfit, debtProfit: debtStats.totalDebtProfit, allTime: true, ...c.slate },
    ];
  }, [enrichedSaleItems, profit, debtStats, t]);

  const headerRight = (
    <View style={styles.headerActions}>
      <Pressable onPress={fetchDashboardData} style={[styles.headerBtn, { paddingHorizontal: spacing.md }]} hitSlop={6}>
        <Ionicons name="refresh-outline" size={14} color={colors.slate500} />
        <Text style={styles.headerBtnText}>{t("refresh")}</Text>
      </Pressable>
      <Pressable onPress={cycleRefreshInterval} style={styles.headerBtn} hitSlop={6}>
        <Ionicons name="time-outline" size={13} color={colors.slate400} />
        <Text style={styles.headerBtnText}>
          {REFRESH_OPTIONS.find((o) => o.value === refreshInterval)?.label === "Off"
            ? t("autoOff")
            : t("everyLabel", { label: REFRESH_OPTIONS.find((o) => o.value === refreshInterval)?.label })}
        </Text>
      </Pressable>
    </View>
  );

  if (!token) {
    return (
      <Screen title={t("dashboard")}>
        <View style={[styles.noticeCard, styles.noticeAmber]}>
          <Text style={[styles.noticeTitle, styles.noticeAmberText]}>{t("notLoggedIn")}</Text>
          <Text style={styles.noticeAmberText}>{t("pleaseLogIn")}</Text>
          <Pressable onPress={() => navigate("/login")} style={styles.goLoginBtn}>
            <Ionicons name="log-in-outline" size={13} color={colors.white} />
            <Text style={styles.goLoginBtnText}>{t("goToLogin")}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen title={t("dashboard")}>
        <DashboardLoading />
      </Screen>
    );
  }

  if (error) {
    const isAuth = errorType === "auth";
    const isCold = errorType === "cold-start";
    return (
      <Screen title={t("dashboard")}>
        <View style={[styles.noticeCard, isAuth ? styles.noticeAmber : isCold ? styles.noticeSky : styles.noticeRed]}>
          <Text style={[styles.noticeTitle, isAuth ? styles.noticeAmberText : isCold ? styles.noticeSkyText : styles.noticeRedText]}>
            {isAuth ? t("sessionExpired") : isCold ? t("serverWakingUp") : t("dashboardError")}
          </Text>
          <Text style={[styles.noticeBody, isAuth ? styles.noticeAmberText : isCold ? styles.noticeSkyText : styles.noticeRedText]}>{error}</Text>
          <View style={styles.noticeActions}>
            {isAuth ? (
              <Pressable onPress={() => navigate("/login")} style={styles.goLoginBtn}>
                <Ionicons name="log-in-outline" size={13} color={colors.white} />
                <Text style={styles.goLoginBtnText}>{t("goToLogin")}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={fetchDashboardData} style={styles.retryBtn}>
                <Ionicons name="refresh-outline" size={13} color={colors.slate700} />
                <Text style={styles.retryBtnText}>{t("retry")}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Screen>
    );
  }

  const kpis = [
    { label: t("todayRevenue"), value: `TZS ${summary?.todayRevenue?.toFixed(2) || "0.00"}`, icon: "cash-outline", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", route: "/reports" },
    { label: t("todaySales"), value: summary?.transactionCount || 0, icon: "cart-outline", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", route: "/sales" },
    { label: t("lowStock"), value: summary?.lowStockCount || 0, icon: "cube-outline", color: (summary?.lowStockCount || 0) > 0 ? "#d97706" : "#059669", bg: (summary?.lowStockCount || 0) > 0 ? "#fffbeb" : "#ecfdf5", border: (summary?.lowStockCount || 0) > 0 ? "#fde68a" : "#a7f3d0", route: "/stock" },
    { label: t("expired"), value: summary?.expiredProducts || 0, icon: "warning-outline", color: (summary?.expiredProducts || 0) > 0 ? "#dc2626" : "#059669", bg: (summary?.expiredProducts || 0) > 0 ? "#fef2f2" : "#ecfdf5", border: (summary?.expiredProducts || 0) > 0 ? "#fecaca" : "#a7f3d0", route: "/products?filter=expired" },
    { label: t("expiringSoon"), value: summary?.expiringSoonCount || 0, icon: "trending-up-outline", color: (summary?.expiringSoonCount || 0) > 0 ? "#d97706" : "#059669", bg: (summary?.expiringSoonCount || 0) > 0 ? "#fffbeb" : "#ecfdf5", border: (summary?.expiringSoonCount || 0) > 0 ? "#fde68a" : "#a7f3d0", route: "/products?filter=expiring" },
    { label: t("products"), value: summary?.totalProducts || 0, icon: "cube-outline", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", route: "/products?filter=active" },
    { label: t("customers"), value: summary?.totalCustomers || 0, icon: "people-outline", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc", route: "/customers" },
    { label: t("suppliers"), value: summary?.totalSuppliers || 0, icon: "truck-outline", color: "#f97316", bg: "#fff7ed", border: "#fed7aa", route: "/suppliers" },
    { label: t("pendingOrders"), value: purchases.filter((p) => p.status === "Pending" || p.status === "Processing").length, icon: "clipboard-outline", color: purchases.filter((p) => p.status === "Pending" || p.status === "Processing").length > 0 ? "#d97706" : "#059669", bg: purchases.filter((p) => p.status === "Pending" || p.status === "Processing").length > 0 ? "#fffbeb" : "#ecfdf5", border: purchases.filter((p) => p.status === "Pending" || p.status === "Processing").length > 0 ? "#fde68a" : "#a7f3d0", route: "/purchases" },
  ];

  const pendingCount = purchases.filter((p) => p.status === "Pending" || p.status === "Processing").length;

  const subtitle = t("realTimeOverview") + (lastUpdated ? ` · ${t("updatedAt", { time: lastUpdated.toLocaleTimeString() })}` : "");

  return (
    <Screen title={t("dashboard")} subtitle={subtitle} right={headerRight} onRefresh={fetchDashboardData} refreshing={isLoading}>
      {offline && (
        <View style={[styles.alertBanner, styles.bannerSky]}>
          <Ionicons name="wifi-off-outline" size={15} color="#0e7490" />
          <Text style={styles.bannerSkyText}><Text style={styles.bannerStrong}>{t("offlineMode")}</Text> — {t("offlineDesc")}</Text>
        </View>
      )}

      {expired.length > 0 && (
        <View style={[styles.alertBanner, styles.bannerRed]}>
          <Ionicons name="warning-outline" size={15} color={colors.dangerDark} />
          <Text style={styles.bannerRedText}><Text style={styles.bannerStrong}>{expired.length}</Text> {t("productsExpired", { count: expired.length })}</Text>
        </View>
      )}

      {pendingCount > 0 && (
        <Pressable onPress={() => navigate("/purchases")} style={[styles.alertBanner, styles.bannerAmber]}>
          <Ionicons name="clipboard-outline" size={15} color="#b45309" />
          <Text style={styles.bannerAmberText}><Text style={styles.bannerStrong}>{pendingCount}</Text> {t("ordersPendingDelivery", { count: pendingCount })} — <Text style={styles.bannerLink}>{t("viewOrders")}</Text></Text>
        </Pressable>
      )}

      {saleKpis.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash-outline" size={16} color={colors.slate500} />
            <Text style={styles.sectionTitle}>{t("salesOverview")}</Text>
          </View>
          <View style={styles.kpiGrid}>
            {saleKpis.map((kpi) => (
              <View
                key={kpi.label}
                style={[styles.saleKpi, { backgroundColor: kpi.bg, borderColor: kpi.border, borderTopColor: kpi.color }]}
              >
                <View style={styles.saleKpiHeader}>
                  <Ionicons name="cash-outline" size={13} color={kpi.color} />
                  <Text style={[styles.saleKpiLabel, { color: colors.slate500 }]}>{kpi.label}</Text>
                </View>
                <Text style={[styles.saleKpiValue, { color: kpi.color }]} numberOfLines={1}>
                  TZS {kpi.sales.toLocaleString()}
                </Text>
                {showProfit && (
                  <>
                    <View style={styles.fmtRow}>
                      <Text style={styles.fmtLabel}>{t("realProfit")} </Text>
                      <Text style={[styles.fmtValue, { color: kpi.profit >= 0 ? "#059669" : "#dc2626" }]} numberOfLines={1}>
                        TZS {Number(kpi.profit || 0).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.fmtRow}>
                      <Text style={styles.fmtLabel2}>{t("netProfit")} </Text>
                      <Text style={[styles.fmtValue, { color: (kpi.profit - (kpi.debtProfit || 0)) >= 0 ? "#059669" : "#dc2626" }]} numberOfLines={1}>
                        TZS {Number(kpi.profit - (kpi.debtProfit || 0)).toLocaleString()}
                      </Text>
                    </View>
                    {kpi.debtProfit > 0 && (
                      <View style={styles.debtChip}>
                        <Text style={styles.debtChipText}>{t("debtLabel")} -TZS {Number(kpi.debtProfit).toLocaleString()}</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.kpiGrid, { marginBottom: spacing.lg }]}>
        {kpis.map((kpi) => (
          <Pressable key={kpi.label} onPress={() => navigate(kpi.route)} style={[styles.statCard, { backgroundColor: kpi.bg, borderColor: kpi.border }]}>
            <View style={styles.statCardHeader}>
              <Ionicons name={kpi.icon} size={13} color={kpi.color} />
              <Text style={styles.statCardLabel} numberOfLines={1}>{kpi.label}</Text>
            </View>
            <Text style={[styles.statCardValue, { color: kpi.color }]} numberOfLines={1}>{kpi.value}</Text>
          </Pressable>
        ))}
      </View>

      {showProfit && profitByProduct.length > 0 && (
        <Card style={styles.prodCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="grid-outline" size={15} color={colors.slate500} />
            <Text style={styles.sectionTitle}>{t("profitByProduct")}</Text>
          </View>
          <View style={styles.prodHeader}>
            <Text style={[styles.prodTh, styles.prodColName]}>{t("product")}</Text>
            <Text style={[styles.prodTh, styles.prodColNum]}>{t("todayColumn")}</Text>
            <Text style={[styles.prodTh, styles.prodColNum]}>{t("thisMonthColumn")}</Text>
            <Text style={[styles.prodTh, styles.prodColNum]}>{t("thisYearColumn")}</Text>
            <Text style={[styles.prodTh, styles.prodColNum]}>{t("netExclDebt")}</Text>
          </View>
          {(showAllProfit ? profitByProduct : profitByProduct.slice(0, 5)).map((item, idx) => {
            const netProfit = (item.yearProfit || 0) - (productDebtProfit[item.name] || 0);
            const c = (v) => (v > 0 ? "#059669" : v < 0 ? "#dc2626" : colors.slate400);
            return (
              <View key={`${item.name}-${idx}`} style={styles.prodRow}>
                <Text style={[styles.prodCell, styles.prodColName, styles.prodName]} numberOfLines={2}>{item.name}</Text>
                <Text style={[styles.prodCell, styles.prodColNum, { color: c(item.dayProfit), fontWeight: "700" }]}>TZS {Number(item.dayProfit || 0).toLocaleString()}</Text>
                <Text style={[styles.prodCell, styles.prodColNum, { color: c(item.monthProfit), fontWeight: "700" }]}>TZS {Number(item.monthProfit || 0).toLocaleString()}</Text>
                <Text style={[styles.prodCell, styles.prodColNum, { color: c(item.yearProfit), fontWeight: "700" }]}>TZS {Number(item.yearProfit || 0).toLocaleString()}</Text>
                <Text style={[styles.prodCell, styles.prodColNum, { color: c(netProfit), fontWeight: "700" }]}>TZS {Number(netProfit).toLocaleString()}</Text>
              </View>
            );
          })}
          {profitByProduct.length > 5 && (
            <Pressable onPress={() => setShowAllProfit(!showAllProfit)} style={styles.prodToggle}>
              <Text style={styles.prodToggleText}>
                {showAllProfit ? `${t("showLess")} ▲` : `${t("viewAllCount", { count: profitByProduct.length })} ▼`}
              </Text>
            </Pressable>
          )}
        </Card>
      )}

      <Pressable onPress={() => navigate("/reports")} style={styles.chartPress}>
        <RevenueChart data={weeklyRevenue} />
      </Pressable>
      <Pressable onPress={() => navigate("/reports")} style={styles.chartPress}>
        <RevenueTrend data={monthlyRevenue} />
      </Pressable>
      <Pressable onPress={() => navigate("/products")} style={styles.chartPress}>
        <TopProductsChart data={topProducts} />
      </Pressable>

      <Pressable onPress={() => navigate("/stock")} style={styles.chartPress}>
        <ExpiryAlertChart expiring={expiring} expired={expired} />
      </Pressable>
      <Pressable onPress={() => navigate("/reports")} style={styles.chartPress}>
        <ExpenseBreakdown data={expenses} />
      </Pressable>
      <Pressable onPress={() => navigate("/sales")} style={styles.chartPress}>
        <RecentSales data={recentSales} />
      </Pressable>

      <Pressable onPress={() => navigate("/sale-items")} style={styles.chartPress}>
        <SaleItemsActivity data={saleItems} />
      </Pressable>
      {showProfit && (
        <Pressable onPress={() => navigate("/reports")} style={styles.chartPress}>
          <DailyProfitChart data={weeklyRevenue} />
        </Pressable>
      )}
      {showProfit && (
        <Pressable onPress={() => navigate("/reports")} style={styles.chartPress}>
          <MonthlyProfitChart data={monthlyRevenue} />
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  loadingHint: { fontSize: font.xs, marginTop: spacing.sm, marginBottom: spacing.xl, color: colors.slate400 },
  tipCard: { maxWidth: 300, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderWidth: 1, borderColor: "#fecdd3", borderRadius: radius.lg, ...shadow.card },
  tipLabel: { fontSize: 10, fontWeight: "700", color: "#f43f5e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  tipText: { fontSize: font.xs, color: colors.slate600, lineHeight: 18 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 7, paddingHorizontal: spacing.sm, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md },
  headerBtnText: { fontSize: font.xs, fontWeight: "600", color: colors.slate500 },
  noticeCard: { marginTop: spacing.sm, marginBottom: spacing.lg, padding: spacing.lg, borderWidth: 1, borderRadius: radius.lg },
  noticeAmber: { backgroundColor: "#fffbeb", borderColor: "#fde68a" },
  noticeSky: { backgroundColor: "#f0f9ff", borderColor: "#bae6fd" },
  noticeRed: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  noticeAmberText: { color: "#92400e" },
  noticeSkyText: { color: "#0c4a6e" },
  noticeRedText: { color: "#991b1b" },
  noticeTitle: { fontWeight: "700", marginBottom: 2 },
  noticeBody: { fontSize: font.sm },
  noticeActions: { flexDirection: "row", marginTop: spacing.md },
  goLoginBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: spacing.md, paddingVertical: 7, backgroundColor: "#d97706", borderRadius: radius.md },
  goLoginBtnText: { color: colors.white, fontSize: font.xs, fontWeight: "600" },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: spacing.md, paddingVertical: 7, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md },
  retryBtnText: { color: colors.slate700, fontSize: font.xs, fontWeight: "600" },
  alertBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.lg, marginBottom: spacing.lg },
  bannerSky: { backgroundColor: "#f0f9ff", borderWidth: 1, borderColor: "#bae6fd" },
  bannerRed: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca" },
  bannerAmber: { backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a" },
  bannerSkyText: { color: "#0e7490", fontSize: font.sm, flex: 1 },
  bannerRedText: { color: "#991b1b", fontSize: font.sm, flex: 1 },
  bannerAmberText: { color: "#92400e", fontSize: font.sm, flex: 1 },
  bannerStrong: { fontWeight: "700" },
  bannerLink: { textDecorationLine: "underline", fontWeight: "700" },
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  sectionTitle: { fontSize: font.sm, fontWeight: "700", color: colors.slate700, textTransform: "uppercase", letterSpacing: 0.4 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  saleKpi: { flexBasis: "47%", flexGrow: 1, borderWidth: 1, borderTopWidth: 3, borderRadius: radius.lg, padding: 10, minWidth: 0 },
  saleKpiHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  saleKpiLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 1 },
  saleKpiValue: { fontSize: 15, fontWeight: "700", lineHeight: 19 },
  fmtRow: { flexDirection: "row", marginTop: 4 },
  fmtLabel: { fontSize: font.xs, fontWeight: "600", color: "#94a3b8", marginRight: 2 },
  fmtLabel2: { fontSize: font.xs, fontWeight: "600", color: colors.slate500, marginRight: 2 },
  fmtValue: { fontSize: font.xs, fontWeight: "700", flexShrink: 1 },
  debtChip: { marginTop: 4, paddingHorizontal: 6, paddingVertical: 3, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: radius.sm },
  debtChipText: { fontSize: 10, fontWeight: "700", color: "#dc2626" },
  statCard: { flexBasis: "31%", flexGrow: 1, borderWidth: 1, borderRadius: radius.lg, padding: 12, minWidth: 0, ...shadow.card },
  statCardHeader: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  statCardLabel: { fontSize: 10, fontWeight: "700", color: colors.slate500, textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 1 },
  statCardValue: { fontSize: font.base, fontWeight: "700" },
  prodCard: { marginBottom: spacing.lg },
  prodHeader: { flexDirection: "row", backgroundColor: colors.slate50, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: spacing.xs },
  prodRow: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.slate50, paddingVertical: 8, paddingHorizontal: spacing.xs },
  prodTh: { fontSize: 9, fontWeight: "700", color: colors.slate500, textTransform: "uppercase" },
  prodCell: { fontSize: font.xs },
  prodColName: { flex: 2.2 },
  prodColNum: { flex: 1, textAlign: "right", paddingLeft: 4 },
  prodName: { fontWeight: "600", color: colors.slate700 },
  prodToggle: { alignItems: "center", paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.slate100, marginTop: spacing.sm },
  prodToggleText: { fontSize: font.xs, fontWeight: "700", color: colors.primary },
  chartPress: { marginBottom: spacing.lg },
});