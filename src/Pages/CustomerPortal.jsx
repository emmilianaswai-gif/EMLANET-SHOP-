import { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import { Card, EmptyState } from "../components/ui";
import { t, useLanguage } from "../i18n";
import { getSaleRemainingDebt, isOutstandingDebtSale } from "../utils/debtUtils";
import { colors, font, radius, spacing, shadow } from "../theme";

const PURCHASE_STATUS_MAP = {
  Pending: { label: "New", bg: "#dbeafe", color: "#2563eb" },
  Processing: { label: "Processing", bg: "#fef3c7", color: "#d97706" },
  Approved: { label: "Delivered", bg: "#d1fae5", color: "#059669" },
  Rejected: { label: "Rejected", bg: "#fee2e2", color: "#dc2626" },
};

const SALE_PAGE_SIZE = 10;
const PURCH_PAGE_SIZE = 10;

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);
  return (
    <View style={s.pagination}>
      <Pressable disabled={page <= 1} onPress={() => onChange(page - 1)} style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}>
        <Ionicons name="chevron-back" size={13} color={page <= 1 ? colors.slate300 : colors.slate600} />
        <Text style={[s.pageBtnText, page <= 1 && s.pageBtnTextDisabled]}>{t("prev")}</Text>
      </Pressable>
      {pages.map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} style={[s.pageNumBtn, i === page && s.pageNumBtnActive]}>
          <Text style={[s.pageNumText, i === page && s.pageNumTextActive]}>{i}</Text>
        </Pressable>
      ))}
      <Pressable disabled={page >= totalPages} onPress={() => onChange(page + 1)} style={[s.pageBtn, page >= totalPages && s.pageBtnDisabled]}>
        <Text style={[s.pageBtnText, page >= totalPages && s.pageBtnTextDisabled]}>{t("next")}</Text>
        <Ionicons name="chevron-forward" size={13} color={page >= totalPages ? colors.slate300 : colors.slate600} />
      </Pressable>
    </View>
  );
}

