// Pure helpers to calculate profit from local (cached) sale records.
// Profit = (selling price - cost price) * quantity per sale item.

function getItemDate(si) {
  const raw = si.sale?.saleDate || si.saleDate || si.sale?.date || si.date || "";
  return String(raw || "").slice(0, 10);
}

function itemFigures(si) {
  const sell = Number(si.price) || 0;
  const cost = Number(si.costPrice) || 0;
  const qty = Number(si.quantity) || 1;
  return { revenue: sell * qty, profit: (sell - cost) * qty };
}

function periodBounds(now = new Date()) {
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
  return { todayStr, weekStartStr, monthStart, sixMonthStartStr, yearStart };
}

export function computeProfitTotals(saleItems) {
  const b = periodBounds();
  const totals = { today: 0, week: 0, month: 0, sixMonths: 0, year: 0, allTime: 0 };
  (Array.isArray(saleItems) ? saleItems : []).forEach((si) => {
    const { profit } = itemFigures(si);
    const d = getItemDate(si);
    totals.allTime += profit;
    if (d >= b.todayStr) totals.today += profit;
    if (d >= b.weekStartStr) totals.week += profit;
    if (d >= b.monthStart) totals.month += profit;
    if (d >= b.sixMonthStartStr) totals.sixMonths += profit;
    if (d >= b.yearStart) totals.year += profit;
  });
  return totals;
}

export function computeProfitByProduct(saleItems) {
  const b = periodBounds();
  const map = {};
  (Array.isArray(saleItems) ? saleItems : []).forEach((si) => {
    const name = si.product?.name || si.productName || "Unknown";
    const { profit } = itemFigures(si);
    const d = getItemDate(si);
    if (!map[name]) map[name] = { name, dayProfit: 0, monthProfit: 0, yearProfit: 0 };
    if (d >= b.yearStart) map[name].yearProfit += profit;
    if (d >= b.monthStart) map[name].monthProfit += profit;
    if (d >= b.todayStr) map[name].dayProfit += profit;
  });
  return Object.values(map).sort((a, b2) => b2.yearProfit - a.yearProfit);
}

export function computeDailyProfitSeries(saleItems, days = 7) {
  const out = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push({
      date: d.toISOString().split("T")[0],
      total: 0,
      revenue: 0,
      profit: 0,
    });
  }
  const byDate = {};
  out.forEach((o) => (byDate[o.date] = o));
  (Array.isArray(saleItems) ? saleItems : []).forEach((si) => {
    const d = getItemDate(si);
    const slot = byDate[d];
    if (!slot) return;
    const { revenue, profit } = itemFigures(si);
    slot.total += revenue;
    slot.revenue += revenue;
    slot.profit += profit;
  });
  return out;
}

export function computeMonthlyProfitSeries(saleItems, months = 12) {
  const now = new Date();
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      total: 0,
      revenue: 0,
      profit: 0,
    });
  }
  const byKey = {};
  out.forEach((o) => (byKey[o.key] = o));
  (Array.isArray(saleItems) ? saleItems : []).forEach((si) => {
    const raw = getItemDate(si);
    if (!raw) return;
    const key = raw.slice(0, 7);
    const slot = byKey[key];
    if (!slot) return;
    const { revenue, profit } = itemFigures(si);
    slot.total += revenue;
    slot.revenue += revenue;
    slot.profit += profit;
  });
  return out.map((o) => ({ month: o.month, year: o.year, total: o.total, revenue: o.revenue, profit: o.profit }));
}

export function buildMinimalSummary(saleItems, sales, purchases) {
  const b = periodBounds();
  const todayStr = b.todayStr;
  let todayRevenue = 0;
  let transactionCount = 0;
  (Array.isArray(sales) ? sales : []).forEach((s) => {
    if (String(s.saleDate || s.createdAt || "").slice(0, 10) === todayStr) {
      transactionCount += 1;
      todayRevenue += Number(s.grandTotal) || Number(s.price) || 0;
    }
  });
  if (transactionCount === 0 && Array.isArray(saleItems)) {
    (saleItems).forEach((si) => {
      if (getItemDate(si) === todayStr) {
        const { revenue } = itemFigures(si);
        todayRevenue += revenue;
        transactionCount += 1;
      }
    });
  }
  return {
    todayRevenue,
    transactionCount,
    lowStockCount: 0,
    expiredProducts: 0,
    expiringSoonCount: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    pendingOrders: Array.isArray(purchases) ? purchases.filter((p) => p.status === "Pending" || p.status === "Processing").length : 0,
  };
}
