import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Modal from "./ui/Modal";
import { colors, font, radius, spacing } from "../theme";

// Native Autocomplete that loads options from an API endpoint, mirrors the
// web ComboBox (endpoint + allowCreate + onSelect(id, name)).
export default function ComboBox({
  label,
  endpoint,
  value,
  inputValue,
  onSelect,
  placeholder = "Select...",
  allowCreate = true,
}) {
  const [items, setItems] = useState([]);
  const [text, setText] = useState(inputValue || "");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setText(inputValue || "");
  }, [inputValue]);

  useEffect(() => {
    let cancelled = false;
    if (!endpoint) return;
    setLoading(true);
    api
      .get(endpoint)
      .then(({ data }) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  const filtered = useMemo(
    () =>
      items.filter((i) => String(i.name || "").toLowerCase().includes(text.trim().toLowerCase())),
    [items, text]
  );
  const exactMatch = items.some(
    (i) => String(i.name || "").toLowerCase() === text.trim().toLowerCase()
  );

  return (
    <View style={styles.container}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <Pressable style={styles.trigger} onPress={() => setShow(true)}>
        <Text style={styles.value} numberOfLines={1}>
          {text || placeholder}
        </Text>
        <AntDesign name="down" size={13} color={colors.slate400} />
      </Pressable>

      <Modal visible={show} onClose={() => setShow(false)} title={label || placeholder}>
        <TextInput
          style={styles.search}
          autoFocus
          value={text}
          placeholder={placeholder}
          placeholderTextColor={colors.slate400}
          onChangeText={(v) => {
            setText(v);
            onSelect?.(null, v);
          }}
          autoCorrect={false}
        />
        {loading && <Text style={styles.hint}>Loading...</Text>}
        {allowCreate && filtered.length === 0 && text.trim() && !exactMatch && (
          <Pressable
            style={styles.create}
            onPress={() => {
              onSelect?.(null, text.trim());
              setShow(false);
            }}
          >
            <Text style={styles.createText}>Create "{text.trim()}"</Text>
          </Pressable>
        )}
        <FlatList
          data={filtered}
          keyExtractor={(_, i) => String(i)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const active = String(value) === String(item.id);
            return (
              <Pressable
                style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && { backgroundColor: colors.slate100 }]}
                onPress={() => {
                  setText(String(item.name || ""));
                  onSelect?.(item.id, item.name);
                  setShow(false);
                }}
              >
                <Text style={styles.optionText}>{item.name}</Text>
              </Pressable>
            );
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { fontSize: font.xs, fontWeight: "700", color: colors.slate500, textTransform: "uppercase", marginBottom: 5 },
  trigger: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.slate300,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
  },
  value: { flex: 1, fontSize: font.base, color: colors.slate800 },
  search: {
    borderWidth: 1,
    borderColor: colors.slate300,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: spacing.sm,
    fontSize: font.base,
  },
  hint: { fontSize: font.xs, color: colors.slate400, marginBottom: spacing.sm },
  create: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  createText: { color: colors.primary, fontWeight: "700", fontSize: font.base },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.slate100,
  },
  optionActive: { backgroundColor: colors.primaryLight },
  optionText: { fontSize: font.base, color: colors.slate700 },
});