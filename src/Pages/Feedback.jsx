import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import { TextField, Button, Card } from "../components/ui";
import { colors, font, radius, spacing, shadow } from "../theme";

const SERVICE_CATEGORIES = [
  { value: "product_quality", label: "Product Quality" },
  { value: "customer_service", label: "Customer Service" },
  { value: "pricing", label: "Pricing & Value" },
  { value: "store_cleanliness", label: "Store Cleanliness" },
  { value: "delivery", label: "Delivery Speed" },
  { value: "website", label: "Website / App" },
  { value: "overall", label: "Overall Experience" },
];

const SENTIMENT_OPTIONS = [
  { value: "positive", label: "Positive", icon: "thumbs-up", color: "#16a34a", bg: "#f0fdf4" },
  { value: "neutral", label: "Neutral", icon: "remove", color: "#ca8a04", bg: "#fefce8" },
  { value: "negative", label: "Negative", icon: "thumbs-down", color: "#dc2626", bg: "#fef2f2" },
];

export default function Feedback() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!rating || !category) {
      setError("Please select a rating and service category");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post("/feedback", {
        rating,
        category,
        sentiment,
        customerName: customerName.trim() || "Anonymous",
        customerPhone: customerPhone.trim(),
        message: message.trim(),
      });
      setSubmitted(true);
    } catch {
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setRating(0);
    setCategory("");
    setSentiment("");
    setCustomerName("");
    setCustomerPhone("");
    setMessage("");
    setSubmitted(false);
    setError("");
  };

  if (submitted) {
    return (
      <SafeAreaView edges={["bottom"]} style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <View style={{ maxWidth: 420, width: "100%", padding: spacing.xl, alignItems: "center" }}>
          <View style={[styles.submittedIcon, { backgroundColor: "#f0fdf4" }]}>
            <Ionicons name="checkmark-circle" size={36} color={colors.success} />
          </View>
          <Text style={styles.submittedTitle}>Thank You!</Text>
          <Text style={styles.submittedText}>
            Your feedback has been submitted successfully. We value your opinion and will use it to improve our services.
          </Text>
          <Text style={[styles.submittedText, { color: colors.slate400, marginBottom: spacing.xl }]}>
            Rating: {rating}/5 {"\u2014"} {SERVICE_CATEGORIES.find((c) => c.value === category)?.label}
          </Text>
          <Button title="Submit Another Feedback" variant="primary" onPress={handleReset} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={{ maxWidth: 640, alignSelf: "center", width: "100%" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary} />
            <Text style={styles.h1}>Customer Feedback</Text>
          </View>
          <Text style={styles.subtitle}>Help us improve by sharing your experience with our services</Text>

          {error && (
            <View style={[styles.alert, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
              <Text style={{ fontSize: font.base, color: "#991b1b" }}>{error}</Text>
            </View>
          )}

          {/* Rating */}
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>How would you rate our service?</Text>
            <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hoverRating || rating) >= star;
                return (
                  <Pressable
                    key={star}
                    onPressIn={() => setHoverRating(star)}
                    onPressOut={() => setHoverRating(0)}
                    onPress={() => setRating(star)}
                    hitSlop={4}
                  >
                    <Ionicons
                      name="star"
                      size={36}
                      color={active ? "#f59e0b" : colors.slate300}
                      style={active ? { color: "#f59e0b" } : undefined}
                    />
                  </Pressable>
                );
              })}
              {rating > 0 && (
                <Text style={{ marginLeft: spacing.sm, fontSize: font.base, fontWeight: "600", color: colors.slate900 }}>
                  {rating}/5 {"\u2014"} {rating <= 2 ? "Poor" : rating === 3 ? "Average" : rating === 4 ? "Good" : "Excellent"}
                </Text>
              )}
            </View>
          </Card>

          {/* Service Category */}
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>What service are you rating?</Text>
            <View style={styles.categoryGrid}>
              {SERVICE_CATEGORIES.map((cat) => {
                const active = category === cat.value;
                return (
                  <Pressable
                    key={cat.value}
                    onPress={() => setCategory(cat.value)}
                    style={[
                      styles.categoryBtn,
                      {
                        borderColor: active ? colors.primary : colors.slate200,
                        backgroundColor: active ? "#eff6ff" : colors.white,
                      },
                    ]}
                  >
                    <Text style={{ fontWeight: "600", fontSize: font.sm, color: active ? colors.primary : colors.slate500, textAlign: "left" }}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Sentiment */}
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Overall feeling (optional)</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {SENTIMENT_OPTIONS.map((opt) => {
                const active = sentiment === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setSentiment(opt.value)}
                    style={[
                      styles.sentimentBtn,
                      {
                        borderColor: active ? opt.color : colors.slate200,
                        backgroundColor: active ? opt.bg : colors.white,
                      },
                    ]}
                  >
                    <Ionicons name={opt.icon} size={18} color={active ? opt.color : colors.slate500} />
                    <Text style={{ fontWeight: "600", fontSize: font.sm, color: active ? opt.color : colors.slate500 }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Contact + Message */}
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Your details (optional)</Text>
            <View style={{ flexDirection: "row", gap: 14, marginBottom: 14 }}>
              <TextField
                label="Your Name"
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="e.g. John Doe"
                containerStyle={styles.colLeft}
              />
              <TextField
                label="Phone Number"
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholder="+255 7XX XXX XXX"
                keyboardType="phone-pad"
                containerStyle={styles.colRight}
              />
            </View>
            <TextField
              label="Your Feedback"
              value={message}
              onChangeText={setMessage}
              multiline
              placeholder="Tell us about your experience..."
            />
          </Card>

          <View style={{ alignItems: "flex-end" }}>
            <Button
              title={submitting ? "Submitting..." : "Submit Feedback"}
              variant="primary"
              size="lg"
              loading={submitting}
              disabled={submitting || !rating || !category}
              onPress={handleSubmit}
              icon={<Ionicons name="send" size={16} color="#fff" />}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  scroll: { padding: spacing.xl },
  h1: { fontSize: 22, fontWeight: "700", color: colors.slate900 },
  subtitle: { color: colors.slate500, fontSize: font.base, marginBottom: spacing.xl },
  alert: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  card: { padding: spacing.xl, marginBottom: spacing.lg, ...shadow.card },
  cardTitle: { fontSize: font.base, fontWeight: "700", color: colors.slate900, marginBottom: spacing.lg },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  categoryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 2,
  },
  sentimentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 2,
  },
  colLeft: { flex: 1 },
  colRight: { flex: 1 },
  submittedIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  submittedTitle: { fontSize: 22, fontWeight: "700", color: colors.slate900, marginBottom: spacing.sm },
  submittedText: { fontSize: font.base, color: colors.slate500, marginBottom: spacing.sm, textAlign: "center", lineHeight: 22 },
});