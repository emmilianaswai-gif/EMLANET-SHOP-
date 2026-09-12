import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/axiosConfig";

const PermissionContext = createContext({ perms: {}, loading: true, hasPerm: () => true });

export function usePermissions() {
  return useContext(PermissionContext);
}

export function PermissionProvider({ children }) {
  const [perms, setPerms] = useState({});
  const [loading, setLoading] = useState(true);
  const [roleKey, setRoleKey] = useState(() => localStorage.getItem("shop_role") || "customer");

  const loadPerms = useCallback(async () => {
    setLoading(true);
    const role = localStorage.getItem("shop_role") || "customer";
    try {
      const { data } = await api.get("/role-permissions").catch(() => ({ data: [] }));
      const map = {};
      (Array.isArray(data) ? data : []).forEach((p) => {
        const r = (p.roleName || "").toLowerCase();
        if (r === role.toLowerCase()) {
          if (!map[r]) map[r] = {};
          map[r][p.moduleId] = { read: !!p.canRead, write: !!p.canWrite, edit: !!p.canEdit, delete: !!p.canDelete, export: !!p.canExport };
        }
      });
      setPerms(map);
    } catch {
      setPerms({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPerms(); }, [loadPerms, roleKey]);

  useEffect(() => {
    const handler = () => {
      setLoading(true);
      setRoleKey(localStorage.getItem("shop_role") || "customer");
    };
    window.addEventListener("roleChanged", handler);
    return () => window.removeEventListener("roleChanged", handler);
  }, []);

  const refreshPerms = () => { setLoading(true); loadPerms(); };

  const hasPerm = useCallback((moduleId, permType = "read") => {
    const role = (localStorage.getItem("shop_role") || "").toLowerCase();
    if (role === "admin" || role === "super_admin") return true;
    if (loading) return true;
    if (!perms[role]) return false;
    if (!perms[role][moduleId]) return false;
    return !!perms[role][moduleId][permType];
  }, [perms, loading]);

  return (
    <PermissionContext.Provider value={{ perms, loading, hasPerm, refreshPerms }}>
      {children}
    </PermissionContext.Provider>
  );
}
