import { View, Text, StyleSheet } from "react-native";
import { PieChart, ChartCard } from "../components/ui";
import { colors, font, spacing } from "../theme";
import { t, useLanguage } from "../i18n";

const COLORS = ["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export default function TopProductsChart({ data }) {
  useLanguage();
  const chartData = (Array.isArray(data) ? data : []).map((d, idx) => ({
    label: d.name,
    value: Number(d.quantity) || 0,
    color: COLORS[idx % COLORS.length],
  }));

  return (
    <ChartCard title={t("topProducts")} subtitle={t("byQuantitySold")}>
      {chartData.length ? (
        <>
          <View style={styles.center}>
            <PieChart data={chartData} size={160} />
          </View>
          <View style={styles.legend}>
            {chartData.map((d, i) => (
              <View key={i} style={styles.item}>
                <View style={[styles.dot, { backgroundColor: d.color }]} />
                <Text style={styles.itemText} numberOfLines={1}>{d.label}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", paddingVertical: spacing.sm },
  legend: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm, marginTop: spacing.xs },
  item: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "45%" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  itemText: { fontSize: 10, color: colors.slate600, flexShrink: 1 },
});