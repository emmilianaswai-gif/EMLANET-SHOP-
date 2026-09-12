import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { colors, font, radius } from "../../theme";

const pluralize = (word, count) => (Number(count) === 1 ? word : `${word}s`);
const bundleLabel = (unit) => (unit && unit !== "piece" ? unit : "bundle");

export default function QuantityInput({
  value = 0,
  onChange,
  piecesPerUnit = 0,
  unit = "piece",
  min = 0,
  placeholder,
  style,
  size = "sm",
}) {
  const hasBundles = Number(piecesPerUnit) > 0;
  const ppu = Number(piecesPerUnit) || 0;
  const [mode, setMode] = useState("unit");
  const [text, setText] = useState("");

  const toDisplay = (pieces) => {
    if (mode === "bundle") {
      if (ppu > 0) {
        const bundles = Number(pieces) / ppu;
        return Number.isInteger(bundles) ? String(bundles) : String(Number(bundles.toFixed(3)));
      }
      return String(pieces ?? "");
    }
    return String(pieces ?? "");
  };

  useEffect(() => {
    setText(toDisplay(value));
  }, [value, mode, ppu]);

  const commit = (str) => {
    const n = parseFloat(str);
    if (isNaN(n) || n < 0) return;
    const pieces = mode === "bundle" ? Math.round(n * (ppu || 1)) : Math.round(n);
    if (Number.isFinite(pieces)) onChange(pieces);
  };

  const piecesValue = Number(value) || 0;
  const bundlesValue = ppu > 0 ? piecesValue / ppu : piecesValue;
  const inBundles = mode === "bundle";

  const toggle = (active) => [styles.toggle, active ? styles.toggleActive : styles.toggleIdle];

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.toggles}>
        <Pressable onPress={() => setMode("unit")} style={toggle(mode === "unit")}>
          <Text style={[styles.toggleText, mode === "unit" && styles.toggleTextActive]}>Units</Text>
        </Pressable>
        <Pressable onPress={() => setMode("bundle")} style={toggle(mode === "bundle")}>
          <Text style={[styles.toggleText, mode === "bundle" && styles.toggleTextActive]}>
            {bundleLabel(unit)}
          </Text>
        </Pressable>
      </View>
      <TextInput
        value={text}
        placeholder={placeholder}
        keyboardType="numeric"
        style={[styles.input, size === "md" && { paddingVertical: 8 }, style]}
        onChangeText={(v) => {
          setText(v);
          commit(v);
        }}
        onEndEditing={() => setText(toDisplay(value))}
      />
      {hasBundles && piecesValue > 0 && (
        <Text style={styles.foot}>
          {inBundles
            ? `= ${piecesValue.toLocaleString()} ${pluralize("piece", piecesValue)}`
            : `${Number(bundlesValue) % 1 === 0 ? Number(bundlesValue).toLocaleString() : Number(bundlesValue.toFixed(2))} ${pluralize(bundleLabel(unit), bundlesValue)}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "column", gap: 3, width: "100%" },
  toggles: { flexDirection: "row", gap: 3 },
  toggle: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.slate300,
  },
  toggleActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  toggleIdle: { backgroundColor: colors.white },
  toggleText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", color: colors.slate500 },
  toggleTextActive: { color: colors.primary },
  input: {
    width: "100%",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.slate300,
    borderRadius: 6,
    fontSize: 12,
    textAlign: "center",
    color: colors.slate800,
    backgroundColor: colors.white,
  },
  foot: { fontSize: 10, color: colors.slate500, textAlign: "center" },
});