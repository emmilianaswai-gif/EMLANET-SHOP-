import { useNavigation, useRoute } from "@react-navigation/native";
import { navigationRef } from "../navigationRef";
import { screenForPath, pathForScreen, setPath, CUSTOMER_PATHS, ALWAYS_ALLOWED } from "./navRoutes";

// Replace the web app's react-router `navigate(to)` / `<Link to>` with this
// helper. It maps a route path (e.g. "/products/add") to a screen name and
// navigates the active react-navigation container.
export function nav(to, params) {
  const target = screenForPath(to);
  setPath(typeof to === "string" ? to : "");
  if (navigationRef.isReady()) {
    navigationRef.navigate(target, params);
  }
}

// Hard redirect (used where the web app calls window.location.href).
export function redirect(to, params = {}) {
  const target = screenForPath(to);
  setPath(typeof to === "string" ? to : "");
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name: target, params }] });
  }
}

// Drop-in for useNavigate(): returns a navigate(path, params) function.
export function useNav() {
  const navigation = useNavigation();
  return (to, params) => {
    const target = screenForPath(to);
    setPath(typeof to === "string" ? to : "");
    navigation.navigate(target, params);
  };
}

// Current route path as the web app's window.location.pathname.
export function useRoutePath() {
  const route = useRoute();
  return pathForScreen(route?.name) || "/";
}

// Role-based route guard mirroring the web ProtectedRoute. Returns the screen
// the current user should end up at when path is not allowed (null = allowed).
export function useRouteGuard(path) {
  const token = global.localStorage.getItem("shop_auth_token");
  const role = global.localStorage.getItem("shop_role") || "customer";
  if (!token) return "Login";
  const p = path || "/";
  if (role === "customer") {
    const ok =
      CUSTOMER_PATHS.some((c) => p === c) ||
      ALWAYS_ALLOWED.some((c) => p === c);
    return ok ? null : "CustomerPortal";
  }
  if (p === "/shops" && role !== "super_admin") return "Dashboard";
  return null;
}

export { useRoutePath as usePathname };
export { screenForPath, pathForScreen, PATH_TO_MODULE, CUSTOMER_PATHS, ALWAYS_ALLOWED } from "./navRoutes";
export { navigationRef } from "../navigationRef";