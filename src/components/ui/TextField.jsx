import { View, TextInput, Text, StyleSheet } from "react-native";
import { colors, font, radius, spacing } from "../../theme";

export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline,
  keyboardType,
  secureTextEntry,
  containerStyle,
  rightIcon,
  inputStyle,
  editable = true,
  numberOfLines,
  returnKeyType,
  onSubmitEditing,
  autoCapitalize,
  maxLength,
}) {
  return (
    <View style={[styles.container, containerStyle]}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.wrap}>
        <TextInput
          style={[
            styles.input,
            multiline && { minHeight: 90, textAlignVertical: "top" },
            error && styles.inputError,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.slate400}
          multiline={multiline}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          editable={editable}
          numberOfLines={numberOfLines}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
        />
        {rightIcon}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
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
  wrap: { flexDirection: "row", alignItems: "center", position: "relative" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.slate300,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: font.base,
    color: colors.slate800,
    backgroundColor: colors.white,
    minHeight: 42,
  },
  inputError: { borderColor: colors.danger, backgroundColor: colors.dangerLight },
  errorText: { color: colors.danger, fontSize: font.xs, marginTop: 4 },
});