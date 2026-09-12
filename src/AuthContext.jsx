import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { isStaffRole } from "./utils/roles";

// Mutable auth state for navigation. The web app persists auth in
// localStorage (shop_auth_token / shop_role / shop_auth_user) and fires a
// "roleChanged" event after login/logout. This provider re-reads those keys on
// every relevant event so the navigator can switch auth stacks automatically.

const AuthContext = createContext({
  token: null,
  role: "customer",
  user: null,
  isLoggedIn: false,
  isStaff: false,
  refresh: () => {},
  logout: () => {},
});

function read() {
  const token = global.localStorage.getItem("shop_auth_token");
  const role = global.localStorage.getItem("shop_role") || "customer";
  let user = null;
  try {
    user = JSON.parse(global.localStorage.getItem("shop_auth_user")) || null;
  } catch {
    user = null;
  }
  return { token, role, user };
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(read);

  const refresh = useCallback(() => setState(read()), []);

  const logout = useCallback(() => {
    global.localStorage.removeItem("shop_auth_token");
    global.localStorage.removeItem("shop_role");
    global.localStorage.removeItem("shop_auth_user");
    global.localStorage.removeItem("shop");
    global.localStorage.removeItem("shop_id");
    global.localStorage.removeItem("user");
    global.window?.dispatchEvent?.(new global.Event("roleChanged"));
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onRoleChanged = () => setState(read());
    global.window?.addEventListener?.("roleChanged", onRoleChanged);
    global.window?.addEventListener?.("storage", onRoleChanged);
    return () => {
      global.window?.removeEventListener?.("roleChanged", onRoleChanged);
      global.window?.removeEventListener?.("storage", onRoleChanged);
    };
  }, []);

  const value = {
    ...state,
    isLoggedIn: !!state.token,
    isStaff: isStaffRole(state.role),
    refresh,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}