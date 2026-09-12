import { useState } from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../components/ui";
import { canViewProfit } from "../utils/roleChecks";
import { colors, font, radius, spacing } from "../theme";
import { t, useLanguage } from "../i18n";

export default function SaleItemsActivity({ data }) {
  const showProfit = canViewProfit();
  const [showAll, setShowAll] = useState(false);
  useLanguage();
  const rows = Array.isArray(data) ? data : [];
  const displayData = showAll ? rows : rows.slice(0, 5);

  if (rows.length === 0) {
    return (
      <Card>
        <View style={styles.header}>
          <Ionicons name="trending-up-outline" size={16} color="#10b981" />
          <Text style={styles.title}>{t("saleItemsActivity")}</Text>
        </View>
        <Text style={styles.subtitle}>{t("individualItemsSold")}</Text>
        <Text style={styles.empty}>{t("noSaleItemsRecorded")}</Text>
      </Card>
    );
  }

  return (
    <Card>
      <View style={styles.rowBetween}>
        <View style={styles.header}>
          <Ionicons name="trending-up-outline" size={16} color="#10b981" />
          <Text style={styles.title}>{t("saleItemsActivity")}</Text>
        </View>
        <Text style={styles.count}>{t("itemsCount", { count: rows.length })}</Text>
      </View>
      <Text style={styles.subtitle}>{t("recentItemsFromSaleItems")}</Text>

      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.colProduct]}>{t("product")}</Text>
        <Text style={[styles.th, styles.colQty]}>{t("qty")}</Text>
        <Text style={[styles.th, styles.colRevenue]}>{t("revenue")}</Text>
        {showProfit && <Text style={[styles.th, styles.colProfit]}>{t("profitLabel")}</Text>}
      </View>

      {displayData.map((item) => {
        const revenue = Number(item.price) || 0;
        const costPrice = Number(item.costPrice) || 0;
        const qty = Number(item.quantity) || 1;
        const profit = (revenue - costPrice) * qty;
        return (
          <View key={item.id} style={styles.row}>
            <View style={[styles.cell, styles.colProduct]}>
              {item.product?.image ? (
                <Image source={{ uri: item.product.image }} style={styles.img} />
              ) : (
                <View style={styles.placeholder}>
                  <Ionicons name="cube-outline" size={11} color="#10b981" />
                </View>
              )}
              <Text style={styles.productName} numberOfLines={1}>{item.product?.name || "—"}</Text>
            </View>
            <Text style={[styles.cell, styles.colQty, styles.qty]}>{item.quantity}</Text>
            <Text style={[styles.cell, styles.colRevenue, styles.amount]}>
              TZS {(revenue * qty).toLocaleString()}
            </Text>
            {showProfit && (
              <Text style={[styles.cell, styles.colProfit, { color: profit >= 0 ? "#059669" : "#dc2626", fontWeight: "700" }]}>
                {profit >= 0 ? "+" : ""}TZS {profit.toLocaleString()}
              </Text>
            )}
          </View>
        );
      })}

      {rows.length > 5 && !showAll && (
        <Pressable onPress={() => setShowAll(true)} style={styles.viewAll}>
          <Text style={styles.viewAllText}>{t("seeAll")}</Text>
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
  colProduct: { flex: 2.5 },
  colQty: { flex: 0.8, alignItems: "center" },
  colRevenue: { flex: 1, alignItems: "flex-end" },
  colProfit: { flex: 1, alignItems: "flex-end" },
  img: { width: 20, height: 20, borderRadius: radius.sm, marginRight: 5, borderWidth: 1, borderColor: colors.slate200 },
  placeholder: { width: 20, height: 20, borderRadius: radius.sm, backgroundColor: "#ecfdf5", alignItems: "center", justifyContent: "center", marginRight: 5 },
  productName: { color: colors.slate700, flexShrink: 1 },
  qty: { textAlign: "center", fontWeight: "600", color: colors.slate600 },
  amount: { textAlign: "right", fontWeight: "600", color: colors.slate700 },
  viewAll: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: spacing.sm, marginTop: spacing.xs },
  viewAllText: { fontSize: font.xs, fontWeight: "700", color: colors.primary },
});