import { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import { TextField, Button, Card, EmptyState } from "../components/ui";
import { t, useLanguage } from "../i18n";
import { colors, font, radius, spacing, shadow } from "../theme";

const PAGE_SIZE = 10;

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", color: "#16a34a", bg: "#f0fdf4" },
  { value: "mobile", label: "Mobile", color: "#2563eb", bg: "#eff6ff" },
];

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);
  return (
    <View style={s.pagination}>
      <Pressable disabled={page <= 1} onPress={() => onChange(page - 1)} style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}>
        <Ionicons name="chevron-back" size={13} color={page <= 1 ? colors.slate300 : colors.slate600} />
        <Text style={[s.pageBtnText, page <= 1 && s.pageBtnTextDisabled]}>{t("prev")}</Text>
      </Pressable>
      {pages.map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} style={[s.pageNumBtn, i === page && s.pageNumBtnActive]}>
          <Text style={[s.pageNumText, i === page && s.pageNumTextActive]}>{i}</Text>
        </Pressable>
      ))}
      <Pressable disabled={page >= totalPages} onPress={() => onChange(page + 1)} style={[s.pageBtn, page >= totalPages && s.pageBtnDisabled]}>
        <Text style={[s.pageBtnText, page >= totalPages && s.pageBtnTextDisabled]}>{t("next")}</Text>
        <Ionicons name="chevron-forward" size={13} color={page >= totalPages ? colors.slate300 : colors.slate600} />
      </Pressable>
    </View>
  );
}

