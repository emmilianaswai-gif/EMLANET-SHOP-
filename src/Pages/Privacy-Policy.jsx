import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TextField, Button, Card } from "../components/ui";
import { colors, font, radius, spacing, shadow } from "../theme";

export default function PrivacyPolicy() {
  const lastUpdated = "June 2026";
  const userId = localStorage.getItem("shop_user_id") || "guest";
  const storageKey = `private_diary_${userId}`;

  const [entries, setEntries] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [diaryMsg, setDiaryMsg] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setEntries(JSON.parse(saved));
    } catch {}
  }, []);

  const saveNote = () => {
    if (!noteText.trim()) { setDiaryMsg("Write something first"); setTimeout(() => setDiaryMsg(""), 1500); return; }
    const newEntry = {
      id: Date.now(),
      text: noteText.trim(),
      date: new Date().toLocaleString(),
    };
    const updated = [newEntry, ...entries];
    setEntries(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setNoteText("");
    setDiaryMsg("Note saved!");
    setTimeout(() => setDiaryMsg(""), 1500);
  };

  const deleteNote = (id) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const isDiaryError = diaryMsg.includes("Write");

  return (
    <SafeAreaView edges={["bottom"]} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.h1}>Privacy Policy</Text>
          <Text style={styles.headerSub}>
            Shop Management Infrastructure Protocol {"\u2022"} Last Updated: {lastUpdated}
          </Text>
        </View>

        <Text style={styles.intro}>
          This Privacy Policy explains how our internal Shop Management System collects, utilizes, safeguards, and manages data related to daily retail workflows, employees, and customers.
        </Text>

        <View style={{ gap: spacing.xl }}>
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>1. Data Collection Categories</Text>
            <Text style={styles.text}>The system actively handles data necessary to execute business operations, specifically:</Text>
            <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
              <Text style={styles.bullet}>
                {"\u2022"} <Text style={{ fontWeight: "700" }}>Staff Information:</Text> Administrative usernames, session authentication keys, and access privileges.
              </Text>
              <Text style={styles.bullet}>
                {"\u2022"} <Text style={{ fontWeight: "700" }}>Transaction Records:</Text> Sold product names, total quantities, billing choices (Cash, Card, M-Pesa), and times.
              </Text>
              <Text style={styles.bullet}>
                {"\u2022"} <Text style={{ fontWeight: "700" }}>Customer Data:</Text> Optional contact records (Names and phone numbers) explicitly tied to credit files or digital invoice dispatches.
              </Text>
            </View>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>2. How Collected Data is Utilized</Text>
            <Text style={styles.text}>Data tracked within this panel is processed exclusively for core storefront actions:</Text>
            <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
              <Text style={styles.bullet}>
                {"\u2022"} Rendering operational performance indicators and activity graphs inside the Reports page.
              </Text>
              <Text style={styles.bullet}>
                {"\u2022"} Deducting appropriate numbers from the Products database inventory counts upon checkout.
              </Text>
              <Text style={styles.bullet}>
                {"\u2022"} Ensuring accurate historical lookup for returns, financial reporting, and credit tracking.
              </Text>
            </View>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>3. Local Storage vs. Server Syncing</Text>
            <Text style={styles.text}>
              This application uses internal browser mechanisms (like <Text style={{ fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}>localStorage</Text>) to keep user sessions cached securely. While operational variables like usernames live in your immediate web browser, financial ledgers and item records are synced directly with your secure backend server database to prevent terminal data loss if a browser cache is cleared.
            </Text>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>4. Information Disclosure &amp; Sharing</Text>
            <Text style={styles.text}>
              We enforce a strict data security rule: shop analytics, private product costs, staff listings, and customer details are entirely proprietary. No information processed through this system is shared, transferred, sold, or distributed to third-party tracking conglomerates or advertising services under any condition.
            </Text>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>5. Employee Access Rights</Text>
            <Text style={styles.text}>
              Store staff members have the right to inspect their system operational logs. Store administrators retain total authorization rights to alter inventory sheets, scrub transactional error rows, or adjust employee access parameters from the administrative panel controls.
            </Text>
          </Card>
        </View>

        {/* Private Diary Section */}
        <Card style={[styles.card, { marginTop: spacing["2xl"], borderColor: "#dbeafe" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Ionicons name="book" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Private Notebook</Text>
          </View>
          <Text style={[styles.text, { marginBottom: spacing.md, fontSize: font.sm }]}>
            Your personal diary {"\u2014"} notes are stored locally in your browser and visible only to you.
          </Text>

          {diaryMsg && (
            <View
              style={[
                styles.diaryMsg,
                {
                  backgroundColor: isDiaryError ? "#fef2f2" : "#f0fdf4",
                  borderColor: isDiaryError ? "#fecaca" : "#bbf7d0",
                },
              ]}
            >
              <Text style={{ fontSize: font.xs, color: isDiaryError ? "#991b1b" : "#166534" }}>{diaryMsg}</Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg, alignItems: "flex-end" }}>
            <TextField
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Write your private note here..."
              multiline
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
            <Button
              title="Save"
              variant="primary"
              size="md"
              onPress={saveNote}
              icon={<Ionicons name="save-outline" size={14} color="#fff" />}
            />
          </View>

          {entries.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={{ color: colors.slate400, fontSize: font.sm, textAlign: "center" }}>
                No notes yet. Write your first note above.
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {entries.map((e) => (
                <View key={e.id} style={styles.noteItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.noteText}>{e.text}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                      <Ionicons name="time-outline" size={10} color={colors.slate400} />
                      <Text style={{ fontSize: font.xs, color: colors.slate400 }}>{e.date}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => deleteNote(e.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={14} color={colors.danger} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Text style={styles.footer}>
          For administrative questions regarding local system database compliance, speak directly to your network operations officer.
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
  intro: { fontSize: font.base, color: colors.slate600, marginBottom: spacing.xl, lineHeight: 22 },
  card: { padding: spacing.xl, borderWidth: 1, borderColor: colors.slate200, ...shadow.card },
  cardTitle: { fontSize: font.lg, fontWeight: "600", color: colors.slate700, marginBottom: 10 },
  text: { fontSize: font.base, color: colors.slate600, lineHeight: 22 },
  bullet: { fontSize: font.base, color: colors.slate600, lineHeight: 22 },
  diaryMsg: {
    paddingVertical: spacing.xs,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    alignItems: "flex-start",
    borderWidth: 1,
    marginBottom: 10,
  },
  emptyBox: {
    padding: spacing.lg,
    alignItems: "center",
    backgroundColor: colors.slate50,
    borderRadius: radius.md,
  },
  noteItem: {
    padding: spacing.md,
    backgroundColor: colors.slate50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    flexDirection: "row",
    gap: spacing.sm,
  },
  noteText: { fontSize: font.sm, color: colors.slate800, lineHeight: 19 },
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

