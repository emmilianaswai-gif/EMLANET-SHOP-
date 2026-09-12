import { Text, StyleSheet } from "react-native";
import { BarChart, ChartCard } from "../components/ui";
import { colors, font } from "../theme";
import { t, useLanguage } from "../i18n";

export default function ExpiryAlertChart({ expiring, expired }) {
  useLanguage();
  const expiringArr = Array.isArray(expiring) ? expiring : [];
  const expiredArr = Array.isArray(expired) ? expired : [];
  const hasExpiring = expiringArr.length > 0;
  const hasExpired = expiredArr.length > 0;

  const chartData = [
    ...(hasExpired ? expiredArr.map((p) => ({ label: p.name, value: Number(p.quantity) || 0, status: t("statusExpired") })) : []),
    ...(hasExpiring ? expiringArr.map((p) => ({ label: p.name, value: Number(p.quantity) || 0, status: t("expiringSoon") })) : []),
  ];

  const subtitle = [
    hasExpired ? t("countExpired", { count: expiredArr.length }) : "",
    hasExpiring ? t("countExpiringSoon", { count: expiringArr.length }) : "",
  ]
    .filter(Boolean)
    .join(haveBoth(hasExpired, hasExpiring) ? " — " : " ");

  return (
    <ChartCard title={t("expiryAlerts")} subtitle={subtitle}>
      {chartData.length === 0 ? (
        <Text style={styles.good}>{t("allGoodNoExpiring")}</Text>
      ) : (
        <BarChart data={chartData} height={170} barColor="#ef4444" />
      )}
    </ChartCard>
  );
}

function haveBoth(a, b) {
  return a && b;
}

const styles = StyleSheet.create({
  good: { color: colors.success, fontSize: font.xs, textAlign: "center", paddingVertical: 32, fontWeight: "600" },
});