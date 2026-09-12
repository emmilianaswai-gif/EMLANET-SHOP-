import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TextField, Button, Card } from "../components/ui";
import { colors, font, radius, spacing, shadow } from "../theme";

const STORAGE_KEY = "shop_support_contacts";

const defaultContacts = [
  {
    id: 1,
    name: "",
    role: "Owner / Manager",
    phone: "",
    email: "",
    whatsapp: "",
    availableHours: "Mon-Sat 8:00 AM - 6:00 PM",
    location: "",
    languages: "Swahili, English",
  },
  {
    id: 2,
    name: "",
    role: "Technical Support",
    phone: "",
    email: "",
    whatsapp: "",
    availableHours: "Mon-Fri 9:00 AM - 5:00 PM",
    location: "",
    languages: "Swahili, English",
  },
];

function loadContacts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return defaultContacts;
}

function saveContacts(contacts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

export default function Support() {
  const [role, setRole] = useState(() => localStorage.getItem("shop_role") || "");
  const [contacts, setContacts] = useState(loadContacts);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canEdit = role === "admin" || role === "manager";

  useEffect(() => {
    setContacts(loadContacts());
  }, []);

  const startEdit = () => {
    setEditData(contacts.map((c) => ({ ...c })));
    setEditing(true);
    setSaved(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditData([]);
  };

  const updateField = (index, field, value) => {
    setEditData((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addContact = () => {
    setEditData((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: "",
        role: "Support Agent",
        phone: "",
        email: "",
        whatsapp: "",
        availableHours: "Mon-Fri 9:00 AM - 5:00 PM",
        location: "",
        languages: "Swahili, English",
      },
    ]);
  };

  const removeContact = (index) => {
    setEditData((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      saveContacts(editData.filter((c) => c.name.trim() || c.phone.trim()));
      setContacts(loadContacts());
      setEditing(false);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 500);
  };

  const visibleContacts = contacts.filter((c) => c.name.trim() || c.phone.trim());

  return (
    <SafeAreaView edges={["bottom"]} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={{ maxWidth: 900, alignSelf: "center", width: "100%" }}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <Ionicons name="headset-outline" size={24} color="#0d9488" />
                <Text style={styles.h1}>Contact Support</Text>
              </View>
              <Text style={styles.headerSub}>
                {canEdit ? "Manage support contacts that customers see when they need help" : "People who can help you with system issues"}
              </Text>
            </View>
            {canEdit && !editing && (
              <Button
                title="Edit Contacts"
                variant="secondary"
                size="md"
                onPress={startEdit}
                icon={<Ionicons name="create-outline" size={15} color="#fff" />}
              />
            )}
          </View>

          {saved && (
            <View style={[styles.alert, styles.savedAlert]}>
              <Ionicons name="refresh" size={14} color="#166534" />
              <Text style={{ fontSize: font.sm, color: "#166534" }}> Contact information saved successfully!</Text>
            </View>
          )}

          {/* Edit Mode */}
          {editing && (
            <Card style={styles.card} padded={false}>
              <View style={styles.editCardInner}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 20 }}>
                  <Ionicons name="create-outline" size={16} color="#0d9488" />
                  <Text style={styles.cardBigTitle}>Edit Support Contacts</Text>
                </View>

                {editData.map((contact, idx) => (
                  <View
                    key={contact.id}
                    style={[
                      styles.editContactBox,
                      idx < editData.length - 1 && { marginBottom: spacing.lg },
                    ]}
                  >
                    <View style={styles.editContactHeader}>
                      <Text style={styles.editContactLabel}>Contact {idx + 1}</Text>
                      {editData.length > 1 && (
                        <Pressable
                          onPress={() => removeContact(idx)}
                          style={styles.removeBtn}
                          hitSlop={6}
                        >
                          <Text style={{ color: "#dc2626", fontSize: font.xs, fontWeight: "600" }}>Remove</Text>
                        </Pressable>
                      )}
                    </View>

                    <View style={{ flexDirection: "row", gap: 14 }}>
                      <TextField
                        label="Full Name *"
                        value={contact.name}
                        onChangeText={(value) => updateField(idx, "name", value)}
                        placeholder="e.g. John Mwangi"
                        containerStyle={styles.colLeft}
                      />
                      <TextField
                        label="Role / Title"
                        value={contact.role}
                        onChangeText={(value) => updateField(idx, "role", value)}
                        placeholder="e.g. Owner / Manager"
                        containerStyle={styles.colRight}
                      />
                    </View>
                    <View style={{ flexDirection: "row", gap: 14 }}>
                      <TextField
                        label="Phone Number *"
                        value={contact.phone}
                        onChangeText={(value) => updateField(idx, "phone", value)}
                        placeholder="+255 7XX XXX XXX"
                        keyboardType="phone-pad"
                        containerStyle={styles.colLeft}
                      />
                      <TextField
                        label="Email"
                        value={contact.email}
                        onChangeText={(value) => updateField(idx, "email", value)}
                        placeholder="support@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        containerStyle={styles.colRight}
                      />
                    </View>
                    <View style={{ flexDirection: "row", gap: 14 }}>
                      <TextField
                        label="WhatsApp"
                        value={contact.whatsapp}
                        onChangeText={(value) => updateField(idx, "whatsapp", value)}
                        placeholder="+255 7XX XXX XXX"
                        keyboardType="phone-pad"
                        containerStyle={styles.colLeft}
                      />
                      <TextField
                        label="Available Hours"
                        value={contact.availableHours}
                        onChangeText={(value) => updateField(idx, "availableHours", value)}
                        placeholder="Mon-Sat 8:00 AM - 6:00 PM"
                        containerStyle={styles.colRight}
                      />
                    </View>
                    <View style={{ flexDirection: "row", gap: 14 }}>
                      <TextField
                        label="Location"
                        value={contact.location}
                        onChangeText={(value) => updateField(idx, "location", value)}
                        placeholder="e.g. Dar es Salaam, Tanzania"
                        containerStyle={styles.colLeft}
                      />
                      <TextField
                        label="Languages"
                        value={contact.languages}
                        onChangeText={(value) => updateField(idx, "languages", value)}
                        placeholder="Swahili, English"
                        containerStyle={styles.colRight}
                      />
                    </View>
                  </View>
                ))}

                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20 }}>
                  <Pressable onPress={addContact} style={styles.addBtn} hitSlop={6}>
                    <Text style={{ color: "#16a34a", fontWeight: "600", fontSize: font.sm }}>+ Add Another Contact</Text>
                  </Pressable>
                  <View style={{ flex: 1 }} />
                  <Button title="Cancel" variant="outline" size="md" onPress={cancelEdit} />
                  <Button
                    title={saving ? "Saving..." : "Save Contacts"}
                    variant="secondary"
                    size="md"
                    loading={saving}
                    onPress={handleSave}
                    icon={<Ionicons name="save-outline" size={15} color="#fff" />}
                  />
                </View>
              </View>
            </Card>
          )}

          {/* Display Contacts */}
          {visibleContacts.length === 0 && !editing ? (
            <Card style={styles.emptyBox}>
              <Ionicons name="headset-outline" size={48} color={colors.slate300} style={{ marginBottom: spacing.lg }} />
              <Text style={styles.emptyTitle}>No Support Contacts Yet</Text>
              <Text style={styles.emptyText}>
                {canEdit
                  ? "Add contact information so customers know who to reach out to for help."
                  : "Support contacts have not been set up yet. Please contact your administrator."}
              </Text>
              {canEdit && (
                <Button
                  title="Add Support Contacts"
                  variant="secondary"
                  size="md"
                  onPress={startEdit}
                  icon={<Ionicons name="create-outline" size={15} color="#fff" />}
                />
              )}
            </Card>
          ) : (
            <View style={{ gap: spacing.lg }}>
              {visibleContacts.map((contact) => (
                <Card key={contact.id} style={styles.contactCard}>
                  <View style={{ flexDirection: "row", gap: spacing.lg, alignItems: "flex-start" }}>
                    <View style={styles.contactAvatar}>
                      <Ionicons name="headset-outline" size={24} color="#0d9488" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactRole}>{contact.role}</Text>
                      <View style={styles.contactDetails}>
                        {contact.phone && (
                          <View style={styles.contactDetailItem}>
                            <Ionicons name="call-outline" size={14} color={colors.slate500} />
                            <Pressable onPress={() => Linking.openURL(`tel:${contact.phone.replace(/\s/g, "")}`)} hitSlop={6}>
                              <Text style={{ color: colors.primary, fontWeight: "500", fontSize: font.sm }}>{contact.phone}</Text>
                            </Pressable>
                          </View>
                        )}
                        {contact.email && (
                          <View style={styles.contactDetailItem}>
                            <Ionicons name="mail-outline" size={14} color={colors.slate500} />
                            <Pressable onPress={() => Linking.openURL(`mailto:${contact.email}`)} hitSlop={6}>
                              <Text style={{ color: colors.primary, fontWeight: "500", fontSize: font.sm }}>{contact.email}</Text>
                            </Pressable>
                          </View>
                        )}
                        {contact.whatsapp && (
                          <View style={styles.contactDetailItem}>
                            <Ionicons name="chatbubble-outline" size={14} color="#25a162" />
                            <Pressable onPress={() => Linking.openURL(`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`)} hitSlop={6}>
                              <Text style={{ color: "#25a162", fontWeight: "500", fontSize: font.sm }}>{contact.whatsapp}</Text>
                            </Pressable>
                          </View>
                        )}
                        {contact.availableHours && (
                          <View style={styles.contactDetailItem}>
                            <Ionicons name="time-outline" size={14} color={colors.slate500} />
                            <Text style={styles.contactDetailText}>{contact.availableHours}</Text>
                          </View>
                        )}
                        {contact.location && (
                          <View style={styles.contactDetailItem}>
                            <Ionicons name="map-pin-outline" size={14} color={colors.slate500} />
                            <Text style={styles.contactDetailText}>{contact.location}</Text>
                          </View>
                        )}
                        {contact.languages && (
                          <View style={styles.contactDetailItem}>
                            <Ionicons name="globe-outline" size={14} color={colors.slate500} />
                            <Text style={styles.contactDetailText}>{contact.languages}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}

          {/* Quick Help Tips */}
          <Card style={styles.card} padded={false}>
            <View style={styles.tipsInner}>
              <Text style={styles.tipsTitle}>Quick Help Tips</Text>
              <View style={{ gap: 10 }}>
                {[
                  { icon: "1", text: "For urgent issues, call the support number directly during business hours." },
                  { icon: "2", text: "Send a WhatsApp message for quick responses — attach screenshots if possible." },
                  { icon: "3", text: "Use the Help Center guides to try resolving common issues on your own first." },
                  { icon: "4", text: "Report bugs from the Help Center page — they are sent directly to the support team." },
                ].map((tip, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, fontSize: font.sm, lineHeight: 19 }}>
                    <View style={styles.tipBadge}>
                      <Text style={{ fontSize: font.xs, fontWeight: "700", color: "#0d9488" }}>{tip.icon}</Text>
                    </View>
                    <Text style={styles.tipText}>{tip.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  scroll: { padding: spacing.xl },
  h1: { fontSize: 22, fontWeight: "700", color: colors.slate900 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  headerSub: { color: colors.slate500, fontSize: font.base },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  savedAlert: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  card: { padding: spacing.xl, ...shadow.card },
  cardBigTitle: { fontSize: font.lg, fontWeight: "700", color: colors.slate900 },
  editCardInner: { padding: spacing.xl },
  editContactBox: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate100,
    backgroundColor: "#fafbfc",
  },
  editContactHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  editContactLabel: {
    fontSize: font.sm,
    fontWeight: "700",
    color: colors.slate500,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: radius.sm,
  },
  colLeft: { flex: 1 },
  colRight: { flex: 1 },
  addBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: radius.md,
  },
  emptyBox: { alignItems: "center", padding: 48, paddingHorizontal: spacing["2xl"] },
  emptyTitle: { fontSize: font.lg, fontWeight: "700", color: colors.slate900, marginBottom: spacing.sm },
  emptyText: { fontSize: font.base, color: colors.slate500, marginBottom: 20, textAlign: "center" },
  contactCard: { padding: spacing.xl, ...shadow.card },
  contactAvatar: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: "#f0fdfa",
    borderWidth: 1.5,
    borderColor: "#99f6e4",
    alignItems: "center",
    justifyContent: "center",
  },
  contactName: { fontSize: font.lg, fontWeight: "700", color: colors.slate900, marginBottom: 2 },
  contactRole: { fontSize: font.sm, color: "#0d9488", fontWeight: "600", marginBottom: 14 },
  contactDetails: { flexDirection: "row", flexWrap: "wrap", gap: 10, rowGap: 10 },
  contactDetailItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm, width: "47%" },
  contactDetailText: { fontSize: font.sm, color: colors.slate600, flexShrink: 1 },
  tipsInner: { padding: spacing.xl },
  tipsTitle: { fontSize: font.base, fontWeight: "700", color: colors.slate900, marginBottom: spacing.lg },
  tipBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f0fdfa",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    borderWidth: 1,
    borderColor: "#99f6e4",
  },
  tipText: { flex: 1, fontSize: font.sm, color: colors.slate600, lineHeight: 19 },
});