import { isAdminOrAbove } from "./roles";

export function canViewProfit() {
  const role = localStorage.getItem("shop_role");
  return isAdminOrAbove(role) || role === "manager";
}
