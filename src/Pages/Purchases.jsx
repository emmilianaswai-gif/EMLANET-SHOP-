import { useEffect, useState, useMemo } from "react";
import { View, Text, Pressable, Image, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import ProductSelector from "../components/ProductSelector";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { useUndo } from "../UndoContext";
import { QuantityInput, SelectField, TextField, Button, Modal, Card, EmptyState } from "../components/ui";
import { confirmDialog } from "../utils/confirm";
import { canViewProfit } from "../utils/roleChecks";
import { t, useLanguage } from "../i18n";
import { colors, radius, spacing, shadow } from "../theme";

const STATUS_MAP = {
  Pending: { label: t("orderStatusNew"), bg: "#dbeafe", color: "#2563eb", border: "#93c5fd" },
  Processing: { label: t("orderStatusProcessing"), bg: "#fef3c7", color: "#d97706", border: "#fcd34d" },
  Approved: { label: t("orderStatusDelivered"), bg: "#d1fae5", color: "#059669", border: "#6ee7b7" },
  Rejected: { label: t("orderStatusRejected"), bg: "#fee2e2", color: "#dc2626", border: "#fca5a5" },
};

const STATUS_OPTIONS = Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }));

const statusTint = (status) => STATUS_MAP[status] || STATUS_MAP.Pending;

function RowCheckBox({ checked, onToggle }) {
  return (
    <Pressable onPress={onToggle} hitSlop={6}>
      <Ionicons
        name={checked ? "checkbox" : "square-outline"}
        size={18}
        color={checked ? colors.primary : colors.slate300}
      />
    </Pressable>
  );
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "\u2014");

