import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect, Path, Circle, Line as SvgLine } from "react-native-svg";
import { colors, font, radius, spacing } from "../../theme";
import Card from "./Card";

// ─────────────────────────────────────────────────────────────────────────────
// BarChart — renders an array of {label, value} as vertical bars.
// ─────────────────────────────────────────────────────────────────────────────
export function BarChart({ data = [], height = 160, barColor = colors.primary, labels }) {
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.value || 0)), [data]);
  const barW = Math.max(6, Math.min(28, (280 - data.length * 2) / Math.max(1, data.length)));
  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${data.length * (barW + 6)} ${height}`}>
        {data.map((d, i) => {
          const x = i * (barW + 6);
          const h = Math.max(2, ((d.value || 0) / max) * (height - 18));
          return (
            <Rect key={i} x={x} y={height - h} width={barW} height={h} rx={2} fill={barColor} opacity={0.85 + 0.15 * (1 - i / data.length)} />
          );
        })}
      </Svg>
      {(labels || data).length > 0 && (
        <View style={chartStyles.labels}>
          {data.map((d, i) => (
            <Text key={i} style={chartStyles.label} numberOfLines={1}>{labels?.[i] ?? d.label ?? ""}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LineChart — array of {label, value} connected by a smooth SVG path.
// ─────────────────────────────────────────────────────────────────────────────
export function LineChart({ data = [], height = 160, color = colors.primary, fill }) {
  const pts = useMemo(() => {
    if (!data.length) return [];
    const max = Math.max(1, ...data.map((d) => d.value || 0));
    const step = 280 / Math.max(1, data.length - 1);
    return data.map((d, i) => ({ x: i * step, y: height - 18 - (((d.value || 0) / max) * (height - 32)) }));
  }, [data, height]);

  if (pts.length < 2) return <View style={{ height }} />;

  const d =
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") +
    ` L ${pts[pts.length - 1].x} ${height} L 0 ${height} Z`;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 280 ${height}`}>
      <Path d={d} fill={fill || (color + "22")} opacity={0.7} />
      <Path d={pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
      ))}
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PieChart — donut rendered with SVG arcs. `data`: [{label,value,color}].
// ─────────────────────────────────────────────────────────────────────────────
export function PieChart({ data = [], size = 140 }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  if (!total || size < 10) return null;
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const ri = r * 0.55;

  let angle = -90;
  const slices = data.map((d) => {
    const sweep = ((d.value || 0) / total) * 360;
    const start = angle;
    angle += sweep;
    return { ...d, start, sweep };
  });

  const describeArc = (start, sweep) => {
    const r2 = r;
    const rad = (deg) => (deg * Math.PI) / 180;
    const x1 = cx + r2 * Math.cos(rad(start));
    const y1 = cy + r2 * Math.sin(rad(start));
    const x2 = cx + r2 * Math.cos(rad(start + sweep));
    const y2 = cy + r2 * Math.sin(rad(start + sweep));
    const x3 = cx + ri * Math.cos(rad(start + sweep));
    const y3 = cy + ri * Math.sin(rad(start + sweep));
    const x4 = cx + ri * Math.cos(rad(start));
    const y4 = cy + ri * Math.sin(rad(start));
    const large = sweep > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r2} ${r2} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${ri} ${ri} 0 ${large} 0 ${x4} ${y4} Z`;
  };

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) =>
        s.sweep > 0.4 ? (
          <Path key={i} d={describeArc(s.start, s.sweep)} fill={s.color || colors.slate400} />
        ) : null
      )}
      <Circle cx={cx} cy={cy} r={ri} fill={colors.white} />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChartCard — a titled card wrapping any chart component.
// ─────────────────────────────────────────────────────────────────────────────
export function ChartCard({ title, subtitle, children, style }) {
  return (
    <Card style={style}>
      <View style={chartStyles.cardHeader}>
        <Text style={chartStyles.cardTitle}>{title}</Text>
        {!!subtitle && <Text style={chartStyles.cardSub}>{subtitle}</Text>}
      </View>
      {children}
    </Card>
  );
}

const chartStyles = StyleSheet.create({
  cardHeader: { marginBottom: spacing.sm },
  cardTitle: { fontSize: font.sm, fontWeight: "700", color: colors.slate700 },
  cardSub: { fontSize: font.xs, color: colors.slate400, marginTop: 1 },
  labels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingHorizontal: 2 },
  label: { fontSize: 9, color: colors.slate400, flexShrink: 1, textAlign: "center", marginLeft: 2 },
});