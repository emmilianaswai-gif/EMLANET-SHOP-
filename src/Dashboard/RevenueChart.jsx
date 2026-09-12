import { BarChart, ChartCard } from "../components/ui";
import { t, useLanguage } from "../i18n";

export default function RevenueChart({ data }) {
  useLanguage();
  const chartData = (Array.isArray(data) ? data : []).map((d) => ({
    label: d.date,
    value: Number(d.total) || 0,
  }));

  return (
    <ChartCard title={t("weeklyRevenue")} subtitle={t("last7Days")}>
      <BarChart data={chartData} height={170} barColor="#3b82f6" />
    </ChartCard>
  );
}