export default function Purchases() {
  useLanguage();
  const showProfit = canViewProfit();
  const { notifyUndo } = useUndo();
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [exchangeRecords, setExchangeRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [statusFilter, setStatusFilter] = useState("all");
  const [showPanel, setShowPanel] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedCards, setExpandedCards] = useState({});
  const [editPurchase, setEditPurchase] = useState(null);
  const [editCart, setEditCart] = useState([]);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editSelProdId, setEditSelProdId] = useState(null);
  const [editQty, setEditQty] = useState(1);
  const [editCost, setEditCost] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [cart, setCart] = useState([]);
  const [selProdId, setSelProdId] = useState(null);
  const [qty, setQty] = useState(1);
  const [cost, setCost] = useState("");
  const [saving, setSaving] = useState(false);

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const applyData = ([pr, pu, pi, sa, st, xr]) => {
    setProducts(pr?.data && Array.isArray(pr.data) ? pr.data : []);
    setPurchases(pu?.data && Array.isArray(pu.data) ? pu.data : []);
    setPurchaseItems(pi?.data && Array.isArray(pi.data) ? pi.data : []);
    setSales(sa?.data && Array.isArray(sa.data) ? sa.data : []);
    setStocks(st?.data && Array.isArray(st.data) ? st.data : []);
    setExchangeRecords(xr?.data && Array.isArray(xr.data) ? xr.data : (xr?.data?.content || xr?.data?.records || []));
  };

  const load = async () => {
    try {
      const [pr, pu, pi, sa, st, xr] = await Promise.all([
        api.get("/products").catch(() => ({ data: [] })),
        api.get("/purchases").catch(() => ({ data: [] })),
        api.get("/purchase-items").catch(() => ({ data: [] })),
        api.get("/sales").catch(() => ({ data: [] })),
        api.get("/stocks").catch(() => ({ data: [] })),
        api.get("/exchange-storing").catch(() => ({ data: [] })),
      ]);
      applyData([pr, pu, pi, sa, st, xr]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const reload = async () => {
    const [pr, pu, pi, sa, st, xr] = await Promise.all([
      api.get("/products").catch(() => ({ data: [] })),
      api.get("/purchases").catch(() => ({ data: [] })),
      api.get("/purchase-items").catch(() => ({ data: [] })),
      api.get("/sales").catch(() => ({ data: [] })),
      api.get("/stocks").catch(() => ({ data: [] })),
      api.get("/exchange-storing").catch(() => ({ data: [] })),
    ]);
    applyData([pr, pu, pi, sa, st, xr]);
  };

  const handleSelect = (pid) => {
    setSelProdId(pid);
    const p = products.find((x) => x.id === pid);
    if (p) setCost(p.buyingPrice || p.price || "");
  };

  const addItem = () => {
    if (!selProdId || !cost) return;
    const p = products.find((x) => x.id === Number(selProdId));
    setCart([...cart, { productId: Number(selProdId), productName: p?.name || "", qty: Number(qty), cost: Number(cost) }]);
    setSelProdId(null); setQty(1); setCost("");
  };

  const removeItem = (i) => setCart(cart.filter((_, idx) => idx !== i));
  const totalQty = cart.reduce((sum, i) => sum + i.qty, 0);
  const totalCost = cart.reduce((sum, i) => sum + i.qty * i.cost, 0);

  const resetPanel = () => {
    setCart([]); setCustomerName(""); setCustomerContact(""); setSelProdId(null); setQty(1); setCost(""); setShowPanel(false);
  };

  const savePurchase = async () => {
    if (!cart.length) return setMessage({ text: t("addAtLeastOneItem"), type: "error" });
    setSaving(true);
    try {
      setMessage({ text: "", type: "" });
      const desc = customerName.trim() ? `Order \u2014 ${customerName.trim()} \u2014 ${cart.length} item(s)` : `Order \u2014 ${cart.length} item(s)`;
      const { data: purchase } = await api.post("/purchases", {
        productName: desc,
        quantity: totalQty,
        unitPrice: totalCost,
        purchaseDate: new Date().toISOString(),
        status: "Pending",
        customerName: customerName.trim() || null,
        customerContact: customerContact.trim() || null,
      });
      for (const ci of cart) {
        await api.post("/purchase-items", { quantity: ci.qty, costPrice: ci.cost, purchase: { id: purchase.id }, product: { id: ci.productId } }).catch(() => {});
        const currentStock = await api.get(`/stocks/product/${ci.productId}`).catch(() => null);
        const currentQty = currentStock?.data?.quantity || 0;
        await api.post("/stock-history", { product: { id: ci.productId }, quantityChange: ci.qty, resultingQuantity: currentQty + ci.qty, transactionType: "Added" }).catch(() => {});
      }
      resetPanel();
      setMessage({ text: t("orderPlaced"), type: "success" });
      await reload();
    } catch { setMessage({ text: t("failedToSave"), type: "error" }); }
    finally { setSaving(false); }
  };

  const restorePurchase = async (purchase, items) => {
    const { data: restored } = await api.post("/purchases", {
      productName: purchase.productName || `Order \u2014 ${items.length} item(s)`,
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      purchaseDate: purchase.purchaseDate || new Date().toISOString(),
      status: purchase.status || "Pending",
      customerName: purchase.customerName || null,
      customerContact: purchase.customerContact || null,
    }).catch(() => ({ data: null }));
    if (restored?.id) {
      for (const pi of items) {
        await api.post("/purchase-items", { quantity: pi.quantity, costPrice: pi.costPrice, purchase: { id: restored.id }, product: { id: pi.product?.id } }).catch(() => {});
      }
    }
    await reload();
    if (notifyUndo) notifyUndo(t("orderRestored"), () => {}, { timeout: 2500, undo: false });
  };

  const deletePurchase = async (id) => {
    if (!(await confirmDialog(t("deleteOrderConfirm")))) return;
    const purchase = purchases.find((p) => p.id === id);
    const items = purchaseItems.filter((x) => x.purchase?.id === id);
    for (const pi of items) await api.delete(`/purchase-items/${pi.id}`).catch(() => {});
    await api.delete(`/purchases/${id}`);
    await reload();
    if (purchase && notifyUndo) notifyUndo(t("orderDeleted", { name: purchase.productName || `#${purchase.id}` }), () => restorePurchase(purchase, items));
  };

  const getOrderItems = (purchaseId) => purchaseItems.filter((pi) => pi.purchase?.id === purchaseId);
  const getOrderTotal = (purchaseId) => {
    const items = getOrderItems(purchaseId);
    return items.reduce((sum, pi) => sum + (Number(pi.quantity) * Number(pi.costPrice || 0)), 0);
  };
  const getExchangedQty = (productId) => {
    const pid = Number(productId);
    return exchangeRecords
      .filter((r) => {
        const st = (r.status || "").toLowerCase();
        if (st !== "approved" && st !== "active") return false;
        return Number(r.product?.id || r.productId) === pid;
      })
      .reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  };
  const getOrderProfit = (purchaseId) => {
    const items = getOrderItems(purchaseId);
    return items.reduce((sum, pi) => {
      const prod = products.find((p) => p.id === pi.product?.id);
      const qty = Number(pi.quantity) || 0;
      const costPrice = Number(pi.costPrice) || 0;
      const sellingPrice = Number(prod?.price) || costPrice;
      const exchanged = Math.min(qty, getExchangedQty(pi.product?.id));
      return sum + (sellingPrice - costPrice) * (qty - exchanged);
    }, 0);
  };
  const getOrderProductSummary = (purchaseId) => {
    const items = getOrderItems(purchaseId);
    return items.map((pi) => {
      const prod = products.find((p) => p.id === pi.product?.id);
      const qty = Number(pi.quantity) || 0;
      const costPrice = Number(pi.costPrice) || 0;
      const sellingPrice = Number(prod?.price) || costPrice;
      const unitProfit = sellingPrice - costPrice;
      const exchangedQty = Math.min(qty, getExchangedQty(pi.product?.id));
      return {
        name: prod?.name || pi.product?.name || "Unknown",
        qty,
        unitProfit,
        profit: unitProfit * qty,
        exchangedQty,
        profitAfterExchange: unitProfit * (qty - exchangedQty),
      };
    });
  };
  const toggleCard = (id) => setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));

  const updateStatus = async (purchase, ns) => {
    setPurchases((prev) => prev.map((o) => (o.id === purchase.id ? { ...o, status: ns } : o)));
    try {
      await api.put(`/purchases/${purchase.id}`, { ...purchase, status: ns });

      if (ns === "Approved") {
        const items = getOrderItems(purchase.id);
        let grandTotal = 0;
        let totalCost = 0;
        const saleItems = [];

        for (const pi of items) {
          const prod = products.find((p) => p.id === pi.product?.id);
          const sellingPrice = Number(prod?.price) || Number(pi.costPrice) || 0;
          const costPrice = Number(pi.costPrice) || 0;
          const qty = Number(pi.quantity) || 0;
          grandTotal += sellingPrice * qty;
          totalCost += costPrice * qty;
          saleItems.push({
            quantity: qty,
            price: sellingPrice,
            costPrice: costPrice,
            product: { id: Number(pi.product?.id) },
          });
        }

        const profit = grandTotal - totalCost;

        let customerId = null;
        if (purchase.customerName) {
          const custRes = await api.post("/customers", {
            name: purchase.customerName,
            phone: purchase.customerContact || "",
            type: "regular",
            paymentMethod: "cash",
            amount: 0,
            paid: 0,
          }).catch(() => null);
          if (custRes?.data?.id) customerId = custRes.data.id;
        }

        const salePayload = {
          description: `Delivered Order #${purchase.id} \u2014 ${items.length} item(s)${purchase.customerName ? ` [${purchase.customerName}]` : ""}`,
          grandTotal,
          quantity: items.reduce((s, i) => s + Number(i.quantity), 0),
          saleDate: new Date().toISOString(),
          status: "completed",
          paymentMethod: "cash",
          customerType: "regular",
          paymentStatus: "PAID",
          profit,
          customer: customerId ? { id: Number(customerId) } : null,
        };

        const { data: savedSale } = await api.post("/sales", salePayload).catch(() => ({ data: null }));

        if (savedSale) {
          for (const pi of items) {
            const prod = products.find((p) => p.id === pi.product?.id);
            if (prod) {
              const qty = Number(pi.quantity) || 0;
              const sellingPrice = Number(prod?.price) || Number(pi.costPrice) || 0;
              const costPrice = Number(pi.costPrice) || 0;

              await api.post("/sale-items", {
                quantity: qty,
                price: sellingPrice,
                costPrice: costPrice,
                sale: { id: savedSale.id },
                product: { id: Number(pi.product?.id) },
              }).catch(() => {});

              const currentStock = Number(prod.quantity) || 0;
              const newQty = Math.max(0, currentStock - qty);
              await api.put(`/products/${prod.id}`, {
                buyingPrice: prod.buyingPrice ?? 0, category: prod.category ? { id: prod.category.id } : null,
                expiryDate: prod.expiryDate, name: prod.name, price: prod.price ?? 0, sku: prod.sku ?? "",
                supplier: prod.supplier ? { id: prod.supplier.id } : null, unit: prod.unit ?? "piece", quantity: newQty,
              }).catch(() => {});

              const stock = stocks.find((s) => (s.product?.id || s.productId) === prod.id);
              if (stock) {
                const stockNewQty = Math.max(0, (Number(stock.quantity) || 0) - qty);
                await api.put(`/stocks/${stock.id}`, {
                  product: { id: prod.id },
                  quantity: stockNewQty,
                  lowStockThreshold: stock.lowStockThreshold || 10,
                  date: new Date().toISOString(),
                }).catch(() => {});
              }

              await api.post("/stock-history", {
                product: { id: Number(pi.product?.id) },
                quantityChange: -qty,
                resultingQuantity: newQty,
                transactionType: "Sold",
              }).catch(() => {});
            }
          }

          const [salesRes, prodRes, stockRes] = await Promise.all([
            api.get("/sales").catch(() => ({ data: [] })),
            api.get("/products").catch(() => ({ data: [] })),
            api.get("/stocks").catch(() => ({ data: [] })),
          ]);
          if (salesRes?.data && Array.isArray(salesRes.data)) setSales(salesRes.data);
          if (prodRes?.data && Array.isArray(prodRes.data)) setProducts(prodRes.data);
          if (stockRes?.data && Array.isArray(stockRes.data)) setStocks(stockRes.data);

          const profitMsg = showProfit ? ` \u2014 ${t("profitLabel")}: TZS ${profit.toLocaleString()}` : "";
          setMessage({ text: t("orderDeliveredSale", { id: purchase.id, sale: savedSale.id, profit: profitMsg }), type: "success" });
          setTimeout(() => setMessage({ text: "", type: "" }), 4000);
        }
      }
    } catch {
      setPurchases((prev) => prev.map((o) => (o.id === purchase.id ? { ...o, status: purchase.status } : o)));
    }
  };

  const openEdit = (purchase) => {
    const items = getOrderItems(purchase.id);
    setEditPurchase(purchase);
    setEditName(purchase.customerName || "");
    setEditContact(purchase.customerContact || "");
    setEditCart(items.map((pi) => ({
      purchaseItemId: pi.id,
      productId: pi.product?.id,
      productName: products.find((p) => p.id === pi.product?.id)?.name || pi.product?.name || "Unknown",
      qty: pi.quantity,
      cost: Number(pi.costPrice) || 0,
    })));
    setEditSelProdId(null); setEditQty(1); setEditCost("");
  };

  const closeEdit = () => { setEditPurchase(null); setEditCart([]); setEditName(""); setEditContact(""); };

  const editAddItem = () => {
    if (!editSelProdId || !editCost) return;
    const p = products.find((x) => x.id === Number(editSelProdId));
    setEditCart([...editCart, { purchaseItemId: null, productId: Number(editSelProdId), productName: p?.name || "", qty: Number(editQty), cost: Number(editCost) }]);
    setEditSelProdId(null); setEditQty(1); setEditCost("");
  };

  const editRemoveItem = (i) => setEditCart(editCart.filter((_, idx) => idx !== i));

  const saveEdit = async () => {
    if (!editPurchase) return;
    setSavingEdit(true);
    try {
      const newTotal = editCart.reduce((s, i) => s + i.qty * i.cost, 0);
      const newQty = editCart.reduce((s, i) => s + i.qty, 0);
      const desc = editName.trim() ? `Order \u2014 ${editName.trim()} \u2014 ${editCart.length} item(s)` : `Order \u2014 ${editCart.length} item(s)`;
      await api.put(`/purchases/${editPurchase.id}`, {
        ...editPurchase,
        productName: desc,
        quantity: newQty,
        unitPrice: newTotal,
        customerName: editName.trim() || null,
        customerContact: editContact.trim() || null,
      });
      const existingItems = purchaseItems.filter((pi) => pi.purchase?.id === editPurchase.id);
      for (const ei of existingItems) {
        if (!editCart.find((ci) => ci.purchaseItemId === ei.id)) {
          await api.delete(`/purchase-items/${ei.id}`).catch(() => {});
        }
      }
      for (const ci of editCart) {
        if (ci.purchaseItemId) {
          await api.put(`/purchase-items/${ci.purchaseItemId}`, {
            id: ci.purchaseItemId,
            quantity: ci.qty,
            costPrice: ci.cost,
            purchase: { id: editPurchase.id },
            product: { id: ci.productId },
          }).catch(() => {});
        } else {
          await api.post("/purchase-items", {
            quantity: ci.qty,
            costPrice: ci.cost,
            purchase: { id: editPurchase.id },
            product: { id: ci.productId },
          }).catch(() => {});
        }
      }
      closeEdit();
      setMessage({ text: t("orderUpdated"), type: "success" });
      await reload();
    } catch { setMessage({ text: t("failedToUpdateOrder"), type: "error" }); }
    finally { setSavingEdit(false); }
  };

  const stats = useMemo(() => {
    const newCount = purchases.filter((p) => p.status === "Pending").length;
    const processingCount = purchases.filter((p) => p.status === "Processing").length;
    const deliveredCount = purchases.filter((p) => p.status === "Approved").length;
    const rejectedCount = purchases.filter((p) => p.status === "Rejected").length;
    return { total: purchases.length, newCount, processingCount, deliveredCount, rejectedCount };
  }, [purchases]);

  const filteredPurchases = useMemo(() => {
    let list = [...purchases];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((p) =>
        p.customerName?.toLowerCase().includes(s) ||
        p.customerContact?.includes(s) ||
        p.productName?.toLowerCase().includes(s) ||
        String(p.id).includes(s)
      );
    }
    if (statusFilter === "new") list = list.filter((p) => p.status === "Pending");
    else if (statusFilter === "processing") list = list.filter((p) => p.status === "Processing");
    else if (statusFilter === "delivered") list = list.filter((p) => p.status === "Approved");
    else if (statusFilter === "rejected") list = list.filter((p) => p.status === "Rejected");
    list.sort((a, b) => {
      const va = new Date(a.purchaseDate || 0);
      const vb = new Date(b.purchaseDate || 0);
      return vb - va;
    });
    return list;
  }, [purchases, search, statusFilter]);

  const [orderPage, setOrderPage] = useState(1);
  const ORDER_PAGE_SIZE = 10;
  const totalOrderPages = Math.max(1, Math.ceil(filteredPurchases.length / ORDER_PAGE_SIZE));
  const paginatedOrders = filteredPurchases.slice((orderPage - 1) * ORDER_PAGE_SIZE, orderPage * ORDER_PAGE_SIZE);
  useEffect(() => { setOrderPage(1); }, [search, statusFilter]);

  const bulk = useBulkSelect(filteredPurchases, (p) => p.id);

  const deleteSelectedPurchases = async () => {
    if (bulk.selected.length === 0) return;
    if (!(await confirmDialog(t("deleteSelectedOrdersConfirm", { count: bulk.selected.length })))) return;
    let failed = 0;
    const deleted = [];
    for (const id of bulk.selected) {
      const purchase = purchases.find((p) => p.id === id);
      if (!purchase) continue;
      const items = purchaseItems.filter((x) => x.purchase?.id === id);
      try {
        for (const pi of items) await api.delete(`/purchase-items/${pi.id}`).catch(() => {});
        await api.delete(`/purchases/${id}`);
        deleted.push({ purchase, items });
      } catch { failed++; }
    }
    bulk.clear();
    await reload();
    if (failed > 0) setMessage({ text: t("deletedMostOrders", { count: failed }), type: "error" });
    if (deleted.length && notifyUndo) notifyUndo(t("ordersDeleted", { count: deleted.length }), () => { deleted.forEach((d) => restorePurchase(d.purchase, d.items)); });
  };

  if (loading) return (
    <View style={s.loadingWrap}>
      <Spinner size={28} text={t("loading")} />
    </View>
  );

  const statCards = [
    { label: t("allOrders"), value: stats.total, bg: "#f8fafc", border: "#e2e8f0", accent: "#475569", top: "#94a3b8", icon: "cart" },
    { label: t("orderNew"), value: stats.newCount, bg: "#eff6ff", border: "#dbeafe", accent: "#2563eb", top: "#2563eb", icon: "time" },
    { label: t("orderProcessing"), value: stats.processingCount, bg: "#fffbeb", border: "#fef3c7", accent: "#d97706", top: "#d97706", icon: "sync" },
    { label: t("orderDelivered"), value: stats.deliveredCount, bg: "#f0fdf4", border: "#d1fae5", accent: "#059669", top: "#059669", icon: "checkmark-circle" },
    { label: t("orderRejected"), value: stats.rejectedCount, bg: "#fef2f2", border: "#fee2e2", accent: "#dc2626", top: "#dc2626", icon: "close-circle" },
  ];

  const filterChips = [
    { k: "all", l: t("all") },
    { k: "new", l: t("orderStatusNew") },
    { k: "processing", l: t("orderStatusProcessing") },
    { k: "delivered", l: t("orderStatusDelivered") },
    { k: "rejected", l: t("orderStatusRejected") },
  ];

  return (
    <View style={s.root}>
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Ionicons name="cart" size={22} color={colors.primary} />
          <Text style={s.headerTitle}>{t("myOrders")}</Text>
        </View>
        <View style={s.clockWrap}>
          <Ionicons name="time-outline" size={13} color={colors.slate400} />
          <Text style={s.clockTime}>{now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</Text>
          <Text style={s.clockDate}>{now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</Text>
        </View>
      </View>

      {message.text !== "" && (
        <View style={[s.msgBar, message.type === "error" ? s.msgBarError : s.msgBarSuccess]}>
          <Text style={[s.msgText, message.type === "error" ? s.msgTextError : s.msgTextSuccess]}>{message.text}</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsRow}>
        {statCards.map((sc) => (
          <View key={sc.label} style={[s.statCard, { backgroundColor: sc.bg, borderColor: sc.border, borderTopColor: sc.top }]}>
            <View style={s.statLabelRow}>
              <Ionicons name={sc.icon} size={12} color={sc.accent} />
              <Text style={[s.statLabel, { color: sc.accent }]}>{sc.label}</Text>
            </View>
            <Text style={[s.statValue, { color: sc.accent }]}>{sc.value}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={s.controlsRow}>
        <Pressable onPress={() => (bulk.mode ? bulk.clear() : bulk.startMode())} style={[s.bulkBtn, bulk.mode && s.bulkBtnActive]}>
          <Ionicons name="checkbox" size={14} color={colors.primary} />
          <Text style={s.bulkBtnText}>{bulk.mode ? t("cancel") : t("select")}</Text>
        </Pressable>
        <Pressable onPress={() => setShowPanel(true)} style={s.addBtn}>
          <Ionicons name="add" size={14} color={colors.white} />
          <Text style={s.addBtnText}>{t("newOrder")}</Text>
        </Pressable>
        {bulk.mode && <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected} onSelectAll={bulk.toggleAll} onDelete={deleteSelectedPurchases} deleteLabel={t("deleteSelected")} />}
        <View style={s.searchWrap}>
          <Ionicons name="search" size={14} color={colors.slate400} style={s.searchIcon} />
          <TextField value={search} onChangeText={setSearch} placeholder={t("searchOrders")} containerStyle={s.searchField} />
        </View>
      </View>

      <View style={s.chipsRow}>
        {filterChips.map((f) => (
          <Pressable key={f.k} onPress={() => setStatusFilter(f.k)} style={[s.chip, statusFilter === f.k && s.chipActive]}>
            <Text style={[s.chipText, statusFilter === f.k && s.chipTextActive]}>{f.l}</Text>
          </Pressable>
        ))}
      </View>

      {filteredPurchases.length === 0 ? (
        <Card style={s.emptyCard}>
          <EmptyState icon="cube-outline" message={t("noOrdersFound")} sub={t("createNewOrderToStart")} />
        </Card>
      ) : (
        <Card padded={false} style={s.listCard}>
          <ScrollView contentContainerStyle={s.listBody}>
            {paginatedOrders.map((purchase) => {
              const items = getOrderItems(purchase.id);
              const total = getOrderTotal(purchase.id);
              const orderProfit = getOrderProfit(purchase.id);
              const productSummary = getOrderProductSummary(purchase.id);
              const isExpanded = expandedCards[purchase.id];
              const st = statusTint(purchase.status);

              return (
                <View key={purchase.id} style={[s.orderCard, bulk.mode && bulk.selectedSet.has(purchase.id) && s.orderCardSelected]}>
                  {bulk.mode && (
                    <View style={s.orderCardBulkHeader}>
                      <RowCheckBox checked={bulk.selectedSet.has(purchase.id)} onToggle={() => bulk.toggle(purchase.id)} />
                      <Text style={s.orderHash}>{t("orderHash")}{purchase.id}</Text>
                    </View>
                  )}

                  <View style={s.orderCardBody}>
                    <View style={s.orderTopRow}>
                      <View style={s.orderLeft}>
                        <View style={[s.orderIcon, { backgroundColor: st.bg, borderColor: st.border }]}>
                          <Ionicons name="cart" size={16} color={st.color} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={s.orderTitleRow}>
                            <Text style={s.orderTitle} numberOfLines={1}>{t("orderHash")}{purchase.id}</Text>
                            <View style={[s.badge, { backgroundColor: st.bg, borderColor: st.border }]}>
                              <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                            </View>
                          </View>
                          <View style={s.orderSubRow}>
                            {purchase.customerName ? (
                              <View style={s.orderSubItem}>
                                <Ionicons name="person-outline" size={11} color={colors.slate500} />
                                <Text style={s.orderSubText}>{purchase.customerName}</Text>
                              </View>
                            ) : null}
                            <Text style={s.orderDate}>{fmtDate(purchase.purchaseDate)}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={s.orderRight}>
                        <Text style={s.orderTotal}>TZS {total.toLocaleString()}</Text>
                        <Text style={s.orderItemCount}>{items.length} {t("itemCount", { n: items.length })}</Text>
                        {showProfit && (
                          <Text style={[s.orderProfit, orderProfit >= 0 ? s.orderProfitPos : s.orderProfitNeg]}>
                            {t("profitLabel")}: TZS {orderProfit.toLocaleString()}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={s.chipRow}>
                      {productSummary.slice(0, isExpanded ? productSummary.length : 3).map((ps, idx) => (
                        <View key={idx} style={s.prodChip} accessibilityLabel={ps.exchangedQty > 0 ? t("exchangedProfitDeducted", { n: ps.exchangedQty }) : undefined}>
                          <Text style={s.prodChipText}>
                            {ps.name} <Text style={s.prodChipQty}>x{ps.qty}</Text>
                            {showProfit && (
                              <Text style={[s.prodChipProfit, ps.exchangedQty > 0 ? s.prodChipProfitExchanged : s.prodChipProfitPos]}>
                                {ps.exchangedQty > 0
                                  ? ` TZS ${ps.profitAfterExchange.toLocaleString()} \u2212${ps.exchangedQty} ${t("exc")}`
                                  : ` +TZS ${ps.profit.toLocaleString()}`}
                              </Text>
                            )}
                          </Text>
                        </View>
                      ))}
                      {!isExpanded && productSummary.length > 3 && (
                        <View style={s.prodChipMuted}>
                          <Text style={s.prodChipText}>+{productSummary.length - 3} {t("more")}</Text>
                        </View>
                      )}
                    </View>

                    {purchase.customerContact ? (
                      <View style={s.contactRow}>
                        <Ionicons name="call-outline" size={10} color={colors.slate400} />
                        <Text style={s.contactText}>{purchase.customerContact}</Text>
                      </View>
                    ) : null}

                    <View style={s.orderActions}>
                      <View style={s.statusSelectWrap}>
                        <SelectField
                          value={purchase.status}
                          onChange={(v) => updateStatus(purchase, v)}
                          options={STATUS_OPTIONS}
                          placeholder={t("orderStatusNew")}
                          containerStyle={s.statusSelect}
                        />
                      </View>
                      <Pressable onPress={() => openEdit(purchase)} style={s.actionBtn}>
                        <Ionicons name="pencil" size={12} color={colors.primary} />
                        <Text style={[s.actionBtnText, { color: colors.primary }]}>{t("edit")}</Text>
                      </Pressable>
                      {items.length > 3 && (
                        <Pressable onPress={() => toggleCard(purchase.id)} style={s.actionBtn}>
                          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={12} color={colors.slate500} />
                          <Text style={s.actionBtnText}>{isExpanded ? t("less") : t("more")}</Text>
                        </Pressable>
                      )}
                      <Pressable onPress={() => deletePurchase(purchase.id)} style={[s.actionBtn, { borderColor: "#fee2e2" }]}>
                        <Ionicons name="trash-outline" size={12} color={colors.danger} />
                        <Text style={[s.actionBtnText, { color: colors.danger }]}>{t("delete")}</Text>
                      </Pressable>
                    </View>
                  </View>

                  {isExpanded && items.length > 0 && (
                    <View style={s.expandedTable}>
                      <View style={s.expandHeaderRow}>
                        <Text style={[s.expandHead, s.colProd]}>{t("product")}</Text>
                        <Text style={[s.expandHead, s.colQty]}>{t("qty")}</Text>
                        <Text style={[s.expandHead, s.colCost]}>{t("unitCost")}</Text>
                        <Text style={[s.expandHead, s.colTotal]}>{t("total")}</Text>
                        {showProfit && <Text style={[s.expandHead, s.colProfit]}>{t("predictedProfit")}</Text>}
                      </View>
                      {items.map((pi) => {
                        const prod = products.find((p) => p.id === pi.product?.id);
                        const unitCost = Number(pi.costPrice) || 0;
                        const qty = Number(pi.quantity) || 0;
                        const sellingPrice = Number(prod?.price) || unitCost;
                        const unitProfit = sellingPrice - unitCost;
                        const exchangedQty = Math.min(qty, getExchangedQty(pi.product?.id));
                        const itemProfit = unitProfit * (qty - exchangedQty);
                        return (
                          <View key={pi.id} style={s.expandRow}>
                            <View style={[s.expandCell, s.colProd]}>
                              {!!(prod?.image || pi.product?.image) && (
                                <Image source={{ uri: prod?.image || pi.product?.image }} style={s.expandImg} />
                              )}
                              <Text style={s.expandProdName} numberOfLines={1}>{prod?.name || pi.product?.name || "\u2014"}</Text>
                            </View>
                            <Text style={[s.expandCell, s.colQty]}>{pi.quantity}</Text>
                            <Text style={[s.expandCell, s.colCost, s.cellMuted]}>TZS {unitCost.toLocaleString()}</Text>
                            <Text style={[s.expandCell, s.colTotal, s.cellBold]}>TZS {(pi.quantity * unitCost).toLocaleString()}</Text>
                            {showProfit && (
                              <View style={[s.expandCell, s.colProfit]}>
                                <Text style={[s.cellBold, itemProfit >= 0 ? s.orderProfitPos : s.orderProfitNeg]}>
                                  TZS {itemProfit.toLocaleString()}
                                </Text>
                                {exchangedQty > 0 && <Text style={s.exchangedNote}>\u2212{exchangedQty} {t("exchanged")}</Text>}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </Card>
      )}

      {totalOrderPages > 1 && (
        <View style={s.paginationBar}>
          <Text style={s.paginationText}>{t("pageXofY", { page: orderPage, total: totalOrderPages, count: filteredPurchases.length, type: t("orders") })}</Text>
          <View style={s.paginationBtns}>
            <Pressable onPress={() => setOrderPage((p) => Math.max(1, p - 1))} disabled={orderPage <= 1} style={[s.pageBtn, orderPage <= 1 && s.pageBtnDisabled]}>
              <Ionicons name="chevron-back" size={13} color={orderPage <= 1 ? colors.slate300 : colors.slate600} />
              <Text style={[s.pageBtnText, orderPage <= 1 && s.pageBtnTextDisabled]}>{t("prev")}</Text>
            </Pressable>
            {Array.from({ length: Math.min(totalOrderPages, 10) }, (_, i) => {
              const start = Math.max(1, orderPage - 5);
              const p = start + i;
              if (p > totalOrderPages) return null;
              return (
                <Pressable key={p} onPress={() => setOrderPage(p)} style={[s.pageNumBtn, p === orderPage && s.pageNumBtnActive]}>
                  <Text style={[s.pageNumText, p === orderPage && s.pageNumTextActive]}>{p}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={() => setOrderPage((p) => Math.min(totalOrderPages, p + 1))} disabled={orderPage >= totalOrderPages} style={[s.pageBtn, orderPage >= totalOrderPages && s.pageBtnDisabled]}>
              <Text style={[s.pageBtnText, orderPage >= totalOrderPages && s.pageBtnTextDisabled]}>{t("next")}</Text>
              <Ionicons name="chevron-forward" size={13} color={orderPage >= totalOrderPages ? colors.slate300 : colors.slate600} />
            </Pressable>
          </View>
        </View>
      )}

      <Modal
        visible={showPanel}
        onClose={resetPanel}
        title={t("newOrder")}
      >
        <View style={s.modalBody}>
          <View style={s.fieldBlock}>
            <Text style={s.fieldLabel}><Ionicons name="person-outline" size={10} color={colors.slate500} /> {t("customerNameLabel")}</Text>
            <TextField value={customerName} onChangeText={setCustomerName} placeholder={t("enterCustomerName")} />
          </View>
          <View style={s.fieldBlock}>
            <Text style={s.fieldLabel}><Ionicons name="call-outline" size={10} color={colors.slate500} /> {t("contactLabel")}</Text>
            <TextField value={customerContact} onChangeText={setCustomerContact} placeholder={t("phoneNumber")} />
          </View>

          <View style={s.hrBlock}>
            <Text style={s.fieldLabel}>{t("addProductLabel")}</Text>
            <ProductSelector value={selProdId ? Number(selProdId) : null} onChange={handleSelect} />
            <View style={s.twoCols}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{t("qty")}</Text>
                <QuantityInput value={Number(qty) || 0} onChange={setQty} piecesPerUnit={selProdId ? (products.find((x) => x.id === selProdId)?.piecesPerUnit || 0) : 0} unit={selProdId ? (products.find((x) => x.id === selProdId)?.unit || t("piece")) : t("piece")} min={1} size="md" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{t("costTZS")}</Text>
                <TextField value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="0.00" />
              </View>
            </View>
            <View style={s.addRow}>
              <Button title={t("add")} variant="primary" size="sm" onPress={addItem} disabled={!selProdId || !cost} icon={<Ionicons name="add" size={14} color={colors.white} />} style={{ flex: 1 }} />
              <Button title={saving ? t("saving") : t("placeOrder")} variant="success" size="sm" loading={saving} icon={<Ionicons name="save" size={14} color={colors.white} />} onPress={savePurchase} disabled={cart.length === 0} style={{ flex: 1 }} />
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsUnits}>{totalQty} {t("units")}</Text>
              <View style={{ flex: 1 }} />
              <Text style={s.totalsValue}>TZS {totalCost.toLocaleString()}</Text>
            </View>
          </View>

          <View style={s.hrBlock}>
            <Text style={s.fieldLabel}>{t("orderItems")} ({cart.length})</Text>
            {cart.length === 0 ? (
              <Text style={s.noItemsText}>{t("noItemsYet")}</Text>
            ) : (
              <View style={s.cartTable}>
                <View style={s.cartHeaderRow}>
                  <Text style={[s.cartHead, s.cartColIdx]}>#</Text>
                  <Text style={[s.cartHead, s.cartColName]}>{t("product")}</Text>
                  <Text style={[s.cartHead, s.cartColQty]}>{t("qty")}</Text>
                  <Text style={[s.cartHead, s.cartColTotal]}>{t("total")}</Text>
                  <Text style={s.cartColIdx} />
                </View>
                {cart.map((ci, idx) => (
                  <View key={idx} style={s.cartRow}>
                    <Text style={[s.cartCell, s.cartColIdx, s.cellMuted]}>{idx + 1}</Text>
                    <Text style={[s.cartCell, s.cartColName, s.cellBold]} numberOfLines={1}>{ci.productName}</Text>
                    <Text style={[s.cartCell, s.cartColQty]}>{ci.qty}</Text>
                    <Text style={[s.cartCell, s.cartColTotal, s.cellBold]}>TZS {(ci.qty * ci.cost).toLocaleString()}</Text>
                    <Pressable style={s.cartColIdx} onPress={() => removeItem(idx)} hitSlop={4}>
                      <Ionicons name="trash-outline" size={12} color={colors.danger} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {editPurchase && (
        <Modal
          visible={!!editPurchase}
          onClose={closeEdit}
          title={`${t("editOrder")} #${editPurchase.id}`}
          actions={[
            <Button key="cancel" title={t("cancel")} variant="outline" size="sm" onPress={closeEdit} />,
            <Button key="save" title={savingEdit ? t("saving") : t("saveChanges")} variant="primary" size="sm" loading={savingEdit} icon={<Ionicons name="save" size={14} color={colors.white} />} onPress={saveEdit} />,
          ]}
        >
          <View style={s.modalBody}>
            <View style={s.actionsBlock}>
              <Text style={s.fieldLabel}>{t("actionLabel")}</Text>
              <SelectField
                value={editPurchase.status}
                onChange={(v) => { updateStatus(editPurchase, v); closeEdit(); }}
                options={STATUS_OPTIONS}
                placeholder={t("orderStatusNew")}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>

            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}><Ionicons name="person-outline" size={10} color={colors.slate500} /> {t("customerNameLabel")}</Text>
              <TextField value={editName} onChangeText={setEditName} placeholder={t("enterCustomerName")} />
            </View>
            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}><Ionicons name="call-outline" size={10} color={colors.slate500} /> {t("contactLabel")}</Text>
              <TextField value={editContact} onChangeText={setEditContact} placeholder={t("phoneNumber")} />
            </View>

            <View style={s.hrBlock}>
              <Text style={s.fieldLabel}>{t("addProductLabel")}</Text>
              <ProductSelector value={editSelProdId ? Number(editSelProdId) : null} onChange={(pid) => { setEditSelProdId(pid); const p = products.find((x) => x.id === pid); if (p) setEditCost(p.buyingPrice || p.price || ""); }} />
              <View style={s.twoCols}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>{t("qty")}</Text>
                  <QuantityInput value={Number(editQty) || 0} onChange={setEditQty} piecesPerUnit={editSelProdId ? (products.find((x) => x.id === editSelProdId)?.piecesPerUnit || 0) : 0} unit={editSelProdId ? (products.find((x) => x.id === editSelProdId)?.unit || "piece") : "piece"} min={1} size="md" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>{t("costTZS")}</Text>
                  <TextField value={editCost} onChangeText={setEditCost} keyboardType="decimal-pad" placeholder="0.00" />
                </View>
              </View>
              <Button title={t("addToOrder")} variant="primary" size="sm" onPress={editAddItem} disabled={!editSelProdId || !editCost} icon={<Ionicons name="add" size={14} color={colors.white} />} style={s.addToOrderBtn} />
            </View>

            <View style={s.hrBlock}>
              <Text style={s.fieldLabel}>{t("orderItems")} ({editCart.length})</Text>
              {editCart.length === 0 ? (
                <Text style={s.noItemsText}>{t("noItems")}</Text>
              ) : (
                <View style={s.editCartList}>
                  {editCart.map((ci, idx) => {
                    const sp = products.find((x) => x.id === ci.productId);
                    return (
                      <View key={idx} style={s.editCartRow}>
                        <Text style={s.editCartIdx}>{idx + 1}.</Text>
                        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                          <SelectField
                            value={ci.productId || ""}
                            onChange={(v) => {
                              const pid = Number(v);
                              const p = products.find((x) => x.id === pid);
                              setEditCart(editCart.map((item, i) => i === idx ? { ...item, productId: pid, productName: p?.name || "Unknown", cost: p?.buyingPrice || p?.price || item.cost } : item));
                            }}
                            options={products.map((p) => ({ value: p.id, label: p.name }))}
                            placeholder={t("product")}
                            containerStyle={{ marginBottom: 0 }}
                          />
                        </View>
                        <View style={{ width: 110 }}>
                          <QuantityInput value={Number(ci.qty) || 1} onChange={(v) => { const q = v || 1; setEditCart(editCart.map((item, i) => i === idx ? { ...item, qty: q } : item)); }} piecesPerUnit={sp?.piecesPerUnit || 0} unit={sp?.unit || "piece"} min={1} />
                        </View>
                        <View style={{ width: 90 }}>
                          <TextField value={String(ci.cost)} onChangeText={(v) => { const n = Number(v) || 0; setEditCart(editCart.map((item, i) => i === idx ? { ...item, cost: n } : item)); }} keyboardType="decimal-pad" containerStyle={{ marginBottom: 0 }} />
                        </View>
                        <Text style={s.editCartTotal}>TZS {(ci.qty * ci.cost).toLocaleString()}</Text>
                        <Pressable onPress={() => editRemoveItem(idx)} hitSlop={4}>
                          <Ionicons name="trash-outline" size={13} color={colors.danger} />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={s.editFooter}>
              <Text style={s.editFooterUnits}>{editCart.reduce((s2, i) => s2 + i.qty, 0)} {t("units")}</Text>
              <Text style={s.editFooterTotal}>TZS {editCart.reduce((s2, i) => s2 + i.qty * i.cost, 0).toLocaleString()}</Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50, padding: spacing.sm, gap: spacing.sm },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", height: 400 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.slate900 },
  clockWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  clockTime: { fontSize: 12, color: colors.slate500 },
  clockDate: { fontSize: 11, color: colors.slate400, marginLeft: 4 },
  msgBar: { padding: spacing.sm, borderRadius: radius.sm, flexShrink: 0 },
  msgBarSuccess: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  msgBarError: { backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: "#fecaca" },
  msgText: { fontSize: 11 },
  msgTextSuccess: { color: "#166534" },
  msgTextError: { color: colors.dangerDark },
  statsRow: { flexDirection: "row", gap: spacing.sm, flexShrink: 0 },
  statCard: { minWidth: 130, flex: 1, borderRadius: radius.md, borderWidth: 1, borderTopWidth: 3, padding: spacing.md },
  statLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { fontSize: 20, fontWeight: "700", marginTop: 2 },
  controlsRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center", flexShrink: 0, flexWrap: "wrap" },
  bulkBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate300, backgroundColor: colors.white },
  bulkBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  bulkBtnText: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: radius.sm },
  addBtnText: { color: colors.white, fontWeight: "600", fontSize: 12 },
  searchWrap: { flex: 1, minWidth: 180, maxWidth: 300, position: "relative" },
  searchIcon: { position: "absolute", left: 8, top: 12, zIndex: 1 },
  searchField: { marginBottom: 0 },
  chipsRow: { flexDirection: "row", gap: 2, backgroundColor: colors.slate200, padding: 2, borderRadius: radius.sm, alignSelf: "flex-start", flexShrink: 0 },
  chip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.xs },
  chipActive: { backgroundColor: colors.white, ...shadow.card },
  chipText: { fontSize: 10, fontWeight: "700", color: colors.slate400 },
  chipTextActive: { color: colors.slate900 },
  emptyCard: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 220 },
  listCard: { flex: 1, minHeight: 0 },
  listBody: { padding: spacing.sm, gap: spacing.sm },
  orderCard: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.slate200, overflow: "hidden", minWidth: "100%" },
  orderCardSelected: { borderWidth: 2, borderColor: colors.primary },
  orderCardBulkHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.slate50, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  orderHash: { fontSize: 11, color: colors.slate500, fontWeight: "600" },
  orderCardBody: { padding: spacing.md },
  orderTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.sm },
  orderLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1, minWidth: 0 },
  orderIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  orderTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 0 },
  orderTitle: { fontWeight: "700", fontSize: 14, color: colors.slate900 },
  badge: { borderRadius: radius.pill, borderWidth: 1, paddingVertical: 2, paddingHorizontal: 8 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  orderSubRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 },
  orderSubItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  orderSubText: { fontSize: 12, color: colors.slate600 },
  orderDate: { fontSize: 11, color: colors.slate400 },
  orderRight: { alignItems: "flex-end", flexShrink: 0 },
  orderTotal: { fontSize: 16, fontWeight: "700", color: colors.slate900 },
  orderItemCount: { fontSize: 11, color: colors.slate400 },
  orderProfit: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  orderProfitPos: { color: "#16a34a" },
  orderProfitNeg: { color: "#dc2626" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  prodChip: { paddingVertical: 3, paddingHorizontal: 8, backgroundColor: colors.slate100, borderRadius: radius.sm },
  prodChipText: { fontSize: 11, color: colors.slate600, fontWeight: "500" },
  prodChipQty: { color: colors.slate400, fontWeight: "400" },
  prodChipProfit: { marginLeft: 5, fontWeight: "700" },
  prodChipProfitPos: { color: "#16a34a" },
  prodChipProfitExchanged: { color: "#b45309" },
  prodChipMuted: { paddingVertical: 3, paddingHorizontal: 8, backgroundColor: colors.slate100, borderRadius: radius.sm },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: spacing.sm },
  contactText: { fontSize: 11, color: colors.slate400 },
  orderActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flexWrap: "wrap" },
  statusSelectWrap: { minWidth: 170, maxWidth: 220 },
  statusSelect: { marginBottom: 0 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.sm },
  actionBtnText: { fontSize: 10, color: colors.slate500, fontWeight: "600" },
  expandedTable: { borderTopWidth: 1, borderTopColor: colors.slate100, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: "#fafbfc" },
  expandHeaderRow: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: colors.slate200, paddingBottom: 4 },
  expandHead: { fontSize: 10, fontWeight: "700", color: colors.slate500 },
  expandRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.slate100, paddingVertical: 6, gap: 4 },
  expandCell: { fontSize: 11 },
  cellMuted: { color: colors.slate500 },
  cellBold: { fontWeight: "700", color: colors.slate900 },
  colProd: { flex: 1.6, minWidth: 0 },
  colQty: { width: 40, textAlign: "center" },
  colCost: { width: 84, textAlign: "right" },
  colTotal: { width: 96, textAlign: "right" },
  colProfit: { width: 110, alignItems: "flex-end", textAlign: "right" },
  expandProdName: { fontSize: 11, fontWeight: "600", color: colors.slate900, flex: 1 },
  expandImg: { width: 24, height: 24, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate200 },
  exchangedNote: { fontSize: 9, fontWeight: "600", color: colors.danger },
  paginationBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.sm, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.sm, backgroundColor: colors.white, flexShrink: 0 },
  paginationText: { fontSize: 11, color: colors.slate500 },
  paginationBtns: { flexDirection: "row", gap: 4, alignItems: "center" },
  pageBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate200, backgroundColor: colors.white },
  pageBtnDisabled: { backgroundColor: colors.slate100 },
  pageBtnText: { fontSize: 11, fontWeight: "600", color: colors.slate600 },
  pageBtnTextDisabled: { color: colors.slate300 },
  pageNumBtn: { width: 26, height: 26, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate200, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  pageNumBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pageNumText: { fontSize: 11, fontWeight: "600", color: colors.slate600 },
  pageNumTextActive: { color: colors.white },
  modalBody: { gap: spacing.md },
  fieldBlock: { flexDirection: "column", gap: 4 },
  fieldLabel: { fontSize: 10, fontWeight: "700", color: colors.slate500, textTransform: "uppercase", letterSpacing: 0.3 },
  hrBlock: { borderTopWidth: 1, borderTopColor: colors.slate100, paddingTop: spacing.sm },
  twoCols: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  addRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  totalsRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.xs },
  totalsUnits: { fontSize: 11, color: colors.slate500 },
  totalsValue: { fontWeight: "700", color: colors.slate900 },
  noItemsText: { padding: spacing.lg, textAlign: "center", color: colors.slate400, fontSize: 12 },
  cartTable: { flexDirection: "column" },
  cartHeaderRow: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: colors.slate200, paddingBottom: 4 },
  cartHead: { fontSize: 10, fontWeight: "700", color: colors.slate500 },
  cartRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.slate100, paddingVertical: 5 },
  cartCell: { fontSize: 11 },
  cartColIdx: { width: 24 },
  cartColName: { flex: 1, minWidth: 0 },
  cartColQty: { width: 40, textAlign: "center" },
  cartColTotal: { width: 90, textAlign: "right" },
  addToOrderBtn: { marginTop: spacing.sm, alignSelf: "stretch" },
  editCartList: { flexDirection: "column", gap: spacing.xs },
  editCartRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, padding: spacing.xs, backgroundColor: colors.slate50, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate200 },
  editCartIdx: { width: 18, fontSize: 10, color: colors.slate400 },
  editCartTotal: { width: 76, fontSize: 10, color: colors.slate500, fontWeight: "600", textAlign: "right" },
  editFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.slate100 },
  editFooterUnits: { fontSize: 11, color: colors.slate500 },
  editFooterTotal: { fontWeight: "700", fontSize: 16, color: colors.slate900 },
});