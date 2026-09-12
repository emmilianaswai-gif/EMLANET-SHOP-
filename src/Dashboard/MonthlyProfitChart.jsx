import { View, Text, StyleSheet } from "react-native";
import { LineChart, ChartCard } from "../components/ui";
import { colors, font, spacing } from "../theme";
import { t, useLanguage } from "../i18n";

const monthKeys = ["monthJan", "monthFeb", "monthMar", "monthApr", "monthMay", "monthJun", "monthJul", "monthAug", "monthSep", "monthOct", "monthNov", "monthDec"];

export default function MonthlyProfitChart({ data }) {
  useLanguage();
  const rows = Array.isArray(data) ? data : [];
  const revenue = rows.map((d) => ({ label: t(monthKeys[d.month - 1]), value: Number(d.revenue) || 0 }));
  const profit = rows.map((d) => ({ label: t(monthKeys[d.month - 1]), value: Number(d.profit) || 0 }));

  return (
    <ChartCard title={t("monthlyProfit")} subtitle={t("revenueVsProfit12Months")}>
      {rows.length === 0 ? (
        <Text style={styles.empty}>{t("noDataAvailable")}</Text>
      ) : (
        <>
          <View style={styles.series}>
            <Text style={styles.seriesLabel}>{t("revenue")}</Text>
            <LineChart data={revenue} height={80} color="#3b82f6" fill="#eff6ff" />
          </View>
          <View style={styles.series}>
            <Text style={styles.seriesLabel}>{t("profitLabel")}</Text>
            <LineChart data={profit} height={80} color="#10b981" fill="#f0fdf4" />
          </View>
        </>
      )}
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  series: { marginBottom: spacing.md },
  seriesLabel: { fontSize: font.xs, fontWeight: "600", color: colors.slate500, marginBottom: 2 },
  empty: { color: colors.slate400, fontSize: font.xs, textAlign: "center", paddingVertical: 32 },
});