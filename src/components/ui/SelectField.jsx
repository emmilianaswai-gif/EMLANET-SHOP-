import { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, FlatList, StyleSheet } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import Modal from "./Modal";
import { colors, font, radius, spacing } from "../../theme";

// Native picker: a pressable trigger that opens a searchable options modal.
// `options` may be [{value,label}] or plain strings.
export default function SelectField({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  searchable = true,
  allowClear = false,
  containerStyle,
  renderValue,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const items = useMemo(
    () => options.map((o) => (typeof o === "string" || o == null ? { value: o, label: String(o ?? "") } : { value: o.value, label: String(o.label ?? o.value ?? "") })),
    [options]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? items.filter((i) => i.label.toLowerCase().includes(needle) || String(i.value).toLowerCase().includes(needle))
      : items;
    return needle ? list : items;
  }, [items, q]);

  const current = items.find((i) => String(i.value) === String(value)) || null;
  const display = renderValue ? renderValue(current) : current ? current.label : placeholder;

  return (
    <View style={[styles.container, containerStyle]}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text
          style={[styles.triggerText, !current && { color: colors.slate400 }]}
          numberOfLines={1}
        >
          {display}
        </Text>
        <View style={styles.triggerRight}>
          {allowClear && current ? (
            <Pressable onPress={() => onChange(null)} hitSlop={8}>
              <AntDesign name="close" size={14} color={colors.slate400} />
            </Pressable>
          ) : (
            <AntDesign name="down" size={13} color={colors.slate400} />
          )}
        </View>
      </Pressable>

      <Modal visible={open} onClose={() => setOpen(false)} title={label || "Select"}>
        {searchable && (
          <TextInput
            style={styles.search}
            value={q}
            onChangeText={setQ}
            placeholder="Search..."
            placeholderTextColor={colors.slate400}
            autoCorrect={false}
            autoCapitalize="none"
          />
        )}
        <FlatList
          data={filtered}
          keyExtractor={(_, i) => String(i)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const active = String(item.value) === String(value);
            return (
              <Pressable
                style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && { backgroundColor: colors.slate100 }]}
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{item.label}</Text>
                {active && <AntDesign name="check" size={14} color={colors.primary} />}
              </Pressable>
            );
          }}
        />
        {filtered.length === 0 && (
          <Text style={styles.empty}>No options</Text>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: {
    fontSize: font.xs,
    fontWeight: "700",
    color: colors.slate500,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  trigger: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.slate300,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerText: { flex: 1, fontSize: font.base, color: colors.slate800 },
  triggerRight: { marginLeft: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  search: {
    borderWidth: 1,
    borderColor: colors.slate300,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: spacing.sm,
    fontSize: font.base,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.slate100,
  },
  optionActive: { backgroundColor: colors.primaryLight },
  optionText: { fontSize: font.base, color: colors.slate700 },
  optionTextActive: { color: colors.primary, fontWeight: "700" },
  empty: { textAlign: "center", color: colors.slate400, padding: spacing.lg, fontSize: font.sm },
});