import { useEffect, useState, useMemo, useCallback } from "react";
import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import ProductSelector from "../components/ProductSelector";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { Card, TextField, SelectField, Button, Modal, Badge } from "../components/ui";
import { QuantityInput } from "../components/ui";
import { confirmDialog, alertMessage } from "../utils/confirm";
import { toastMessage } from "../utils/confirm";
import { useUndo } from "../UndoContext";
import { useNav } from "../navigation/nav";
import { t, useLanguage } from "../i18n";
import { colors, font, radius, spacing, shadow, money, statusColor } from "../theme";

function RowCheckBox({ checked, onToggle }) {
  return (
    <Pressable onPress={onToggle} hitSlop={6}>
      <Ionicons
        name={checked ? "checkbox" : "square-outline"}
        size={18}
        color={checked ? colors.primary : colors.slate400}
      />
    </Pressable>
  );
}

const STATUS_OPTIONS = ["All", "Active", "Inactive"];

export default function Purchases() {
  useLanguage();
  const navigate = useNav();
  const { notifyUndo } = useUndo();
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortF, setSortF] = useState("date");
  const [sortD, setSortD] = useState("desc");
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState("");
  const PAGE_SIZE = 10;
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [form, setForm] = useState({
    productId: "",
    quantity: "",
    supplier: "",
    price: "",
    discount: "0",
    tax: "0",
    expiryDate: "",
  });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [pr, prods] = await Promise.all([
        api.get("/purchases").catch(() => ({ data: [] })),
        api.get("/products").catch(() => ({ data: [] })),
      ]);
      setPurchases(Array.isArray(pr.data) ? pr.data : []);
      setProducts(Array.isArray(prods.data) ? prods.data : []);
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const getProduct = (purchase) => {
    const pid = purchase.product?.id || purchase.productId;
    if (!pid) return null;
    return products.find((p) => p.id === pid) || null;
  };

  const getProductName = (purchase) => {
    const pid = purchase.product?.id || purchase.productId;
    if (!pid) return purchase.productName || "\u2014";
    return products.find((p) => p.id === pid)?.name || purchase.productName || "\u2014";
  };

  const getProductUnit = (purchase) => {
    const p = getProduct(purchase);
    return p?.unit || "piece";
  };

  const decorated = useMemo(() => {
    const items = purchases.map((p) => {
      const unit = getProductUnit(p);
      const unitQty = (Number(p.quantity) || 0) * (Number(getProduct(p)?.piecesPerUnit) > 0 ? Number(getProduct(p)?.piecesPerUnit) : 1);
      const disc = Number(p.discount) || 0;
      const tax = Number(p.tax) || 0;
      const base = (Number(p.price) || 0) * (Number(p.quantity) || 0);
      const afterDiscount = base - (base * disc) / 100;
      const taxAmount = (afterDiscount * tax) / 100;
      const total = afterDiscount + taxAmount;
      const paid = Number(p.paidAmount) || 0;
      const status = (p.status || (p.active === false ? "Inactive" : "Active"));
      const ts = p.purchaseDate || p.createdAt || "";
      return {
        id: `purchase-${p.id}`,
        purchaseId: p.id,
        name: p.product?.name || getProductName(p),
        productId: p.product?.id || p.productId,
        supplier: p.supplier || "\u2014",
        quantity: Number(p.quantity) || 0,
        unit,
        unitQty,
        discount: disc,
        tax,
        basePrice: base,
        afterDiscount,
        taxAmount,
        total,
        paid,
        balance: total - paid,
        status,
        expiryDate: p.expiryDate || "",
        date: ts,
        dateLabel: ts ? new Date(ts).toLocaleDateString() : "\u2014",
        timeLabel: ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        raw: p,
      };
    });
    return items;
  }, [purchases, products]);

  const filtered = useMemo(() => {
    let items = decorated;
    if (statusFilter !== "All") {
      items = items.filter((r) => r.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((r) => r.name.toLowerCase().includes(q) || r.supplier.toLowerCase().includes(q));
    }
    items.sort((a, b) => {
      let va, vb;
      if (sortF === "name") { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortF === "total") { va = a.total; vb = b.total; }
      else if (sortF === "qty") { va = a.quantity; vb = b.quantity; }
      else { va = a.date; vb = b.date; }
      return typeof va === "string" ? (sortD === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)) : (sortD === "asc" ? va - vb : vb - va);
    });
    return items;
  }, [decorated, search, statusFilter, sortF, sortD]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter, sortF, sortD]);

  const bulk = useBulkSelect(filtered, (r) => r.id);

  const statTotals = useMemo(() => {
    const now = new Date();
    let todayAdded = 0, todayDeleted = 0, thisMonth = 0;
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const todayKey = now.toISOString().slice(0, 10);
    purchases.forEach((p) => {
      const ts = p.purchaseDate || p.createdAt || "";
      if (ts.slice(0, 7) === monthKey) thisMonth += Number(p.quantity) || 0;
      if (ts.slice(0, 10) === todayKey) todayAdded += Number(p.quantity) || 0;
    });
    return { todayAdded, todayDeleted, thisMonth };
  }, [purchases]);

  const openNew = () => {
    setForm({ productId: "", quantity: "", supplier: "", price: "", discount: "0", tax: "0", expiryDate: "" });
    setEditingPurchase(null);
    setShowNewModal(true);
  };

  const openEdit = (r) => {
    setEditingPurchase(r);
    setForm({
      productId: r.productId ? String(r.productId) : "",
      quantity: String(r.quantity),
      supplier: r.raw?.supplier || r.supplier || "",
      price: String(r.raw?.price || ""),
      discount: String(r.discount),
      tax: String(r.tax),
      expiryDate: r.raw?.expiryDate ? new Date(r.raw.expiryDate).toISOString().split("T")[0] : "",
    });
    setShowNewModal(true);
  };

  const idForProduct = (r) => (r.raw?.productId ?? r.raw?.product?.id ?? r.productId) || null;

  const createPurchase = async () => {
    const pid = Number(form.productId);
    const qty = Number(form.quantity);
    if (!pid || !qty || qty <= 0) {
      alertMessage(t("fillRequiredFields"));
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const payload = {
        product: { id: pid },
        quantity: qty,
        supplier: form.supplier.trim(),
        price: Number(form.price) || 0,
        discount: Number(form.discount) || 0,
        tax: Number(form.tax) || 0,
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
        status: "Active",
        active: true,
      };
      if (editingPurchase) {
        await api.put(`/purchases/${editingPurchase.purchaseId}`, { ...payload, id: editingPurchase.purchaseId });
      } else {
        const res = await api.post("/purchases", payload);
        const id = res.data?.id;
        await api.post("/stock-history", {
          product: { id: pid },
          quantityChange: qty,
          resultingQuantity: qty,
          transactionType: "Added",
        }).catch(() => {});
        try {
          const stockRes = await api.get("/stocks").catch(() => ({ data: [] }));
          const stocks = Array.isArray(stockRes.data) ? stockRes.data : [];
          const stock = stocks.find((st) => (st.product?.id || st.productId) === pid);
          if (stock) {
            await api.put(`/stocks/${stock.id}`, {
              ...stock,
              quantity: (Number(stock.quantity) || 0) + qty,
              lowStockThreshold: Number(stock.lowStockThreshold) || 0,
              expiryDate: payload.expiryDate,
              product: { id: pid },
            }).catch(() => {});
          } else {
            await api.post("/stocks", {
              quantity: qty,
              lowStockThreshold: 0,
              expiryDate: payload.expiryDate,
              product: { id: pid },
            }).catch(() => {});
          }
        } catch {}
      }
      setShowNewModal(false);
      await loadData();
      setMsg(editingPurchase ? t("purchaseUpdated") : t("purchaseAdded"));
      setTimeout(() => setMsg(""), 2500);
    } catch {
      setMsg(t("failedToCreatePurchase"));
      setTimeout(() => setMsg(""), 2000);
    }
    finally { setSaving(false); }
  };

  const toggleStatus = async (r) => {
    const next = r.status === "Active" ? "Inactive" : "Active";
    const prev = r.status;
    try {
      await api.put(`/purchases/${r.purchaseId}`, { ...r.raw, status: next, active: next === "Active" });
      setPurchases((prevState) => prevState.map((p) => {
        const st = (p.status || (p.active === false ? "Inactive" : "Active"));
        if (p.id === r.purchaseId) return { ...p, status: next, active: next === "Active" };
        return p;
      }));
      notifyUndo(t("purchaseStatusChanged"), async () => {
        await api.put(`/purchases/${r.purchaseId}`, { ...r.raw, status: prev, active: prev === "Active" });
        setPurchases((prevState) => prevState.map((p) =>
          p.id === r.purchaseId ? { ...p, status: prev, active: prev === "Active" } : p
        ));
      });
    } catch {
      setMsg(t("failed"));
      setTimeout(() => setMsg(""), 2000);
    }
  };

  const deletePurchase = async (r) => {
    if (!(await confirmDialog(t("deletePurchaseConfirm", { name: r.name })))) return;
    try {
      await api.delete(`/purchases/${r.purchaseId}`);
      await loadData();
      setMsg(t("purchaseDeleted"));
      setTimeout(() => setMsg(""), 2000);
    } catch {
      setMsg(t("failedToDelete"));
      setTimeout(() => setMsg(""), 2000);
    }
  };

  const deleteSelected = async () => {
    if (bulk.selected.length === 0) return;
    if (!(await confirmDialog(t("deleteSelectedCount", { count: bulk.selected.length, type: t("purchases") })))) return;
    setMsg("");
    try {
      if (bulk.allSelected) {
        for (const r of filtered) { try { await api.delete(`/purchases/${r.purchaseId}`); } catch {} }
      } else {
        for (const id of bulk.selected) {
          const r = filtered.find((x) => x.id === id);
          if (r) { try { await api.delete(`/purchases/${r.purchaseId}`); } catch {} }
        }
      }
      bulk.clear();
      await loadData();
      setMsg(t("deleted"));
      setTimeout(() => setMsg(""), 2000);
    } catch {
      setMsg(t("failed"));
      setTimeout(() => setMsg(""), 2000);
    }
  };

  const toggleSort = useCallback((field) => {
    if (sortF === field) setSortD((d) => d === "asc" ? "desc" : "asc");
    else { setSortF(field); setSortD("desc"); }
  }, [sortF]);

  const statusTone = (status) => {
    if (status === "Active") return "success";
    return "warning";
  };

  if (loading) return (
    <View style={s.loadingWrap}>
      <Spinner size={28} text={t("loading")} />
    </View>
  );

  if (loadError) return (
    <View style={s.errorWrap}>
      <Ionicons name="warning" size={40} color="#f59e0b" style={{ opacity: 0.6 }} />
      <Text style={s.errorTitle}>{t("failedToLoadStockData")}</Text>
      <Text style={s.errorSub}>{t("checkBackendEndpoint")}</Text>
      <Pressable onPress={loadData} style={s.retryBtn}>
        <Ionicons name="refresh" size={14} color={colors.white} />
        <Text style={s.retryBtnText}>{t("retry")}</Text>
      </Pressable>
    </View>
  );

  const statCards = [
    { label: t("totalPurchases"), value: String(filtered.length), color: colors.primary, iconName: "cart", bg: colors.primaryLight },
    { label: t("thisMonth"), value: String(statTotals.thisMonth.toLocaleString()), color: colors.success, iconName: "calendar", bg: colors.successLight },
    { label: t("todayAdded"), value: String(statTotals.todayAdded), color: colors.info, iconName: "add-circle", bg: "#f0f9ff" },
    { label: t("activePurchases"), value: String(decorated.filter((r) => r.status === "Active").length + decorated.filter((r) => r.status === "Inactive").length), color: colors.warning, iconName: "checkmark-circle", bg: colors.warningLight },
  ];

  const formProduct = products.find((p) => p.id === Number(form.productId));
  const boxQty = Number(form.quantity) || 0;
  const piecesPerUnit = Number(formProduct?.piecesPerUnit) || 0;
  const calcTotal = useMemo(() => {
    const qty = boxQty;
    const base = (Number(form.price) || 0) * qty;
    const afterDiscount = base - (base * (Number(form.discount) || 0)) / 100;
    const taxAmount = (afterDiscount * (Number(form.tax) || 0)) / 100;
    const total = afterDiscount + taxAmount;
    const perPiece = total > 0 && piecesPerUnit > 0 ? total / (qty * piecesPerUnit) : total / (qty || 1);
    return { base, afterDiscount, taxAmount, total, perPiece };
  }, [boxQty, form, piecesPerUnit]);

  const isEdit = !!editingPurchase;

  return (
    <View style={s.root}>
      <Modal
        visible={showNewModal}
        onClose={() => setShowNewModal(false)}
        title={isEdit ? `${t("editPurchase")} \u2014 ${editingPurchase.name}` : t("addPurchase")}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={s.modalBody}>
            <ProductSelector
              value={form.productId ? Number(form.productId) : null}
              onChange={(v) => setForm((f) => ({ ...f, productId: v ? String(v) : "" }))}
              placeholder={t("selectProduct")}
              showPrice
              showQty
            />
            <QuantityInput
              value={boxQty}
              onChange={(v) => setForm((f) => ({ ...f, quantity: String(v) }))}
              piecesPerUnit={piecesPerUnit}
              unit={formProduct?.unit || "piece"}
              min={0}
              placeholder="e.g. 10"
            />
            <View style={{ flex: 1 }}>
              <QuantityInput
                value={piecesPerUnit > 0 ? boxQty * piecesPerUnit : 0}
                onChange={(v) => setForm((f) => ({ ...f, quantity: piecesPerUnit > 0 ? String(Number(v) / piecesPerUnit) : String(v) }))}
                piecesPerUnit={0}
                unit="piece"
                min={0}
                placeholder="Pieces"
                size="sm"
              />
            </View>
            <TextField label={t("supplier")} value={form.supplier} onChangeText={(v) => setForm((f) => ({ ...f, supplier: v }))} placeholder={t("supplierPlaceholder")} />
            <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
              <View style={{ flex: 1, minWidth: 120 }}>
                <TextField label={t("pricePerBox")} value={form.price} onChangeText={(v) => setForm((f) => ({ ...f, price: v }))} keyboardType="numeric" placeholder="e.g. 45000" />
              </View>
              <View style={{ flex: 1, minWidth: 100 }}>
                <TextField label={t("discountPct")} value={form.discount} onChangeText={(v) => setForm((f) => ({ ...f, discount: v }))} keyboardType="numeric" placeholder="% e.g. 5" />
              </View>
              <View style={{ flex: 1, minWidth: 100 }}>
                <TextField label={t("taxPct")} value={form.tax} onChangeText={(v) => setForm((f) => ({ ...f, tax: v }))} keyboardType="numeric" placeholder="% e.g. 0" />
              </View>
            </View>
            <TextField label={t("expiryDate")} value={form.expiryDate} onChangeText={(v) => setForm((f) => ({ ...f, expiryDate: v }))} placeholder="YYYY-MM-DD" />
            <View style={s.priceSummary}>
              <View style={s.priceLine}>
                <Text style={s.priceLabel}>{t("subtotal")}</Text>
                <Text style={s.priceValue}>TZS {calcTotal.base.toLocaleString()}</Text>
              </View>
              <View style={s.priceLine}>
                <Text style={s.priceLabel}>{t("afterDiscount")}</Text>
                <Text style={s.priceValue}>TZS {calcTotal.afterDiscount.toLocaleString()}</Text>
              </View>
              <View style={s.priceLine}>
                <Text style={s.priceLabel}>{t("tax")}</Text>
                <Text style={s.priceValue}>TZS {calcTotal.taxAmount.toLocaleString()}</Text>
              </View>
              <View style={[s.priceLine, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.slate200, paddingTop: 4 }]}>
                <Text style={[s.priceLabel, { fontWeight: "700" }]}>{t("total")}</Text>
                <Text style={[s.priceValue, { fontWeight: "700", color: colors.primary }]}>TZS {calcTotal.total.toLocaleString()}</Text>
              </View>
              {calcTotal.total > 0 && piecesPerUnit > 0 && (
                <View style={s.priceLine}>
                  <Text style={s.priceLabel}>{t("perPiece")}</Text>
                  <Text style={s.priceValue}>TZS {Math.round(calcTotal.perPiece).toLocaleString()}</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
        <View style={s.modalActions}>
          <Button title={t("cancel")} variant="outline" size="sm" onPress={() => setShowNewModal(false)} />
          <Button title={isEdit ? t("saveChanges") : t("addPurchaseAction")} variant="primary" size="sm" loading={saving} icon={<Ionicons name="save" size={14} color={colors.white} />} onPress={createPurchase} />
        </View>
      </Modal>

      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Ionicons name="cart" size={22} color={colors.primary} />
          <Text style={s.headerTitle}>{t("purchases")}</Text>
          <Text style={s.headerCount}>({filtered.length})</Text>
        </View>
        <View style={s.headerRight}>
          <Pressable onPress={() => bulk.mode ? bulk.clear() : bulk.startMode()} style={[s.bulkBtn, bulk.mode && s.bulkBtnActive]}>
            <Ionicons name="checkbox" size={14} color={colors.primary} />
            <Text style={s.bulkBtnText}>{bulk.mode ? t("cancelSelect") : t("select")}</Text>
          </Pressable>
          <Pressable onPress={openNew} style={s.addBtn}>
            <Ionicons name="add" size={14} color={colors.white} />
            <Text style={s.addBtnText}>{t("addPurchase")}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsRow}>
        {statCards.map((c, i) => (
          <View key={i} style={[s.statCard, { backgroundColor: colors.white, borderColor: colors.slate200, borderTopColor: c.color }]}>
            <View style={s.statLabelRow}>
              <Ionicons name={c.iconName} size={12} color={c.color} />
              <Text style={[s.statLabel, { color: c.color }]}>{c.label}</Text>
            </View>
            <Text style={[s.statValue, { color: c.color }]}>{c.value}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={s.controlsRow}>
        <View style={s.searchWrap}>
          <Ionicons name="search" size={14} color={colors.slate400} style={s.searchIcon} />
          <TextField value={search} onChangeText={setSearch} placeholder={t("searchPurchases")} containerStyle={s.searchField} />
        </View>
        <SelectField
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS.map((o) => ({ value: o, label: o }))}
          placeholder={t("filterByStatus")}
          containerStyle={{ marginBottom: 0, minWidth: 150 }}
        />
        {bulk.mode && <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected} onSelectAll={bulk.toggleAll} onDelete={deleteSelected} deleteLabel={t("deleteSelected")} />}
      </View>

      {msg !== "" && (
        <View style={[s.msgBar, msg.includes("Failed") ? s.msgBarError : s.msgBarSuccess]}>
          <Text style={[s.msgText, msg.includes("Failed") ? s.msgTextError : s.msgTextSuccess]}>{msg}</Text>
        </View>
      )}

      <Card padded={false} style={s.tableCard}>
        <View style={s.tableBody}>
          {filtered.length === 0 ? (
            <Text style={s.noData}>{t("noRecordsFound")}</Text>
          ) : (
            <FlatList
              data={pageItems}
              keyExtractor={(r) => r.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: spacing.sm }}
              renderItem={({ item: r }) => (
                <View key={r.id} style={s.row}>
                  {bulk.mode && (
                    <View style={s.rowCheck}>
                      <RowCheckBox checked={bulk.selectedSet.has(r.id)} onToggle={() => bulk.toggle(r.id)} />
                    </View>
                  )}
                  <Pressable style={[s.rowMain, s.rowMainPressable]} onPress={() => openEdit(r)}>
                    <View style={s.rowProduct}>
                      <View style={[s.rowIconWrap, { backgroundColor: r.status === "Active" ? colors.successLight : colors.warningLight }]}>
                        <Ionicons name="cube-outline" size={14} color={r.status === "Active" ? colors.success : colors.warning} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.rowName} numberOfLines={1}>{r.name}</Text>
                        <Text style={s.rowSub} numberOfLines={1}>{(r.supplier || "\u2014") + " \u00b7 " + r.dateLabel}</Text>
                      </View>
                    </View>
                    <View style={s.rowQtyWrap}>
                      <Text style={s.rowQty}>{r.quantity}</Text>
                      <Text style={[s.rowSub, { fontSize: 9 }]}>{"\u2248"} {r.unitQty.toLocaleString()} {t("pieces")}</Text>
                    </View>
                    <View style={s.rowTotalWrap}>
                      <Text style={s.rowTotal}>TZS {r.total.toLocaleString()}</Text>
                      <Text style={[s.rowSub, { fontSize: 9 }]}>{t("paid")}: TZS {r.paid.toLocaleString()}</Text>
                    </View>
                    <View style={s.rowStatus}>
                      <Badge text={r.status} tone={statusTone(r.status)} style={{ alignSelf: "flex-start" }} />
                    </View>
                    <Text style={s.rowDate}>{r.dateLabel} {r.timeLabel}</Text>
                    <Text style={s.rowExpiry}>{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : "\u2014"}</Text>
                  </Pressable>
                  <View style={s.rowActions}>
                    <Pressable onPress={() => toggleStatus(r)} hitSlop={4}>
                      <Ionicons name={r.status === "Active" ? "close-circle" : "checkmark-circle"} size={15} color={r.status === "Active" ? colors.danger : colors.success} />
                    </Pressable>
                    <Pressable onPress={() => startEditAndOpen(r)} hitSlop={4}>
                      <Ionicons name="pencil" size={13} color={colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => deletePurchase(r)} hitSlop={4}>
                      <Ionicons name="trash" size={13} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              )}
            />
          )}
        </View>
        {totalPages > 1 && (
          <View style={s.paginationBar}>
            <Text style={s.paginationText}>{t("pageXofY", { page: currentPage, total: totalPages, count: filtered.length, type: t("purchases") })}</Text>
            <View style={s.paginationBtns}>
              <Pressable onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} style={[s.pageBtn, currentPage <= 1 && s.pageBtnDisabled]}>
                <Ionicons name="chevron-back" size={13} color={currentPage <= 1 ? colors.slate300 : colors.slate700} />
                <Text style={[s.pageBtnText, currentPage <= 1 && s.pageBtnTextDisabled]}>{t("prev")}</Text>
              </Pressable>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                const start = Math.max(1, currentPage - 5);
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <Pressable key={p} onPress={() => setPage(p)} style={[s.pageNumBtn, p === currentPage && s.pageNumBtnActive]}>
                    <Text style={[s.pageNumText, p === currentPage && s.pageNumTextActive]}>{p}</Text>
                  </Pressable>
                );
              })}
              <Pressable onPress={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} style={[s.pageBtn, currentPage >= totalPages && s.pageBtnDisabled]}>
                <Text style={[s.pageBtnText, currentPage >= totalPages && s.pageBtnTextDisabled]}>{t("next")}</Text>
                <Ionicons name="chevron-forward" size={13} color={currentPage >= totalPages ? colors.slate300 : colors.slate700} />
              </Pressable>
            </View>
          </View>
        )}
      </Card>
    </View>
  );

  function startEditAndOpen(r) {
    openEdit(r);
  }
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50, padding: spacing.sm, gap: spacing.sm },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", height: 400 },
  errorWrap: { flex: 1, alignItems: "center", justifyContent: "center", height: 400, gap: spacing.md },
  errorTitle: { fontSize: 18, fontWeight: "700", color: colors.slate900, margin: 0 },
  errorSub: { fontSize: 13, color: colors.slate500, textAlign: "center", maxWidth: 400, margin: 0 },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.primary, borderRadius: radius.md },
  retryBtnText: { color: colors.white, fontWeight: "600", fontSize: 13 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.slate900 },
  headerCount: { color: colors.slate400, fontSize: 12 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bulkBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate300, backgroundColor: colors.white },
  bulkBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  bulkBtnText: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: radius.sm },
  addBtnText: { color: colors.white, fontWeight: "600", fontSize: 12 },
  statsRow: { flexDirection: "row", gap: spacing.sm, flexShrink: 0 },
  statCard: { minWidth: 130, flex: 1, borderRadius: radius.md, borderWidth: 1, borderTopWidth: 3, padding: spacing.md },
  statLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  statValue: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  controlsRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center", flexShrink: 0, flexWrap: "wrap" },
  searchWrap: { flex: 1, minWidth: 200, maxWidth: 320, position: "relative" },
  searchIcon: { position: "absolute", left: 8, top: 12, zIndex: 1 },
  searchField: { marginBottom: 0 },
  msgBar: { padding: spacing.sm, borderRadius: radius.sm, flexShrink: 0 },
  msgBarSuccess: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  msgBarError: { backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: "#fecaca" },
  msgText: { fontSize: 11 },
  msgTextSuccess: { color: "#166534" },
  msgTextError: { color: colors.dangerDark },
  tableCard: { flex: 1, minHeight: 0 },
  tableBody: { flex: 1 },
  noData: { padding: spacing.xl * 2, textAlign: "center", color: colors.slate400 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.slate100, gap: spacing.xs, minHeight: 52 },
  rowCheck: { width: 28, alignItems: "center" },
  rowMain: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flex: 1, minWidth: 0 },
  rowMainPressable: { paddingVertical: 2 },
  rowProduct: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, minWidth: 0 },
  rowIconWrap: { width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  rowName: { fontWeight: "600", color: colors.slate900, fontSize: 12 },
  rowSub: { fontSize: 10, color: colors.slate400 },
  rowQtyWrap: { width: 60, alignItems: "center" },
  rowQty: { fontSize: 12, fontWeight: "700", color: colors.slate800 },
  rowTotalWrap: { width: 90, alignItems: "flex-end" },
  rowTotal: { fontSize: 11, fontWeight: "700", color: colors.slate800 },
  rowStatus: { width: 84 },
  rowDate: { width: 96, fontSize: 10, color: colors.slate500 },
  rowExpiry: { width: 76, fontSize: 10, color: colors.slate400 },
  rowActions: { flexDirection: "row", gap: spacing.sm },
  paginationBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.slate100, backgroundColor: colors.slate50 },
  paginationText: { fontSize: 11, color: colors.slate500 },
  paginationBtns: { flexDirection: "row", gap: 4, alignItems: "center" },
  pageBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate200 },
  pageBtnDisabled: { backgroundColor: colors.slate100 },
  pageBtnText: { fontSize: 11, fontWeight: "600", color: colors.slate700 },
  pageBtnTextDisabled: { color: colors.slate300 },
  pageNumBtn: { width: 26, height: 26, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate200, alignItems: "center", justifyContent: "center" },
  pageNumBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pageNumText: { fontSize: 11, fontWeight: "600", color: colors.slate700 },
  pageNumTextActive: { color: colors.white },
  modalBody: { gap: spacing.md },
  priceSummary: { backgroundColor: colors.slate50, borderRadius: radius.sm, padding: spacing.sm, gap: 3 },
  priceLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { fontSize: 11, color: colors.slate500 },
  priceValue: { fontSize: 12, fontWeight: "600", color: colors.slate700 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.md },
});