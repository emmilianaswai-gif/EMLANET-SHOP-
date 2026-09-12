// Route table mirroring the web app's react-router paths. RN has no URL bar,
// so screens are identified by a route name and we translate between the two.

export const ROUTES = [
  { path: "/", name: "Dashboard", labelKey: "dashboard" },
  { path: "/dashboard", name: "Dashboard", labelKey: "dashboard" },
  { path: "/products", name: "Products", labelKey: "allProducts" },
  { path: "/products/add", name: "AddProduct", labelKey: "addProduct" },
  { path: "/categories", name: "Categories", labelKey: "categories" },
  { path: "/suppliers", name: "Suppliers", labelKey: "suppliers" },
  { path: "/stock", name: "Stock", labelKey: "stock" },
  { path: "/stock-history", name: "StockHistory", labelKey: "stockHistory" },
  { path: "/purchases", name: "Purchases", labelKey: "orders" },
  { path: "/purchase-items", name: "PurchaseItems", labelKey: "purchaseItems" },
  { path: "/my-pocket", name: "MyPocket", labelKey: "myPocket" },
  { path: "/my-account", name: "MyAccount", labelKey: "myAccount" },
  { path: "/sales", name: "Sales", labelKey: "transactions" },
  { path: "/sale-manager", name: "SaleManager", labelKey: "saleManager" },
  { path: "/sale-items", name: "SaleItems", labelKey: "saleItems" },
  { path: "/portal", name: "CustomerPortal", labelKey: "myPortal" },
  { path: "/customer-purchase", name: "CustomerPurchase", labelKey: "placeOrder" },
  { path: "/customer-payment", name: "CustomerPayment", labelKey: "myPayments" },
  { path: "/customers", name: "Customers", labelKey: "customers" },
  { path: "/payments", name: "Payments", labelKey: "payments" },
  { path: "/users", name: "Users", labelKey: "users" },
  { path: "/role-access", name: "RoleAccess", labelKey: "roleAccess" },
  { path: "/shops", name: "Shops", labelKey: "shops" },
  { path: "/reports", name: "Reports", labelKey: "reports" },
  { path: "/settings", name: "Settings", labelKey: "settings" },
  { path: "/store-settings", name: "Settings", labelKey: "settings" },
  { path: "/profile-settings", name: "ProfileSettings", labelKey: "profileSettings" },
  { path: "/system-settings", name: "SystemSettings", labelKey: "systemSettings" },
  { path: "/exchange", name: "Exchange", labelKey: "exchangeStoring" },
  { path: "/logout", name: "Logout", labelKey: "logout" },
  { path: "/login", name: "Login", labelKey: "login" },
  { path: "/register", name: "Register", labelKey: "register" },
  { path: "/register-shop", name: "ShopRegister", labelKey: "shopRegistration" },
  { path: "/setup", name: "Setup", labelKey: "setup" },
  { path: "/help", name: "Help", labelKey: "help" },
  { path: "/feedback", name: "Feedback", labelKey: "feedback" },
  { path: "/about", name: "About", labelKey: "about" },
  { path: "/terms", name: "Terms", labelKey: "terms" },
  { path: "/terms-service", name: "Terms", labelKey: "terms" },
  { path: "/privacy", name: "Privacy", labelKey: "privacy" },
  { path: "/support", name: "Support", labelKey: "support" },
];

// Route gating copied from the web ProtectedRoute.
export const PATH_TO_MODULE = {
  "/": "dashboard",
  "/dashboard": "dashboard",
  "/products": "products",
  "/products/add": "products",
  "/categories": "categories",
  "/stock": "stock",
  "/stock-history": "stock_history",
  "/purchases": "purchases",
  "/purchase-items": "purchase_items",
  "/sales": "sales",
  "/sale-manager": "sale_manager",
  "/sale-items": "sale_items",
  "/customers": "customers",
  "/suppliers": "suppliers",
  "/exchange": "exchange",
  "/reports": "reports",
  "/my-pocket": "my_pocket",
  "/payments": "payments",
  "/my-account": "my_account",
  "/users": "users",
  "/role-access": "users",
  "/settings": "settings",
  "/store-settings": "settings",
  "/system-settings": "settings",
};

export const CUSTOMER_PATHS = ["/portal", "/customer-purchase", "/customer-payment", "/my-account"];
export const ALWAYS_ALLOWED = [
  "/my-account", "/logout", "/help", "/feedback", "/about",
  "/support", "/Support", "/terms", "/privacy", "/terms-service", "/Terms-service",
];

// Translate a web-route path to a screen name (fuzzy: exact match, then
// longest prefix, then segment).
export function screenForPath(path) {
  if (!path) return "Dashboard";
  const clean = String(path).split("?")[0];
  const exact = ROUTES.find((r) => r.path === clean);
  if (exact) return exact.name;
  const prefix = ROUTES.filter((r) => clean.startsWith(r.path) && r.path !== "/")
    .sort((a, b) => b.path.length - a.path.length)[0];
  if (prefix) return prefix.name;
  const seg = clean.split("/").filter(Boolean).pop() || "";
  const bySeg = ROUTES.find((r) => r.path.split("/").filter(Boolean).pop() === seg);
  return bySeg ? bySeg.name : "Dashboard";
}

export function pathForScreen(name) {
  const r = ROUTES.find((x) => x.name === name);
  return r ? r.path : "/";
}

export function labelKeyForScreen(name) {
  const r = ROUTES.find((x) => x.name === name);
  return r ? r.labelKey : null;
}

export function labelKeyForPath(path) {
  const r = ROUTES.find((x) => x.path === path);
  return r ? r.labelKey : null;
}

export { setPath } from "../shim";