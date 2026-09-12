import { Text, StyleSheet } from "react-native";
import { LineChart, ChartCard } from "../components/ui";
import { colors, font } from "../theme";
import { t, useLanguage } from "../i18n";

export default function ExpenseBreakdown({ data }) {
  useLanguage();
  const chartData = (Array.isArray(data) ? data : []).map((d) => ({
    label: d.title,
    value: Number(d.amount) || 0,
  }));

  return (
    <ChartCard title={t("recentExpenses")} subtitle={t("latestExpenseRecords")}>
      {chartData.length === 0 ? (
        <Text style={styles.empty}>{t("noExpensesYet")}</Text>
      ) : (
        <LineChart data={chartData} height={170} color="#ef4444" fill="#fef2f2" />
      )}
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.slate400, fontSize: font.xs, textAlign: "center", paddingVertical: 32 },
});