import { LineChart, ChartCard } from "../components/ui";
import { t, useLanguage } from "../i18n";

const monthKeys = ["monthJan", "monthFeb", "monthMar", "monthApr", "monthMay", "monthJun", "monthJul", "monthAug", "monthSep", "monthOct", "monthNov", "monthDec"];

export default function RevenueTrend({ data }) {
  useLanguage();
  const chartData = (Array.isArray(data) ? data : []).map((d) => ({
    label: `${t(monthKeys[d.month - 1])} ${d.year}`,
    value: Number(d.total) || 0,
  }));

  return (
    <ChartCard title={t("revenueTrend")} subtitle={t("monthlyOverPastYear")}>
      <LineChart data={chartData} height={170} color="#10b981" fill="#f0fdf4" />
    </ChartCard>
  );
}