export default function CustomerPortal() {
  useLanguage();
  const userId = localStorage.getItem("shop_user_id");
  const fullName = localStorage.getItem("shop_full_name") || localStorage.getItem("shop_username") || "";

  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [salePage, setSalePage] = useState(1);
  const [purchPage, setPurchPage] = useState(1);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [custRes, purchaseRes] = await Promise.all([
        userId ? api.get("/sales/customer/" + userId).catch(() => ({ data: null })) : { data: null },
        api.get("/purchases").catch(() => ({ data: [] })),
      ]);
      setCustomerData(custRes.data);
      const allPurchases = Array.isArray(purchaseRes.data) ? purchaseRes.data : [];
      setPurchases(allPurchases.filter((p) => p.customerName === fullName));
    } finally { setLoading(false); }
  };

  const reload = async () => {
    setRefreshing(true);
    try {
      const [custRes, purchaseRes] = await Promise.all([
        userId ? api.get("/sales/customer/" + userId).catch(() => ({ data: null })) : { data: null },
        api.get("/purchases").catch(() => ({ data: [] })),
      ]);
      setCustomerData(custRes.data);
      const allPurchases = Array.isArray(purchaseRes.data) ? purchaseRes.data : [];
      setPurchases(allPurchases.filter((p) => p.customerName === fullName));
    } finally { setRefreshing(false); }
  };

  const sales = customerData?.sales || [];
  const totalPaid = customerData?.totalPaid || 0;
  const totalDebt = sales.reduce((sum, s) => sum + getSaleRemainingDebt(s), 0);
  const totalSpent = totalPaid + totalDebt;
  const orderCount = sales.length + purchases.length;
  const pendingOrders = purchases.filter((p) => p.status === "Pending").length;
  const deliveredOrders = purchases.filter((p) => p.status === "Approved").length;
  const paginatedSales = [...sales].reverse().slice((salePage - 1) * SALE_PAGE_SIZE, salePage * SALE_PAGE_SIZE);
  const paginatedPurchases = purchases.slice((purchPage - 1) * PURCH_PAGE_SIZE, purchPage * PURCH_PAGE_SIZE);
  const saleTotalPages = Math.ceil(sales.length / SALE_PAGE_SIZE);
  const purchTotalPages = Math.ceil(purchases.length / PURCH_PAGE_SIZE);

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <Spinner size={28} text={t("loading")} />
      </View>
    );
  }

  const summaryCards = [
    { label: "Total Spent", value: `TZS ${totalSpent.toLocaleString()}`, color: "#0f172a", icon: "wallet-outline" },
    { label: "Total Paid", value: `TZS ${totalPaid.toLocaleString()}`, color: "#16a34a", icon: "checkmark-circle-outline" },
    { label: "Outstanding", value: `TZS ${totalDebt.toLocaleString()}`, color: totalDebt > 0 ? "#dc2626" : "#16a34a", icon: "alert-circle-outline" },
    { label: "Total Orders", value: orderCount, color: "#2563eb", icon: "cube-outline" },
    { label: "Completed", value: sales.length, color: "#16a34a", icon: "checkmark-circle-outline" },
    { label: "Pending Delivery", value: pendingOrders, color: "#f59e0b", icon: "time-outline" },
  ];

  return (
    <View style={s.root}>
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Ionicons name="bag-outline" size={22} color="#2563eb" />
          <Text style={s.headerTitle}>My Account</Text>
          {fullName ? (
            <View style={s.nameTag}>
              <Ionicons name="person-outline" size={12} color={colors.slate500} />
              <Text style={s.nameTagText}>{fullName}</Text>
            </View>
          ) : null}
        </View>
        <Pressable onPress={reload} disabled={refreshing} style={s.refreshBtn}>
          <Ionicons name="refresh" size={13} color={colors.slate600} />
          <Text style={s.refreshBtnText}>Refresh</Text>
        </Pressable>
      </View>

      <Card style={s.summaryCard}>
        <View style={s.sectionHeader}>
          <Ionicons name="person-outline" size={16} color="#2563eb" />
          <Text style={s.sectionTitle}>Account Summary</Text>
        </View>
        <View style={s.summaryGrid}>
          {summaryCards.map((sc) => (
            <View key={sc.label} style={s.summaryItem}>
              <View style={s.summaryItemLabel}>
                <Ionicons name={sc.icon} size={12} color={sc.color} />
                <Text style={[s.summaryItemLabelText, { color: sc.color }]}>{sc.label}</Text>
              </View>
              <Text style={[s.summaryItemValue, { color: sc.color }]}>{sc.value}</Text>
            </View>
          ))}
        </View>
      </Card>

      {purchases.length > 0 && (
        <Card padded={false} style={s.purchasesCard}>
          <View style={s.sectionHeaderBar}>
            <Ionicons name="cube-outline" size={14} color="#2563eb" />
            <Text style={s.sectionHeaderTitle}>Purchase Orders ({purchases.length})</Text>
          </View>
          <ScrollView style={s.purchasesScroll} nestedScrollEnabled>
            {paginatedPurchases.map((p) => {
              const st = PURCHASE_STATUS_MAP[p.status] || { label: p.status, bg: "#f1f5f9", color: "#64748b" };
              return (
                <View key={p.id} style={s.purchaseRow}>
                  <Text style={s.orderHash}>#{p.id}</Text>
                  <Text style={s.purchaseDate}>
                    {p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : "\u2014"}
                  </Text>
                  <Text style={s.purchaseName} numberOfLines={1}>{p.productName || `Order #${p.id}`}</Text>
                  <Text style={s.purchaseTotal}>TZS {(Number(p.unitPrice) || 0).toLocaleString()}</Text>
                  <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                    <Text style={[s.statusBadgeText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
              );
            })}
            <Pagination page={purchPage} totalPages={purchTotalPages} onChange={setPurchPage} />
          </ScrollView>
        </Card>
      )}

      <Card padded={false} style={s.salesCard}>
        <View style={s.sectionHeaderBar}>
          <Ionicons name="time-outline" size={14} color="#2563eb" />
          <Text style={s.sectionHeaderTitle}>Sales History ({sales.length})</Text>
        </View>
        <View style={s.salesBody}>
          {sales.length === 0 ? (
            <EmptyState icon="time-outline" message="No sales yet" />
          ) : (
            <ScrollView nestedScrollEnabled>
              {paginatedSales.map((sale) => {
                const remainingDebt = getSaleRemainingDebt(sale);
                const outstanding = isOutstandingDebtSale(sale);
                const expanded = expandedOrder === sale.id;
                const items = sale.saleItems || sale.items || [];
                return (
                  <View key={sale.id} style={s.saleRowWrap}>
                    <Pressable style={s.saleRow} onPress={() => setExpandedOrder(expanded ? null : sale.id)}>
                      <Text style={s.orderHash}>#{sale.id}</Text>
                      <Text style={s.saleDate}>
                        {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : "\u2014"}
                      </Text>
                      <Text style={s.saleDesc} numberOfLines={1}>
                        {items.length > 0 ? items.map((it) => `${it.productName || it.product?.name || "?"} x${it.quantity}`).join(", ") : (sale.description || `Sale #${sale.id}`)}
                      </Text>
                      <Text style={s.saleTotal}>TZS {(Number(sale.grandTotal) || 0).toLocaleString()}</Text>
                      <View style={[s.saleStatusBadge, { backgroundColor: outstanding ? "#fef2f2" : "#f0fdf4" }]}>
                        <Text style={[s.saleStatusBadgeText, { color: outstanding ? "#dc2626" : "#16a34a" }]}>
                          {outstanding ? `UNPAID \u00b7 TZS ${remainingDebt.toLocaleString()}` : "PAID"}
                        </Text>
                      </View>
                      <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.slate400} />
                    </Pressable>
                    {expanded && items.length > 0 && (
                      <View style={s.expandedItems}>
                        {items.map((item, idx) => (
                          <View key={idx} style={s.expandedItemRow}>
                            <Text style={s.expandedItemName} numberOfLines={1}>{item.productName || item.product?.name || "\u2014"}</Text>
                            <Text style={s.expandedItemQty}>x{item.quantity}</Text>
                            <Text style={s.expandedItemPrice}>TZS {Number(item.price || 0).toLocaleString()}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
              <Pagination page={salePage} totalPages={saleTotalPages} onChange={setSalePage} />
            </ScrollView>
          )}
        </View>
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50, padding: spacing.sm, gap: spacing.sm },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.slate900 },
  nameTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  nameTagText: { color: colors.slate500, fontSize: 12 },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: colors.slate100, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate200 },
  refreshBtnText: { color: colors.slate600, fontWeight: "600", fontSize: 12 },
  summaryCard: { flexShrink: 0 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.md },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.slate900 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryItem: { padding: 10, backgroundColor: colors.slate50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.slate200, minWidth: 140, flexGrow: 1 },
  summaryItemLabel: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  summaryItemLabelText: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  summaryItemValue: { fontSize: 18, fontWeight: "700" },
  purchasesCard: { flexShrink: 0, maxHeight: 260 },
  sectionHeaderBar: { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.slate100, backgroundColor: colors.slate50 },
  sectionHeaderTitle: { fontSize: 13, fontWeight: "700", color: colors.slate900 },
  purchasesScroll: { maxHeight: 200 },
  purchaseRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  orderHash: { fontWeight: "700", color: "#2563eb", fontSize: 13, minWidth: 40 },
  purchaseDate: { fontSize: 12, color: colors.slate500 },
  purchaseName: { flex: 1, fontSize: 12, color: colors.slate700 },
  purchaseTotal: { fontSize: 13, fontWeight: "700", color: colors.slate900 },
  statusBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.pill },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  salesCard: { flex: 1, minHeight: 0 },
  salesBody: { flex: 1 },
  saleRowWrap: { borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  saleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16 },
  saleDate: { fontSize: 12, color: colors.slate500, minWidth: 80 },
  saleDesc: { flex: 1, fontSize: 12, color: colors.slate700 },
  saleTotal: { fontSize: 13, fontWeight: "700", color: colors.slate900 },
  saleStatusBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.pill },
  saleStatusBadgeText: { fontSize: 10, fontWeight: "700" },
  expandedItems: { paddingLeft: 72, paddingRight: 16, paddingBottom: 12 },
  expandedItemRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  expandedItemName: { flex: 1, fontSize: 11, color: colors.slate600 },
  expandedItemQty: { fontSize: 11, color: colors.slate600 },
  expandedItemPrice: { fontSize: 11, color: colors.slate600 },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  pageBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.slate300, borderRadius: radius.sm, backgroundColor: colors.white },
  pageBtnDisabled: { backgroundColor: colors.slate100 },
  pageBtnText: { fontSize: 13, fontWeight: "500", color: colors.slate600 },
  pageBtnTextDisabled: { color: colors.slate300 },
  pageNumBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.slate300, borderRadius: radius.sm, backgroundColor: colors.white },
  pageNumBtnActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  pageNumText: { fontSize: 13, fontWeight: "500", color: colors.slate600 },
  pageNumTextActive: { color: "#fff" },
});
