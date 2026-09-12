import { View, Text, StyleSheet } from "react-native";
import { LineChart, ChartCard } from "../components/ui";
import { colors, font, spacing } from "../theme";
import { t, useLanguage } from "../i18n";

export default function YearlyProfitChart({ data }) {
  useLanguage();
  const rows = Array.isArray(data) ? data : [];
  const revenue = rows.map((d) => ({ label: String(d.year), value: Number(d.revenue) || 0 }));
  const profit = rows.map((d) => ({ label: String(d.year), value: Number(d.profit) || 0 }));

  return (
    <ChartCard title={t("yearlyProfitComparison")} subtitle={t("revenueVsProfitByYear")}>
      {rows.length === 0 ? (
        <Text style={styles.empty}>{t("noYearlyData")}</Text>
      ) : (
        <>
          <View style={styles.series}>
            <Text style={styles.seriesLabel}>{t("revenue")}</Text>
            <LineChart data={revenue} height={130} color="#2563eb" fill="#eff6ff" />
          </View>
          <View style={styles.series}>
            <Text style={styles.seriesLabel}>{t("profitLabel")}</Text>
            <LineChart data={profit} height={130} color="#16a34a" fill="#f0fdf4" />
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