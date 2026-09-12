import { useEffect, useState, useMemo, useCallback } from "react";
import { View, Text, Pressable, FlatList, Image, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import { canViewProfit } from "../utils/roleChecks";
import BulkBar from "../components/BulkBar";
import { useBulkSelect } from "../hooks/useBulkSelect";
import { QuantityInput } from "../components/ui";
import { TextField, Button, Card, Modal, Badge } from "../components/ui";
import { confirmDialog } from "../utils/confirm";
import { useNav, redirect, useRoutePath } from "../navigation/nav";
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

export default function Stock() {
  useLanguage();
  const navigate = useNav();
  const routePath = useRoutePath();
  const showProfit = canViewProfit();
  const [stocks, setStocks] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [products, setProducts] = useState([]);
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
  const [editQty, setEditQty] = useState("");
  const [editThreshold, setEditThreshold] = useState("");
  const [editExpiry, setEditExpiry] = useState("");
  const [stockPage, setStockPage] = useState(1);
  const STOCK_PAGE_SIZE = 10;

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

  useEffect(() => { loadData(); }, [routePath]);

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
    return p?.name || "\u2014";
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
        dateLabel: h.createdAt ? new Date(h.createdAt).toLocaleDateString() : "\u2014",
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
        const day = (e.date || "").slice(0, 10) || "\u2014";
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
          dateLabel: e.dayKey === "\u2014" ? "\u2014" : new Date(e.dayKey + "T00:00:00").toLocaleDateString(),
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
      const day = (e.date || "").slice(0, 10) || "\u2014";
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
        dateLabel: day === "\u2014" ? "\u2014" : new Date(day + "T00:00:00").toLocaleDateString(),
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
  const totalExchangedQty = byProduct.reduce((sum, r) => sum + (Number(r.exchangedQty) || 0), 0);

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
        items.push({ type: "danger", iconName: "warning", title: t("outOfStockTitle"), msg: t("needsRestockMsg", { name: p.name }), action: () => navigate(`/products/add?edit=${p.productId}&from=stock`), label: t("restockLabel") });
      } else if (p.currentStock <= p.lowStockThreshold && p.lowStockThreshold > 0) {
        items.push({ type: "warning", iconName: "warning", title: t("lowStockTitle"), msg: t("lowStockMsg", { name: p.name, qty: p.currentStock, threshold: p.lowStockThreshold }), action: () => navigate(`/products/add?edit=${p.productId}&from=stock`), label: t("reorderLabel") });
      }
      if (p.expiryDate) {
        const exp = new Date(p.expiryDate);
        const days = Math.ceil((exp - now) / 86400000);
        if (days < 0) {
          items.push({ type: "danger", iconName: "time", title: t("expiredTitle"), msg: t("expiredMsg", { name: p.name, days: Math.abs(days) }), action: () => navigate(`/products/add?edit=${p.productId}&from=stock`), label: t("reviewLabel") });
        } else if (days <= 30) {
          items.push({ type: "warning", iconName: "time", title: t("expiringTitle"), msg: t("expiringMsg", { name: p.name, days, date: p.expiryDateLabel }), action: () => navigate(`/products/add?edit=${p.productId}&from=stock`), label: t("promoteLabel") });
        }
      }
      const hist = pidStockHist[p.productId] || [];
      const sells = hist.filter((h) => h.transactionType === "Sold" || h.transactionType === "Sell");
      if (sells.length >= 3) {
        items.push({ type: "info", iconName: "cart", title: t("highDemandTitle"), msg: t("highDemandMsg", { name: p.name, count: sells.length }), action: () => setViewMode("bydate"), label: t("viewActivityLabel") });
      }
    });
    return items.slice(0, 8);
  }, [byProduct, stockHistory, navigate]);

  const toggleSort = useCallback((field) => {
    if (sortF === field) setSortD((d) => d === "asc" ? "desc" : "asc");
    else { setSortF(field); setSortD("desc"); }
  }, [sortF]);

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

  const statsCards = [
    { key: "all", label: t("totalProducts"), value: String(byProduct.length), color: colors.primary, iconName: "hash", bg: colors.primaryLight, filterVal: "all" },
    { key: "all", label: t("totalQuantity"), value: String(totalQty.toLocaleString()), color: colors.success, iconName: "cube-outline", bg: colors.successLight, filterVal: "all" },
    { key: "out", label: t("outOfStock"), value: String(outOfStock), color: colors.danger, iconName: "warning", bg: colors.dangerLight, filterVal: "out" },
    { key: "low", label: t("lowStock"), value: String(lowStock), color: colors.warning, iconName: "warning", bg: colors.warningLight, filterVal: "low" },
    ...(showProfit ? [
      { key: "all", label: t("earnedProfit"), value: `TZS ${totalEarnedProfit.toLocaleString()}`, color: "#0ea5e9", iconName: "trending-up", bg: "#f0f9ff", filterVal: "all" },
      { key: "all", label: t("predictedProfit"), value: `TZS ${totalPredictedProfit.toLocaleString()}`, color: colors.success, iconName: "trending-up", bg: "#f0fdf4", filterVal: "all" },
    ] : []),
  ];

  const recColors = {
    danger: { bg: colors.dangerLight, border: "#fecaca", text: colors.dangerDark, btn: colors.danger },
    warning: { bg: colors.warningLight, border: "#fde68a", text: "#92400e", btn: colors.warning },
    info: { bg: colors.primaryLight, border: "#bfdbfe", text: "#1e40af", btn: colors.primary },
  };

  return (
    <View style={s.root}>
      {editingStock && (
        <Modal visible onClose={() => setEditingStock(null)} title={`${t("addStockTitle")} \u2014 ${editingStock.name}`}>
          <View style={s.modalInfo}>
            <Text style={s.modalInfoLabel}>{t("currentStock")}: <Text style={s.modalInfoValue}>{editingStock.currentStock ?? editingStock.quantity ?? 0} {editingStock.unit || ""}</Text></Text>
            {(() => { const ppu = Number(getProductPieces(editingStock.productId)); const cur = Number(editingStock.currentStock ?? editingStock.quantity ?? 0); return ppu > 0 && cur > 0 ? (
              <Text style={s.modalInfoSub}> ({t("approx")} {Math.round((cur / ppu) * 100) / 100} {getProductUnit(editingStock.productId)})</Text>
            ) : null; })()}
            {Number(editingStock.exchangedQty) > 0 && (
              <Text style={s.modalExchanged}> (\u2212{editingStock.exchangedQty} {t("exchanged")})</Text>
            )}
          </View>
          <TextField label={t("addQuantityLabel")} value={editQty} onChangeText={(v) => setEditQty(v)} keyboardType="numeric" placeholder="e.g. 12" />
          <QuantityInput value={Number(editQty) || 0} onChange={(v) => setEditQty(String(v))} piecesPerUnit={getProductPieces(editingStock.productId)} unit={getProductUnit(editingStock.productId)} min={0} placeholder="e.g. 12" />
          <TextField label={t("lowStockAlertThreshold")} value={editThreshold} onChangeText={(v) => setEditThreshold(v)} keyboardType="numeric" placeholder="e.g. 10" />
          <TextField label={t("expiryDate")} value={editExpiry} onChangeText={setEditExpiry} placeholder="YYYY-MM-DD" />
          <View style={s.modalActions}>
            <Pressable onPress={() => navigate(`/products/add?edit=${editingStock.productId}&from=stock`)} style={s.editPurchaseBtn}>
              <Ionicons name="pencil" size={12} color={colors.slate500} />
              <Text style={s.editPurchaseBtnText}>{t("editPurchase")}</Text>
            </Pressable>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Button title={t("cancel")} variant="outline" size="sm" onPress={() => setEditingStock(null)} />
              <Button title={t("addStockAction")} variant="primary" size="sm" icon={<Ionicons name="save" size={14} color={colors.white} />} onPress={saveStockEdit} />
            </View>
          </View>
        </Modal>
      )}

      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Ionicons name="cube-outline" size={22} color={colors.primary} />
          <Text style={s.headerTitle}>{t("stock")}</Text>
          <Text style={s.headerCount}>({totalEntries} {viewMode === "products" ? t("products") : t("entries")})</Text>
        </View>
        <View style={s.headerRight}>
          <Pressable onPress={() => bulk.mode ? bulk.clear() : bulk.startMode()} style={[s.bulkBtn, bulk.mode && s.bulkBtnActive]}>
            <Ionicons name="checkbox" size={14} color={colors.primary} />
            <Text style={s.bulkBtnText}>{bulk.mode ? t("cancelSelect") : t("select")}</Text>
          </Pressable>
          <Pressable onPress={() => navigate("/products/add?from=stock")} style={s.addBtn}>
            <Ionicons name="add" size={14} color={colors.white} />
            <Text style={s.addBtnText}>{t("addStock")}</Text>
          </Pressable>
        </View>
      </View>

      {recommendations.length > 0 && (
        <View style={s.recContainer}>
          <View style={s.recHeader}>
            <Ionicons name="bulb" size={14} color={colors.warning} />
            <Text style={s.recHeaderText}>{t("smartRecommendations")}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {recommendations.map((r, i) => {
              const c = recColors[r.type] || recColors.info;
              return (
                <View key={i} style={[s.recCard, { backgroundColor: c.bg, borderColor: c.border }]}>
                  <View style={s.recCardHeader}>
                    <Ionicons name={r.iconName} size={12} color={c.text} />
                    <Text style={[s.recCardTitle, { color: c.text }]}>{r.title}</Text>
                  </View>
                  <Text style={[s.recCardMsg, { color: c.text }]}>{r.msg}</Text>
                  <Pressable onPress={r.action} style={[s.recCardBtn, { backgroundColor: c.btn }]}>
                    <Text style={s.recCardBtnText}>{r.label}</Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsRow}>
        {statsCards.map((s) => {
          const isActive = (s.key === "out" || s.key === "low") ? s.filterVal === statFilter : statFilter === "all";
          return (
            <Pressable key={`${s.label}-${s.filterVal}`} onPress={() => { setViewMode("products"); setStatFilter(s.filterVal); }}
              style={[s.statCard, { backgroundColor: isActive ? s.bg : colors.white, borderColor: isActive ? s.color : colors.slate200, borderTopColor: s.color }]}>
              <View style={s.statLabelRow}>
                <Ionicons name={s.iconName} size={12} color={s.color} />
                <Text style={[s.statLabel, { color: s.color }]}>{s.label}</Text>
              </View>
              <Text style={[s.statValue, { color: s.color }]}>{s.value}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={s.controlsRow}>
        <View style={s.searchWrap}>
          <Ionicons name="search" size={14} color={colors.slate400} style={s.searchIcon} />
          <TextField value={search} onChangeText={setSearch} placeholder={t("searchProducts")} containerStyle={s.searchField} />
        </View>
        <View style={s.viewToggle}>
          <Pressable onPress={() => setViewMode("products")} style={[s.viewToggleBtn, viewMode === "products" && s.viewToggleBtnActive]}>
            <Ionicons name="layers" size={12} color={viewMode === "products" ? colors.primary : colors.slate500} />
            <Text style={[s.viewToggleText, viewMode === "products" && s.viewToggleTextActive]}>{t("byProduct")}</Text>
          </Pressable>
          <Pressable onPress={() => setViewMode("bydate")} style={[s.viewToggleBtn, viewMode === "bydate" && s.viewToggleBtnActive]}>
            <Ionicons name="time-outline" size={12} color={viewMode === "bydate" ? colors.primary : colors.slate500} />
            <Text style={[s.viewToggleText, viewMode === "bydate" && s.viewToggleTextActive]}>{t("byDate")}</Text>
          </Pressable>
        </View>
        {bulk.mode && <BulkBar count={bulk.selected.length} allSelected={bulk.allSelected} onSelectAll={bulk.toggleAll} onDelete={deleteSelected} deleteLabel={t("deleteSelected")} />}
      </View>

      {msg !== "" && (
        <View style={[s.msgBar, msg.includes("Failed") ? s.msgBarError : s.msgBarSuccess]}>
          <Text style={[s.msgText, msg.includes("Failed") ? s.msgTextError : s.msgTextSuccess]}>{msg}</Text>
        </View>
      )}

      <Card padded={false} style={s.tableCard}>
        <View style={s.tableBody}>
          {activeRows.length === 0 ? (
            <Text style={s.noData}>{t("noRecordsFound")}</Text>
          ) : (
            <FlatList
              data={paginatedRows}
              keyExtractor={(r) => r.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: spacing.sm }}
              renderItem={({ item: r }) => {
                if (viewMode === "products") {
                  const isOut = r.currentStock <= 0;
                  const isLow = r.currentStock > 0 && r.currentStock <= r.lowStockThreshold;
                  return (
                    <View key={r.id} style={[s.row, { backgroundColor: isOut ? colors.dangerLight : isLow ? "#fefce8" : colors.white }]}>
                      {bulk.mode && (
                        <View style={s.rowCheck}>
                          <RowCheckBox checked={bulk.selectedSet.has(r.id)} onToggle={() => bulk.toggle(r.id)} />
                        </View>
                      )}
                      <View style={s.rowProduct}>
                        {r.image ? (
                          <Image source={{ uri: r.image }} style={s.rowImage} />
                        ) : (
                          <View style={[s.rowImage, { backgroundColor: isOut ? colors.dangerLight : isLow ? "#fef9c3" : colors.primaryLight, alignItems: "center", justifyContent: "center" }]}>
                            <Ionicons name="cube-outline" size={14} color={isOut ? colors.danger : isLow ? "#a16207" : colors.primary} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={s.rowName}>{r.name}</Text>
                          <Text style={s.rowSub}>{r.unit}{Number(r.piecesPerUnit) > 0 ? ` \u00b7 ${r.piecesPerUnit} ${t("pieces")}` : ""}</Text>
                        </View>
                      </View>
                      <Text style={[s.rowCenter, { color: isOut ? colors.danger : isLow ? "#a16207" : colors.success, fontWeight: "700", fontSize: 14 }]}>
                        {r.currentStock}
                      </Text>
                      <Text style={[s.rowCenter, { color: colors.slate400 }]}>{r.initialQuantity}</Text>
                      <Text style={s.rowCenter}>{r.lowStockThreshold}</Text>
                      <View style={s.rowCenter}>
                        <Badge text={isOut ? t("statusOut") : isLow ? t("statusLow") : t("statusOk")} />
                      </View>
                      <Text style={s.rowDate}>{r.date || "\u2014"}</Text>
                      <Text style={[s.rowDate, { color: r.expiryDate && new Date(r.expiryDate) < new Date() ? colors.danger : colors.slate500 }]}>
                        {r.expiryDateLabel || "\u2014"}
                      </Text>
                      {showProfit && <Text style={s.rowRight}>TZS {(Number(r.earnedProfit) || 0).toLocaleString()}</Text>}
                      {showProfit && <Text style={s.rowRightBold}>TZS {(((Number(r.sellingPrice) || 0) - (Number(r.buyingPrice) || 0)) * r.currentStock).toLocaleString()}</Text>}
                      <View style={s.rowActions}>
                        <Pressable onPress={() => startEditStock(r)} hitSlop={4}>
                          <Ionicons name="pencil" size={13} color={colors.primary} />
                        </Pressable>
                        <Pressable onPress={() => deleteProduct(r.productId)} hitSlop={4}>
                          <Ionicons name="trash" size={13} color={colors.danger} />
                        </Pressable>
                      </View>
                    </View>
                  );
                }
                const isAdd = r.addedQty > 0;
                const isSell = r.soldQty > 0;
                const netDel = (r.restoredQty || 0) - (r.deletedQty || 0);
                const isDel = netDel !== 0;
                const iconColor = isDel ? colors.warning : isSell ? colors.danger : colors.success;
                const iconBg = isDel ? "#fefce8" : isSell ? colors.dangerLight : colors.successLight;
                return (
                  <View key={r.id} style={s.row}>
                    {bulk.mode && (
                      <View style={s.rowCheck}>
                        <RowCheckBox checked={bulk.selectedSet.has(r.id)} onToggle={() => bulk.toggle(r.id)} />
                      </View>
                    )}
                    <View style={s.rowProduct}>
                      <View style={[s.rowImage, { backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }]}>
                        <Ionicons name="cube-outline" size={14} color={iconColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.rowName}>{r.name}</Text>
                        <Text style={s.rowSub}>{r.unit}{r.historyIds.length > 1 ? ` \u00b7 ${r.historyIds.length} ${t("entries")}` : ""}</Text>
                      </View>
                    </View>
                    <Text style={[s.rowCenter, { color: colors.success, fontWeight: "700" }]}>{isAdd ? `+${r.addedQty}` : "\u2014"}</Text>
                    <Text style={[s.rowCenter, { color: colors.danger, fontWeight: "700" }]}>{isSell ? `\u2212${r.soldQty}` : "\u2014"}</Text>
                    <Text style={[s.rowCenter, { color: colors.warning, fontWeight: "700" }]}>{isDel ? (netDel > 0 ? `+${netDel}` : `${netDel}`) : "\u2014"}</Text>
                    <Text style={s.rowCenter}>{r.resultingQuantity}</Text>
                    <Text style={s.rowDate}>{r.dateLabel}</Text>
                    <Text style={s.rowDate}>{r.timeLabel || "\u2014"}</Text>
                    {showProfit && <Text style={[s.rowRight, { color: colors.success }]}>{r.expectedProfit > 0 ? `TZS ${r.expectedProfit.toLocaleString()}` : "\u2014"}</Text>}
                    {showProfit && <Text style={[s.rowRight, { color: "#0ea5e9" }]}>{r.earnedProfit > 0 ? `TZS ${r.earnedProfit.toLocaleString()}` : "\u2014"}</Text>}
                    <View style={s.rowActions}>
                      <Pressable onPress={() => navigate(`/products/add?edit=${r.productId}&from=stock`)} hitSlop={4}>
                        <Ionicons name="pencil" size={13} color={colors.primary} />
                      </Pressable>
                      <Pressable onPress={() => deleteDayGroup(r)} hitSlop={4}>
                        <Ionicons name="trash" size={13} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
        {totalStockPages > 1 && (
          <View style={s.paginationBar}>
            <Text style={s.paginationText}>{t("pageXofY", { page: currentStockPage, total: totalStockPages, count: activeRows.length, type: viewMode === "products" ? t("products") : t("entries") })}</Text>
            <View style={s.paginationBtns}>
              <Pressable onPress={() => setStockPage((p) => Math.max(1, p - 1))} disabled={currentStockPage <= 1} style={[s.pageBtn, currentStockPage <= 1 && s.pageBtnDisabled]}>
                <Ionicons name="chevron-back" size={13} color={currentStockPage <= 1 ? colors.slate300 : colors.slate700} />
                <Text style={[s.pageBtnText, currentStockPage <= 1 && s.pageBtnTextDisabled]}>{t("prev")}</Text>
              </Pressable>
              {Array.from({ length: Math.min(totalStockPages, 10) }, (_, i) => {
                const start = Math.max(1, currentStockPage - 5);
                const p = start + i;
                if (p > totalStockPages) return null;
                return (
                  <Pressable key={p} onPress={() => setStockPage(p)} style={[s.pageNumBtn, p === currentStockPage && s.pageNumBtnActive]}>
                    <Text style={[s.pageNumText, p === currentStockPage && s.pageNumTextActive]}>{p}</Text>
                  </Pressable>
                );
              })}
              <Pressable onPress={() => setStockPage((p) => Math.min(totalStockPages, p + 1))} disabled={currentStockPage >= totalStockPages} style={[s.pageBtn, currentStockPage >= totalStockPages && s.pageBtnDisabled]}>
                <Text style={[s.pageBtnText, currentStockPage >= totalStockPages && s.pageBtnTextDisabled]}>{t("next")}</Text>
                <Ionicons name="chevron-forward" size={13} color={currentStockPage >= totalStockPages ? colors.slate300 : colors.slate700} />
              </Pressable>
            </View>
          </View>
        )}
      </Card>
    </View>
  );
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
  recContainer: { backgroundColor: colors.warningLight, borderRadius: radius.lg, borderWidth: 1, borderColor: "#fde68a", padding: spacing.sm, flexShrink: 0 },
  recHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.xs },
  recHeaderText: { fontSize: 11, fontWeight: "700", color: "#92400e", textTransform: "uppercase" },
  recCard: { width: 220, borderRadius: radius.md, borderWidth: 1, padding: spacing.sm, gap: 4, flexShrink: 0 },
  recCardHeader: { flexDirection: "row", alignItems: "center", gap: 4 },
  recCardTitle: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  recCardMsg: { fontSize: 11, lineHeight: 16 },
  recCardBtn: { alignSelf: "flex-start", paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4, marginTop: 2 },
  recCardBtnText: { color: colors.white, fontSize: 10, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: spacing.sm, flexShrink: 0 },
  statCard: { minWidth: 140, flex: 1, borderRadius: radius.md, borderWidth: 1, borderTopWidth: 3, padding: spacing.md },
  statLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  statValue: { fontSize: 18, fontWeight: "700", marginTop: 2 },
  controlsRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center", flexShrink: 0, flexWrap: "wrap" },
  searchWrap: { flex: 1, minWidth: 200, maxWidth: 320, position: "relative" },
  searchIcon: { position: "absolute", left: 8, top: 12, zIndex: 1 },
  searchField: { marginBottom: 0 },
  viewToggle: { flexDirection: "row", backgroundColor: colors.slate100, borderRadius: radius.sm, padding: 2, flexShrink: 0 },
  viewToggleBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 4 },
  viewToggleBtnActive: { backgroundColor: colors.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 1 },
  viewToggleText: { fontSize: 11, fontWeight: "600", color: colors.slate500 },
  viewToggleTextActive: { color: colors.primary },
  msgBar: { padding: spacing.sm, borderRadius: radius.sm, flexShrink: 0 },
  msgBarSuccess: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  msgBarError: { backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: "#fecaca" },
  msgText: { fontSize: 11 },
  msgTextSuccess: { color: "#166534" },
  msgTextError: { color: colors.dangerDark },
  tableCard: { flex: 1, minHeight: 0 },
  tableBody: { flex: 1 },
  noData: { padding: spacing.xl * 2, textAlign: "center", color: colors.slate400 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.slate100, gap: spacing.xs, minHeight: 44 },
  rowCheck: { width: 28, alignItems: "center" },
  rowProduct: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, minWidth: 0 },
  rowImage: { width: 28, height: 28, borderRadius: 6, overflow: "hidden" },
  rowName: { fontWeight: "600", color: colors.slate900, fontSize: 12 },
  rowSub: { fontSize: 10, color: colors.slate400 },
  rowCenter: { width: 50, textAlign: "center", fontSize: 12, color: colors.slate700 },
  rowDate: { width: 80, fontSize: 11, color: colors.slate500 },
  rowRight: { width: 80, textAlign: "right", fontSize: 11, color: colors.slate600, fontWeight: "600" },
  rowRightBold: { width: 80, textAlign: "right", fontSize: 11, color: colors.success, fontWeight: "700" },
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
  modalInfo: { backgroundColor: colors.slate50, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate200, padding: spacing.sm, marginBottom: spacing.md },
  modalInfoLabel: { fontSize: 12, color: colors.slate500 },
  modalInfoValue: { color: colors.slate900, fontWeight: "700" },
  modalInfoSub: { fontSize: 11, color: colors.slate500 },
  modalExchanged: { color: colors.danger, fontWeight: "600", fontSize: 12 },
  modalActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md },
  editPurchaseBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate200, backgroundColor: colors.slate100 },
  editPurchaseBtnText: { fontSize: 11, fontWeight: "600", color: colors.slate500 },
});
