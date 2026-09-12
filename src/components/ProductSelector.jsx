import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import SelectField from "./ui/SelectField";
import { colors, font, radius, spacing } from "../theme";

export default function ProductSelector({
  value,
  onChange,
  placeholder = "Select product...",
  showPrice = true,
  showQty = true,
}) {
  const [products, setProducts] = useState([]);
  const [stockMap, setStockMap] = useState({});

  useEffect(() => {
    Promise.all([
      api.get("/products").catch(() => ({ data: [] })),
      api.get("/stocks").catch(() => ({ data: [] })),
    ]).then(([pr, sr]) => {
      setProducts(Array.isArray(pr.data) ? pr.data : []);
      const smap = {};
      (Array.isArray(sr.data) ? sr.data : []).forEach((s) => {
        smap[s.productId ?? s.product?.id] = s.quantity;
      });
      setStockMap(smap);
    });
  }, []);

  const getQty = (p) => stockMap[p.id] ?? Number(p.quantity) || 0;

  const options = products.map((p) => {
    let label = p.name;
    if (showPrice) label += ` — TZS ${Number(p.price).toFixed(2)}`;
    if (showQty) label += ` (Stock: ${getQty(p)})`;
    return { value: p.id, label };
  });

  return (
    <View style={{ flexDirection: "column", gap: 4 }}>
      <View style={styles.header}>
        <Ionicons name="cube-outline" size={14} color={colors.slate400} />
        <Text style={styles.label}>{placeholder}</Text>
      </View>
      <SelectField
        value={value}
        onChange={(v) => onChange(Number(v))}
        options={options}
        placeholder={placeholder}
        containerStyle={{ marginBottom: 0 }}
        searchable
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 5 },
  label: { fontSize: 11, fontWeight: "700", color: colors.slate500, textTransform: "uppercase" },
});