import { useState, useEffect, useMemo } from "react";
import { View, Text, Pressable, ScrollView, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { canViewProfit } from "../utils/roleChecks";
import { isOutstandingDebtSale, isFullyPaidDebtSale, getSaleRemainingDebt } from "../utils/debtUtils";
import { confirmDialog } from "../utils/confirm";
import { useUndo } from "../UndoContext";
import { useNav } from "../navigation/nav";
import { QuantityInput, SelectField, TextField, Button } from "../components/ui";
import { t, useLanguage } from "../i18n";
import { colors, font, radius, spacing, shadow } from "../theme";

export default function SaleItems() {
  useLanguage();
  const nav = useNav();
  const showProfit = canViewProfit();
  const { notifyUndo } = useUndo() || {};
  const [saleItems, setSaleItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortDir, setSortDir] = useState("desc");
  const [sortField, setSortField] = useState("date");
  const [viewMode, setViewMode] = useState("bydate");
  const [debtFilter, setDebtFilter] = useState("all");
  const [deliveredFilter, setDeliveredFilter] = useState("all");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [form, setForm] = useState({ productId: "", productName: "", quantity: 1, price: "", costPrice: "", saleId: "" });

  useEffect(() => {
    const load = async () => {
      try {
        const [itemsRes, prodRes, salesRes, stockRes] = await Promise.all([
          api.get("/sale-items").catch(() => ({ data: [] })),
          api.get("/products").catch(() => ({ data: [] })),
          api.get("/sales").catch(() => ({ data: [] })),
          api.get("/stocks").catch(() => ({ data: [] })),
        ]);
        setSaleItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
        setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
        setSales(Array.isArray(salesRes.data) ? salesRes.data : []);
        const smap = {};
        (Array.isArray(stockRes.data) ? stockRes.data : []).forEach((s) => { smap[s.productId ?? s.product?.id] = s.quantity; });
        setStockMap(smap);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const loadItems = async () => {
    const [itemsRes, salesRes, stockRes] = await Promise.all([
      api.get("/sale-items").catch(() => ({ data: [] })),
      api.get("/sales").catch(() => ({ data: [] })),
      api.get("/stocks").catch(() => ({ data: [] })),
    ]);
    setSaleItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
    setSales(Array.isArray(salesRes.data) ? salesRes.data : []);
    const smap = {};
    (Array.isArray(stockRes.data) ? stockRes.data : []).forEach((s) => { smap[s.productId ?? s.product?.id] = s.quantity; });
    setStockMap(smap);
  };

  const salesMap = useMemo(() => {
    const m = {};
    sales.forEach((s) => { m[s.id] = s; });
    return m;
  }, [sales]);

  const enrichedSaleItems = useMemo(() => {
    return saleItems.map((si) => {
      const saleId = si.sale?.id || si.saleId;
      const fullSale = saleId && salesMap[saleId];
      if (fullSale) return { ...si, sale: fullSale };
      if (si.sale) return si;
      return si;
    });
  }, [saleItems, salesMap]);

  const isDebtItem = (si) => {
    const sale = si.sale || si;
    return isOutstandingDebtSale(sale);
  };

  const isPaidDebtItem = (si) => {
    const sale = si.sale || si;
    return isFullyPaidDebtSale(sale);
  };

  const isDeliveredItem = (si) => {
    return si.sale?.description && si.sale.description.startsWith("Delivered Order");
  };

  const debtStats = useMemo(() => {
    let totalDebt = 0, todayDebt = 0, monthDebt = 0;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    sales.forEach((s) => {
      if (isOutstandingDebtSale(s)) {
        const remaining = getSaleRemainingDebt(s);
        totalDebt += remaining;
        const d = (s.saleDate || "").slice(0, 10);
        if (d === todayStr) todayDebt += remaining;
        if (d >= monthStart) monthDebt += remaining;
      }
    });
    return { totalDebt, todayDebt, monthDebt };
  }, [sales]);

  const productMap = useMemo(() => {
    const m = {};
    products.forEach((p) => { m[p.id] = p; });
    return m;
  }, [products]);

  const getQty = (pid) => (pid ? (stockMap[pid] ?? productMap[pid]?.quantity ?? 0) : 0);

  const getBuyingPrice = (si) => {
    const pid = si.product?.id;
    if (pid && productMap[pid]) {
      return Number(productMap[pid].buyingPrice) || 0;
    }
    return Number(si.costPrice) || 0;
  };

  const getSortTime = (si) => {
    const raw = si.sale?.saleDate || si.saleDate || si.sale?.createdAt || si.createdAt || "";
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : 0;
  };

  const handleProductSelect = (val) => {
    const pid = Number(val);
    const p = products.find((x) => x.id === pid);
    setForm((prev) => ({
      ...prev, productId: pid,
      productName: p ? p.name : prev.productName,
      price: p ? p.price ?? prev.price : prev.price,
      costPrice: p ? p.buyingPrice ?? prev.costPrice : prev.costPrice,
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ productId: "", productName: "", quantity: 1, price: "", costPrice: "", saleId: "" });
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.productId && !form.productName) { setMessage({ text: t("selectProduct"), type: "error" }); return; }
    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      const payload = {
        quantity: Number(form.quantity),
        price: Number(form.price) || 0,
        costPrice: Number(form.costPrice) || 0,
        product: form.productId ? { id: form.productId } : { name: form.productName },
        sale: form.saleId ? { id: Number(form.saleId) } : null,
      };

      if (editingId) {
        await api.put(`/sale-items/${editingId}`, payload);
        setMessage({ text: t("itemUpdated"), type: "success" });
      } else {
        await api.post("/sale-items", payload);
        setMessage({ text: t("itemAdded"), type: "success" });
      }

      resetForm();
      await loadItems();
    } catch {
      setMessage({ text: t("failedToSave"), type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const editItem = (item) => {
    setEditingId(item.id);
    setForm({
      productId: item.product?.id || "",
      productName: item.product?.name || item.productName || "",
      quantity: item.quantity || 1,
      price: item.price ?? "",
      costPrice: item.costPrice ?? "",
      saleId: item.sale?.id || "",
    });
    setShowForm(true);
  };

  const restoreSaleItem = async (item) => {
    const payload = {
      quantity: Number(item.quantity) || 0,
      price: Number(item.price) || 0,
      costPrice: Number(item.costPrice) || 0,
      product: item.product?.id ? { id: item.product.id } : { name: item.product?.name || item.productName },
    };
    if (item.sale?.id) payload.sale = { id: item.sale.id };
    await api.post("/sale-items", payload).catch(() => {});
    await loadItems();
    if (notifyUndo) notifyUndo(t("saleItemRestored"), () => {}, { timeout: 2500, undo: false });
  };

  const deleteItem = async (id) => {
    const target = byDate.find((si) => si.id === id);
    if (!(await confirmDialog(t("deleteSaleItemConfirm")))) return;
    try {
      await api.delete(`/sale-items/${id}`);
      await loadItems();
      if (target) notifyUndo?.(`${t("saleItemDeleted")}: ${target.product?.name || target.productName || `#${target.id}`}`, () => restoreSaleItem(target));
    } catch {}
  };

  const byDate = useMemo(() => {
    let items = [...enrichedSaleItems];

    if (search) {
      items = items.filter((si) => {
        const name = si.product?.name || si.productName || "";
        return name.toLowerCase().includes(search.toLowerCase());
      });
    }
    if (dateFrom) {
      items = items.filter((si) => {
        const d = (si.sale?.saleDate || si.saleDate || "").slice(0, 10);
        return d && d >= dateFrom;
      });
    }
    if (dateTo) {
      items = items.filter((si) => {
        const d = (si.sale?.saleDate || si.saleDate || "").slice(0, 10);
        return d && d <= dateTo;
      });
    }
    if (debtFilter === "debt") items = items.filter((si) => isDebtItem(si));
    else if (debtFilter === "cash") items = items.filter((si) => !isDebtItem(si));
    if (deliveredFilter === "delivered") items = items.filter((si) => isDeliveredItem(si));
    else if (deliveredFilter === "regular") items = items.filter((si) => !isDeliveredItem(si));

    items.sort((a, b) => {
      let va, vb;
      if (sortField === "name") {
        va = (a.product?.name || a.productName || "").toLowerCase();
        vb = (b.product?.name || b.productName || "").toLowerCase();
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      va = getSortTime(a);
      vb = getSortTime(b);
      return sortDir === "asc" ? va - vb : vb - va;
    });

    return items;
  }, [enrichedSaleItems, search, dateFrom, dateTo, sortDir, sortField, debtFilter, deliveredFilter]);

  const byProduct = useMemo(() => {
    const grouped = {};
    let items = [...enrichedSaleItems];

    if (search) {
      items = items.filter((si) => {
        const name = si.product?.name || si.productName || "";
        return name.toLowerCase().includes(search.toLowerCase());
      });
    }
    if (dateFrom) {
      items = items.filter((si) => {
        const d = (si.sale?.saleDate || si.saleDate || "").slice(0, 10);
        return d && d >= dateFrom;
      });
    }
    if (dateTo) {
      items = items.filter((si) => {
        const d = (si.sale?.saleDate || si.saleDate || "").slice(0, 10);
        return d && d <= dateTo;
      });
    }
    if (debtFilter === "debt") items = items.filter((si) => isDebtItem(si));
    else if (debtFilter === "cash") items = items.filter((si) => !isDebtItem(si));
    if (deliveredFilter === "delivered") items = items.filter((si) => isDeliveredItem(si));
    else if (deliveredFilter === "regular") items = items.filter((si) => !isDeliveredItem(si));

    items.forEach((si) => {
      const name = si.product?.name || si.productName || "Unknown";
      const pid = si.product?.id || 0;
      const key = name.toLowerCase().trim();
      if (!grouped[key]) {
        grouped[key] = {
          id: `grp-${pid || key}`,
          productId: pid,
          productName: name,
          currentStock: getQty(pid),
          quantity: 0,
          totalSold: 0,
          totalCost: 0,
          totalProfit: 0,
          lastDate: "",
        };
      }
      const qty = Number(si.quantity) || 1;
      const sellingPrice = Number(si.price) || 0;
      const buyingPrice = Number(si.costPrice) || 0;
      grouped[key].quantity += qty;
      grouped[key].totalSold += sellingPrice * qty;
      grouped[key].totalCost += buyingPrice * qty;
      grouped[key].totalProfit += (sellingPrice - buyingPrice) * qty;
      const d = si.sale?.saleDate || si.saleDate || si.createdAt || "";
      if (d && d > grouped[key].lastDate) grouped[key].lastDate = d;
    });

    let result = Object.values(grouped);

    result.sort((a, b) => {
      let va, vb;
      if (sortField === "date") { va = new Date(a.lastDate).getTime() || 0; vb = new Date(b.lastDate).getTime() || 0; }
      else if (sortField === "qty") { va = a.quantity; vb = b.quantity; }
      else if (sortField === "profit") { va = a.totalProfit; vb = b.totalProfit; }
      else if (sortField === "sold") { va = a.totalSold; vb = b.totalSold; }
      else { va = a.productName.toLowerCase(); vb = b.productName.toLowerCase(); return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va); }
      return sortDir === "asc" ? va - vb : vb - va;
    });

    return result;
  }, [enrichedSaleItems, search, dateFrom, dateTo, sortDir, sortField, debtFilter, deliveredFilter]);

  const { todayTotal, todayProfit, weekTotal, weekProfit, monthTotal, monthProfit, sixMonthTotal, sixMonthProfit, yearTotal, yearProfit } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const yearStart = `${now.getFullYear()}-01-01`;

    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - mondayOffset);
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    const sixMonthStartStr = sixMonthsAgo.toISOString().split("T")[0];

    let tTotal = 0, tProfit = 0;
    let wTotal = 0, wProfit = 0;
    let mTotal = 0, mProfit = 0;
    let sTotal = 0, sProfit = 0;
    let yTotal = 0, yProfit = 0;

    enrichedSaleItems.forEach((si) => {
      const date = (si.sale?.saleDate || si.saleDate || "").slice(0, 10);
      const sellingPrice = Number(si.price) || 0;
      const qty = Number(si.quantity) || 1;
      const buyingPrice = getBuyingPrice(si);
      const profit = (sellingPrice - buyingPrice) * qty;

      if (date >= todayStr) { tTotal += sellingPrice * qty; tProfit += profit; }
      if (date >= weekStartStr) { wTotal += sellingPrice * qty; wProfit += profit; }
      if (date >= monthStart) { mTotal += sellingPrice * qty; mProfit += profit; }
      if (date >= sixMonthStartStr) { sTotal += sellingPrice * qty; sProfit += profit; }
      if (date >= yearStart) { yTotal += sellingPrice * qty; yProfit += profit; }
    });

    return {
      todayTotal: tTotal, todayProfit: tProfit,
      weekTotal: wTotal, weekProfit: wProfit,
      monthTotal: mTotal, monthProfit: mProfit,
      sixMonthTotal: sTotal, sixMonthProfit: sProfit,
      yearTotal: yTotal, yearProfit: yProfit,
    };
  }, [enrichedSaleItems, productMap]);

  const getProfitColor = (profit) => profit >= 0 ? "#16a34a" : "#dc2626";

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const currentData = viewMode === "bydate" ? byDate : byProduct;
  const totalPages = Math.ceil(currentData.length / PAGE_SIZE);
  const paginatedData = currentData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, dateFrom, dateTo, sortField, sortDir, debtFilter, deliveredFilter, viewMode]);

  const bulk = useBulkSelect(byDate, (r) => r.id);

  const bulkDeleteItems = async () => {
    if (bulk.selected.length === 0) return;
    const count = bulk.selected.length;
    if (!(await confirmDialog(t("deleteSelectedSaleItemsConfirm", { count })))) return;
    setMessage({ text: "", type: "" });
    try {
      const deleted = bulk.selected.map((id) => byDate.find((si) => si.id === id)).filter(Boolean);
      for (const id of bulk.selected) await api.delete(`/sale-items/${id}`).catch(() => {});
      bulk.clear();
      await loadItems();
      setMessage({ text: t("deleted"), type: "success" });
      if (deleted.length) notifyUndo?.(`${deleted.length} ${t("saleItemsDeleted")}`, () => { deleted.forEach((si) => restoreSaleItem(si)); });
    } catch {
      setMessage({ text: t("failedToDelete"), type: "error" });
    }
  };

  const selectedProduct = products.find((p) => String(p.id) === String(form.productId));

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <Spinner size={28} text={t("loadingSaleItems")} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="bag-handle" size={17} color={colors.white} />
          </View>
          <Text style={styles.headerTitle}>{t("saleItems")}</Text>
          <Text style={styles.headerCount}>
            ({viewMode === "bydate" ? byDate.length : byProduct.length} {viewMode === "bydate" ? t("items") : t("products")})
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => (bulk.mode ? bulk.clear() : bulk.startMode())} style={[styles.selectBtn, bulk.mode && styles.selectBtnActive]} hitSlop={6}>
            <Ionicons name="checkbox-outline" size={13} color={colors.primary} />
            <Text style={styles.selectBtnText}>{bulk.mode ? t("cancel") : t("select")}</Text>
          </Pressable>
          <Pressable onPress={loadItems} style={styles.refreshBtn} hitSlop={6}>
            <Ionicons name="refresh" size={13} color={colors.slate600} />
            <Text style={styles.refreshBtnText}>{t("refresh")}</Text>
          </Pressable>
          <Pressable onPress={() => nav("/sale-manager")} style={styles.addBtn} hitSlop={6}>
            <Ionicons name="add" size={13} color={colors.white} />
            <Text style={styles.addBtnText}>{t("addSaleItem")}</Text>
          </Pressable>
        </View>
      </View>

      {message.text !== "" && (
        <View style={[styles.msgBar, message.type === "error" ? styles.msgBarError : styles.msgBarSuccess]}>
          <Text style={message.type === "error" ? styles.msgBarTextError : styles.msgBarTextSuccess}>{message.text}</Text>
        </View>
      )}

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editingId ? t("editSaleItem") : t("newSaleItem")}</Text>
          <View style={styles.formGrid}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>{t("productFromStock")} *</Text>
              <SelectField
                value={form.productId ? String(form.productId) : ""}
                onChange={handleProductSelect}
                options={products.map((p) => {
                  const pq = getQty(p.id);
                  return { value: String(p.id), label: `${p.name} — TZS ${Number(p.price).toFixed(2)} (${t("cost")}: TZS ${Number(p.buyingPrice || 0).toFixed(2)}) (${t("stock")}: ${pq})` };
                })}
                placeholder={t("selectProductDot")}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>{t("sellPriceAuto")}</Text>
              <TextField
                value={form.price}
                onChangeText={(v) => setForm({ ...form, price: v })}
                keyboardType="decimal-pad"
                placeholder="0.00"
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>{t("quantity")}</Text>
              <QuantityInput
                value={Number(form.quantity) || 0}
                onChange={(v) => setForm({ ...form, quantity: v })}
                piecesPerUnit={selectedProduct?.piecesPerUnit || 0}
                unit={selectedProduct?.unit || "piece"}
                min={1}
              />
            </View>
          </View>
          <View style={styles.formActions}>
            <Button size="sm" title={saving ? t("saving") : editingId ? t("update") : t("add")} variant="primary" loading={saving} disabled={saving} onPress={handleSubmit} />
            {editingId && (
              <Button size="sm" variant="outline" title={t("cancel")} onPress={resetForm} />
            )}
          </View>
        </View>
      )}

      <View style={styles.statsGrid}>
        {[
          { key: "today", label: t("today"), value: todayTotal, profit: todayProfit, c: "#0f172a", ic: "#64748b" },
          { key: "week", label: t("thisWeek"), value: weekTotal, profit: weekProfit, c: "#0f172a", ic: "#0ea5e9" },
          { key: "month", label: t("thisMonth"), value: monthTotal, profit: monthProfit, c: "#0f172a", ic: "#6366f1" },
          { key: "six", label: t("lastSixMonths"), value: sixMonthTotal, profit: sixMonthProfit, c: "#0f172a", ic: "#f59e0b" },
          { key: "year", label: t("thisYear"), value: yearTotal, profit: yearProfit, c: "#0f172a", ic: "#8b5cf6" },
        ].map((st) => (
          <View key={st.key} style={styles.statCard}>
            <View style={styles.statHead}>
              <Ionicons name="calendar" size={13} color={st.ic} />
              <Text style={styles.statLabel}>{st.label}</Text>
            </View>
            <Text style={styles.statValue}>TZS {st.value.toFixed(2)}</Text>
            {showProfit && (
              <Text style={[styles.statProfit, { color: getProfitColor(st.profit) }]}>
                {t("profit")}: TZS {st.profit.toFixed(2)}
              </Text>
            )}
          </View>
        ))}
        {debtStats.totalDebt > 0 && (
          <View style={[styles.statCard, { borderTopWidth: 3, borderTopColor: colors.danger }]}>
            <View style={styles.statHead}>
              <Ionicons name="card" size={13} color={colors.danger} />
              <Text style={[styles.statLabel, { color: colors.danger }]}>{t("outstandingDebt")}</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.danger }]}>TZS {debtStats.totalDebt.toLocaleString()}</Text>
            <Text style={styles.statProfit}>
              {t("today")}: TZS {debtStats.todayDebt.toLocaleString()} | {t("thisMonth")}: TZS {debtStats.monthDebt.toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={14} color={colors.slate400} style={styles.searchIcon} />
          <TextField value={search} onChangeText={setSearch} placeholder={t("searchProduct")} containerStyle={styles.searchInput} inputStyle={styles.searchInputField} />
        </View>
        <View style={styles.segRow}>
          <Pressable onPress={() => setViewMode("bydate")} style={[styles.segBtn, viewMode === "bydate" && styles.segBtnActive]}>
            <Ionicons name="time" size={12} color={viewMode === "bydate" ? colors.primary : colors.slate500} />
            <Text style={[styles.segBtnText, viewMode === "bydate" && styles.segBtnTextActive]}>{t("byDate")}</Text>
          </Pressable>
          <Pressable onPress={() => setViewMode("products")} style={[styles.segBtn, viewMode === "products" && styles.segBtnActive]}>
            <Ionicons name="layers" size={12} color={viewMode === "products" ? colors.primary : colors.slate500} />
            <Text style={[styles.segBtnText, viewMode === "products" && styles.segBtnTextActive]}>{t("byProduct")}</Text>
          </Pressable>
        </View>
        <View style={styles.segRow}>
          {[{ v: "all", lk: "all" }, { v: "cash", lk: "cash" }, { v: "debt", lk: "debt" }].map((f) => (
            <Pressable key={f.v} onPress={() => setDebtFilter(f.v)} style={[styles.segBtn, debtFilter === f.v && styles.segBtnActive]}>
              <Text style={[styles.segBtnText, debtFilter === f.v && (f.v === "debt" ? { color: colors.danger } : styles.segBtnTextActive)]}>
                {t(f.lk)}{f.v === "debt" && debtStats.totalDebt > 0 ? ` (${debtStats.totalDebt.toLocaleString()})` : ""}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.segRow}>
          {[{ v: "all", lk: "all" }, { v: "delivered", lk: "delivered" }, { v: "regular", lk: "regular" }].map((f) => (
            <Pressable key={f.v} onPress={() => setDeliveredFilter(f.v)} style={[styles.segBtn, deliveredFilter === f.v && styles.segBtnActive]}>
              <View style={styles.segInner}>
                {f.v === "delivered" && <Ionicons name="checkmark-circle" size={10} color={deliveredFilter === f.v ? colors.primary : colors.slate400} />}
                <Text style={[styles.segBtnText, deliveredFilter === f.v && (f.v === "delivered" ? { color: colors.primary } : styles.segBtnTextActive)]}>
                  {f.v === "regular" ? "Regular" : t(f.lk)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
        <View style={styles.dateRow}>
          <TextField value={dateFrom} onChangeText={setDateFrom} placeholder="YYYY-MM-DD" containerStyle={styles.dateInput} inputStyle={styles.dateInputField} />
          <Text style={styles.dateDash}>–</Text>
          <TextField value={dateTo} onChangeText={setDateTo} placeholder="YYYY-MM-DD" containerStyle={styles.dateInput} inputStyle={styles.dateInputField} />
        </View>
        <Pressable onPress={() => setSortDir(sortDir === "desc" ? "asc" : "desc")} style={styles.sortBtn} hitSlop={6}>
          <Ionicons name="swap-vertical" size={12} color={colors.slate600} />
          <Text style={styles.sortBtnText}>{sortDir === "desc" ? t("newest") : t("oldest")}</Text>
        </Pressable>
        {bulk.mode && (
          <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected} onSelectAll={bulk.toggleAll} onDelete={bulkDeleteItems} deleteLabel={t("deleteSelected")} />
        )}
      </View>

      <View style={styles.tableCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tableInner}>
            {viewMode === "bydate" ? (
              <>
                <View style={styles.trHead}>
                  {bulk.mode && (
                    <View style={[styles.td, styles.colCheck]}>
                      <Pressable onPress={bulk.toggleAll} hitSlop={8}>
                        <Ionicons name={bulk.allSelected ? "checkbox" : "square-outline"} size={16} color={bulk.allSelected ? colors.primary : colors.slate400} />
                      </Pressable>
                    </View>
                  )}
                  <Pressable style={[styles.th, styles.colProduct]} onPress={() => toggleSort("name")} hitSlop={6}>
                    <Text style={styles.thText}>{t("product")}{sortField === "name" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</Text>
                  </Pressable>
                  <Text style={[styles.th, styles.colCustomer]}>{t("customer")}</Text>
                  <Text style={[styles.th, styles.colCenter]}>{t("qty")}</Text>
                  <Text style={[styles.th, styles.colRight]}>{t("sellPrice")}</Text>
                  <Text style={[styles.th, styles.colRight]}>{t("cost")}</Text>
                  {showProfit && <Text style={[styles.th, styles.colRight]}>{t("profit")}</Text>}
                  <Text style={[styles.th, styles.colPayment]}>{t("payment")}</Text>
                  <Pressable style={[styles.th, styles.colDate]} onPress={() => toggleSort("date")} hitSlop={6}>
                    <Text style={styles.thText}>{t("dateAndTime")}{sortField === "date" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</Text>
                  </Pressable>
                  <Text style={[styles.th, styles.colActions]}>{t("actions")}</Text>
                </View>

                {paginatedData.length === 0 ? (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyText}>{t("noSaleItemsFound")}</Text>
                  </View>
                ) : paginatedData.map((si, idx) => {
                  const sellingPrice = Number(si.price) || 0;
                  const qty = Number(si.quantity) || 1;
                  const buyingPrice = getBuyingPrice(si);
                  const profit = (sellingPrice - buyingPrice) * qty;
                  const date = si.sale?.saleDate || si.saleDate || "";
                  const productName = si.product?.name || si.productName || "—";
                  const customerName = si.sale?.customer?.name || si.sale?.customer?.customerName || "—";
                  return (
                    <View key={si.id || idx} style={styles.tr} {...bulk.rowProps(si.id)}>
                      {bulk.mode && (
                        <View style={[styles.td, styles.colCheck]}>
                          <Pressable onPress={() => bulk.toggle(si.id)} hitSlop={8}>
                            <Ionicons name={bulk.selectedSet.has(si.id) ? "checkbox" : "square-outline"} size={16} color={bulk.selectedSet.has(si.id) ? colors.primary : colors.slate400} />
                          </Pressable>
                        </View>
                      )}
                      <View style={[styles.td, styles.colProduct]}>
                        <View style={styles.productCell}>
                          {si.product?.image ? (
                            <Image source={{ uri: si.product.image }} style={styles.productImg} />
                          ) : (
                            <View style={styles.productAvatar}>
                              <Text style={styles.productAvatarText}>{(productName || "—").charAt(0).toUpperCase()}</Text>
                            </View>
                          )}
                          <Text style={styles.productName} numberOfLines={1}>{productName}</Text>
                        </View>
                      </View>
                      <View style={[styles.td, styles.colCustomer]}>
                        <View style={styles.customerCell}>
                          <Text style={styles.mutedText} numberOfLines={1}>{customerName}</Text>
                          {si.sale?.description && si.sale.description.startsWith("Delivered Order") && (
                            <View style={styles.deliveredBadge}>
                              <Ionicons name="checkmark-circle" size={9} color="#2563eb" />
                              <Text style={styles.deliveredText}>{t("delivered")}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text style={[styles.td, styles.colCenter]}>{qty}</Text>
                      <Text style={[styles.td, styles.colRight, styles.soldText]}>TZS {(sellingPrice * qty).toFixed(2)}</Text>
                      <Text style={[styles.td, styles.colRight, styles.mutedText]}>TZS {(buyingPrice * qty).toFixed(2)}</Text>
                      {showProfit && (
                        <Text style={[styles.td, styles.colRight, { fontWeight: "700", color: getProfitColor(profit) }]}>
                          TZS {profit.toFixed(2)}
                          <Text style={styles.pctText}> ({profit > 0 ? "+" : ""}{buyingPrice > 0 ? ((profit / (buyingPrice * qty)) * 100).toFixed(0) : "—"}%)</Text>
                        </Text>
                      )}
                      <View style={styles.paymentCell}>
                        <View style={[styles.payBadge, { backgroundColor: isDebtItem(si) ? colors.dangerLight : "#f0fdf4" }]}>
                          <Text style={[styles.payBadgeText, { color: isDebtItem(si) ? colors.danger : "#16a34a" }]}>
                            {isDebtItem(si) ? t("debt") : isPaidDebtItem(si) ? t("paid") : t("cash")}
                          </Text>
                        </View>
                        {si.sale?.paymentStatus === "PAID" && si.sale?.paymentMethod === "cash" && (
                          <View style={styles.collectedBadge}>
                            <Text style={styles.collectedText}>{t("collected")}</Text>
                          </View>
                        )}
                      </View>
                      <View style={[styles.td, styles.colDate, styles.dateCell]}>
                        {date ? (
                          <>
                            <Text style={styles.dateText}>{new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</Text>
                            <Text style={styles.timeText}>{new Date(date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</Text>
                          </>
                        ) : <Text style={styles.dateText}>—</Text>}
                      </View>
                      <View style={[styles.td, styles.colActions, styles.actionsCell]}>
                        <Pressable onPress={() => nav("/sale-manager", { sale: si.sale?.id || "" })} hitSlop={6}>
                          <Text style={styles.viewText}>{t("view")}</Text>
                        </Pressable>
                        <Pressable onPress={() => deleteItem(si.id)} hitSlop={6} style={{ padding: 2 }}>
                          <Ionicons name="trash-outline" size={13} color={colors.danger} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </>
            ) : (
              <>
                <View style={styles.trHead}>
                  <Pressable style={[styles.th, styles.colProduct]} onPress={() => toggleSort("name")} hitSlop={6}>
                    <Text style={styles.thText}>{t("product")}{sortField === "name" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</Text>
                  </Pressable>
                  <Pressable style={[styles.th, styles.colCenter]} onPress={() => toggleSort("qty")} hitSlop={6}>
                    <Text style={styles.thText}>{t("totalSold")}{sortField === "qty" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</Text>
                  </Pressable>
                  <Text style={[styles.th, styles.colCenter]}>{t("currentStock")}</Text>
                  <Pressable style={[styles.th, styles.colRight]} onPress={() => toggleSort("sold")} hitSlop={6}>
                    <Text style={styles.thText}>{t("totalRevenue")}{sortField === "sold" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</Text>
                  </Pressable>
                  <Text style={[styles.th, styles.colRight]}>{t("totalCost")}</Text>
                  {showProfit && (
                    <Pressable style={[styles.th, styles.colRight]} onPress={() => toggleSort("profit")} hitSlop={6}>
                      <Text style={styles.thText}>{t("totalProfit")}{sortField === "profit" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</Text>
                    </Pressable>
                  )}
                  <Pressable style={[styles.th, styles.colDate]} onPress={() => toggleSort("date")} hitSlop={6}>
                    <Text style={styles.thText}>{t("lastSale")}{sortField === "date" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</Text>
                  </Pressable>
                </View>

                {paginatedData.length === 0 ? (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyText}>{t("noSaleItemsFound")}</Text>
                  </View>
                ) : paginatedData.map((g, idx) => {
                  const profit = g.totalProfit;
                  const lowStock = g.currentStock < 10;
                  return (
                    <View key={g.id || idx} style={styles.tr}>
                      <Text style={[styles.td, styles.colProduct, { fontWeight: "600" }]} numberOfLines={1}>{g.productName}</Text>
                      <Text style={[styles.td, styles.colCenter, { fontWeight: "700" }]}>{g.quantity}</Text>
                      <Text style={[styles.td, styles.colCenter, { fontWeight: "700", color: g.currentStock <= 0 ? colors.danger : lowStock ? colors.warning : "#16a34a" }]}>
                        {g.currentStock}
                      </Text>
                      <Text style={[styles.td, styles.colRight, styles.soldText]}>TZS {g.totalSold.toFixed(2)}</Text>
                      <Text style={[styles.td, styles.colRight, styles.mutedText]}>TZS {g.totalCost.toFixed(2)}</Text>
                      {showProfit && (
                        <Text style={[styles.td, styles.colRight, { fontWeight: "700", color: getProfitColor(profit) }]}>
                          TZS {profit.toFixed(2)}
                          <Text style={styles.pctText}> ({profit > 0 ? "+" : ""}{g.totalCost > 0 ? ((profit / g.totalCost) * 100).toFixed(0) : "—"}%)</Text>
                        </Text>
                      )}
                      <Text style={[styles.td, styles.colDate, styles.dateText]}>
                        {g.lastDate ? new Date(g.lastDate).toLocaleDateString() : "—"}
                      </Text>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        </ScrollView>
      </View>

      {totalPages > 1 && (
        <View style={styles.pager}>
          <Text style={styles.pagerInfo}>{t("pageOf", { page, totalPages })} ({currentData.length} {viewMode === "bydate" ? t("items") : t("products")})</Text>
          <View style={styles.pagerBtns}>
            <Pressable onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={[styles.pageNav, page <= 1 && styles.pageNavDisabled]} hitSlop={6}>
              <Ionicons name="chevron-back" size={13} color={page <= 1 ? colors.slate300 : colors.slate600} />
              <Text style={[styles.pageNavText, page <= 1 && styles.pageNavTextDisabled]}>{t("prev")}</Text>
            </Pressable>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Pressable key={p} onPress={() => setPage(p)} style={[styles.pageNum, p === page && styles.pageNumActive]} hitSlop={6}>
                <Text style={[styles.pageNumText, p === page && styles.pageNumTextActive]}>{p}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={[styles.pageNav, page >= totalPages && styles.pageNavDisabled]} hitSlop={6}>
              <Text style={[styles.pageNavText, page >= totalPages && styles.pageNavTextDisabled]}>{t("next")}</Text>
              <Ionicons name="chevron-forward" size={13} color={page >= totalPages ? colors.slate300 : colors.slate600} />
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.summaryBar}>
        <View>
          <Text style={styles.summaryLabel}>{viewMode === "bydate" ? t("filteredItems") : t("products")}</Text>
          <Text style={styles.summaryValue}>{viewMode === "bydate" ? byDate.length : byProduct.length}</Text>
        </View>
        <View>
          <Text style={styles.summaryLabel}>{t("totalSold")}</Text>
          <Text style={styles.summaryValue}>
            TZS {(viewMode === "bydate" ? byDate : byProduct).reduce((s, si) => {
              if (viewMode === "bydate") return s + ((Number(si.price) || 0) * (Number(si.quantity) || 1));
              return s + (Number(si.totalSold) || 0);
            }, 0).toFixed(2)}
          </Text>
        </View>
        {showProfit && (
          <View>
            <Text style={styles.summaryLabel}>{t("totalProfit")}</Text>
            <Text style={styles.summaryValue}>
              TZS {(viewMode === "bydate" ? byDate : byProduct).reduce((s, si) => {
                if (viewMode === "bydate") {
                  const sp = Number(si.price) || 0;
                  const cp = getBuyingPrice(si);
                  const qty = Number(si.quantity) || 1;
                  return s + (sp - cp) * qty;
                }
                return s + (Number(si.totalProfit) || 0);
              }, 0).toFixed(2)}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50, padding: spacing.sm },
  body: { gap: spacing.sm, paddingBottom: 64 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 400 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm, flexShrink: 0 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1, flexWrap: "wrap" },
  headerIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: font.lg, fontWeight: "700", color: colors.slate900 },
  headerCount: { color: colors.slate400, fontSize: font.xs },
  headerActions: { flexDirection: "row", gap: 6, flexWrap: "wrap", flexShrink: 0 },
  selectBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.slate300, borderRadius: 8, backgroundColor: colors.white },
  selectBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  selectBtnText: { fontSize: font.sm, fontWeight: "600", color: colors.primary },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.slate300, borderRadius: 8, backgroundColor: colors.white },
  refreshBtnText: { fontSize: font.sm, fontWeight: "600", color: colors.slate600 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, backgroundColor: colors.primary },
  addBtnText: { color: colors.white, fontSize: font.sm, fontWeight: "600" },

  msgBar: { padding: spacing.md, borderRadius: radius.md, flexShrink: 0 },
  msgBarSuccess: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  msgBarError: { backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: "#fecaca" },
  msgBarTextSuccess: { color: "#166534" },
  msgBarTextError: { color: colors.dangerDark },

  formCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, padding: spacing.lg, flexShrink: 0, ...shadow.card },
  formTitle: { fontSize: font.base, fontWeight: "700", color: colors.slate900, marginBottom: spacing.md },
  formGrid: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, flexWrap: "wrap" },
  formField: { flex: 1, minWidth: 160 },
  formLabel: { fontSize: font.xs, fontWeight: "700", color: colors.slate500, textTransform: "uppercase", marginBottom: 4 },
  formActions: { flexDirection: "row", gap: spacing.sm },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, flexShrink: 0 },
  statCard: { flex: 1, minWidth: 150, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, padding: spacing.lg, gap: 4, ...shadow.card },
  statHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  statLabel: { fontSize: font.xs, color: colors.slate500, fontWeight: "600", textTransform: "uppercase" },
  statValue: { fontSize: font.xl, fontWeight: "700", color: colors.slate900 },
  statProfit: { fontSize: font.xs, color: colors.slate500, fontWeight: "600" },

  toolbar: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center", flexShrink: 0 },
  searchWrap: { position: "relative", flex: 1, minWidth: 200, maxWidth: 320 },
  searchIcon: { position: "absolute", left: 10, top: 12, zIndex: 1 },
  searchInput: { marginBottom: 0 },
  searchInputField: { paddingLeft: 32 },
  segRow: { flexDirection: "row", backgroundColor: colors.slate100, borderRadius: 6, padding: 2, flexShrink: 0 },
  segBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 4 },
  segBtnActive: { backgroundColor: colors.white, ...shadow.card },
  segBtnText: { fontSize: font.xs, fontWeight: "600", color: colors.slate500 },
  segBtnTextActive: { color: colors.primary },
  segInner: { flexDirection: "row", alignItems: "center", gap: 3 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  dateInput: { marginBottom: 0, width: 110 },
  dateInputField: { fontSize: font.xs, paddingVertical: 8, paddingHorizontal: 8 },
  dateDash: { color: colors.slate400 },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.slate300, borderRadius: 6, backgroundColor: colors.white },
  sortBtnText: { fontSize: font.xs, fontWeight: "600", color: colors.slate600 },

  tableCard: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, overflow: "hidden", minHeight: 120, ...shadow.card },
  tableInner: { minWidth: 760 },
  trHead: { flexDirection: "row", backgroundColor: colors.slate50, borderBottomWidth: 2, borderBottomColor: colors.slate200 },
  th: { paddingVertical: 10, paddingHorizontal: 14, flexDirection: "row", alignItems: "center" },
  thText: { fontSize: font.xs, fontWeight: "700", color: colors.slate500, textTransform: "uppercase" },
  tr: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.slate100, minHeight: 44 },
  td: { paddingVertical: 8, paddingHorizontal: 14, justifyContent: "center" },
  colCheck: { width: 32, alignItems: "center", justifyContent: "center" },
  colProduct: { flex: 1.6, minWidth: 140 },
  colCustomer: { flex: 1, minWidth: 120 },
  colCenter: { width: 60, textAlign: "center", alignItems: "center" },
  colRight: { width: 110, alignItems: "flex-end", textAlign: "right" },
  colPayment: { width: 90, alignItems: "center" },
  colDate: { width: 100 },
  colActions: { width: 80, alignItems: "center" },

  productCell: { flexDirection: "row", alignItems: "center", gap: 6 },
  productImg: { width: 26, height: 26, borderRadius: 5, borderWidth: 1, borderColor: colors.slate200 },
  productAvatar: { width: 26, height: 26, borderRadius: 5, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  productAvatarText: { fontSize: 11, fontWeight: "700", color: colors.primary },
  productName: { fontWeight: "600", color: colors.slate700, flexShrink: 1, maxWidth: 140 },
  customerCell: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  mutedText: { fontSize: font.xs, color: colors.slate500 },
  soldText: { fontWeight: "600", color: colors.slate800 },
  pctText: { fontSize: 10, fontWeight: "400" },
  deliveredBadge: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 1, paddingHorizontal: 6, borderRadius: radius.pill, backgroundColor: "#dbeafe", borderWidth: 1, borderColor: "#93c5fd" },
  deliveredText: { fontSize: 9, fontWeight: "700", color: colors.primary },
  paymentCell: { width: 90, paddingVertical: 8, paddingHorizontal: 14, justifyContent: "center", alignItems: "center", gap: 3 },
  payBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.pill },
  payBadgeText: { fontSize: 10, fontWeight: "600" },
  collectedBadge: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: radius.pill, backgroundColor: "#ecfdf5", borderWidth: 1, borderColor: "#a7f3d0" },
  collectedText: { fontSize: 9, fontWeight: "600", color: "#059669" },
  dateCell: { flexDirection: "column", gap: 1 },
  dateText: { fontSize: font.xs, color: colors.slate400 },
  timeText: { fontSize: 10, color: colors.slate500 },
  actionsCell: { flexDirection: "row", alignItems: "center", gap: 8 },
  viewText: { color: colors.primary, fontSize: font.xs, fontWeight: "600" },

  emptyRow: { padding: 40, alignItems: "center" },
  emptyText: { color: colors.slate400, fontSize: font.sm },

  pager: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.slate200, backgroundColor: colors.slate50, flexShrink: 0 },
  pagerInfo: { fontSize: font.xs, color: colors.slate500 },
  pagerBtns: { flexDirection: "row", gap: 4, alignItems: "center" },
  pageNav: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.slate200, borderRadius: 5, backgroundColor: colors.white },
  pageNavDisabled: { backgroundColor: colors.slate100 },
  pageNavText: { fontSize: font.xs, fontWeight: "600", color: colors.slate600 },
  pageNavTextDisabled: { color: colors.slate300 },
  pageNum: { width: 26, height: 26, borderWidth: 1, borderColor: colors.slate200, borderRadius: 5, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  pageNumActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pageNumText: { fontSize: font.xs, fontWeight: "600", color: colors.slate600 },
  pageNumTextActive: { color: colors.white },

  summaryBar: { marginTop: spacing.lg, backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, padding: spacing.lg, flexDirection: "row", gap: 32, flexWrap: "wrap", flexShrink: 0 },
  summaryLabel: { fontSize: font.xs, color: colors.slate400, textTransform: "uppercase", fontWeight: "600" },
  summaryValue: { fontWeight: "700", color: colors.slate900, fontSize: font.base },
});