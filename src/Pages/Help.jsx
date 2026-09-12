import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import { TextField, SelectField, Button, Card } from "../components/ui";
import { colors, font, radius, spacing, shadow } from "../theme";

const guides = [
  {
    title: "Getting Started",
    icon: "cube-outline",
    color: "#2563eb",
    steps: [
      "Log in with your username and password at the start of each shift.",
      "Your Dashboard shows real-time sales, stock levels, and revenue at a glance.",
      "Use the sidebar to navigate between Products, Sales, Customers, and Reports.",
    ],
  },
  {
    title: "Managing Products",
    icon: "cube-outline",
    color: "#16a34a",
    steps: [
      "Go to Products > Add Product to create new items with name, price, unit, and category.",
      "Set expiry dates for perishable goods — the system flags items expiring within 14 days.",
      "Low stock items (below 10 units) appear with a red alert; click 'Low Stock' filter to see them.",
      "Use the edit icon on any product row to update price, category, or stock details.",
    ],
  },
  {
    title: "Processing Sales",
    icon: "cart-outline",
    color: "#7c3aed",
    steps: [
      "Go to Sale Manager and select the customer type (Walk-in, Regular, Wholesale, VIP).",
      "Add products from the dropdown — prices auto-fill. Adjust quantity as needed.",
      "Choose payment method: Cash or Debt. Click 'Complete Sale' to finalize.",
      "View all transactions on the Sales page; filter by date or payment type.",
    ],
  },
  {
    title: "Tracking Inventory",
    icon: "bar-chart-outline",
    color: "#ca8a04",
    steps: [
      "Stock page shows current quantities for all products.",
      "Stock History logs every change: purchases, sales, adjustments, and transfers.",
      "Set up low stock alerts in Settings to get notified when items run low.",
    ],
  },
  {
    title: "Managing Customers",
    icon: "people-outline",
    color: "#0891b2",
    steps: [
      "Add customers with name, phone, and email from the Customers page.",
      "Track purchase history and outstanding balances for credit customers.",
      "Customer types (Regular, Wholesale, VIP) help you offer tiered pricing.",
    ],
  },
  {
    title: "Reports & Analytics",
    icon: "bar-chart-outline",
    color: "#ea580c",
    steps: [
      "Reports page shows daily, weekly, and monthly sales charts.",
      "Top Products chart highlights best sellers by revenue.",
      "Use date filters to compare performance across periods.",
    ],
  },
];

