import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../components/ui";
import { colors, font, radius, spacing, shadow } from "../theme";

export default function TermsService() {
  const lastUpdated = "June 2026";

  return (
    <SafeAreaView edges={["bottom"]} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Document Header */}
        <View style={styles.header}>
          <Text style={styles.h1}>Terms of Service</Text>
          <Text style={styles.headerSub}>
            System Operational Agreement {"\u2022"} Last Updated: {lastUpdated}
          </Text>
        </View>

        {/* Warning/Important Notice Banner */}
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Important Operational Notice</Text>
          <Text style={styles.noticeText}>
            By authenticating into and processing commercial financial transactions through this platform, you agree to the standard store operational protocols outlined below.
          </Text>
        </View>

        {/* Policy Sections Wrapper */}
        <View style={{ gap: spacing.xl }}>
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>1. Account Security &amp; Access Controls</Text>
            <Text style={styles.text}>
              Authorized managers and staff members are solely responsible for maintaining the confidentiality of their login credentials (usernames and passwords). Any action, inventory deletion, or sales log alteration performed under an authenticated profile will be permanently credited to that user in the system audit logs.
            </Text>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>2. Data Ownership &amp; Privacy</Text>
            <Text style={styles.text}>
              All store metrics{"\u2014"}including product pricing data, customer telephone records, store credit ledgers, and raw transaction records{"\u2014"}remain the absolute property of the store owner. The software infrastructure will process this information locally or via secure cloud synchronizations strictly to generate analytics charts and sales receipts.
            </Text>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>3. Transaction Accuracy &amp; Compliance</Text>
            <Text style={styles.text}>
              It is the responsibility of the operator to ensure that tax rate figures entered in the{" "}
              <Text style={{ fontWeight: "700" }}>Settings</Text> module conform to local commercial tax regulations. The software handles basic mathematical tracking automatically, but final bookkeeping compliance relies on correct data entry by shop administration.
            </Text>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>4. System Limitations &amp; Liability</Text>
            <Text style={styles.text}>
              This application is provided "as is". The developers are not liable for any financial losses, unrecorded stock differences, or missed revenue calculations resulting from localized hardware failures, browser storage clearouts, power grid cuts, or unbacked-up local system databases.
            </Text>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>5. Modifications to the Service</Text>
            <Text style={styles.text}>
              We reserve the right to deploy software patches, fix functional dashboard bugs, or restructure application database configurations to optimize performance without prior notification to operators.
            </Text>
          </Card>
        </View>

        {/* Footer Support Notice */}
        <Text style={styles.footer}>
          If you have legal or technical questions regarding these operational parameters, please contact your system administrator.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  scroll: { padding: spacing.xl, maxWidth: 850, alignSelf: "center", width: "100%" },
  header: { marginBottom: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.slate200, paddingBottom: spacing.xl },
  h1: { fontSize: 26, fontWeight: "700", color: colors.slate900, marginBottom: 5 },
  headerSub: { color: colors.slate500, fontSize: font.base },
  notice: {
    backgroundColor: "#fef3c7",
    borderLeftWidth: 4,
    borderLeftColor: "#d97706",
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  noticeTitle: { color: "#92400e", fontWeight: "700", marginBottom: 4 },
  noticeText: { fontSize: font.base, color: "#78350f", lineHeight: 22 },
  section: { padding: spacing.xl, borderWidth: 1, borderColor: colors.slate200, ...shadow.card },
  sectionTitle: { fontSize: font.lg, fontWeight: "600", color: colors.slate700, marginBottom: 10 },
  text: { fontSize: font.base, color: colors.slate600, lineHeight: 22 },
  footer: {
    marginTop: spacing["2xl"],
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
    textAlign: "center",
    color: colors.slate400,
    fontSize: font.sm,
  },
});