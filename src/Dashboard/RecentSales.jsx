import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../components/ui";
import { colors, font, radius, spacing } from "../theme";
import { isOutstandingDebtSale, isFullyPaidDebtSale } from "../utils/debtUtils";
import { t, useLanguage } from "../i18n";

export default function RecentSales({ data }) {
  const [showAll, setShowAll] = useState(false);
  useLanguage();
  const rows = Array.isArray(data) ? data : [];
  const displayData = showAll ? rows : rows.slice(0, 5);

  if (rows.length === 0) {
    return (
      <Card>
        <View style={styles.header}>
          <Ionicons name="bag-outline" size={16} color={colors.primary} />
          <Text style={styles.title}>{t("recentSales")}</Text>
        </View>
        <Text style={styles.subtitle}>{t("latestTransactionsFromSaleManager")}</Text>
        <Text style={styles.empty}>{t("noRecentSales")}</Text>
      </Card>
    );
  }

  return (
    <Card>
      <View style={styles.rowBetween}>
        <View style={styles.header}>
          <Ionicons name="bag-outline" size={16} color={colors.primary} />
          <Text style={styles.title}>{t("recentSales")}</Text>
        </View>
        <Text style={styles.count}>{t("transactionsCount", { count: rows.length })}</Text>
      </View>
      <Text style={styles.subtitle}>{t("latestFromSaleManagerItems")}</Text>

      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.colCustomer]}>{t("customer")}</Text>
        <Text style={[styles.th, styles.colPayment]}>{t("payment")}</Text>
        <Text style={[styles.th, styles.colAmount]}>{t("amount")}</Text>
        <Text style={[styles.th, styles.colDate]}>{t("date")}</Text>
      </View>

      {displayData.map((sale) => {
        const isDebt = isOutstandingDebtSale(sale);
        const isPaidDebt = isFullyPaidDebtSale(sale);
        return (
          <View key={sale.id} style={styles.row}>
            <View style={[styles.cell, styles.colCustomer]}>
              <View style={styles.avatar}>
                <Ionicons name="person-outline" size={11} color={colors.slate400} />
              </View>
              <Text style={styles.customerName} numberOfLines={1}>
                {sale.customer?.name || t("walkInCustomer")}
              </Text>
            </View>
            <Text style={[styles.cell, styles.colPayment]}>
              <Text style={[styles.badge, isDebt ? styles.badgeDebt : styles.badgePaid]}>
                {isDebt ? t("debt") : isPaidDebt ? t("paid") : t("cash")}
              </Text>
            </Text>
            <Text style={[styles.cell, styles.colAmount, styles.amount]}>
              TZS {(Number(sale.grandTotal) || 0).toLocaleString()}
            </Text>
            <Text style={[styles.cell, styles.colDate, styles.cellDate]}>
              {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : "—"}
            </Text>
          </View>
        );
      })}

      {rows.length > 5 && !showAll && (
        <Pressable onPress={() => setShowAll(true)} style={styles.viewAll}>
          <Text style={styles.viewAllText}>{t("viewAll")}</Text>
          <Ionicons name="arrow-forward-outline" size={12} color={colors.primary} />
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: font.sm, fontWeight: "700", color: colors.slate800 },
  subtitle: { fontSize: font.xs, color: colors.slate400, marginTop: 1, marginBottom: spacing.sm },
  count: { fontSize: 10, color: colors.slate400, fontWeight: "600" },
  empty: { color: colors.slate400, fontSize: font.xs, textAlign: "center", paddingVertical: 32 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.slate100, paddingVertical: 6 },
  th: { fontSize: 9, fontWeight: "700", color: colors.slate400, textTransform: "uppercase", letterSpacing: 0.4 },
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.slate50, paddingVertical: 6 },
  cell: { fontSize: font.xs },
  colCustomer: { flex: 2.2 },
  colPayment: { flex: 1 },
  colAmount: { flex: 1, alignItems: "flex-end" },
  colDate: { flex: 1 },
  avatar: { width: 20, height: 20, borderRadius: radius.sm, backgroundColor: colors.slate100, alignItems: "center", justifyContent: "center", marginRight: 5 },
  customerName: { color: colors.slate700, flexShrink: 1 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill, fontSize: 9, fontWeight: "700", overflow: "hidden" },
  badgeDebt: { backgroundColor: "#fef2f2", color: "#dc2626" },
  badgePaid: { backgroundColor: "#ecfdf5", color: "#059669" },
  amount: { textAlign: "right", fontWeight: "600", color: colors.slate700 },
  cellDate: { color: colors.slate400 },
  viewAll: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: spacing.sm, marginTop: spacing.xs },
  viewAllText: { fontSize: font.xs, fontWeight: "700", color: colors.primary },
});