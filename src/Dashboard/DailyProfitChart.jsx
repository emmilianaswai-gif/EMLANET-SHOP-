import { View, Text, StyleSheet } from "react-native";
import { BarChart, ChartCard } from "../components/ui";
import { colors, font, spacing } from "../theme";
import { t, useLanguage } from "../i18n";

export default function DailyProfitChart({ data }) {
  useLanguage();
  const rows = Array.isArray(data) ? data : [];
  const revenue = rows.map((d) => ({ label: d.date, value: Number(d.revenue) || 0 }));
  const profit = rows.map((d) => ({ label: d.date, value: Number(d.profit) || 0 }));

  return (
    <ChartCard title={t("dailyProfit")} subtitle={t("revenueVsProfit7Days")}>
      {rows.length === 0 ? (
        <Text style={styles.empty}>{t("noDataAvailable")}</Text>
      ) : (
        <>
          <View style={styles.series}>
            <Text style={styles.seriesLabel}>{t("revenue")}</Text>
            <BarChart data={revenue} height={80} barColor="#3b82f6" />
          </View>
          <View style={styles.series}>
            <Text style={styles.seriesLabel}>{t("profitLabel")}</Text>
            <BarChart data={profit} height={80} barColor="#10b981" />
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