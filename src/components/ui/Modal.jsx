import { Modal as RNModal, View, Text, Pressable, StyleSheet, ScrollView, TouchableWithoutFeedback } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { colors, font, radius, spacing, shadow } from "../../theme";

export default function Modal({
  visible,
  onClose,
  title,
  children,
  actions,
}) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <View style={styles.card}>
          {!!title && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
                <AntDesign name="close" size={16} color={colors.slate500} />
              </Pressable>
            </View>
          )}
          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {!!actions && actions.length > 0 && (
            <View style={styles.footer}>{actions}</View>
          )}
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "82%",
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    overflow: "hidden",
    ...shadow.raised,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  title: { fontSize: font.lg, fontWeight: "700", color: colors.slate900 },
  close: { padding: 4 },
  body: { padding: 16 },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
});