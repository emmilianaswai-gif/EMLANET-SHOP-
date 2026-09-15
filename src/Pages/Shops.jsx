import { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getShops, addShop, updateShop, removeShop, mergeServerShops } from "../utils/shopStore";
import api from "../api/axiosConfig";
import { t, useLanguage } from "../i18n";
import { redirect } from "../navigation/nav";
import { confirmDialog } from "../utils/confirm";
import { Button, Card, TextField } from "../components/ui";
import { colors, font, radius, spacing, shadow } from "../theme";

const emptyForm = { name: "", address: "", phone: "", location: "" };

export default function Shops() {
  useLanguage();
  const [shops, setShops] = useState(() => getShops());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [serverShops, setServerShops] = useState([]);
  const [serverLoading, setServerLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const isSuper = (localStorage.getItem("shop_role") || "").toLowerCase() === "super_admin";

  useEffect(() => {
    if (!isSuper) redirect("/");
  }, [isSuper]);

  const loadServerShops = async (silent) => {
    if (!silent) setServerLoading(true);
    try {
      const res = await api.get("/shops");
      const list = Array.isArray(res.data) ? res.data : [];
      setServerShops(list);
      setShops(mergeServerShops(list));
    } catch {
      setServerShops([]);
    } finally {
      setServerLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    api
      .get("/shops")
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setServerShops(list);
        setShops(mergeServerShops(list));
      })
      .catch(() => {
        if (!cancelled) setServerShops([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isSuper) return null;

  const refresh = () => setShops(getShops());

  const isServerShop = (id) => serverShops.some((s) => String(s.id) === String(id));

  const startAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
    setNotice("");
  };

  const startEdit = (shop) => {
    setEditing(shop);
    setForm({ name: shop.name, address: shop.address, phone: shop.phone, location: shop.location });
    setShowForm(true);
    setError("");
    setNotice("");
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError(t("shopNameRequired"));

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
    };

    setError("");
    setNotice("");
    setBusy(true);
    let synced = false;

    try {
      if (editing) {
        const serverManaged = isServerShop(editing.id);
        updateShop(editing.id, payload);
        if (serverManaged) {
          await api.put(`/shops/${editing.id}`, payload);
          synced = true;
        } else {
          // Promote the device-only shop to a real server tenant.
          const res = await api.post("/shops", payload);
          if (res.data?.id) {
            removeShop(editing.id);
            mergeServerShops([res.data]);
          }
          synced = true;
        }
      } else {
        const local = addShop(payload);
        const res = await api.post("/shops", payload);
        if (res.data?.id) {
          removeShop(local.id);
          mergeServerShops([res.data]);
        }
        synced = true;
      }
    } catch {
      synced = false;
    } finally {
      await loadServerShops(true);
      refresh();
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      setBusy(false);
      setNotice(synced ? t("savedOnServerAndDevice") : t("savedOnDeviceOnly"));
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirmDialog(t("removeShopConfirm")))) return;
    setNotice("");
    setBusy(true);
    const serverManaged = isServerShop(id);
    try {
      if (serverManaged) await api.delete(`/shops/${id}`);
    } catch {
      // offline - local removal below still applies
    } finally {
      removeShop(id);
      await loadServerShops(true);
      refresh();
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <View style={styles.headerTitleBlock}>
          <View style={styles.headerIcon}>
            <Ionicons name="storefront-outline" size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.pageTitle}>{t("shops")}</Text>
            <Text style={styles.pageSubtitle}>{t("shopsSubtitle")}</Text>
          </View>
        </View>
        <Pressable style={[styles.addBtn, { opacity: busy ? 0.6 : 1 }]} disabled={busy} onPress={startAdd}>
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={styles.addBtnText}>{t("addShop")}</Text>
        </Pressable>
      </View>

      {!!error && (
        <View style={[styles.noticeBar, { backgroundColor: colors.dangerLight, borderColor: "#fecaca" }]}>
          <Text style={{ color: "#991b1b", fontSize: font.sm }}>{error}</Text>
        </View>
      )}
      {!!notice && (
        <View style={[styles.noticeBar, { backgroundColor: colors.successLight, borderColor: "#bbf7d0" }]}>
          <Text style={{ color: colors.success, fontSize: font.sm }}>{notice}</Text>
        </View>
      )}

      <Card style={styles.serverCard}>
        <View style={styles.serverHead}>
          <View style={styles.serverTitleRow}>
            <Ionicons name="server-outline" size={16} color="#7c3aed" />
            <Text style={styles.serverTitle}>{t("serverTenants")} ({serverShops.length})</Text>
          </View>
          <Pressable
            style={styles.refreshBtn}
            disabled={serverLoading || busy}
            onPress={() => loadServerShops(false)}
          >
            <Ionicons name="refresh" size={12} color="#6d28d9" />
            <Text style={styles.refreshBtnText}>{t("refresh")}</Text>
          </Pressable>
        </View>
        <Text style={styles.serverDesc}>
          {serverShops.length === 0 ? t("noTenantsYet") : t("eachTenantIsolated")}
        </Text>
      </Card>

      {showForm && (
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>{editing ? t("editShop") : t("addNewShop")}</Text>
          <View style={styles.formBody}>
            <TextField
              label={`${t("shopName")} *`}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder={t("shopNamePlaceholder")}
            />
            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <TextField
                  label={t("shopAddressArea")}
                  value={form.address}
                  onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
                  placeholder={t("shopAddressPlaceholder")}
                />
              </View>
              <View style={styles.formCol}>
                <TextField
                  label={t("phone")}
                  value={form.phone}
                  onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
                  placeholder={t("phonePlaceholder")}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <TextField
              label={t("locationNote")}
              value={form.location}
              onChangeText={(v) => setForm((f) => ({ ...f, location: v }))}
              placeholder={t("locationPlaceholder")}
            />
          </View>
          <View style={styles.formFooter}>
            <Button title={t("cancel")} variant="outline" onPress={() => { setShowForm(false); setEditing(null); }} />
            <Button
              title={busy ? t("saving") : editing ? t("saveChanges") : t("addShop")}
              onPress={handleSubmit}
              disabled={busy}
            />
          </View>
        </Card>
      )}

      {shops.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="storefront-outline" size={36} color={colors.slate300} />
          <Text style={styles.emptyTitle}>{t("noShopsYet")}</Text>
          <Text style={styles.emptySub}>{t("addFirstShopMessage")}</Text>
        </View>
      ) : (
        <View style={styles.shopGrid}>
          {shops.map((shop) => {
            const onServer = isServerShop(shop.id);
            return (
              <Card key={shop.id} style={styles.shopCard}>
                <View style={styles.shopCardHead}>
                  <View style={styles.shopIdentity}>
                    <View style={styles.shopAvatar}>
                      <Ionicons name="storefront-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={styles.shopName}>{shop.name}</Text>
                      <Text style={styles.shopLocation}>{shop.location || "—"}</Text>
                    </View>
                  </View>
                  <View style={styles.shopActions}>
                    <Pressable style={styles.shopIconBtn} onPress={() => startEdit(shop)} hitSlop={4}>
                      <Ionicons name="create-outline" size={14} color="#475569" />
                    </Pressable>
                    <Pressable style={[styles.shopIconBtn, { borderColor: "#fee2e2" }]} onPress={() => handleDelete(shop.id)} hitSlop={4}>
                      <Ionicons name="trash-outline" size={14} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.shopMeta}>
                  {!!shop.address && (
                    <Text style={styles.shopMetaLine}><Ionicons name="location-outline" size={12} color={colors.slate400} /> {shop.address}</Text>
                  )}
                  {!!shop.phone && (
                    <Text style={styles.shopMetaLine}><Ionicons name="call-outline" size={12} color={colors.slate400} /> {shop.phone}</Text>
                  )}
                </View>
                <View style={styles.shopStatus}>
                  {onServer ? (
                    <Text style={[styles.shopStatusText, { color: "#7c3aed" }]}><Ionicons name="checkmark-circle-outline" size={12} color="#7c3aed" /> {t("onServerStatus")}</Text>
                  ) : (
                    <Text style={[styles.shopStatusText, { color: colors.slate500 }]}><Ionicons name="hardware-chip-outline" size={12} color={colors.slate500} /> {t("thisDeviceOnly")}</Text>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 },
  headerTitleBlock: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 22, fontWeight: "700", color: colors.slate900 },
  pageSubtitle: { fontSize: font.sm, color: colors.slate500 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: radius.md },
  addBtnText: { color: "#fff", fontSize: font.sm, fontWeight: "600" },

  noticeBar: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm, marginBottom: 12, borderWidth: 1 },

  serverCard: { marginBottom: 20, padding: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg },
  serverHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  serverTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  serverTitle: { fontWeight: "700", fontSize: 14, color: colors.slate900 },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: "#f5f3ff", borderWidth: 1, borderColor: "#ddd6fe", borderRadius: radius.md },
  refreshBtnText: { color: "#6d28d9", fontSize: font.sm, fontWeight: "600" },
  serverDesc: { fontSize: font.sm, color: colors.slate400 },

  formCard: { padding: 18, marginBottom: 20, maxWidth: 640, width: "100%", backgroundColor: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg },
  formTitle: { fontSize: 15, fontWeight: "700", color: colors.slate900, marginBottom: 14 },
  formBody: { flexDirection: "column", gap: 4 },
  formRow: { flexDirection: "row", gap: 12 },
  formCol: { flex: 1 },
  formFooter: { flexDirection: "row", gap: 8, marginTop: 14, justifyContent: "flex-end" },

  emptyWrap: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.slate300, borderStyle: "dashed", borderRadius: radius.lg },
  emptyTitle: { fontSize: 14, fontWeight: "600", color: colors.slate500, marginTop: 8 },
  emptySub: { fontSize: font.sm, color: colors.slate400, marginTop: 4 },

  shopGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  shopCard: { flexBasis: 260, flexGrow: 1, padding: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, ...shadow.card },
  shopCardHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  shopIdentity: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  shopAvatar: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  shopName: { fontSize: 14, fontWeight: "700", color: colors.slate900 },
  shopLocation: { fontSize: font.xs, color: colors.slate500 },
  shopActions: { flexDirection: "row", gap: 4 },
  shopIconBtn: { width: 30, height: 30, borderRadius: radius.md, borderWidth: 1, borderColor: colors.slate200, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  shopMeta: { marginTop: 10, flexDirection: "column", gap: 4, fontSize: font.sm, color: colors.slate600 },
  shopMetaLine: { flexDirection: "row", alignItems: "center", gap: 6, fontSize: font.sm, color: colors.slate600 },
  shopStatus: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6, fontSize: font.xs, fontWeight: "600" },
  shopStatusText: { flexDirection: "row", alignItems: "center", gap: 4, fontSize: font.xs, fontWeight: "600" },
});