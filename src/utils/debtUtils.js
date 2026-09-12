const isDebtSale = (sale) => {
  if (!sale) return false;
  const pm = sale.paymentMethod;
  const ps = sale.paymentStatus;
  return (
    pm === "debt" || pm === "DEBT" ||
    ps === "unpaid" || ps === "debt" || ps === "UNPAID"
  );
};

export const isCashSale = (sale) => {
  if (!sale) return false;
  return sale.paymentMethod === "cash" || sale.paymentMethod === "CASH" || !isDebtSale(sale);
};

export const getSaleRemainingDebt = (sale) => {
  if (!sale || !isDebtSale(sale)) return 0;
  const total = Number(sale.grandTotal) || Number(sale.price) || 0;
  const paid = Number(sale.paidAmount) || 0;
  return Math.max(0, total - paid);
};

export const isFullyPaidDebtSale = (sale) => {
  if (!sale || !isDebtSale(sale)) return false;
  const ps = sale.paymentStatus;
  if (ps === "PAID" || ps === "paid" || ps === "Paid") return true;
  return getSaleRemainingDebt(sale) <= 0;
};

export const isOutstandingDebtSale = (sale) => {
  return isDebtSale(sale) && !isFullyPaidDebtSale(sale);
};
