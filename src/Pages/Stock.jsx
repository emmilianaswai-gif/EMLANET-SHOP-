import { useEffect, useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { t, useLanguage } from "../i18n";
import { canViewProfit } from "../utils/roleChecks";
import { confirmDialog } from "../utils/confirm";
import { useNav, useRoutePath } from "../navigation/nav";
import { TextField, Button, Modal, QuantityInput } from "../components/ui";
import { colors, font, radius, spacing, shadow } from "../theme";

export default function Stock() {
  useLanguage();
  const showProfit = canViewProfit();
  const navigate = useNav();
  const pathname = useRoutePath();
  const STOCK_PAGE_SIZE = 10;

  const [stocks, setStocks] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [exchangeRecords, setExchangeRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [sortF, setSortF] = useState("date");
  const [sortD, setSortD] = useState("desc");
  const [msg, setMsg] = useState("");
  const [viewMode, setViewMode] = useState("products");
  const [statFilter, setStatFilter] = useState("all");
  const [editingStock, setEditingStock] = useState(null);
  const [editQty, setEditQty] = useState(0);
  const [editThreshold, setEditThreshold] = useState(0);
  const [editExpiry, setEditExpiry] = useState("");
  const [stockPage, setStockPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [sr, pr, hr, xr] = await Promise.all([
        api.get("/stocks").catch(() => ({ data: [] })),
        api.get("/products").catch(() => ({ data: [] })),
        api.get("/stock-history").catch(() => ({ data: [] })),
        api.get("/exchange-storing").catch(() => ({ data: [] })),
      ]);
      setStocks(Array.isArray(sr.data) ? sr.data : []);
      setProducts(Array.isArray(pr.data) ? pr.data : []);
      setStockHistory(Array.isArray(hr.data) ? hr.data : []);
      setExchangeRecords(Array.isArray(xr.data) ? xr.data : []);
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [pathname]);

  const reload = async () => {
    setLoadError(false);
    try {
      const [sr, hr, xr] = await Promise.all([
        api.get("/stocks").catch(() => ({ data: [] })),
        api.get("/stock-history").catch(() => ({ data: [] })),
        api.get("/exchange-storing").catch(() => ({ data: [] })),
      ]);
      setStocks(Array.isArray(sr.data) ? sr.data : []);
      setStockHistory(Array.isArray(hr.data) ? hr.data : []);
      setExchangeRecords(Array.isArray(xr.data) ? xr.data : []);
    } catch { setLoadError(true); }
  };

  const getProductName = (pid) => {
    const p = products.find((x) => x.id === pid);
    return p?.name || "—";
  };

  const getProductUnit = (pid) => {
    const p = products.find((x) => x.id === pid);
    return p?.unit || "piece";
  };

  const getProductPieces = (pid) => {
    const p = products.find((x) => x.id === pid);
    return Number(p?.piecesPerUnit) > 0 ? p.piecesPerUnit : "";
  };

  const getProductExpiry = (pid) => {
    const p = products.find((x) => x.id === pid);
    return p?.expiryDate || "";
  };

  const byProduct = useMemo(() => {
    const grouped = {};
    const initialQtyMap = {};
    const soldQtyMap = {};
    const exchangedQtyMap = {};

    stockHistory.forEach((h) => {
      const pid = h.product?.id || h.productId;
      const pname = getProductName(pid);
      const key = pname.toLowerCase().trim();
      if (!key) return;
      if (h.transactionType === "Added" && !initialQtyMap[key]) {
        initialQtyMap[key] = Number(h.resultingQuantity) || Number(h.quantityChange) || 0;
      }
      const q = Number(h.quantityChange) || 0;
      if (q < 0 && (h.transactionType === "Sold" || h.transactionType === "Sell")) soldQtyMap[key] = (soldQtyMap[key] || 0) + Math.abs(q);
      if (!grouped[key]) {
        grouped[key] = {
          id: `hist-${h.id}`,
          productId: pid,
          name: pname,
          unit: getProductUnit(pid),
          piecesPerUnit: getProductPieces(pid),
          initialQuantity: 0,
          quantity: 0,
          currentStock: 0,
          lowStockThreshold: 0,
          date: "",
          expiryDate: "",
          expiryDateLabel: "",
          buyingPrice: 0,
          sellingPrice: 0,
          qtySold: 0,
          exchangedQty: 0,
        };
      }
      grouped[key].quantity += q;
    });

    stocks.forEach((s) => {
      const pid = s.product?.id || s.productId;
      const pname = s.product?.name || s.productName || getProductName(pid);
      const key = pname.toLowerCase().trim();
      if (!key) return;
      if (!grouped[key]) {
        grouped[key] = {
          id: `stock-${s.id}`,
          productId: pid,
          name: pname,
          unit: s.product?.unit || getProductUnit(pid),
          piecesPerUnit: getProductPieces(pid),
          initialQuantity: 0,
          quantity: 0,
          currentStock: 0,
          lowStockThreshold: 0,
          date: s.date || "",
          expiryDate: s.expiryDate || getProductExpiry(pid) || "",
          expiryDateLabel: (s.expiryDate || getProductExpiry(pid)) ? new Date(s.expiryDate || getProductExpiry(pid)).toLocaleDateString() : "",
          buyingPrice: 0,
          sellingPrice: 0,
          qtySold: 0,
          exchangedQty: 0,
          image: "",
        };
      }
      grouped[key].currentStock += Number(s.quantity) || 0;
      if (Number(s.lowStockThreshold) > grouped[key].lowStockThreshold) grouped[key].lowStockThreshold = Number(s.lowStockThreshold);
      if (!grouped[key].date && s.date) grouped[key].date = s.date;
      const prod = products.find((p) => p.id === pid);
      if (prod) {
        grouped[key].buyingPrice = Number(prod.buyingPrice) || 0;
        grouped[key].sellingPrice = Number(prod.price) || 0;
        if (Number(prod.piecesPerUnit) > 0) grouped[key].piecesPerUnit = prod.piecesPerUnit;
        if (prod.image) grouped[key].image = prod.image;
        grouped[key].expiryDate = prod.expiryDate || grouped[key].expiryDate;
        grouped[key].expiryDateLabel = prod.expiryDate ? new Date(prod.expiryDate).toLocaleDateString() : grouped[key].expiryDateLabel;
      }
      if (!grouped[key].expiryDate && (s.expiryDate || getProductExpiry(pid))) {
        grouped[key].expiryDate = s.expiryDate || getProductExpiry(pid);
        grouped[key].expiryDateLabel = new Date(grouped[key].expiryDate).toLocaleDateString();
      }
    });

    exchangeRecords.forEach((r) => {
      const st = (r.status || "").toLowerCase();
      if (st !== "approved" && st !== "active") return;
      const pid = r.product?.id || r.productId;
      const pname = pid ? getProductName(pid) : (r.productName || "");
      const key = pname.toLowerCase().trim();
      if (!key) return;
      exchangedQtyMap[key] = (exchangedQtyMap[key] || 0) + (Number(r.quantity) || 0);
    });

    Object.values(grouped).forEach((r) => {
      const key = r.name.toLowerCase().trim();
      r.initialQuantity = initialQtyMap[key] ?? r.currentStock;
      r.exchangedQty = exchangedQtyMap[key] || 0;
      r.qtySold = soldQtyMap[key] || 0;
      r.earnedProfit = ((Number(r.sellingPrice) || 0) - (Number(r.buyingPrice) || 0)) * r.qtySold;
    });

    let items = Object.values(grouped);

    if (statFilter === "out") {
      items = items.filter((r) => r.currentStock <= 0);
    } else if (statFilter === "low") {
      items = items.filter((r) => r.currentStock > 0 && r.currentStock <= r.lowStockThreshold);
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((r) => r.name.toLowerCase().includes(q));
    }

    items.sort((a, b) => {
      let va, vb;
      if (sortF === "name") { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortF === "qty") { va = a.quantity; vb = b.quantity; }
      else { va = a.date; vb = b.date; }
      return typeof va === "string" ? (sortD === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)) : (sortD === "asc" ? va - vb : vb - va);
    });

    return items;
  }, [stocks, products, stockHistory, exchangeRecords, search, sortF, sortD, statFilter]);

  const byDate = useMemo(() => {
    const priceOf = {};
    products.forEach((p) => {
      priceOf[p.id] = { selling: Number(p.price) || 0, buying: Number(p.buyingPrice) || 0 };
    });

    const entries = stockHistory.map((h) => {
      const pid = h.product?.id || h.productId;
      const prices = priceOf[pid] || { selling: 0, buying: 0 };
      const margin = prices.selling - prices.buying;
      const q = Number(h.quantityChange) || 0;
      return {
        id: `hist-${h.id}`,
        historyId: h.id,
        productId: pid,
        name: getProductName(pid),
        unit: getProductUnit(pid),
        quantityChange: q,
        resultingQuantity: Number(h.resultingQuantity) || 0,
        transactionType: h.transactionType || "",
        date: h.createdAt || "",
        dateLabel: h.createdAt ? new Date(h.createdAt).toLocaleDateString() : "—",
        timeLabel: h.createdAt ? new Date(h.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        margin,
        expectedProfit: 0,
        earnedProfit: 0,
      };
    });

    const chrono = [...entries].sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.historyId - b.historyId));
    const fifo = {};
    const unattached = [];
    chrono.forEach((e) => {
      if (e.quantityChange > 0) {
        const day = (e.date || "").slice(0, 10) || "—";
        const isAdd = e.transactionType === "Added" || e.transactionType === "Purchase";
        e.dayKey = day;
        e.isAdd = isAdd;
        e.groupKey = `${e.name.toLowerCase().trim()}::${day}::${e.quantityChange}::hist-${e.historyId}`;
        e.expectedProfit = isAdd ? e.margin * e.quantityChange : 0;
        e.earnedProfit = 0;
        e.soldQty = 0;
        e.deletedQty = 0;
        e.fifoRemaining = e.quantityChange;
        (fifo[e.productId] = fifo[e.productId] || []).push(e);
      } else if (e.quantityChange < 0) {
        const isSale = e.transactionType === "Sold" || e.transactionType === "Sell";
        let remaining = Math.abs(e.quantityChange);
        const queue = fifo[e.productId];
        e.fromBatches = [];
        if (queue) {
          while (remaining > 0 && queue.length > 0) {
            const batch = queue[0];
            const take = Math.min(batch.fifoRemaining, remaining);
            batch.fifoRemaining -= take;
            remaining -= take;
            e.fromBatches.push({ batch, take, isSale });
            if (isSale) {
              batch.earnedProfit += take * batch.margin;
              batch.soldQty += take;
            } else {
              batch.deletedQty += take;
            }
            if (batch.fifoRemaining <= 0) queue.shift();
          }
        }
        e.earnedProfit = isSale ? e.margin * Math.abs(e.quantityChange) : 0;
        if (remaining > 0) unattached.push({ ...e, unattachedQty: remaining });
      }
    });

    const groups = {};
    chrono.forEach((e) => {
      if (e.quantityChange <= 0) return;
      let key = e.groupKey;
      if (!e.isAdd) {
        const base = `${e.name.toLowerCase().trim()}::${e.dayKey}::${e.quantityChange}::`;
        const match = Object.keys(groups).find((k) => k.startsWith(base));
        if (match) key = match;
      }
      if (!groups[key]) {
        groups[key] = {
          id: `day-${key}`,
          historyIds: [],
          productId: e.productId,
          name: e.name,
          unit: e.unit,
          addedQty: 0,
          restoredQty: 0,
          soldQty: 0,
          deletedQty: 0,
          resultingQuantity: 0,
          date: e.dayKey,
          dateLabel: e.dayKey === "—" ? "—" : new Date(e.dayKey + "T00:00:00").toLocaleDateString(),
          timeLabel: "",
          expectedProfit: 0,
          earnedProfit: 0,
        };
      }
      const g = groups[key];
      g.historyIds.push(e.historyId);
      g.productId = e.productId;
      g.unit = e.unit;
      if (e.isAdd) g.addedQty += e.quantityChange;
      else g.restoredQty += e.quantityChange;
      g.soldQty += e.soldQty || 0;
      g.deletedQty += e.deletedQty || 0;
      g.expectedProfit += e.expectedProfit || 0;
      g.earnedProfit += e.earnedProfit || 0;
    });

    chrono.forEach((e) => {
      if (e.quantityChange >= 0) return;
      (e.fromBatches || []).forEach((fb) => {
        const key = fb.batch.groupKey;
        if (groups[key]) groups[key].historyIds.push(e.historyId);
      });
    });

    Object.values(groups).forEach((g) => {
      g.resultingQuantity = (g.addedQty + g.restoredQty) - g.soldQty - g.deletedQty;
      g.historyIds = [...new Set(g.historyIds)];
    });

    unattached.forEach((e) => {
      const day = (e.date || "").slice(0, 10) || "—";
      const isSale = e.transactionType === "Sold" || e.transactionType === "Sell";
      const key = `${e.name.toLowerCase().trim()}::${day}::misc-${e.historyId}`;
      groups[key] = {
        id: `day-${key}`,
        historyIds: [e.historyId],
        productId: e.productId,
        name: e.name,
        unit: e.unit,
        addedQty: 0,
        restoredQty: 0,
        soldQty: isSale ? Math.abs(e.quantityChange) : 0,
        deletedQty: isSale ? 0 : Math.abs(e.quantityChange),
        resultingQuantity: e.resultingQuantity,
        date: day,
        dateLabel: day === "—" ? "—" : new Date(day + "T00:00:00").toLocaleDateString(),
        timeLabel: "",
        expectedProfit: 0,
        earnedProfit: 0,
      };
    });

    let items = Object.values(groups);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((r) => r.name.toLowerCase().includes(q));
    }

    items.sort((a, b) => {
      let va, vb;
      if (sortF === "name") { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortF === "qty") { va = a.resultingQuantity; vb = b.resultingQuantity; }
      else { va = a.date; vb = b.date; }
      return typeof va === "string" ? (sortD === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)) : (sortD === "asc" ? va - vb : vb - va);
    });

    return items;
  }, [stockHistory, products, search, sortF, sortD]);

  const activeRows = viewMode === "products" ? byProduct : byDate;

  const totalStockPages = Math.max(1, Math.ceil(activeRows.length / STOCK_PAGE_SIZE));
  const currentStockPage = Math.min(stockPage, totalStockPages);
  const paginatedRows = activeRows.slice((currentStockPage - 1) * STOCK_PAGE_SIZE, currentStockPage * STOCK_PAGE_SIZE);

  useEffect(() => { setStockPage(1); }, [search, sortF, sortD, statFilter, viewMode]);

  const bulk = useBulkSelect(activeRows, (r) => r.id);

  const deleteSelected = async () => {
    if (bulk.selected.length === 0) return;
    if (!(await confirmDialog(t("deleteSelectedCount", { count: bulk.selected.length, type: viewMode === "products" ? t("productPlural") : t("entryPlural") })))) return;
    setMsg("");
    try {
      if (viewMode === "products") {
        for (const id of bulk.selected) {
          const row = activeRows.find((r) => r.id === id);
          if (!row || !row.productId) continue;
          const pid = row.productId;
          const stock = stocks.find((s) => (s.product?.id || s.productId) === pid);
          if (stock) await api.delete(`/stocks/${stock.id}`).catch(() => {});
          for (const h of stockHistory.filter((x) => (x.product?.id || x.productId) === pid)) await api.delete(`/stock-history/${h.id}`).catch(() => {});
          await api.delete(`/products/${pid}`).catch(() => {});
        }
      } else {
        for (const id of bulk.selected) {
          const row = activeRows.find((r) => r.id === id);
          if (!row) continue;
          const ids = row.historyIds || (row.historyId ? [row.historyId] : []);
          const stock = stocks.find((s) => (s.product?.id || s.productId) === row.productId);
          if (stock) await api.delete(`/stocks/${stock.id}`).catch(() => {});
          for (const hid of ids) await api.delete(`/stock-history/${hid}`).catch(() => {});
        }
      }
      bulk.clear();
      await loadData();
      setMsg(t("deleted"));
      setTimeout(() => setMsg(""), 2000);
    } catch { setMsg(t("failedToDelete")); setTimeout(() => setMsg(""), 2000); }
  };

  const totalQty = byProduct.reduce((sum, r) => sum + r.currentStock, 0);
  const outOfStock = byProduct.filter((r) => r.currentStock <= 0).length;
  const lowStock = byProduct.filter((r) => r.currentStock > 0 && r.currentStock <= r.lowStockThreshold).length;
  const totalEntries = viewMode === "products" ? byProduct.length : byDate.length;
  const totalPredictedProfit = byProduct.reduce((sum, r) => {
    return sum + ((Number(r.sellingPrice) || 0) - (Number(r.buyingPrice) || 0)) * r.currentStock;
  }, 0);
  const totalEarnedProfit = byProduct.reduce((sum, r) => sum + (Number(r.earnedProfit) || 0), 0);

  const recommendations = useMemo(() => {
    const items = [];
    const now = new Date();
    const pidStockHist = {};
    stockHistory.forEach((h) => {
      const pid = h.product?.id || h.productId;
      if (!pidStockHist[pid]) pidStockHist[pid] = [];
      pidStockHist[pid].push(h);
    });

    byProduct.forEach((p) => {
      if (p.currentStock <= 0) {
        items.push({ type: "danger", icon: "alert-triangle", title: t("outOfStockTitle"), msg: t("needsRestockMsg", { name: p.name }), action: () => navigate("/products/add", { edit: p.productId, from: "stock" }), label: t("restockLabel") });
      } else if (p.currentStock <= p.lowStockThreshold && p.lowStockThreshold > 0) {
        items.push({ type: "warning", icon: "alert-triangle", title: t("lowStockTitle"), msg: t("lowStockMsg", { name: p.name, qty: p.currentStock, threshold: p.lowStockThreshold }), action: () => navigate("/products/add", { edit: p.productId, from: "stock" }), label: t("reorderLabel") });
      }
      if (p.expiryDate) {
        const exp = new Date(p.expiryDate);
        const days = Math.ceil((exp - now) / 86400000);
        if (days < 0) {
          items.push({ type: "danger", icon: "time", title: t("expiredTitle"), msg: t("expiredMsg", { name: p.name, days: Math.abs(days) }), action: () => navigate("/products/add", { edit: p.productId, from: "stock" }), label: t("reviewLabel") });
        } else if (days <= 30) {
          items.push({ type: "warning", icon: "time", title: t("expiringTitle"), msg: t("expiringMsg", { name: p.name, days, date: p.expiryDateLabel }), action: () => navigate("/products/add", { edit: p.productId, from: "stock" }), label: t("promoteLabel") });
        }
      }
      const hist = pidStockHist[p.productId] || [];
      const sells = hist.filter((h) => h.transactionType === "Sold" || h.transactionType === "Sell");
      if (sells.length >= 3) {
        items.push({ type: "info", icon: "cart", title: t("highDemandTitle"), msg: t("highDemandMsg", { name: p.name, count: sells.length }), action: () => setViewMode("bydate"), label: t("viewActivityLabel") });
      }
    });
    return items.slice(0, 8);
  }, [byProduct, stockHistory, navigate]);

  const toggleSort = (field) => {
    if (sortF === field) setSortD((d) => d === "asc" ? "desc" : "asc");
    else { setSortF(field); setSortD("desc"); }
  };

  const deleteHistory = async (id) => {
    if (!(await confirmDialog(t("deleteHistoryEntryConfirm")))) return;
    try {
      const hist = stockHistory.find((h) => h.id === id);
      const pid = hist?.product?.id || hist?.productId;
      const stock = stocks.find((s) => (s.product?.id || s.productId) === pid);
      if (stock) { try { await api.delete(`/stocks/${stock.id}`); } catch {} }
      await api.delete(`/stock-history/${id}`);
      await reload();
    } catch { setMsg(t("failed")); setTimeout(() => setMsg(""), 2000); }
  };

  const deleteDayGroup = async (row) => {
    if (!row?.historyIds?.length) return;
    if (!(await confirmDialog(t("deleteStockEntriesConfirm", { name: row.name, date: row.dateLabel })))) return;
    try {
      const stock = stocks.find((s) => (s.product?.id || s.productId) === row.productId);
      if (stock) { try { await api.delete(`/stocks/${stock.id}`); } catch {} }
      for (const id of row.historyIds) { try { await api.delete(`/stock-history/${id}`); } catch {} }
      await reload();
      setMsg(t("stockEntriesDeleted"));
      setTimeout(() => setMsg(""), 2000);
    } catch { setMsg(t("failed")); setTimeout(() => setMsg(""), 2000); }
  };

  const startEditStock = (row) => {
    setEditingStock(row);
    setEditQty("");
    setEditThreshold(String(row.lowStockThreshold));
    setEditExpiry(row.expiryDate ? new Date(row.expiryDate).toISOString().split("T")[0] : "");
  };

  const saveStockEdit = async () => {
    if (!editingStock) return;
    const addQty = Number(editQty) || 0;
    const newThreshold = Number(editThreshold) || 0;
    const pid = editingStock.productId;
    const expiryPayload = editExpiry ? new Date(editExpiry).toISOString() : null;
    const stock = stocks.find((s) => (s.product?.id || s.productId) === pid);
    const currentQty = stock ? Number(stock.quantity) || 0 : 0;
    const newQty = currentQty + addQty;
    try {
      if (stock) {
        await api.put(`/stocks/${stock.id}`, { ...stock, quantity: newQty, lowStockThreshold: newThreshold, expiryDate: expiryPayload, product: { id: pid } });
      } else if (addQty > 0) {
        await api.post("/stocks", { quantity: addQty, lowStockThreshold: newThreshold, expiryDate: expiryPayload, product: { id: pid } });
      }
      if (addQty !== 0) {
        await api.post("/stock-history", { product: { id: pid }, quantityChange: addQty, resultingQuantity: newQty, transactionType: "Added" }).catch(() => {});
      }
      setEditingStock(null);
      await loadData();
      setMsg(addQty > 0 ? t("stockAddedMsg", { name: editingStock.name, qty: newQty }) : t("stockUpdated"));
      setTimeout(() => setMsg(""), 2500);
    } catch { setMsg(t("failedToUpdateStock")); setTimeout(() => setMsg(""), 2000); }
  };

  const deleteProduct = async (pid) => {
    if (!(await confirmDialog(t("deleteProductAndStock")))) return;
    try {
      const stock = stocks.find((s) => (s.product?.id || s.productId) === pid);
      if (stock) await api.delete(`/stocks/${stock.id}`).catch(() => {});
      stockHistory.filter((h) => (h.product?.id || h.productId) === pid).forEach(async (h) => { await api.delete(`/stock-history/${h.id}`).catch(() => {}); });
      await api.delete(`/products/${pid}`);
      await loadData();
      setMsg(t("productDeleted"));
      setTimeout(() => setMsg(""), 2000);
    } catch { setMsg(t("failedToDelete")); setTimeout(() => setMsg(""), 2000); }
  };

  if (loading) return (
    <View style={styles.centerBox}>
      <Spinner size={28} text={t("loading")} />
    </View>
  );

  if (loadError) return (
    <View style={styles.errorWrap}>
      <Ionicons name="alert-triangle" size={40} color={colors.warning} style={{ opacity: 0.6 }} />
      <Text style={styles.errorTitle}>{t("failedToLoadStockData")}</Text>
      <Text style={styles.errorText}>{t("checkBackendEndpoint")}</Text>
      <Pressable onPress={loadData} style={styles.retryBtn}>
        <Ionicons name="refresh" size={14} color="#fff" />
        <Text style={styles.retryText}>{t("retry")}</Text>
      </Pressable>
    </View>
  );

  const statCards = [
    { key: "all", label: t("totalProducts"), value: byProduct.length, color: colors.primary, ion: "hash", bg: "#eff6ff", action: () => setStatFilter("all") },
    { key: "all", label: t("totalQuantity"), value: totalQty.toLocaleString(), color: colors.success, ion: "cube", bg: "#ecfdf5", action: () => setStatFilter("all") },
    { key: "out", label: t("outOfStock"), value: outOfStock, color: colors.danger, ion: "alert-triangle", bg: "#fef2f2", action: () => setStatFilter("out") },
    { key: "low", label: t("lowStock"), value: lowStock, color: colors.warning, ion: "alert-triangle", bg: "#fef3c7", action: () => setStatFilter("low") },
    ...(showProfit ? [
      { key: "all", label: t("earnedProfit"), value: `TZS ${totalEarnedProfit.toLocaleString()}`, color: "#0ea5e9", ion: "trending-up", bg: "#f0f9ff", action: () => setStatFilter("all") },
      { key: "all", label: t("predictedProfit"), value: `TZS ${totalPredictedProfit.toLocaleString()}`, color: colors.success, ion: "trending-up", bg: "#f0fdf4", action: () => setStatFilter("all") },
    ] : []),
  ];

  const recommendationColors = {
    danger: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", btn: colors.danger },
    warning: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", btn: colors.warning },
    info: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af", btn: colors.primary },
  };

  const fmtDate = (s) => {
    if (!s) return "—";
    try { return new Date(s).toLocaleDateString(); } catch { return "—"; }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing.sm, gap: spacing.sm, paddingBottom: 40 }}>
      <Modal
        visible={!!editingStock}
        onClose={() => setEditingStock(null)}
        title={`${t("addStockTitle")} — ${editingStock?.name || ""}`}
      >
        {editingStock && (
          <>
            <View style={styles.editingInfo}>
              <Text style={styles.editingInfoText}>
                {t("currentStock")}: <Text style={{ fontWeight: "700", color: colors.slate900 }}>{editingStock.currentStock ?? editingStock.quantity ?? 0} {editingStock.unit || ""}</Text>
                {(() => { const ppu = Number(getProductPieces(editingStock.productId)); const cur = Number(editingStock.currentStock ?? editingStock.quantity ?? 0); return ppu > 0 && cur > 0 ? <Text> ({t("approx")} {Math.round((cur / ppu) * 100) / 100} {getProductUnit(editingStock.productId)})</Text> : null; })()}
                {Number(editingStock.exchangedQty) > 0 && (
                  <Text style={{ color: colors.danger, fontWeight: "600" }}> (−{editingStock.exchangedQty} {t("exchanged")})</Text>
                )}
              </Text>
            </View>

            <Text style={styles.modalLabel}>{t("addQuantityLabel")}</Text>
            <QuantityInput
              value={Number(editQty) || 0}
              onChange={(v) => setEditQty(v)}
              piecesPerUnit={getProductPieces(editingStock.productId)}
              unit={getProductUnit(editingStock.productId)}
              min={0}
              placeholder="e.g. 12"
            />

            <Text style={styles.modalLabel}>{t("lowStockAlertThreshold")}</Text>
            <QuantityInput
              value={Number(editThreshold) || 0}
              onChange={(v) => setEditThreshold(v)}
              piecesPerUnit={getProductPieces(editingStock.productId)}
              unit={getProductUnit(editingStock.productId)}
              min={0}
              placeholder="e.g. 10"
            />

            <TextField
              label={t("expiryDate")}
              value={editExpiry}
              onChangeText={setEditExpiry}
              placeholder="YYYY-MM-DD"
            />
          </>
        )}
      </Modal>

      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <Ionicons name="cube-outline" size={22} color={colors.primary} />
          <Text style={styles.title}>{t("stock")}</Text>
          <Text style={styles.count}>({totalEntries} {viewMode === "products" ? t("products") : t("entries")})</Text>
        </View>
        <View style={styles.titleActions}>
          <Pressable
            onPress={() => (bulk.mode ? bulk.clear() : bulk.startMode())}
            style={[styles.selectBtn, bulk.mode && styles.selectBtnActive]}
          >
            <Ionicons name="checkbox-outline" size={14} color={colors.primary} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>{bulk.mode ? t("cancelSelect") : t("select")}</Text>
          </Pressable>
          <Pressable onPress={() => navigate("/products/add", { from: "stock" })} style={styles.addBtn}>
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={styles.addBtnText}>{t("addStock")}</Text>
          </Pressable>
        </View>
      </View>

      {recommendations.length > 0 && (
        <View style={styles.recommendWrap}>
          <View style={styles.recommendHeader}>
            <Ionicons name="bulb" size={14} color={colors.warning} />
            <Text style={styles.recommendTitle}>{t("smartRecommendations")}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {recommendations.map((r, i) => {
              const c = recommendationColors[r.type] || recommendationColors.info;
              return (
                <View key={i} style={[styles.recommendCard, { background: c.bg, borderColor: c.border }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                    <Ionicons name={r.icon} size={12} color={c.text} />
                    <Text style={[styles.recommendCardTitle, { color: c.text }]}>{r.title}</Text>
                  </View>
                  <Text style={[styles.recommendCardMsg, { color: c.text }]}>{r.msg}</Text>
                  <Pressable onPress={r.action} style={[styles.recommendBtn, { backgroundColor: c.btn }]}>
                    <Text style={styles.recommendBtnText}>{r.label}</Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.statsRow}>
        {statCards.map((s) => {
          const isActive = (s.key === "out" || s.key === "low") ? s.key === statFilter : statFilter === "all";
          return (
            <Pressable
              key={s.label}
              onPress={() => { setViewMode("products"); s.action(); }}
              style={[styles.statCard, isActive && { background: s.bg, borderColor: s.color }]}
            >
              <View style={[styles.statTopBorder, { background: s.color }]} />
              <Text style={[styles.statLabel, { color: s.color }]}>
                <Ionicons name={s.ion} size={12} color={s.color} /> {s.label}
              </Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.toolbar}>
        <View style={{ flex: 1, minWidth: 160, position: "relative" }}>
          <View style={{ position: "absolute", left: 8, top: 12, zIndex: 1 }}>
            <Ionicons name="search" size={14} color={colors.slate400} />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("searchProducts")}
            placeholderTextColor={colors.slate400}
            style={styles.searchInput}
          />
        </View>
        <View style={styles.segmented}>
          <Pressable onPress={() => setViewMode("products")} style={[styles.segment, viewMode === "products" && styles.segmentActive]}>
            <Ionicons name="layers" size={12} color={viewMode === "products" ? colors.primary : colors.slate500} />
            <Text style={[styles.segmentText, viewMode === "products" && styles.segmentTextActive]}>{t("byProduct")}</Text>
          </Pressable>
          <Pressable onPress={() => setViewMode("bydate")} style={[styles.segment, viewMode === "bydate" && styles.segmentActive]}>
            <Ionicons name="time" size={12} color={viewMode === "bydate" ? colors.primary : colors.slate500} />
            <Text style={[styles.segmentText, viewMode === "bydate" && styles.segmentTextActive]}>{t("byDate")}</Text>
          </Pressable>
        </View>
        {bulk.mode && (
          <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected} onSelectAll={bulk.toggleAll} onDelete={deleteSelected} deleteLabel={t("deleteSelected")} />
        )}
      </View>

      {!!msg && (
        <View style={[styles.msgBanner, { background: msg.includes("Failed") ? "#fef2f2" : "#f0fdf4", borderColor: msg.includes("Failed") ? "#fecaca" : "#bbf7d0" }]}>
          <Text style={{ fontSize: 11, color: msg.includes("Failed") ? "#991b1b" : "#166534" }}>{msg}</Text>
        </View>
      )}

      <View style={styles.tableCard}>
        <ScrollView horizontal>
          <View style={{ minWidth: 720 }}>
            <View style={[styles.thead, { background: "#f8fafc", borderBottomColor: colors.slate200 }]}>
              {bulk.mode && (
                <Pressable style={[styles.th, styles.centerCell, { width: 32 }]} onPress={bulk.toggleAll}>
                  <Ionicons name={bulk.allSelected ? "checkbox" : "square-outline"} size={16} color={bulk.allSelected ? colors.primary : colors.slate400} />
                </Pressable>
              )}
              {viewMode === "products" ? (
                <>
                  {[
                    { f: "name", l: t("productName"), flex: 1.6 },
                    { f: "qty", l: t("currentQuantity"), flex: 0.8, center: true },
                    { f: null, l: t("previousQuantity"), flex: 0.9, center: true },
                    { f: null, l: t("lowAlert"), flex: 0.6, center: true },
                    { f: null, l: t("status"), flex: 0.8, center: true },
                    { f: "date", l: t("dateAdded"), flex: 0.8, center: true },
                    { f: null, l: t("expiry"), flex: 0.8, center: true },
                    ...(showProfit ? [{ f: null, l: t("earned"), flex: 0.8, right: true }, { f: null, l: t("projectedProfit"), flex: 0.8, right: true }] : []),
                    { f: null, l: t("actions"), flex: 0.6, center: true },
                  ].map((h) => (
                    <Pressable key={h.l} style={[styles.th, h.center && styles.centerCell, h.right && { alignItems: "flex-end" }, { flex: h.flex }]} onPress={() => h.f && toggleSort(h.f)}>
                      <Text style={styles.thText}>{h.l}</Text>
                      {!!h.f && <Ionicons name="swap-vertical" size={10} style={{ opacity: sortF === h.f ? 1 : 0.3 }} color={sortF === h.f ? colors.primary : colors.slate400} />}
                    </Pressable>
                  ))}
                </>
              ) : (
                <>
                  {[
                    { f: "name", l: t("productName"), flex: 1.6 },
                    { f: null, l: t("added"), flex: 0.7, center: true },
                    { f: null, l: t("sold"), flex: 0.7, center: true },
                    { f: null, l: t("deleted"), flex: 0.7, center: true },
                    { f: "qty", l: t("resulting"), flex: 0.7, center: true },
                    { f: "date", l: t("date"), flex: 0.9, center: true },
                    { f: null, l: t("time"), flex: 0.8, center: true },
                    ...(showProfit ? [{ f: null, l: t("expectedProfit"), flex: 0.9, right: true }, { f: null, l: t("alreadyEarned"), flex: 0.9, right: true }] : []),
                    { f: null, l: t("actions"), flex: 0.6, center: true },
                  ].map((h) => (
                    <Pressable key={h.l} style={[styles.th, h.center && styles.centerCell, h.right && { alignItems: "flex-end" }, { flex: h.flex }]} onPress={() => h.f && toggleSort(h.f)}>
                      <Text style={styles.thText}>{h.l}</Text>
                      {!!h.f && <Ionicons name="swap-vertical" size={10} style={{ opacity: sortF === h.f ? 1 : 0.3 }} color={sortF === h.f ? colors.primary : colors.slate400} />}
                    </Pressable>
                  ))}
                </>
              )}
            </View>

            {activeRows.length === 0 ? (
              <View style={[styles.emptyCell, { alignItems: "center" }]}>
                <Text style={styles.emptyText}>{t("noRecordsFound")}</Text>
              </View>
            ) : viewMode === "products" ? (
              paginatedRows.map((r) => {
                const isOut = r.currentStock <= 0;
                const isLow = r.currentStock > 0 && r.currentStock <= r.lowStockThreshold;
                return (
                  <View key={r.id} style={[styles.tr, { background: isOut ? "#fef2f2" : isLow ? "#fefce8" : "#fff" }]} {...bulk.rowProps(r.id)}>
                    {bulk.mode && (
                      <Pressable style={[styles.td, styles.centerCell, { width: 32 }]} onPress={() => bulk.toggle(r.id)}>
                        <Ionicons name={bulk.selectedSet.has(r.id) ? "checkbox" : "square-outline"} size={16} color={bulk.selectedSet.has(r.id) ? colors.primary : colors.slate400} />
                      </Pressable>
                    )}
                    <View style={[styles.td, { flex: 1.6, flexDirection: "row", alignItems: "center", gap: 6 }]}>
                      {r.image ? (
                        <Image source={{ uri: r.image }} style={styles.thumb} />
                      ) : (
                        <View style={[styles.iconBox, { background: isOut ? "#fef2f2" : isLow ? "#fef9c3" : "#eff6ff" }]}>
                          <Ionicons name="cube" size={14} color={isOut ? colors.danger : isLow ? "#a16207" : colors.primary} />
                        </View>
                      )}
                      <View style={{ flexShrink: 1 }}>
                        <Text style={styles.nameText} numberOfLines={1}>{r.name}</Text>
                        <Text style={styles.subText}>{r.unit}{Number(r.piecesPerUnit) > 0 ? ` · ${r.piecesPerUnit} ${t("pieces")}` : ""}</Text>
                      </View>
                    </View>
                    <View style={[styles.td, styles.centerCell, { flex: 0.8 }]}>
                      <Text style={[styles.qtyText, { color: isOut ? colors.danger : isLow ? "#a16207" : colors.success }]}>{r.currentStock}</Text>
                      {Number(r.exchangedQty) > 0 && (
                        <Text style={styles.exchangedText}>−{r.exchangedQty} {t("exchanged")}</Text>
                      )}
                    </View>
                    <View style={[styles.td, styles.centerCell, { flex: 0.9 }]}>
                      <Text style={[styles.qtyText, { color: colors.slate400 }]}>{r.initialQuantity}</Text>
                    </View>
                    <View style={[styles.td, styles.centerCell, { flex: 0.6 }]}>
                      <Text style={styles.plainText}>{r.lowStockThreshold}</Text>
                    </View>
                    <View style={[styles.td, { flex: 0.8 }]}>
                      <View style={[styles.statusBadge, { background: isOut ? "#fef2f2" : isLow ? "#fef9c3" : "#f0fdf4" }]}>
                        <Ionicons name="alert-triangle" size={10} color={isOut ? colors.danger : isLow ? "#a16207" : colors.success} />
                        <Text style={[styles.statusText, { color: isOut ? colors.danger : isLow ? "#a16207" : colors.success }]}>{isOut ? t("statusOut") : isLow ? t("statusLow") : t("statusOk")}</Text>
                      </View>
                    </View>
                    <View style={[styles.td, styles.centerCell, { flex: 0.8 }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="calendar" size={10} color={colors.slate400} />
                        <Text style={styles.dateText2}>{r.date || "—"}</Text>
                      </View>
                    </View>
                    <View style={[styles.td, styles.centerCell, { flex: 0.8 }]}>
                      <Text style={[styles.dateText2, { color: r.expiryDate && new Date(r.expiryDate) < new Date() ? colors.danger : colors.slate500 }]}>{r.expiryDateLabel || "—"}</Text>
                    </View>
                    {showProfit && <View style={[styles.td, { flex: 0.8, alignItems: "flex-end" }]}><Text style={[styles.earnedText, { color: "#0ea5e9" }]}>TZS {(Number(r.earnedProfit) || 0).toLocaleString()}</Text></View>}
                    {showProfit && <View style={[styles.td, { flex: 0.8, alignItems: "flex-end" }]}><Text style={[styles.earnedText, { color: colors.success }]}>TZS {(((Number(r.sellingPrice) || 0) - (Number(r.buyingPrice) || 0)) * r.currentStock).toLocaleString()}</Text></View>}
                    <View style={[styles.td, styles.centerCell, { flex: 0.6 }]}>
                      <Pressable onPress={() => startEditStock(r)} style={styles.actionBtn}>
                        <Ionicons name="pencil" size={13} color={colors.primary} />
                      </Pressable>
                      <Pressable onPress={() => deleteProduct(r.productId)} style={styles.actionBtn}>
                        <Ionicons name="trash" size={13} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                );
              })
            ) : (
              paginatedRows.map((r) => {
                const isAdd = r.addedQty > 0;
                const isSell = r.soldQty > 0;
                const netDel = (r.restoredQty || 0) - (r.deletedQty || 0);
                const isDel = netDel !== 0;
                const iconColor = isDel ? colors.warning : isSell ? colors.danger : colors.success;
                const iconBg = isDel ? "#fefce8" : isSell ? "#fef2f2" : "#f0fdf4";
                return (
                  <View key={r.id} style={styles.tr} {...bulk.rowProps(r.id)}>
                    {bulk.mode && (
                      <Pressable style={[styles.td, styles.centerCell, { width: 32 }]} onPress={() => bulk.toggle(r.id)}>
                        <Ionicons name={bulk.selectedSet.has(r.id) ? "checkbox" : "square-outline"} size={16} color={bulk.selectedSet.has(r.id) ? colors.primary : colors.slate400} />
                      </Pressable>
                    )}
                    <View style={[styles.td, { flex: 1.6, flexDirection: "row", alignItems: "center", gap: 6 }]}>
                      <View style={[styles.iconBox, { background: iconBg }]}>
                        <Ionicons name="cube" size={14} color={iconColor} />
                      </View>
                      <View style={{ flexShrink: 1 }}>
                        <Text style={styles.nameText} numberOfLines={1}>{r.name}</Text>
                        <Text style={styles.subText}>{r.unit}{r.historyIds.length > 1 ? ` · ${r.historyIds.length} ${t("entries")}` : ""}</Text>
                      </View>
                    </View>
                    <View style={[styles.td, styles.centerCell, { flex: 0.7 }]}>
                      <Text style={[styles.deltaPos, { color: colors.success }]}>{isAdd ? `+${r.addedQty}` : "—"}</Text>
                    </View>
                    <View style={[styles.td, styles.centerCell, { flex: 0.7 }]}>
                      <Text style={[styles.deltaPos, { color: colors.danger }]}>{isSell ? `−${r.soldQty}` : "—"}</Text>
                    </View>
                    <View style={[styles.td, styles.centerCell, { flex: 0.7 }]}>
                      <Text style={[styles.deltaPos, { color: colors.warning }]}>{isDel ? (netDel > 0 ? `+${netDel}` : `${netDel}`) : "—"}</Text>
                    </View>
                    <View style={[styles.td, styles.centerCell, { flex: 0.7 }]}>
                      <Text style={styles.plainText}>{r.resultingQuantity}</Text>
                    </View>
                    <View style={[styles.td, styles.centerCell, { flex: 0.9 }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="calendar" size={10} color={colors.slate400} />
                        <Text style={styles.dateText2}>{r.dateLabel}</Text>
                      </View>
                    </View>
                    <View style={[styles.td, styles.centerCell, { flex: 0.8 }]}>
                      <Text style={styles.subText}>{r.timeLabel || "—"}</Text>
                    </View>
                    {showProfit && <View style={[styles.td, { flex: 0.9, alignItems: "flex-end" }]}><Text style={[styles.earnedText, { color: colors.success }]}>{r.expectedProfit > 0 ? `TZS ${r.expectedProfit.toLocaleString()}` : "—"}</Text></View>}
                    {showProfit && <View style={[styles.td, { flex: 0.9, alignItems: "flex-end" }]}><Text style={[styles.earnedText, { color: "#0ea5e9" }]}>{r.earnedProfit > 0 ? `TZS ${r.earnedProfit.toLocaleString()}` : "—"}</Text></View>}
                    <View style={[styles.td, styles.centerCell, { flex: 0.6 }]}>
                      <Pressable onPress={() => navigate("/products/add", { edit: r.productId, from: "stock" })} style={styles.actionBtn}>
                        <Ionicons name="pencil" size={13} color={colors.primary} />
                      </Pressable>
                      <Pressable onPress={() => deleteDayGroup(r)} style={styles.actionBtn}>
                        <Ionicons name="trash" size={13} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
        {totalStockPages > 1 && (
          <View style={styles.paginationBar}>
            <Text style={styles.pageInfo}>
              {t("pageXofY", { page: currentStockPage, total: totalStockPages, count: activeRows.length, type: viewMode === "products" ? t("products") : t("entries") })}
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.xs, alignItems: "center" }}>
              <Pressable onPress={() => setStockPage((p) => Math.max(1, p - 1))} disabled={currentStockPage <= 1} style={[styles.pageNav, currentStockPage <= 1 && styles.pageNavDisabled]}>
                <Ionicons name="chevron-back" size={13} color={currentStockPage <= 1 ? colors.slate300 : colors.slate700} />
                <Text style={[styles.pageNavText, { color: currentStockPage <= 1 ? colors.slate300 : colors.slate700 }]}>{t("prev")}</Text>
              </Pressable>
              <Pressable onPress={() => setStockPage((p) => Math.min(totalStockPages, p + 1))} disabled={currentStockPage >= totalStockPages} style={[styles.pageNav, currentStockPage >= totalStockPages && styles.pageNavDisabled]}>
                <Text style={[styles.pageNavText, { color: currentStockPage >= totalStockPages ? colors.slate300 : colors.slate700 }]}>{t("next")}</Text>
                <Ionicons name="chevron-forward" size={13} color={currentStockPage >= totalStockPages ? colors.slate300 : colors.slate700} />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 90 },
  errorWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 90 },
  errorTitle: { fontSize: font.lg, fontWeight: "700", color: colors.slate900 },
  errorText: { fontSize: font.sm, color: colors.slate500, textAlign: "center", maxWidth: 400 },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.primary, borderRadius: radius.md, marginTop: spacing.sm },
  retryText: { color: "#fff", fontWeight: "600", fontSize: font.sm },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.sm },
  titleLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontSize: font.lg, fontWeight: "700", color: colors.slate900 },
  count: { color: colors.slate400, fontSize: font.xs },
  titleActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  selectBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.slate300, borderRadius: radius.sm, backgroundColor: "#fff" },
  selectBtnActive: { borderColor: colors.primary, backgroundColor: "#eff6ff" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: radius.sm },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: font.xs },
  editingInfo: { padding: spacing.sm, borderRadius: radius.sm, background: colors.slate50, borderWidth: 1, borderColor: colors.slate200, marginBottom: spacing.md },
  editingInfoText: { fontSize: font.xs, color: colors.slate500 },
  modalLabel: { fontSize: font.xs, fontWeight: "700", color: colors.slate500, textTransform: "uppercase", marginBottom: 5 },
  recommendWrap: { background: "#fefce8", borderColor: "#fde68a", borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  recommendHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  recommendTitle: { fontSize: font.xs, fontWeight: "700", color: "#92400e", textTransform: "uppercase" },
  recommendCard: { flexShrink: 0, width: 220, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, gap: 4 },
  recommendCardTitle: { fontSize: font.xs, fontWeight: "700", textTransform: "uppercase" },
  recommendCardMsg: { fontSize: font.xs, lineHeight: 16 },
  recommendBtn: { alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: spacing.sm, borderRadius: radius.sm, marginTop: 2 },
  recommendBtnText: { color: "#fff", fontSize: font.xs, fontWeight: "600" },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md, padding: spacing.md, minWidth: 130, flexBasis: "45%", flexGrow: 1, overflow: "hidden", ...shadow.card },
  statTopBorder: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  statLabel: { fontSize: font.xs, fontWeight: "600", textTransform: "uppercase" },
  statValue: { fontSize: 17, fontWeight: "700", marginTop: 2 },
  toolbar: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  searchInput: { borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.sm, fontSize: font.xs, paddingVertical: 8, paddingLeft: 28, paddingRight: spacing.sm, backgroundColor: "#fff", minWidth: 180 },
  segmented: { flexDirection: "row", gap: 2, backgroundColor: colors.slate100, padding: 2, borderRadius: radius.sm },
  segment: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5, paddingHorizontal: 12, borderRadius: radius.xs },
  segmentActive: { backgroundColor: "#fff" },
  segmentText: { fontSize: font.xs, fontWeight: "600", color: colors.slate500 },
  segmentTextActive: { color: colors.primary },
  msgBanner: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.xs, fontSize: font.xs, borderWidth: 1 },
  tableCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md, overflow: "hidden", flexGrow: 0 },
  thead: { flexDirection: "row", borderBottomWidth: 2 },
  th: { paddingVertical: 8, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 2 },
  thText: { fontSize: font.xs, fontWeight: "700", color: colors.slate500, textTransform: "uppercase" },
  tr: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.slate100, minHeight: 52 },
  td: { paddingVertical: 8, paddingHorizontal: 10, justifyContent: "center" },
  centerCell: { alignItems: "center" },
  thumb: { width: 28, height: 28, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate200 },
  iconBox: { width: 28, height: 28, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  nameText: { fontWeight: "600", fontSize: font.xs, flexShrink: 1, color: colors.slate800 },
  subText: { fontSize: 10, color: colors.slate400 },
  qtyText: { fontWeight: "700", fontSize: 14 },
  exchangedText: { fontSize: 9, color: colors.danger, fontWeight: "600" },
  deltaPos: { fontWeight: "700", fontSize: font.sm },
  plainText: { fontSize: font.sm, color: colors.slate500 },
  dateText2: { fontSize: font.xs, color: colors.slate500 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99, alignSelf: "flex-start" },
  statusText: { fontSize: 10, fontWeight: "600" },
  earnedText: { fontWeight: "700", fontSize: font.xs },
  actionBtn: { padding: 3 },
  emptyCell: { padding: spacing.xl, flexDirection: "row", justifyContent: "center" },
  emptyText: { color: colors.slate400, fontSize: font.sm },
  paginationBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.slate200, background: colors.slate50, flexShrink: 0 },
  pageInfo: { fontSize: font.xs, color: colors.slate500 },
  pageNav: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.sm, background: "#fff" },
  pageNavDisabled: { background: colors.slate100 },
  pageNavText: { fontSize: font.xs, fontWeight: "600" },
});