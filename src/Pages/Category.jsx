import { useEffect, useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { useUndo } from "../UndoContext";
import { t, useLanguage } from "../i18n";
import { TextField, Button, Modal } from "../components/ui";
import { confirmDialog } from "../utils/confirm";
import { useNav } from "../navigation/nav";
import { colors, font, radius, spacing, shadow } from "../theme";

export default function Category() {
  useLanguage();
  const nav = useNav();
  const { notifyUndo } = useUndo() || {};
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortF, setSortF] = useState("name");
  const [sortD, setSortD] = useState("asc");
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [form, setForm] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statFilter, setStatFilter] = useState("all");
  const [showPanel, setShowPanel] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    Promise.all([
      api.get("/categories").catch(() => ({ data: [] })),
      api.get("/products").catch(() => ({ data: [] })),
    ]).then(([cr, pr]) => {
      setCategories(Array.isArray(cr.data) ? cr.data : []);
      setProducts(Array.isArray(pr.data) ? pr.data : []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (msg.text) {
      const tm = setTimeout(() => setMsg({ text: "", type: "" }), 3000);
      return () => clearTimeout(tm);
    }
  }, [msg.text]);

  const reload = async () => {
    const [cr, pr] = await Promise.all([
      api.get("/categories").catch(() => ({ data: [] })),
      api.get("/products").catch(() => ({ data: [] })),
    ]);
    setCategories(Array.isArray(cr.data) ? cr.data : []);
    setProducts(Array.isArray(pr.data) ? pr.data : []);
  };

  const getProductCount = (catId) => products.filter((p) => p.category?.id === catId).length;

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, form);
        setMsg({ text: t("categoryUpdated"), type: "success" });
      } else {
        await api.post("/categories", form);
        setMsg({ text: t("categoryAdded"), type: "success" });
      }
      setForm({ name: "", description: "" });
      setEditingId(null);
      setShowPanel(false);
      await reload();
    } catch (err) {
      const raw = (err.response?.data?.message || err.response?.data?.error || "").toLowerCase();
      if (raw.includes("duplicate") || raw.includes("already exists") || err.response?.status === 409) {
        setMsg({ text: t("categoryAlreadyExists"), type: "error" });
      } else {
        setMsg({ text: t("failedToSave"), type: "error" });
      }
    } finally { setSaving(false); }
  };

  const editCategory = (c) => {
    setEditingId(c.id);
    setForm({ name: c.name || "", description: c.description || "" });
    setShowPanel(true);
  };

  const closePanel = () => {
    setEditingId(null);
    setForm({ name: "", description: "" });
    setShowPanel(false);
  };

  const restoreCategory = async (c) => {
    await api.post("/categories", { name: c.name || "", description: c.description || "" }).catch(() => {});
    await reload();
    if (notifyUndo) notifyUndo(t("categoryRestored"), () => {}, { timeout: 2500, undo: false });
  };

  const deleteCategory = async (id) => {
    const count = getProductCount(id);
    if (count > 0) {
      setMsg({ text: t("cannotDeleteCategoryInUseCount", { count }), type: "error" });
      return;
    }
    const target = categories.find((c) => c.id === id);
    const ok = await confirmDialog(t("deleteCategoryConfirm"), t("delete"), { destructive: true });
    if (!ok) return;
    try {
      await api.delete(`/categories/${id}`);
      setMsg({ text: t("categoryDeleted"), type: "success" });
      if (editingId === id) closePanel();
      await reload();
      if (target) notifyUndo?.(t("categoryDeletedName", { name: target.name }), () => restoreCategory(target));
    } catch (err) {
      const raw = (err.response?.data?.message || "").toLowerCase();
      if (raw.includes("foreign key") || raw.includes("constraint")) {
        setMsg({ text: t("cannotDeleteCategoryInUse"), type: "error" });
      } else {
        setMsg({ text: t("failedToDelete"), type: "error" });
      }
    }
  };

  const stats = useMemo(() => {
    let totalProducts = 0;
    categories.forEach((c) => { totalProducts += getProductCount(c.id); });
    return { totalCategories: categories.length, totalProducts, emptyCategories: categories.filter((c) => getProductCount(c.id) === 0).length };
  }, [categories, products]);

  const filtered = useMemo(() => {
    let items = [...categories];
    if (statFilter === "empty") {
      items = items.filter((c) => getProductCount(c.id) === 0);
    }
    if (search) {
      const s = search.toLowerCase();
      items = items.filter((c) => c.name?.toLowerCase().includes(s) || c.description?.toLowerCase().includes(s));
    }
    items.sort((a, b) => {
      let va, vb;
      if (sortF === "products") { va = getProductCount(a.id); vb = getProductCount(b.id); }
      else { va = (a.name || "").toLowerCase(); vb = (b.name || "").toLowerCase(); }
      return typeof va === "string" ? (sortD === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)) : (sortD === "asc" ? va - vb : vb - va);
    });
    return items;
  }, [categories, products, search, sortF, sortD, statFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, statFilter, sortF, sortD]);

  const bulk = useBulkSelect(filtered, (c) => c.id);

  const deleteSelected = async () => {
    if (bulk.selected.length === 0) return;
    const blocked = bulk.selected.filter((id) => getProductCount(id) > 0);
    if (blocked.length > 0) {
      setMsg({ text: t("cannotDeleteCategoriesInUse", { count: blocked.length }), type: "error" });
      return;
    }
    const ok = await confirmDialog(t("deleteCategoriesConfirm", { count: bulk.selected.length }), t("delete"), { destructive: true });
    if (!ok) return;
    try {
      const deleted = bulk.selected.map((id) => categories.find((c) => c.id === id)).filter(Boolean);
      for (const id of bulk.selected) {
        await api.delete(`/categories/${id}`).catch(() => {});
        if (editingId === id) closePanel();
      }
      bulk.clear();
      await reload();
      setMsg({ text: t("categoriesDeleted"), type: "success" });
      notifyUndo?.(t("categoriesDeletedCount", { count: deleted.length }), () => { deleted.forEach((c) => restoreCategory(c)); });
    } catch (err) {
      const raw = (err.response?.data?.message || "").toLowerCase();
      if (raw.includes("foreign key") || raw.includes("constraint")) {
        setMsg({ text: t("cannotDeleteCategoryInUse"), type: "error" });
      } else {
        setMsg({ text: t("failedToDelete"), type: "error" });
      }
    }
  };

  const toggleSort = (f) => sortF === f ? setSortD((d) => d === "asc" ? "desc" : "asc") : (setSortF(f), setSortD("asc"));

  if (loading) return <View style={styles.centerBox}><Spinner size={28} text={t("loading")} /></View>;

  const statCards = [
    { l: t("totalCategoriesStat"), v: stats.totalCategories, c: "#0f172a", i: "folder-outline", action: () => { setStatFilter("all"); setSearch(""); } },
    { l: t("totalProducts"), v: stats.totalProducts, c: "#2563eb", i: "cube-outline", action: () => nav("/products") },
    { l: t("emptyCategoriesStat"), v: stats.emptyCategories, c: stats.emptyCategories > 0 ? "#f59e0b" : "#16a34a", i: "folder-open-outline", action: () => { setStatFilter("empty"); setSearch(""); } },
  ];

  const headerCells = [
    { f: "name", l: t("category"), flex: 1.4 },
    { f: null, l: t("description"), flex: 1 },
    { f: "products", l: t("products"), flex: 0.6, center: true },
    { f: null, l: t("actions"), flex: 0.7, center: true },
  ];

  const pagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return (
      <View style={styles.pagination}>
        <Button size="sm" variant="outline" title={t("prev")} disabled={page <= 1} onPress={() => setPage((p) => p - 1)}
          icon={<Ionicons name="chevron-back" size={12} color={colors.slate700} />} />
        {pages.map((i) => (
          <Pressable key={i} style={[styles.pageBtn, page === i && styles.pageBtnActive]} onPress={() => setPage(i)}>
            <Text style={[styles.pageBtnText, page === i && styles.pageBtnTextActive]}>{i}</Text>
          </Pressable>
        ))}
        <Button size="sm" variant="outline" title={t("next")} disabled={page >= totalPages} onPress={() => setPage((p) => p + 1)}
          icon={<Ionicons name="chevron-forward" size={12} color={colors.slate700} />} />
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <View style={styles.titleBox}>
          <Ionicons name="folder-outline" size={20} color="#2563eb" />
          <Text style={styles.title}>{t("categories")}</Text>
          <Text style={styles.titleCount}>({categories.length})</Text>
        </View>
        <Button title={t("newCategory")} size="sm" onPress={() => { setEditingId(null); setForm({ name: "", description: "" }); setShowPanel(true); }}
          icon={<Ionicons name="add" size={13} color="#fff" />} />
      </View>

      <View style={styles.statsRow}>
        {statCards.map((s) => (
          <Pressable key={s.l} style={[styles.statCard, { borderTopColor: s.c }]} onPress={s.action}>
            <View style={styles.statLabel}>
              <Ionicons name={s.i} size={12} color={s.c} />
              <Text style={[styles.statLabelText, { color: "#64748b" }]}>{s.l}</Text>
            </View>
            <Text style={[styles.statValue, { color: s.c }]}>{s.v}</Text>
          </Pressable>
        ))}
      </View>

      {msg.text && (
        <View style={[styles.msg, msg.type === "error" ? styles.msgError : styles.msgSuccess]}>
          <Text style={{ fontSize: 12, color: msg.type === "error" ? "#991b1b" : "#166534" }}>{msg.text}</Text>
        </View>
      )}

      <View style={styles.columns}>
        <View style={styles.tableCol}>
          <View style={styles.toolbar}>
            <View style={styles.toolbarLeft}>
              <Ionicons name="folder-outline" size={14} color="#2563eb" />
              <Text style={styles.toolbarTitle}>{t("allCategories")}</Text>
              {statFilter !== "all" && (
                <Text style={styles.filterBadge}>{t("filtered")}: {statFilter === "empty" ? t("emptyOnly") : statFilter}</Text>
              )}
            </View>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={13} color="#94a3b8" style={styles.searchIcon} />
              <TextField
                value={search}
                onChangeText={setSearch}
                placeholder={t("searchCategoriesPlaceholder")}
                containerStyle={{ marginBottom: 0 }}
                inputStyle={styles.searchInput}
              />
            </View>
          </View>

          {bulk.mode && (
            <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected}
              onSelectAll={bulk.toggleAll} onDelete={deleteSelected} deleteLabel={t("deleteSelected")} />
          )}

          <View style={styles.card}>
            <View style={styles.tableHeader}>
              {bulk.mode && (
                <Pressable style={{ width: 30, alignItems: "center" }} onPress={bulk.toggleAll} hitSlop={8}>
                  <Ionicons name={bulk.allSelected ? "checkbox" : "square-outline"} size={17} color="#2563eb" />
                </Pressable>
              )}
              {headerCells.map((h) => (
                <Pressable
                  key={h.l}
                  style={[styles.headerCell, { flex: h.flex }, h.center && styles.centerCell]}
                  onPress={() => h.f && toggleSort(h.f)}
                >
                  <Text style={styles.headerCellText}>{h.l}</Text>
                  {h.f && <Ionicons name="swap-vertical" size={11} color={sortF === h.f ? "#2563eb" : "#94a3b8"} style={{ opacity: sortF === h.f ? 1 : 0.4 }} />}
                </Pressable>
              ))}
            </View>

            {filtered.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="folder-open-outline" size={26} color={colors.slate300} />
                <Text style={styles.emptyText}>{t("noCategories")}</Text>
              </View>
            ) : (
              <FlatList
                data={paginated}
                keyExtractor={(c) => String(c.id)}
                style={styles.list}
                renderItem={({ item: c }) => {
                  const count = getProductCount(c.id);
                  const isEditing = editingId === c.id;
                  return (
                    <Pressable {...bulk.rowProps(c.id)} style={[styles.row, isEditing && styles.rowEditing]}>
                      {bulk.mode && (
                        <Pressable style={{ width: 30, alignItems: "center" }} onPress={() => bulk.toggle(c.id)} hitSlop={8}>
                          <Ionicons name={bulk.selectedSet.has(c.id) ? "checkbox" : "square-outline"} size={17} color="#2563eb" />
                        </Pressable>
                      )}
                      <View style={[styles.cell, { flex: 1.4 }]}>
                        <View style={styles.cellNameWrap}>
                          <View style={[styles.cellIcon, isEditing ? styles.cellIconEditing : count > 0 ? styles.cellIconActive : styles.cellIconIdle]}>
                            <Ionicons name="folder" size={16} color={isEditing ? "#f59e0b" : count > 0 ? "#2563eb" : "#94a3b8"} />
                          </View>
                          <Text style={styles.cellName}>{c.name}</Text>
                        </View>
                      </View>
                      <View style={[styles.cell, { flex: 1, paddingHorizontal: 4 }]}>
                        <Text style={styles.cellDesc} numberOfLines={1}>{c.description || "—"}</Text>
                      </View>
                      <View style={[styles.cell, { flex: 0.6, alignItems: "center" }]}>
                        <View style={[styles.countBadge, count > 0 ? styles.countBadgeActive : styles.countBadgeIdle]}>
                          <Ionicons name="cube-outline" size={11} color={count > 0 ? "#2563eb" : "#94a3b8"} />
                          <Text style={{ color: count > 0 ? "#2563eb" : "#94a3b8", fontWeight: "600" }}>{count}</Text>
                        </View>
                      </View>
                      <View style={[styles.cell, { flex: 0.7, flexDirection: "row", justifyContent: "center", gap: 6 }]}>
                        <Pressable style={[styles.iconBtn, isEditing && styles.iconBtnEdit]} onPress={() => editCategory(c)} hitSlop={6}>
                          <Ionicons name="create-outline" size={14} color="#2563eb" />
                        </Pressable>
                        {bulk.mode && (
                          <Pressable style={styles.iconBtn} onPress={() => deleteCategory(c.id)} hitSlop={6}>
                            <Ionicons name="trash-outline" size={14} color="#ef4444" />
                          </Pressable>
                        )}
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
          {pagination()}
        </View>
      </View>

      <Modal
        visible={showPanel}
        onClose={closePanel}
        title={editingId ? `${t("editCategoryTitle")} — ${categories.find((c) => c.id === editingId)?.name || ""}` : t("newCategory")}
        actions={[
          <Button key="cancel" variant="outline" title={t("cancel")} onPress={closePanel} style={{ flex: 1 }} />,
          <Button key="save" variant={editingId ? "danger" : "primary"} loading={saving}
            title={saving ? t("saving") : editingId ? t("update") : t("addCategory")} onPress={handleSubmit} style={{ flex: 2 }}
            icon={<Ionicons name={editingId ? "checkmark" : "add"} size={13} color="#fff" />} />,
        ]}
      >
        <TextField
          label={`${t("name")} *`}
          value={form.name}
          onChangeText={(v) => setForm({ ...form, name: v })}
          placeholder={t("categoryNamePlaceholder")}
          containerStyle={{ marginBottom: spacing.sm }}
        />
        <TextField
          label={t("description")}
          value={form.description}
          onChangeText={(v) => setForm({ ...form, description: v })}
          placeholder={t("optionalDescriptionPlaceholder")}
          multiline
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50, padding: spacing.sm, gap: 8 },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  titleBox: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 18, fontWeight: "700", color: colors.slate900 },
  titleCount: { color: "#94a3b8", fontSize: 12 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: {
    background: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: 8, padding: 12,
    borderTopWidth: 3, minWidth: 140, flexGrow: 1, flexBasis: "30%", gap: 2,
  },
  statLabel: { flexDirection: "row", alignItems: "center", gap: 4 },
  statLabelText: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  statValue: { fontSize: 18, fontWeight: "700" },
  msg: { padding: 8, paddingHorizontal: 12, borderRadius: 6, flexShrink: 0 },
  msgError: { background: "#fef2f2", borderWidth: 1, borderColor: "#fecaca" },
  msgSuccess: { background: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  columns: { flex: 1, minHeight: 0 },
  tableCol: { flex: 1, minWidth: 0 },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  toolbarLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  toolbarTitle: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  filterBadge: { fontSize: 10, fontWeight: "500", color: "#f59e0b", background: "#fef3c7", paddingHorizontal: 8, borderRadius: 99, overflow: "hidden" },
  searchWrap: { flexDirection: "row", alignItems: "center", flex: 1, maxWidth: 260 },
  searchIcon: { position: "absolute", left: 8, zIndex: 1 },
  searchInput: { paddingLeft: 28, fontSize: 12 },
  card: { flex: 1, background: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: 8, overflow: "hidden" },
  tableHeader: { flexDirection: "row", background: "#f8fafc", borderBottomWidth: 2, borderBottomColor: colors.slate200, paddingVertical: 9, paddingHorizontal: 10 },
  headerCell: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 2 },
  centerCell: { justifyContent: "center" },
  headerCellText: { fontSize: 10, fontWeight: "700", color: "#64748b", textTransform: "uppercase" },
  list: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.slate100, paddingVertical: 9, paddingHorizontal: 10, minHeight: 46 },
  rowEditing: { background: "#eff6ff" },
  cell: { paddingHorizontal: 2, justifyContent: "center" },
  cellNameWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  cellIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  cellIconEditing: { background: "#fef3c7" },
  cellIconActive: { background: "#eff6ff" },
  cellIconIdle: { background: "#f8fafc" },
  cellName: { fontSize: 13, fontWeight: "600", color: colors.slate800 },
  cellDesc: { fontSize: 12, color: "#64748b" },
  countBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, fontSize: 11 },
  countBadgeActive: { background: "#eff6ff" },
  countBadgeIdle: { background: "#f8fafc" },
  iconBtn: { padding: 4, borderRadius: 4 },
  iconBtnEdit: { background: "#fef3c7" },
  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 8 },
  emptyText: { color: "#94a3b8", fontSize: 13 },
  pagination: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 12 },
  pageBtn: { width: 32, height: 32, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, alignItems: "center", justifyContent: "center", background: "#fff" },
  pageBtnActive: { borderColor: "#2563eb", background: "#2563eb" },
  pageBtnText: { color: "#374151", fontWeight: "500", fontSize: 13 },
  pageBtnTextActive: { color: "#fff", fontWeight: "700" },
});