export default function Help() {
  const [expandedGuide, setExpandedGuide] = useState(0);
  const [phone, setPhone] = useState("");
  const [issueType, setIssueType] = useState("bug");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");

  const getSupportPhone = () => {
    try {
      const saved = localStorage.getItem("shop_support_contacts");
      if (saved) {
        const contacts = JSON.parse(saved);
        const contact = contacts.find((c) => c.phone && c.phone.trim());
        if (contact) return contact.phone.trim();
      }
    } catch {}
    return "+255768980990";
  };

  const handleSendSms = async () => {
    if (!phone.trim() || !description.trim()) {
      setSendError("Phone and description are required");
      return;
    }
    setSending(true);
    setSendError("");
    try {
      const toNumber = getSupportPhone();
      const smsBody = `[EMLANETSHOP Help] Issue: ${issueType.toUpperCase()}\n${description.trim()}\nFrom: ${phone.trim()}`;
      await api.post("/sms/send", {
        to: toNumber,
        message: smsBody,
      });
      setSent(true);
    } catch {
      setSendError("Failed to send SMS. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.root, { backgroundColor: colors.slate50 }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={{ maxWidth: 900, alignSelf: "center", width: "100%" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Ionicons name="help-circle" size={24} color={colors.primary} />
            <Text style={styles.h1}>Help Center</Text>
          </View>
          <Text style={styles.subtitle}>Learn how to use the system and get support when you need it</Text>

          {/* Guides Section */}
          <Text style={styles.h2}>System User Guide</Text>
          <View style={{ gap: spacing.sm, marginBottom: spacing["2xl"] }}>
            {guides.map((guide, idx) => {
              const isExpanded = expandedGuide === idx;
              return (
                <Card key={idx} style={{ padding: 0, overflow: "hidden" }}>
                  <Pressable style={styles.guideHeader} onPress={() => setExpandedGuide(isExpanded ? -1 : idx)}>
                    <View style={[styles.guideIcon, { backgroundColor: `${guide.color}12` }]}>
                      <Ionicons name={guide.icon} size={18} color={guide.color} />
                    </View>
                    <Text style={styles.guideTitle}>{guide.title}</Text>
                    {isExpanded ? (
                      <Ionicons name="chevron-up" size={16} color={colors.slate400} />
                    ) : (
                      <Ionicons name="chevron-down" size={16} color={colors.slate400} />
                    )}
                  </Pressable>
                  {isExpanded && (
                    <View style={styles.guideBody}>
                      {guide.steps.map((step, si) => (
                        <View key={si} style={[styles.guideStep, si < guide.steps.length - 1 && { marginBottom: 10 }]}>
                          <View style={[styles.stepBadge, { backgroundColor: `${guide.color}12` }]}>
                            <Text style={{ fontSize: font.xs, fontWeight: "700", color: guide.color }}>{si + 1}</Text>
                          </View>
                          <Text style={styles.stepText}>{step}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Card>
              );
            })}
          </View>

          {/* SMS Problem Reporting */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 4 }}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
            <Text style={styles.h2}>Report a Problem</Text>
          </View>
          <Text style={[styles.subtitle, { marginBottom: 14 }]}>
            Found a bug or need help? Send us an SMS and we'll get back to you.
          </Text>

          {sent ? (
            <Card style={styles.sentBox}>
              <Ionicons name="checkmark-circle" size={40} color={colors.success} style={{ marginBottom: 12 }} />
              <Text style={styles.sentTitle}>Message Sent!</Text>
              <Text style={[styles.subtitle, { marginBottom: spacing.lg }]}>
                Your issue has been reported via SMS. Our support team will contact you shortly.
              </Text>
              <Button
                title="Send Another Report"
                variant="primary"
                onPress={() => { setSent(false); setPhone(""); setDescription(""); setIssueType("bug"); }}
              />
            </Card>
          ) : (
            <Card style={styles.form}>
              {sendError && (
                <View style={[styles.alert, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
                  <Ionicons name="alert-circle" size={14} color="#991b1b" />
                  <Text style={{ fontSize: font.sm, color: "#991b1b", flex: 1 }}>{sendError}</Text>
                </View>
              )}
              <View style={styles.formRow}>
                <TextField
                  label="Your Phone Number *"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+255 7XX XXX XXX"
                  keyboardType="phone-pad"
                  containerStyle={styles.colLeft}
                />
                <SelectField
                  label="Issue Type"
                  value={issueType}
                  onChange={setIssueType}
                  options={[
                    { value: "bug", label: "Bug Report" },
                    { value: "feature", label: "Feature Request" },
                    { value: "support", label: "Technical Support" },
                    { value: "billing", label: "Billing Issue" },
                    { value: "other", label: "Other" },
                  ]}
                  containerStyle={styles.colRight}
                />
              </View>
              <TextField
                label="Describe the Problem *"
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="What happened? What did you expect? Include any error messages..."
              />
              <View style={{ alignItems: "flex-end" }}>
                <Button
                  title={sending ? "Sending SMS..." : "Send Report via SMS"}
                  variant="success"
                  size="md"
                  loading={sending}
                  disabled={sending || !phone.trim() || !description.trim()}
                  onPress={handleSendSms}
                  icon={<Ionicons name="send" size={14} color="#fff" />}
                />
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: spacing.xl },
  h1: { fontSize: 22, fontWeight: "700", color: colors.slate900 },
  h2: { fontSize: font.lg, fontWeight: "700", color: colors.slate900, marginBottom: 14 },
  subtitle: { color: colors.slate500, fontSize: font.base, marginBottom: 28 },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  guideIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  guideTitle: { flex: 1, fontSize: font.base, fontWeight: "700", color: colors.slate900 },
  guideBody: { paddingHorizontal: 18, paddingBottom: spacing.lg, paddingLeft: 66 },
  guideStep: { flexDirection: "row", gap: 10 },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepText: { flex: 1, fontSize: font.sm, color: colors.slate600, lineHeight: 19 },
  sentBox: { alignItems: "center", padding: spacing["2xl"], paddingVertical: 32 },
  sentTitle: { fontSize: font.lg, fontWeight: "700", color: colors.slate900, marginBottom: 6 },
  form: { padding: spacing.xl, ...shadow.card },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 14,
  },
  formRow: { flexDirection: "row", gap: 14, marginBottom: 14 },
  colLeft: { flex: 1 },
  colRight: { flex: 1 },
});