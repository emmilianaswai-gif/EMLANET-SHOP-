import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTenant } from "../TenantContext";
import { Button } from "../components/ui";
import { t, useLanguage } from "../i18n";
import { redirect } from "../navigation/nav";
import { colors, font, radius, spacing } from "../theme";

export default function Logout() {
  useLanguage();
  const { logout } = useTenant();

  const handleLogout = () => {
    logout();
    redirect("/login");
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>{t("logout")}</Text>
          <Text style={styles.message}>{t("logoutMessage")}</Text>
          <Button
            title={t("confirmLogout")}
            variant="danger"
            size="lg"
            onPress={handleLogout}
            style={{ alignSelf: "flex-start" }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: spacing.lg },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.xl,
    maxWidth: 700,
    alignSelf: "center",
    width: "100%",
  },
  title: { fontSize: font["2xl"], fontWeight: "700", color: colors.slate900, marginBottom: spacing.sm },
  message: { fontSize: font.base, color: colors.slate600, marginBottom: spacing.xl },
});