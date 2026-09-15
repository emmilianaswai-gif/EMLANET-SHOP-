import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, radius } from "../theme";

export default function BulkBar({ count, allSelected, onSelectAll, onDelete, deleteLabel = "Delete" }) {
  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.btn, { backgroundColor: colors.white, borderColor: colors.slate300 }]}
        onPress={onSelectAll}
      >
        <Ionicons name="checkbox-outline" size={12} color={colors.primary} />
        <Text style={[styles.btnText, { color: colors.primary }]}>{allSelected ? "Deselect All" : "Select All"}</Text>
      </Pressable>
      <Pressable
        style={[styles.btn, { backgroundColor: count === 0 ? "#f3f4f6" : "#fef2f2", borderColor: count === 0 ? colors.slate200 : "#fecaca" }]}
        onPress={onDelete}
        disabled={count === 0}
      >
        <Ionicons name="trash-outline" size={12} color={count === 0 ? colors.slate400 : colors.danger} />
        <Text style={[styles.btnText, { color: count === 0 ? colors.slate400 : colors.danger }]}>
          {deleteLabel} {count > 0 ? `(${count})` : ""}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", flexShrink: 0 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  btnText: { fontSize: 11, fontWeight: "600", whiteSpace: "nowrap" },
});