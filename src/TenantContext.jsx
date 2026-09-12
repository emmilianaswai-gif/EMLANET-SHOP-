import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { STAFF_ROLES, isStaffRole, isSuperAdmin } from "./utils/roles";

export { STAFF_ROLES, isStaffRole };

const SESSION_KEYS = [
  "shop_auth_token",
  "shop_role",
  "shop_username",
  "shop_user_id",
  "shop_full_name",
  "shop_id",
  "shop_name",
];

export function readTenant() {
  return {
    token: localStorage.getItem("shop_auth_token") || "",
    id: localStorage.getItem("shop_id") || "",
    name: localStorage.getItem("shop_name") || "",
    role: localStorage.getItem("shop_role") || "",
    username: localStorage.getItem("shop_username") || "",
    userId: localStorage.getItem("shop_user_id") || "",
    fullName: localStorage.getItem("shop_full_name") || "",
  };
}

const TenantContext = createContext({
  tenant: readTenant(),
  isStaff: false,
  isSuperAdmin: false,
  switchShop: () => {},
  logout: () => {},
  refresh: () => {},
});

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(readTenant);

  const refresh = useCallback(() => setTenant(readTenant()), []);

  useEffect(() => {
    const sync = () => setTenant(readTenant());
    window.addEventListener("roleChanged", sync);
    window.addEventListener("tenantChanged", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("roleChanged", sync);
      window.removeEventListener("tenantChanged", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Point the session at a different tenant (shop) while staying logged in.
  const switchShop = useCallback((shopId, shopName) => {
    const id = String(shopId || "").trim();
    if (!id) return;
    localStorage.setItem("shop_id", id);
    localStorage.setItem("shop_name", String(shopName || "").trim() || localStorage.getItem("shop_name") || "Shop");
    localStorage.setItem("shop_selected_shop", id);
    window.dispatchEvent(new Event("roleChanged"));
    window.dispatchEvent(new Event("tenantChanged"));
  }, []);

  const logout = useCallback(() => {
    SESSION_KEYS.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        // ignore
      }
    });
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event("roleChanged"));
    window.dispatchEvent(new Event("tenantChanged"));
  }, []);

  return (
    <TenantContext.Provider
      value={{ tenant, isStaff: isStaffRole(tenant.role), isSuperAdmin: isSuperAdmin(tenant.role), switchShop, logout, refresh }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