export default function CustomerPayment() {
  useLanguage();
  const userId = localStorage.getItem("shop_user_id");
  const fullName = localStorage.getItem("shop_full_name") || localStorage.getItem("shop_username") || "";

  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [pwError, setPwError] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [msg, setMsg] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payContact, setPayContact] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [page, setPage] = useState(1);

  const handleUnlock = () => {
    if (passwordInput === "emmilianaswai@gmail.com") {
      setUnlocked(true);
      setPwError("");
    } else {
      setPwError("Incorrect password");
    }
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [puRes, cuRes] = await Promise.all([
        api.get("/purchases").catch(() => ({ data: [] })),
        api.get("/customers").catch(() => ({ data: [] })),
      ]);
      setPurchases(Array.isArray(puRes.data) ? puRes.data : []);
      setCustomers(Array.isArray(cuRes.data) ? cuRes.data : []);
    } finally { setLoading(false); }
  };

  const customer = customers.find((c) => c.name === fullName || String(c.id) === String(userId));
  const myDebtPurchases = purchases.filter(
    (p) => p.customerName === fullName && (p.status === "Pending" || p.status === "Processing")
  );
  const totalPages = Math.ceil(myDebtPurchases.length / PAGE_SIZE);
  const paginatedPurchases = myDebtPurchases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const myPaidPurchases = purchases.filter(
    (p) => p.customerName === fullName && p.status === "Approved"
  );

  const totalOutstanding = myDebtPurchases.reduce((s, p) => s + (Number(p.unitPrice) || 0), 0);
  const totalPaid = myPaidPurchases.reduce((s, p) => s + (Number(p.unitPrice) || 0), 0);
  const customerDebt = customer ? Math.max(0, (Number(customer.amount) || 0) - (Number(customer.paid) || 0)) : 0;
  const outstandingTotal = totalOutstanding + customerDebt;

  const handlePay = async () => {
    if (!payAmount || Number(payAmount) <= 0) {
      setMsg("Enter a valid amount");
      setTimeout(() => setMsg(""), 3000);
      return;
    }
    if (Number(payAmount) > outstandingTotal) {
      setMsg("Amount exceeds outstanding balance");
      setTimeout(() => setMsg(""), 3000);
      return;
    }
    setSaving(true);
    try {
      if (customer) {
        const newPaid = (Number(customer.paid) || 0) + Number(payAmount);
        await api.put(`/customers/${customer.id}`, {
          ...customer,
          paid: newPaid,
        });
      }
      await api.post("/sales", {
        description: `Payment by ${fullName}`,
        grandTotal: Number(payAmount),
        quantity: 1,
        saleDate: new Date().toISOString(),
        status: "completed",
        paymentMethod: payMethod,
        paymentStatus: "PAID",
        customer: customer ? { id: customer.id } : null,
      }).catch(() => ({ data: null }));

      setPayAmount("");
      setMsg("Payment recorded successfully!");
      setTimeout(() => setMsg(""), 3000);
      await loadData();
    } catch {
      setMsg("Failed to record payment");
      setTimeout(() => setMsg(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (!unlocked) {
    return (
      <View style={s.lockWrap}>
        <View style={s.lockIconBox}>
          <Ionicons name="lock-closed-outline" size={26} color="#2563eb" />
        </View>
        <Text style={s.lockTitle}>Customer Payment Portal</Text>
        <Text style={s.lockSubtitle}>Enter the password to access your payment page</Text>
        <View style={s.lockForm}>
          <TextField
            value={passwordInput}
            onChangeText={setPasswordInput}
            placeholder="Enter password"
            secureTextEntry
            error={pwError || undefined}
            containerStyle={{ marginBottom: 0 }}
          />
          <Button title="Enter" variant="primary" onPress={handleUnlock}
            icon={<Ionicons name="log-in-outline" size={14} color={colors.white} />} />
        </View>
        <View style={s.watermark}>
          <Text style={s.watermarkText}>This coming soon</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <Spinner size={28} text={t("loading")} />
      </View>
    );
  }

  const summaryCards = [
    { label: "Outstanding Balance", value: `TZS ${outstandingTotal.toLocaleString()}`, color: outstandingTotal > 0 ? "#dc2626" : "#16a34a", bg: outstandingTotal > 0 ? "#fef2f2" : "#f0fdf4", icon: "alert-circle-outline" },
    { label: "Total Paid", value: `TZS ${totalPaid.toLocaleString()}`, color: "#16a34a", bg: "#f0fdf4", icon: "checkmark-circle-outline" },
    { label: "Pending Orders", value: myDebtPurchases.length, color: "#2563eb", bg: "#eff6ff", icon: "time-outline" },
  ];

  return (
    <View style={s.root}>
      <View style={s.headerRow}>
        <Ionicons name="wallet-outline" size={22} color="#2563eb" />
        <Text style={s.headerTitle}>My Payments</Text>
        {fullName ? (
          <View style={s.nameTag}>
            <Ionicons name="person-outline" size={12} color={colors.slate500} />
            <Text style={s.nameTagText}>{fullName}</Text>
          </View>
        ) : null}
      </View>

      {msg !== "" && (
        <View style={[s.msgBar, (msg.includes("Failed") || msg.includes("exceeds")) ? s.msgBarError : s.msgBarSuccess]}>
          <Ionicons name={(msg.includes("Failed") || msg.includes("exceeds")) ? "alert-circle" : "checkmark-circle"} size={13} color={(msg.includes("Failed") || msg.includes("exceeds")) ? "#991b1b" : "#166534"} />
          <Text style={[s.msgText, (msg.includes("Failed") || msg.includes("exceeds")) ? s.msgTextError : s.msgTextSuccess]}>{msg}</Text>
        </View>
      )}

      <View style={s.summaryRow}>
        {summaryCards.map((sc) => (
          <View key={sc.label} style={[s.summaryCard, { backgroundColor: sc.bg, borderTopColor: sc.color }]}>
            <View style={s.summaryLabel}>
              <Ionicons name={sc.icon} size={12} color={sc.color} />
              <Text style={[s.summaryLabelText, { color: sc.color }]}>{sc.label}</Text>
            </View>
            <Text style={[s.summaryValue, { color: sc.color }]}>{sc.value}</Text>
          </View>
        ))}
      </View>

      <View style={s.mainRow}>
        <View style={s.paymentCol}>
          <Card padded={false} style={s.paymentCard}>
            <View style={s.sectionHeader}>
              <Ionicons name="cash-outline" size={16} color="#2563eb" />
              <Text style={s.sectionTitle}>Make a Payment</Text>
            </View>
            <View style={s.paymentForm}>
              <TextField label="Your Name" value={fullName} editable={false} containerStyle={{ marginBottom: spacing.sm }} />
              <TextField label="Contact" value={payContact} onChangeText={setPayContact} placeholder="Phone number" containerStyle={{ marginBottom: spacing.sm }} />
              <TextField label="Amount (TZS)" value={payAmount} onChangeText={setPayAmount} keyboardType="numeric" placeholder={`Max: ${outstandingTotal.toLocaleString()}`} containerStyle={{ marginBottom: spacing.sm }} />

              <Text style={s.paymentLabel}>Payment Method</Text>
              <View style={s.paymentMethods}>
                {PAYMENT_METHODS.map((pm) => (
                  <Pressable key={pm.value} style={[s.paymentMethodBtn, payMethod === pm.value && { borderColor: pm.color, backgroundColor: pm.bg }]}
                    onPress={() => setPayMethod(pm.value)}>
                    <Text style={[s.paymentMethodText, payMethod === pm.value && { color: pm.color }]}>
                      {pm.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Button title={saving ? "Processing..." : "Make Payment"} variant="primary" onPress={handlePay}
                disabled={saving || !payAmount || outstandingTotal <= 0} loading={saving}
                icon={<Ionicons name="cash-outline" size={14} color={colors.white} />}
                style={{ marginTop: spacing.sm }} />
            </View>
          </Card>
        </View>

        <View style={s.outstandingCol}>
          <Card padded={false} style={s.outstandingCard}>
            <View style={s.sectionHeader}>
              <Ionicons name="time-outline" size={16} color="#f59e0b" />
              <Text style={s.sectionTitle}>Outstanding Orders ({myDebtPurchases.length})</Text>
            </View>
            <ScrollView style={s.outstandingBody} nestedScrollEnabled>
              {myDebtPurchases.length === 0 ? (
                <EmptyState icon="checkmark-circle-outline" message="No outstanding orders" />
              ) : (
                paginatedPurchases.map((p) => (
                  <View key={p.id} style={s.orderRow}>
                    <Text style={s.orderHash}>#{p.id}</Text>
                    <Text style={s.orderDate}>
                      {p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : "\u2014"}
                    </Text>
                    <Text style={s.orderName} numberOfLines={1}>{p.productName || `Order #${p.id}`}</Text>
                    <Text style={s.orderAmount}>TZS {(Number(p.unitPrice) || 0).toLocaleString()}</Text>
                    <View style={[s.orderStatusBadge, { backgroundColor: p.status === "Pending" ? "#dbeafe" : "#fef3c7" }]}>
                      <Text style={[s.orderStatusBadgeText, { color: p.status === "Pending" ? "#2563eb" : "#d97706" }]}>
                        {p.status === "Pending" ? "New" : "Processing"}
                      </Text>
                    </View>
                  </View>
                ))
              )}
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </ScrollView>
          </Card>
        </View>
      </View>

      <View style={s.watermarkBottom}>
        <Text style={s.watermarkBottomText}>This page coming soon</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50, padding: spacing.sm, gap: spacing.sm },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  lockWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.slate50, gap: 16 },
  lockIconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  lockTitle: { fontSize: 18, fontWeight: "700", color: colors.slate900 },
  lockSubtitle: { fontSize: 13, color: colors.slate500, textAlign: "center", maxWidth: 300 },
  lockForm: { width: 280, gap: 10 },
  watermark: { position: "absolute", alignItems: "center", justifyContent: "center", opacity: 0.08 },
  watermarkText: { fontSize: 48, color: colors.black, fontWeight: "900", letterSpacing: 4, textTransform: "uppercase", transform: [{ rotate: "-30deg" }] },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 0 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.slate900 },
  nameTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  nameTagText: { color: colors.slate500, fontSize: 12 },
  msgBar: { flexDirection: "row", alignItems: "center", gap: 6, padding: spacing.sm, borderRadius: radius.sm, flexShrink: 0 },
  msgBarSuccess: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  msgBarError: { backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: "#fecaca" },
  msgText: { fontSize: 12 },
  msgTextSuccess: { color: "#166534" },
  msgTextError: { color: colors.dangerDark },
  summaryRow: { flexDirection: "row", gap: spacing.sm, flexShrink: 0 },
  summaryCard: { flex: 1, borderRadius: radius.md, borderWidth: 1, borderTopWidth: 3, borderColor: colors.slate200, padding: spacing.md },
  summaryLabel: { flexDirection: "row", alignItems: "center", gap: 4 },
  summaryLabelText: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  summaryValue: { fontSize: 18, fontWeight: "700", marginTop: 2 },
  mainRow: { flex: 1, flexDirection: "row", gap: spacing.md, minHeight: 0 },
  paymentCol: { flex: 1, minWidth: 0 },
  paymentCard: { flex: 1 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.slate100, backgroundColor: colors.slate50 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.slate900 },
  paymentForm: { padding: 16, gap: 4 },
  paymentLabel: { fontSize: 10, fontWeight: "700", color: colors.slate500, textTransform: "uppercase", marginBottom: 6 },
  paymentMethods: { flexDirection: "row", gap: 6, marginBottom: spacing.sm },
  paymentMethodBtn: { flex: 1, alignItems: "center", justifyContent: "center", padding: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate200, backgroundColor: colors.white },
  paymentMethodText: { fontSize: 11, fontWeight: "600", color: colors.slate500 },
  outstandingCol: { flex: 1, minWidth: 0 },
  outstandingCard: { flex: 1 },
  outstandingBody: { flex: 1 },
  orderRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  orderHash: { fontWeight: "700", color: "#2563eb", fontSize: 13, minWidth: 40 },
  orderDate: { fontSize: 12, color: colors.slate500 },
  orderName: { flex: 1, fontSize: 12, color: colors.slate700 },
  orderAmount: { fontSize: 13, fontWeight: "700", color: colors.danger },
  orderStatusBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.pill },
  orderStatusBadgeText: { fontSize: 10, fontWeight: "700" },
  watermarkBottom: { position: "absolute", bottom: 12, right: 12, opacity: 0.5 },
  watermarkBottomText: { fontSize: 11, color: colors.slate300, fontWeight: "500", letterSpacing: 1, textTransform: "uppercase" },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  pageBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.slate300, borderRadius: radius.sm, backgroundColor: colors.white },
  pageBtnDisabled: { backgroundColor: colors.slate100 },
  pageBtnText: { fontSize: 13, fontWeight: "500", color: colors.slate600 },
  pageBtnTextDisabled: { color: colors.slate300 },
  pageNumBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.slate300, borderRadius: radius.sm, backgroundColor: colors.white },
  pageNumBtnActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  pageNumText: { fontSize: 13, fontWeight: "500", color: colors.slate600 },
  pageNumTextActive: { color: "#fff" },
});
