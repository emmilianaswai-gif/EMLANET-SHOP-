import { useState, useEffect, useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t, useLanguage } from "../i18n";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { QuantityInput, SelectField, TextField, Button, Modal } from "../components/ui";
import { confirmDialog } from "../utils/confirm";
import { colors, radius, spacing, shadow } from "../theme";

const CUSTOMER_TYPES = [
  { value: "walk-in", label: "Walk-in Customer", color: "#64748b" },
  { value: "regular", label: "Regular Customer", color: "#2563eb" },
  { value: "wholesale", label: "Wholesale / Bulk Buyer", color: "#7c3aed" },
  { value: "vip", label: "VIP / Premium", color: "#f59e0b" },
];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export default function SaleManager() {
  useLanguage();
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [salesList, setSalesList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  const [availableProducts, setAvailableProducts] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [stockIdMap, setStockIdMap] = useState({});
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState("");
  const [customerType, setCustomerType] = useState("walk-in");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [customerName, setCustomerName] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [stockErrors, setStockErrors] = useState({});
  const [debtContact, setDebtContact] = useState("");

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [saleItems, setSaleItems] = useState([
    { id: Date.now(), productId: "", productName: "", price: 0, costPrice: 0, quantity: 1, subtotal: 0 },
  ]);

  useEffect(() => {
    const load = async () => {
      try {
        const [prodRes, custRes, stockRes, salesRes] = await Promise.all([
          api.get("/products").catch(() => ({ data: [] })),
          api.get("/customers").catch(() => ({ data: [] })),
          api.get("/stocks").catch(() => ({ data: [] })),
          api.get("/sales").catch(() => ({ data: [] })),
        ]);
        setAvailableProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
        setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
        setSalesList(Array.isArray(salesRes.data) ? salesRes.data : []);
        const smap = {};
        const sidmap = {};
        (Array.isArray(stockRes.data) ? stockRes.data : []).forEach((s) => { smap[s.productId ?? s.product?.id] = s.quantity; sidmap[s.productId ?? s.product?.id] = s.id; });
        setStockMap(smap);
        setStockIdMap(sidmap);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const total = saleItems.reduce((sum, i) => sum + (i.subtotal || 0), 0);
    setGrandTotal(total);
  }, [saleItems]);

  const [grandTotal, setGrandTotal] = useState(0);

  const selectedCustomer = useMemo(() => customers.find((c) => String(c.id) === String(customerId)), [customers, customerId]);
  const prevOutstanding = useMemo(() => {
    if (!selectedCustomer) return 0;
    return Math.max(0, (Number(selectedCustomer.amount) || 0) - (Number(selectedCustomer.paid) || 0));
  }, [selectedCustomer]);
  const totalSpend = useMemo(() => prevOutstanding + (Number(grandTotal) || 0), [prevOutstanding, grandTotal]);

  const filteredSales = useMemo(() => {
    let items = [...salesList];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((s) =>
        (s.description || "").toLowerCase().includes(q) ||
        (s.id?.toString() || "").includes(q) ||
        (s.paymentMethod || "").toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => {
      let va, vb;
      if (sortField === "date") { va = a.saleDate || ""; vb = b.saleDate || ""; }
      else if (sortField === "amount") { va = Number(a.grandTotal) || 0; vb = Number(b.grandTotal) || 0; }
      else { va = a.id || 0; vb = b.id || 0; }
      if (sortField === "date" || sortField === "description") {
        return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return items;
  }, [salesList, searchQuery, sortField, sortDir]);

  const salesStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todaySales = salesList.filter((s) => s.saleDate && s.saleDate.slice(0, 10) === today);
    const totalRevenue = todaySales.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
    const totalPaid = todaySales.filter((s) => s.paymentStatus === "PAID").reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
    const totalDebt = todaySales.filter((s) => s.paymentStatus === "UNPAID").reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
    return { count: salesList.length, todayCount: todaySales.length, totalRevenue, totalPaid, totalDebt };
  }, [salesList]);

  const toggleSort = (f) => {
    if (sortField === f) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDir("desc"); }
  };

  const bulk = useBulkSelect(filteredSales, (s) => s.id);

  const deleteSelectedSales = async () => {
    if (bulk.selected.length === 0) return;
    if (!(await confirmDialog(`Delete ${bulk.selected.length} selected sale(s)?`))) return;
    let failed = 0;
    for (const id of bulk.selected) {
      try { await deleteSaleCore(id); } catch { failed++; }
    }
    bulk.clear();
    await refreshSales();
    if (failed > 0) setMessage({ text: `Deleted selected — ${failed} failed`, type: "error" });
  };

  const totalPages = Math.ceil(filteredSales.length / PAGE_SIZE);
  const paginatedSales = filteredSales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [searchQuery, sortField, sortDir]);

  const refreshSales = async () => {
    setLoading(true);
    try {
      const salesRes = await api.get("/sales").catch(() => ({ data: [] }));
      setSalesList(Array.isArray(salesRes.data) ? salesRes.data : []);
    } finally { setLoading(false); }
  };

  const startNewSale = () => {
    setShowNewSaleModal(true);
    setEditingSale(null);
    setMessage({ text: "", type: "" });
    setSaleItems([{ id: Date.now(), productId: "", productName: "", price: 0, costPrice: 0, quantity: 1, subtotal: 0 }]);
    setCustomerId("");
    setCustomerName("");
    setCustomerSearch("");
    setCustomerType("walk-in");
    setPaymentMethod("cash");
    setStockErrors({});
    setDebtContact("");
  };

  const goToEditSale = (sale) => {
    setEditingSale(sale);
    setShowNewSaleModal(false);
    setCustomerId(sale.customer?.id || "");
    setCustomerName(sale.customer?.name || "");
    setCustomerSearch(sale.customer?.name || "");
    setCustomerType(sale.customerType || "walk-in");
    setPaymentMethod(sale.paymentMethod || "cash");
    setDebtContact(sale.customer?.phone || "");
    setSaleItems((sale.saleItems || []).map((si, idx) => ({
      id: si.id || Date.now() + idx,
      productId: si.product?.id || "",
      productName: si.product?.name || "",
      price: si.price || 0,
      costPrice: si.costPrice || 0,
      quantity: si.quantity || 1,
      subtotal: (si.price || 0) * (si.quantity || 1),
    })));
    setMessage({ text: "", type: "" });
    setStockErrors({});
  };

  const closeSaleModal = () => {
    setShowNewSaleModal(false);
    setEditingSale(null);
    setMessage({ text: "", type: "" });
  };

  const deleteSaleCore = async (saleId) => {
    const { data: sale } = await api.get(`/sales/${saleId}`).catch(() => ({ data: null }));
    if (sale?.saleItems) {
      for (const si of sale.saleItems) {
        const pid = si.product?.id;
        if (!pid) continue;
        const prod = availableProducts.find((p) => String(p.id) === String(pid));
        const restoreQty = (getStock(pid)) + (si.quantity || 0);
        if (prod) {
          await api.put(`/products/${pid}`, {
            ...prod, quantity: restoreQty,
            category: prod.category ? { id: prod.category.id } : null,
            supplier: prod.supplier ? { id: prod.supplier.id } : null,
          }).catch(() => {});
          const stockId = stockIdMap[pid];
          if (stockId) {
            await api.put(`/stocks/${stockId}`, {
              product: { id: Number(pid) },
              quantity: restoreQty,
              lowStockThreshold: 10,
              date: new Date().toISOString(),
            }).catch(() => {});
          }
        }
        await api.post("/stock-history", { product: { id: pid }, quantityChange: si.quantity || 0, resultingQuantity: restoreQty, transactionType: "Sale Deleted" }).catch(() => {});
        setStockMap((prev) => ({ ...prev, [pid]: restoreQty }));
      }
    }
    await api.delete(`/sales/${saleId}`);
  };

  const deleteSale = async (saleId) => {
    if (!(await confirmDialog("Delete this sale?"))) return;
    try {
      await deleteSaleCore(saleId);
      await refreshSales();
    } catch {
      setMessage({ text: "Failed to delete sale", type: "error" });
    }
  };

  const deleteAllSales = async () => {
    if (salesList.length === 0) return;
    if (!(await confirmDialog(`Delete ALL ${salesList.length} sale(s)? This will restore stock for each sale. This cannot be undone.`))) return;
    let failed = 0;
    for (const s of [...salesList]) {
      try { await deleteSaleCore(s.id); } catch { failed++; }
    }
    await refreshSales();
    setMessage(failed > 0
      ? { text: `Deleted all sales — ${failed} failed`, type: "error" }
      : { text: "All sales deleted!", type: "success" });
  };

  const getStock = (productId) => {
    if (!productId) return 0;
    if (stockMap[productId] !== undefined) return Number(stockMap[productId]) || 0;
    const prod = availableProducts.find((p) => String(p.id) === String(productId));
    return prod ? (Number(prod.quantity) || 0) : 0;
  };

  const validateQuantity = (itemId, productId, qty) => {
    const available = getStock(productId);
    const numQty = Number(qty) || 0;
    if (!productId) {
      setStockErrors((prev) => { const n = { ...prev }; delete n[itemId]; return n; });
      return true;
    }
    if (available <= 0) {
      setStockErrors((prev) => ({ ...prev, [itemId]: { type: "out", msg: "OUT OF STOCK", available: 0 } }));
      return false;
    }
    if (numQty > available) {
      setStockErrors((prev) => ({ ...prev, [itemId]: { type: "exceed", msg: `Only ${available} in stock`, available } }));
      return false;
    }
    if (numQty <= 0) {
      setStockErrors((prev) => { const n = { ...prev }; delete n[itemId]; return n; });
      return false;
    }
    setStockErrors((prev) => { const n = { ...prev }; delete n[itemId]; return n; });
    return true;
  };

  const hasStockErrors = Object.keys(stockErrors).length > 0;

  const filteredCustomers = customers.filter((c) =>
    c.name?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const handleCustomerSelect = (c) => {
    setCustomerId(String(c.id));
    setCustomerName(c.name);
    setCustomerSearch(c.name);
    setShowCustomerDropdown(false);
    setDebtContact(c.phone || c.email || "");
  };

  const handleCustomerNameChange = (val) => {
    setCustomerSearch(val);
    setCustomerName(val);
    setCustomerId("");
    setShowCustomerDropdown(val.length > 0);
  };

  const handleItemChange = (id, field, value) => {
    setSaleItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "productId") {
          const prod = availableProducts.find((p) => String(p.id) === String(value));
          updated.productName = prod ? prod.name : "";
          updated.price = prod ? Number(prod.price) : 0;
          updated.costPrice = prod ? Number(prod.buyingPrice) || 0 : 0;
          if (prod) validateQuantity(id, value, updated.quantity);
          else { setStockErrors((prev) => { const n = { ...prev }; delete n[id]; return n; }); }
        }
        if (field === "quantity") validateQuantity(id, updated.productId, value);
        updated.subtotal = (Number(updated.price) || 0) * (Number(updated.quantity) || 0);
        return updated;
      })
    );
  };

  const addItemRow = () => {
    setSaleItems((prev) => [...prev, { id: Date.now() + Math.random(), productId: "", productName: "", price: 0, costPrice: 0, quantity: 1, subtotal: 0 }]);
  };

  const removeItemRow = (id) => {
    if (saleItems.length > 1) {
      setSaleItems((prev) => prev.filter((i) => i.id !== id));
      setStockErrors((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const handleSubmit = async () => {
    const validItems = saleItems.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) { setMessage({ text: "Add at least one product", type: "error" }); return; }
    const stockIssues = [];
    for (const item of validItems) {
      const available = getStock(item.productId);
      if (available <= 0) stockIssues.push(`${item.productName || "Unknown"} is OUT OF STOCK`);
      else if (item.quantity > available) stockIssues.push(`${item.productName || "Unknown"}: Requested ${item.quantity} but only ${available} available`);
    }
    if (stockIssues.length > 0) { setMessage({ text: `Cannot complete sale — ${stockIssues.join("; ")}`, type: "error" }); return; }

    setSaving(true);
    setMessage({ text: "", type: "" });
    try {
      let linkedCustomerId = customerId;
      if (linkedCustomerId) {
        const check = await api.get(`/customers/${linkedCustomerId}`).catch(() => null);
        if (!check || !check.data || check.data.error) linkedCustomerId = null;
      }
      if (!linkedCustomerId) {
        const custName = customerName.trim() || "Walk-in Customer";
        const custPayload = { name: custName, type: customerType, paymentMethod, amount: 0, paid: 0 };
        if (paymentMethod === "debt") {
          custPayload.phone = debtContact.trim() || "";
          custPayload.amount = Number(grandTotal) || 0;
        }
        const { data: newCust } = await api.post("/customers", custPayload);
        linkedCustomerId = newCust.id;
        setCustomers((prev) => [...prev, newCust]);
      }
      const totalQty = validItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
      const custLabel = customerName.trim() || "Walk-in";

      if (editingSale) {
        await api.put(`/sales/${editingSale.id}`, {
          description: `Sale — ${validItems.length} item(s) [${custLabel}]`,
          grandTotal, quantity: totalQty,
          paymentMethod: paymentMethod || "cash", customerType: customerType || "walk-in",
          paymentStatus: paymentMethod === "debt" ? "UNPAID" : "PAID",
          customer: { id: Number(linkedCustomerId) },
        });
        for (const item of validItems) {
          if (item.saleItemId) {
            await api.put(`/sale-items/${item.saleItemId}`, {
              quantity: item.quantity, price: item.price, costPrice: item.costPrice || 0,
              product: { id: Number(item.productId) }, sale: { id: editingSale.id },
            }).catch(() => {});
          }
        }
        setMessage({ text: `Sale #${editingSale.id} updated!`, type: "success" });
        await refreshSales();
        setTimeout(() => closeSaleModal(), 1200);
      } else {
        const payload = {
          description: `Sale — ${validItems.length} item(s) [${custLabel}]`,
          grandTotal, quantity: totalQty, saleDate: new Date().toISOString(), status: "completed",
          paymentMethod: paymentMethod || "cash", customerType: customerType || "walk-in",
          paymentStatus: paymentMethod === "debt" ? "UNPAID" : "PAID",
          customer: { id: Number(linkedCustomerId) },
          saleItems: validItems.map((i) => ({
            quantity: i.quantity, price: i.price, costPrice: i.costPrice, product: { id: Number(i.productId) },
          })),
        };
        const { data: saved } = await api.post("/sales", payload);
        const cust = customers.find((c) => String(c.id) === String(linkedCustomerId));
        if (cust) {
          if (paymentMethod === "debt") {
            await api.put(`/customers/${linkedCustomerId}`, {
              ...cust, amount: totalSpend, phone: debtContact.trim() || cust.phone || "",
            }).catch(() => {});
          } else {
            await api.put(`/customers/${linkedCustomerId}`, { ...cust, paid: (Number(cust.paid) || 0) + grandTotal }).catch(() => {});
          }
        }
        for (const item of validItems) {
          const prod = availableProducts.find((p) => String(p.id) === String(item.productId));
          if (prod) {
            const newQty = Math.max(0, (getStock(item.productId)) - item.quantity);
            await api.put(`/products/${item.productId}`, {
              buyingPrice: prod.buyingPrice ?? 0, category: prod.category ? { id: prod.category.id } : null,
              expiryDate: prod.expiryDate, name: prod.name, price: prod.price ?? 0, sku: prod.sku ?? "",
              supplier: prod.supplier ? { id: prod.supplier.id } : null, unit: prod.unit ?? "piece", quantity: newQty,
            }).catch(() => {});
            const stockId = stockIdMap[item.productId];
            if (stockId) {
              await api.put(`/stocks/${stockId}`, {
                product: { id: Number(item.productId) },
                quantity: newQty,
                lowStockThreshold: 10,
                date: new Date().toISOString(),
              }).catch(() => {});
            }
            await api.post("/stock-history", { product: { id: Number(item.productId) }, quantityChange: -item.quantity, resultingQuantity: newQty, transactionType: "Sold" }).catch(() => {});
            setStockMap((prev) => ({ ...prev, [item.productId]: newQty }));
          }
        }
        setMessage({ text: `Sale #${saved.id} completed! ${paymentMethod === "cash" ? "Cash" : "Debt"} — TZS ${grandTotal.toLocaleString()}`, type: "success" });
        setSaleItems([{ id: Date.now(), productId: "", productName: "", price: 0, costPrice: 0, quantity: 1, subtotal: 0 }]);
        setCustomerId(""); setCustomerName(""); setCustomerSearch(""); setStockErrors({});
        setDebtContact("");
        await refreshSales();
        const custRes = await api.get("/customers").catch(() => ({ data: [] }));
        setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
        setTimeout(() => closeSaleModal(), 1200);
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || err.response?.data?.error || `Server error ${err.response?.status || ""}`, type: "error" });
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <Spinner size={28} text={t("loading")} />
      </View>
    );
  }

  const isModalOpen = showNewSaleModal || editingSale;

  return (
    <View style={s.root}>
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Ionicons name="bag-outline" size={22} color={colors.primary} />
          <Text style={s.headerTitle}>{t("saleManager")}</Text>
          <Text style={s.headerCount}>({salesList.length})</Text>
        </View>
        <View style={s.headerActions}>
          <Pressable onPress={() => (bulk.mode ? bulk.clear() : bulk.startMode())} style={[s.bulkBtn, bulk.mode && s.bulkBtnActive]}>
            <Ionicons name="checkbox-outline" size={13} color={colors.primary} />
            <Text style={s.bulkBtnText}>{bulk.mode ? t("cancel") : t("select")}</Text>
          </Pressable>
          <Pressable onPress={refreshSales} style={s.secondaryBtn}>
            <Ionicons name="refresh" size={13} color={colors.slate600} />
            <Text style={s.secondaryBtnText}>{t("refresh")}</Text>
          </Pressable>
          {salesList.length > 0 && (
            <Pressable onPress={deleteAllSales} style={s.dangerBtn}>
              <Ionicons name="trash-outline" size={13} color={colors.danger} />
              <Text style={s.dangerBtnText}>Delete All ({salesList.length})</Text>
            </Pressable>
          )}
          <Pressable onPress={startNewSale} style={s.successBtn}>
            <Ionicons name="add" size={14} color={colors.white} />
            <Text style={s.successBtnText}>New Sale</Text>
          </Pressable>
        </View>
      </View>
      {bulk.mode && (
        <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected} onSelectAll={bulk.toggleAll} onDelete={deleteSelectedSales} deleteLabel="Delete Selected" />
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsRow}>
        {[
          { label: t("totalSales"), value: salesStats.count, c: "#0f172a", icon: "bag" },
          { label: t("today"), value: salesStats.todayCount, c: "#2563eb", icon: "checkmark-circle" },
          { label: t("todayRevenue"), value: `TZS ${salesStats.totalRevenue.toLocaleString()}`, c: "#16a34a", icon: "cash" },
          { label: t("paid"), value: `TZS ${salesStats.totalPaid.toLocaleString()}`, c: "#16a34a", icon: "wallet" },
          { label: t("debt"), value: `TZS ${salesStats.totalDebt.toLocaleString()}`, c: "#dc2626", icon: "card" },
        ].map((sc) => (
          <View key={sc.label} style={[s.statCard, { borderTopColor: sc.c }]}>
            <Text style={[s.statLabel, { color: "#64748b" }]}><Ionicons name={sc.icon} size={12} color={sc.c} /> {sc.label}</Text>
            <Text style={[s.statValue, { color: sc.c }]}>{sc.value}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={s.tableCard}>
        <View style={s.tableToolbar}>
          <View style={s.searchWrap}>
            <Ionicons name="search" size={14} color={colors.slate400} style={s.searchIcon} />
            <TextField value={searchQuery} onChangeText={setSearchQuery} placeholder="Search by ID, description..." containerStyle={s.searchField} />
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.tableInner}>
            <View style={s.trHead}>
              {bulk.mode && (
                <Pressable style={[s.th, s.colCheck]} onPress={bulk.toggleAll}>
                  <Ionicons name={bulk.allSelected ? "checkbox" : "square-outline"} size={16} color={bulk.allSelected ? colors.primary : colors.slate400} />
                </Pressable>
              )}
              <Pressable style={[s.th, { flex: 1.6 }]} onPress={() => toggleSort("description")}>
                <Text style={s.thText}>{t("description")}</Text>
              </Pressable>
              <Pressable style={[s.th, { width: 90 }]} onPress={() => toggleSort("amount")}>
                <Text style={[s.thText, { textAlign: "right" }]}>{t("total")}</Text>
              </Pressable>
              <View style={[s.th, { width: 80 }]}>
                <Text style={[s.thText, { textAlign: "center" }]}>{t("payment")}</Text>
              </View>
              <View style={[s.th, { width: 80 }]}>
                <Text style={[s.thText, { textAlign: "center" }]}>{t("status")}</Text>
              </View>
              <Pressable style={[s.th, { width: 90 }]} onPress={() => toggleSort("date")}>
                <Text style={s.thText}>{t("date")}</Text>
              </Pressable>
              <View style={[s.th, { width: 40 }]} />
            </View>

            {paginatedSales.length === 0 ? (
              <View style={s.emptyRow}>
                <Text style={s.emptyText}>No sales found</Text>
              </View>
            ) : paginatedSales.map((sl) => (
              <Pressable key={sl.id} style={[s.tr, bulk.selectedSet.has(sl.id) && s.trSelected]} onPress={() => (bulk.mode ? bulk.toggle(sl.id) : goToEditSale(sl))}>
                {bulk.mode && (
                  <View style={[s.td, s.colCheck]}>
                    <Pressable onPress={() => bulk.toggle(sl.id)} hitSlop={6}>
                      <Ionicons name={bulk.selectedSet.has(sl.id) ? "checkbox" : "square-outline"} size={16} color={bulk.selectedSet.has(sl.id) ? colors.primary : colors.slate400} />
                    </Pressable>
                  </View>
                )}
                <View style={[s.td, { flex: 1.6 }]}>
                  <View style={s.descRow}>
                    <Text style={s.descText} numberOfLines={1}>{sl.description || "—"}</Text>
                    {sl.description && sl.description.startsWith("Delivered Order") && (
                      <View style={s.deliveredBadge}>
                        <Ionicons name="checkmark-circle" size={9} color="#2563eb" />
                        <Text style={s.deliveredText}>Delivered</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={[s.td, { width: 90, textAlign: "right", fontWeight: "700" }]}>TZS {Number(sl.grandTotal || 0).toLocaleString()}</Text>
                <View style={[s.td, { width: 80, alignItems: "center" }]}>
                  <View style={[s.pill, { backgroundColor: sl.paymentMethod === "cash" ? "#f0fdf4" : "#fef2f2" }]}>
                    <Text style={[s.pillText, { color: sl.paymentMethod === "cash" ? "#16a34a" : "#dc2626" }]}>
                      {(sl.paymentMethod || "cash").toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={[s.td, { width: 80, alignItems: "center" }]}>
                  <View style={[s.pill, { backgroundColor: sl.paymentStatus === "PAID" ? "#f0fdf4" : "#fef2f2" }]}>
                    <Text style={[s.pillText, { color: sl.paymentStatus === "PAID" ? "#16a34a" : "#dc2626" }]}>
                      {sl.paymentStatus || "—"}
                    </Text>
                  </View>
                </View>
                <Text style={[s.td, { width: 90, fontSize: 11, color: colors.slate500 }]}>{fmtDate(sl.saleDate)}</Text>
                <Pressable style={[s.td, { width: 40, alignItems: "center" }]} onPress={(e) => { e.stopPropagation?.(); deleteSale(sl.id); }} hitSlop={6}>
                  <Ionicons name="trash-outline" size={13} color="#ef4444" />
                </Pressable>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {totalPages > 1 && (
        <View style={s.pager}>
          <Text style={s.pagerInfo}>Page {page} of {totalPages} ({filteredSales.length} sales)</Text>
          <View style={s.pagerBtns}>
            <Pressable onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={[s.pageNav, page <= 1 && s.pageNavDisabled]}>
              <Ionicons name="chevron-back" size={13} color={page <= 1 ? colors.slate300 : colors.slate600} />
              <Text style={[s.pageNavText, page <= 1 && s.pageNavTextDisabled]}>Prev</Text>
            </Pressable>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Pressable key={p} onPress={() => setPage(p)} style={[s.pageNum, p === page && s.pageNumActive]}>
                <Text style={[s.pageNumText, p === page && s.pageNumTextActive]}>{p}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={[s.pageNav, page >= totalPages && s.pageNavDisabled]}>
              <Text style={[s.pageNavText, page >= totalPages && s.pageNavTextDisabled]}>Next</Text>
              <Ionicons name="chevron-forward" size={13} color={page >= totalPages ? colors.slate300 : colors.slate600} />
            </Pressable>
          </View>
        </View>
      )}

      <Modal visible={isModalOpen} onClose={closeSaleModal} title={editingSale ? `Edit Sale #${editingSale.id}` : "New Sale"}>
        <View style={s.modalBody}>
          {message.text !== "" && (
            <View style={[s.msgBar, message.type === "error" ? s.msgBarError : s.msgBarSuccess]}>
              <Text style={[s.msgText, message.type === "error" ? s.msgTextError : s.msgTextSuccess]}>{message.text}</Text>
            </View>
          )}

          <View style={s.modalGrid}>
            <View style={s.modalGridCol}>
              <View style={s.sectionCard}>
                <Text style={s.sectionLabel}><Ionicons name="people-outline" size={12} color={colors.slate500} /> Customer Type</Text>
                <View style={s.customerTypeGrid}>
                  {CUSTOMER_TYPES.map((ct) => (
                    <Pressable key={ct.value} onPress={() => setCustomerType(ct.value)} style={[s.customerTypeBtn, customerType === ct.value && { borderColor: ct.color, backgroundColor: ct.color + "10" }]}>
                      <Text style={[s.customerTypeText, customerType === ct.value ? { color: ct.color } : {}]}>{ct.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={s.subLabel}>Customer Name</Text>
                <View style={s.customerSearchWrap}>
                  <Ionicons name="search" size={13} color={colors.slate400} style={s.customerSearchIcon} />
                  <TextField value={customerSearch} onChangeText={handleCustomerNameChange} placeholder="Type name or select..." containerStyle={s.customerSearchField} />
                </View>
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <View style={s.dropdown}>
                    {filteredCustomers.slice(0, 6).map((c) => (
                      <Pressable key={c.id} onPress={() => handleCustomerSelect(c)} style={[s.dropdownItem, String(c.id) === String(customerId) && s.dropdownItemActive]}>
                        <Text style={[s.dropdownText, String(c.id) === String(customerId) && { color: colors.primary }]}>{c.name}</Text>
                        {String(c.id) === String(customerId) && <Ionicons name="checkmark" size={14} color={colors.primary} />}
                      </Pressable>
                    ))}
                  </View>
                )}
                {showCustomerDropdown && customerSearch.length > 0 && filteredCustomers.length === 0 && (
                  <Pressable style={s.dropdownNew} onPress={() => setShowCustomerDropdown(false)}>
                    <Text style={s.dropdownNewText}>New: "{customerSearch}" (created on save)</Text>
                  </Pressable>
                )}
              </View>
            </View>
            <View style={s.modalGridCol}>
              <View style={s.sectionCard}>
                <Text style={s.sectionLabel}>{t("paymentMethod")}</Text>
                <View style={s.paymentBtns}>
                  <Pressable onPress={() => setPaymentMethod("cash")} style={[s.payBtn, paymentMethod === "cash" && s.payBtnCash]}>
                    <Ionicons name="wallet" size={14} color={paymentMethod === "cash" ? "#16a34a" : "#64748b"} />
                    <Text style={[s.payBtnText, paymentMethod === "cash" && { color: "#16a34a" }]}>{t("cash")}</Text>
                  </Pressable>
                  <Pressable onPress={() => setPaymentMethod("debt")} style={[s.payBtn, paymentMethod === "debt" && s.payBtnDebt]}>
                    <Ionicons name="card" size={14} color={paymentMethod === "debt" ? "#dc2626" : "#64748b"} />
                    <Text style={[s.payBtnText, paymentMethod === "debt" && { color: "#dc2626" }]}>{t("debt")}</Text>
                  </Pressable>
                </View>
              </View>
              {paymentMethod === "debt" && (
                <View style={s.debtSection}>
                  <Text style={s.debtSectionTitle}><Ionicons name="card" size={12} color={colors.danger} /> Debt Information</Text>
                  <View style={s.fieldBlock}>
                    <Text style={s.fieldLabel}>Contact</Text>
                    <TextField value={debtContact} onChangeText={setDebtContact} placeholder="Phone number or email" />
                  </View>
                  <View style={s.twoCols}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fieldLabel}>Previous Outstanding</Text>
                      <View style={s.readonlyField}>
                        <Text style={s.readonlyText}>TZS {prevOutstanding.toLocaleString()}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fieldLabel}>Total Spend</Text>
                      <View style={[s.readonlyField, { borderColor: "#dc2626", backgroundColor: "#fef2f2" }]}>
                        <Text style={[s.readonlyText, { color: "#dc2626", fontWeight: "700" }]}>TZS {totalSpend.toLocaleString()}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={s.lineItemsCard}>
            <View style={s.lineItemsHeader}>
              <View style={s.lineItemsHeaderLeft}>
                <Text style={s.lineItemsTitle}>{t("lineItems")}</Text>
                {hasStockErrors && (
                  <View style={s.stockIssuesBadge}>
                    <Ionicons name="warning" size={10} color="#dc2626" />
                    <Text style={s.stockIssuesText}>Stock Issues</Text>
                  </View>
                )}
              </View>
              <Pressable onPress={addItemRow} style={s.addItemBtn}>
                <Ionicons name="add" size={13} color={colors.white} />
                <Text style={s.addItemBtnText}>{t("addItem")}</Text>
              </Pressable>
            </View>
            {saleItems.map((item) => {
              const stock = getStock(item.productId);
              const error = stockErrors[item.id];
              const outOfStock = item.productId && stock <= 0;
              const exceedsStock = error?.type === "exceed";
              const selProd = availableProducts.find((p) => String(p.id) === String(item.productId));
              return (
                <View key={item.id} style={[s.lineItemRow, outOfStock && s.lineItemRowOut, exceedsStock && s.lineItemRowWarn]}>
                  <View style={{ flex: 2 }}>
                    <SelectField
                      value={item.productId ? String(item.productId) : ""}
                      onChange={(v) => handleItemChange(item.id, "productId", v)}
                      options={availableProducts.map((p) => {
                        const s = getStock(p.id);
                        const disabled = s <= 0;
                        return { value: String(p.id), label: `${disabled ? "(OUT) " : ""}${p.name} — TZS ${Number(p.price).toLocaleString()} (${s})` };
                      })}
                      placeholder="Select product..."
                      containerStyle={{ marginBottom: 2 }}
                    />
                    {outOfStock && (
                      <View style={s.errorRow}>
                        <Ionicons name="close-circle" size={10} color="#dc2626" />
                        <Text style={s.errorText}>OUT OF STOCK</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 0.6, alignItems: "center" }}>
                    {item.productId ? (
                      <View style={[s.stockBadge, stock <= 0 ? s.stockBadgeOut : stock <= 5 ? s.stockBadgeLow : s.stockBadgeOk]}>
                        <Text style={[s.stockBadgeText, stock <= 0 ? { color: "#dc2626" } : stock <= 5 ? { color: "#a16207" } : { color: "#16a34a" }]}>{stock}</Text>
                      </View>
                    ) : <Text style={{ color: colors.slate300, fontSize: 10 }}>—</Text>}
                  </View>
                  <View style={{ flex: 0.8 }}>
                    <Text style={s.fieldLabel}>Price</Text>
                    <TextField value={String(item.price)} onChangeText={(v) => handleItemChange(item.id, "price", v)} keyboardType="decimal-pad" containerStyle={{ marginBottom: 0 }} />
                  </View>
                  <View style={{ flex: 0.8 }}>
                    <Text style={s.fieldLabel}>Qty</Text>
                    <QuantityInput value={Number(item.quantity) || 0} onChange={(v) => handleItemChange(item.id, "quantity", v)} piecesPerUnit={selProd?.piecesPerUnit || 0} unit={selProd?.unit || "piece"} min={1} />
                    {error && (
                      <View style={s.errorRow}>
                        <Ionicons name="warning" size={9} color={error.type === "out" ? "#dc2626" : "#a16207"} />
                        <Text style={[s.errorTextSmall, { color: error.type === "out" ? "#dc2626" : "#a16207" }]}>{error.msg}</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 0.8, alignItems: "flex-end" }}>
                    <Text style={{ fontWeight: "700" }}>TZS {(item.subtotal || 0).toLocaleString()}</Text>
                  </View>
                  <Pressable onPress={() => removeItemRow(item.id)} disabled={saleItems.length <= 1} hitSlop={6} style={{ padding: 3 }}>
                    <Ionicons name="trash-outline" size={14} color={saleItems.length > 1 ? "#ef4444" : "#d1d5db"} />
                  </Pressable>
                </View>
              );
            })}
          </View>

          <View style={s.footerBar}>
            <View>
              <Text style={s.footerLabel}>Grand Total · {paymentMethod === "cash" ? "Cash" : "Debt"}</Text>
              <Text style={s.footerTotal}>TZS {grandTotal.toLocaleString()}</Text>
            </View>
            <Button title={saving ? "Saving..." : hasStockErrors ? "Fix Stock Issues" : editingSale ? "Update Sale" : "Complete Sale"} variant={saving || hasStockErrors ? "secondary" : "success"} onPress={handleSubmit} disabled={saving || hasStockErrors} loading={saving} icon={<Ionicons name="checkmark-circle" size={16} color={colors.white} />} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50, padding: spacing.sm, gap: spacing.sm },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", height: 400 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexShrink: 0 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.slate900 },
  headerCount: { color: "#94a3b8", fontSize: 12 },
  headerActions: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  bulkBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.slate300, borderRadius: 6, backgroundColor: colors.white },
  bulkBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  bulkBtnText: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.slate200, borderRadius: 6, backgroundColor: colors.slate100 },
  secondaryBtnText: { fontSize: 12, fontWeight: "600", color: colors.slate600 },
  dangerBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: "#fecaca", borderRadius: 6, backgroundColor: colors.dangerLight },
  dangerBtnText: { fontSize: 12, fontWeight: "600", color: colors.danger },
  successBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6, backgroundColor: "#16a34a" },
  successBtnText: { color: colors.white, fontSize: 12, fontWeight: "600" },

  statsRow: { flexDirection: "row", gap: spacing.sm, flexShrink: 0 },
  statCard: { minWidth: 140, flex: 1, backgroundColor: colors.white, borderWidth: 1, borderTopWidth: 3, borderColor: colors.slate200, borderRadius: 8, padding: spacing.md, gap: 2 },
  statLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", flexDirection: "row", alignItems: "center", gap: 4 },
  statValue: { fontSize: 18, fontWeight: "700" },

  tableCard: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: 8, overflow: "hidden", minHeight: 0 },
  tableToolbar: { padding: 8, borderBottomWidth: 1, borderBottomColor: colors.slate200, flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: colors.slate50, flexShrink: 0 },
  searchWrap: { flex: 1, position: "relative" },
  searchIcon: { position: "absolute", left: 8, top: 12, zIndex: 1 },
  searchField: { marginBottom: 0 },

  tableInner: { minWidth: 600 },
  trHead: { flexDirection: "row", backgroundColor: colors.slate50, borderBottomWidth: 2, borderBottomColor: colors.slate200 },
  th: { paddingVertical: 8, paddingHorizontal: 10, flexDirection: "row", alignItems: "center" },
  thText: { fontSize: 10, fontWeight: "700", color: colors.slate500, textTransform: "uppercase" },
  tr: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.slate100, minHeight: 44 },
  trSelected: { backgroundColor: colors.primaryLight },
  td: { paddingVertical: 8, paddingHorizontal: 10, justifyContent: "center" },
  colCheck: { width: 32, alignItems: "center", justifyContent: "center" },
  descRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  descText: { color: colors.slate700, fontSize: 12 },
  deliveredBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 1, paddingHorizontal: 6, borderRadius: 99, fontSize: 9, fontWeight: "700", backgroundColor: "#dbeafe" },
  deliveredText: { fontSize: 9, fontWeight: "700", color: "#2563eb" },
  pill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99 },
  pillText: { fontSize: 10, fontWeight: "600" },

  emptyRow: { padding: 40, alignItems: "center" },
  emptyText: { color: "#94a3b8", fontSize: 13 },

  pager: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 8, borderTopWidth: 1, borderTopColor: colors.slate200, backgroundColor: colors.slate50, flexShrink: 0 },
  pagerInfo: { fontSize: 11, color: colors.slate500 },
  pagerBtns: { flexDirection: "row", gap: 4, alignItems: "center" },
  pageNav: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.slate200, borderRadius: 5, backgroundColor: colors.white },
  pageNavDisabled: { backgroundColor: colors.slate100 },
  pageNavText: { fontSize: 11, fontWeight: "600", color: colors.slate600 },
  pageNavTextDisabled: { color: colors.slate300 },
  pageNum: { width: 26, height: 26, borderWidth: 1, borderColor: colors.slate200, borderRadius: 5, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  pageNumActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pageNumText: { fontSize: 11, fontWeight: "600", color: colors.slate600 },
  pageNumTextActive: { color: colors.white },

  modalBody: { gap: spacing.sm },
  msgBar: { padding: spacing.sm, borderRadius: radius.sm, flexShrink: 0 },
  msgBarSuccess: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  msgBarError: { backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: "#fecaca" },
  msgText: { fontSize: 11 },
  msgTextSuccess: { color: "#166534" },
  msgTextError: { color: colors.dangerDark },

  modalGrid: { flexDirection: "row", gap: spacing.sm, flexShrink: 0 },
  modalGridCol: { flex: 1 },
  sectionCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: 8, padding: 10 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.slate500, textTransform: "uppercase", marginBottom: 6, flexDirection: "row", alignItems: "center", gap: 3 },
  customerTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 8 },
  customerTypeBtn: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6, borderWidth: 2, borderColor: colors.slate200, backgroundColor: colors.white },
  customerTypeText: { fontWeight: "600", fontSize: 10, color: colors.slate500 },
  subLabel: { fontSize: 10, fontWeight: "600", color: colors.slate400, marginBottom: 3 },
  customerSearchWrap: { position: "relative" },
  customerSearchIcon: { position: "absolute", left: 8, top: 12, zIndex: 1 },
  customerSearchField: { marginBottom: 0 },

  dropdown: { position: "absolute", top: 70, left: 0, right: 0, zIndex: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: 6, ...shadow.card, maxHeight: 120, overflow: "hidden" },
  dropdownItem: { paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.slate100, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dropdownItemActive: { backgroundColor: colors.primaryLight },
  dropdownText: { fontSize: 11, color: colors.slate700 },
  dropdownNew: { padding: 8, borderWidth: 1, borderColor: colors.slate200, borderRadius: 6, backgroundColor: colors.white },
  dropdownNewText: { fontSize: 11, color: colors.primary },

  paymentBtns: { flexDirection: "row", gap: 6 },
  payBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, padding: 8, borderRadius: 6, borderWidth: 2, borderColor: colors.slate200, backgroundColor: colors.white },
  payBtnCash: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  payBtnDebt: { borderColor: "#dc2626", backgroundColor: colors.dangerLight },
  payBtnText: { fontWeight: "600", fontSize: 12, color: colors.slate500 },

  debtSection: { backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: "#fecaca", borderRadius: 8, padding: 10, gap: 4 },
  debtSectionTitle: { fontSize: 11, fontWeight: "700", color: colors.danger, textTransform: "uppercase", marginBottom: 4, flexDirection: "row", alignItems: "center", gap: 4 },
  fieldBlock: { marginBottom: 8 },
  fieldLabel: { fontSize: 10, fontWeight: "600", color: colors.slate400, marginBottom: 3 },
  twoCols: { flexDirection: "row", gap: 8 },
  readonlyField: { borderWidth: 1, borderColor: colors.slate200, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: colors.slate100 },
  readonlyText: { fontSize: 12, color: colors.slate700 },

  lineItemsCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate200, borderRadius: 8, overflow: "hidden", flexShrink: 0 },
  lineItemsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.slate50, borderBottomWidth: 1, borderBottomColor: colors.slate200 },
  lineItemsHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  lineItemsTitle: { fontWeight: "700", fontSize: 13, color: colors.slate900 },
  stockIssuesBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 99, backgroundColor: colors.dangerLight },
  stockIssuesText: { fontSize: 10, fontWeight: "700", color: colors.danger },
  addItemBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 5, backgroundColor: colors.primary },
  addItemBtnText: { color: colors.white, fontWeight: "600", fontSize: 11 },
  lineItemRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  lineItemRowOut: { backgroundColor: colors.dangerLight },
  lineItemRowWarn: { backgroundColor: colors.warningLight },

  errorRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  errorText: { fontSize: 10, fontWeight: "700", color: "#dc2626" },
  errorTextSmall: { fontSize: 9, fontWeight: "600" },

  stockBadge: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 99 },
  stockBadgeOut: { backgroundColor: colors.dangerLight },
  stockBadgeLow: { backgroundColor: "#fef9c3" },
  stockBadgeOk: { backgroundColor: "#f0fdf4" },
  stockBadgeText: { fontSize: 10, fontWeight: "700" },

  footerBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.slate800, color: colors.white, padding: 12, borderRadius: 8, flexShrink: 0 },
  footerLabel: { fontSize: 10, textTransform: "uppercase", color: colors.slate400, fontWeight: "600" },
  footerTotal: { fontSize: 24, fontWeight: "800", color: "#4ade80" },
});
