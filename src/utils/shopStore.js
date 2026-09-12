const SHOPS_KEY = "mama_swai_shops";
const ADMIN_KEY = "mama_swai_admin";
const CUSTOMERS_KEY_PREFIX = "mama_swai_offline_customers";

const seedShops = () => [
  {
    id: "shop-main",
    name: "EMLANETSHOP - Main",
    address: "Dar es Salaam",
    phone: "",
    location: "Main Branch",
  },
];

const uid = () => `shop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / unavailable - ignore
  }
}

/* ------------------------------ SHOP REGISTRY ------------------------------ */

export function getShops() {
  const shops = read(SHOPS_KEY, null);
  if (shops === null) {
    const seeded = seedShops();
    write(SHOPS_KEY, seeded);
    return seeded;
  }
  return Array.isArray(shops) ? shops : [];
}

export function saveShops(shops) {
  write(SHOPS_KEY, Array.isArray(shops) ? shops : []);
}

export function addShop({ name, address, phone, location }) {
  const shops = getShops();
  const shop = {
    id: uid(),
    name: String(name || "").trim() || "Unnamed Shop",
    address: String(address || "").trim(),
    phone: String(phone || "").trim(),
    location: String(location || "").trim(),
  };
  shops.push(shop);
  saveShops(shops);
  return shop;
}

export function updateShop(id, patch) {
  const shops = getShops().map((s) =>
    s.id === id ? { ...s, ...patch } : s
  );
  saveShops(shops);
}

export function removeShop(id) {
  saveShops(getShops().filter((s) => s.id !== id));
}

export function getShopById(id) {
  return getShops().find((s) => s.id === id) || null;
}

/* --------------------------- SERVER SHOP SYNC --------------------------- */

// Bring the server's registered tenants into the local registry so the shop
// pickers on login/registration also reflect shops created on the server.
// Local (device-only) shops are kept untouched.
export function mergeServerShops(serverShops) {
  const list = Array.isArray(serverShops) ? serverShops.filter((s) => s && s.id) : [];
  if (!list.length) return getShops();
  const merged = getShops().map((s) => ({ ...s }));
  const index = new Map(merged.map((s) => [String(s.id), merged.indexOf(s)]));
  list.forEach((s) => {
    const key = String(s.id);
    const entry = {
      id: s.id,
      name: String(s.name || "").trim() || "Unnamed Shop",
      address: String(s.address || "").trim(),
      phone: String(s.phone || "").trim(),
      location: String(s.location || "").trim(),
    };
    if (index.has(key)) {
      merged[index.get(key)] = { ...merged[index.get(key)], ...entry };
    } else {
      index.set(key, merged.length);
      merged.push(entry);
    }
  });
  saveShops(merged);
  return merged;
}

// Returns the merged registry: server tenants when online, otherwise the
// device-local list. Safe to call without a token (public tenant registry).
export async function loadShopsFromServer() {
  try {
    const { default: api } = await import("../api/axiosConfig");
    const res = await api.get("/shops");
    return mergeServerShops(Array.isArray(res.data) ? res.data : []);
  } catch {
    return getShops();
  }
}

/* ------------------------------ LOCAL ADMIN ------------------------------ */

export function getAdmin() {
  return read(ADMIN_KEY, null);
}

export function hasAdmin() {
  return !!getAdmin();
}

export function setAdmin({ username, password, fullName }) {
  const admin = {
    username: String(username || "").trim().toLowerCase(),
    password: String(password || ""),
    fullName: String(fullName || "").trim() || "Administrator",
    role: "admin",
    createdAt: new Date().toISOString(),
  };
  write(ADMIN_KEY, admin);
  return admin;
}

export function verifyAdmin(username, password) {
  const admin = getAdmin();
  if (!admin) return null;
  if (
    admin.username === String(username || "").trim().toLowerCase() &&
    admin.password === String(password || "")
  ) {
    return admin;
  }
  return null;
}

export function clearAdmin() {
  try {
    localStorage.removeItem(ADMIN_KEY);
  } catch {
    // ignore
  }
}

/* --------------------------- OFFLINE CUSTOMERS --------------------------- */

// Offline customer accounts are scoped per shop so one tenant can never see
// (or sign in as) a customer registered to another shop on the same device.
function customersKey(shopId) {
  return shopId ? `${CUSTOMERS_KEY_PREFIX}:${shopId}` : CUSTOMERS_KEY_PREFIX;
}

export function getOfflineCustomers(shopId) {
  return read(customersKey(shopId), []);
}

// Check if an email or phone is already used by any offline customer across all shops.
export function isCredentialTaken(identifier, excludeUsername) {
  if (!identifier) return false;
  const val = String(identifier).trim().toLowerCase();
  if (!val) return false;

  // Check against the local admin account
  const admin = getAdmin();
  if (admin) {
    const adminEmail = String(admin.username || "").trim().toLowerCase();
    if (val === adminEmail && (!excludeUsername || adminEmail !== String(excludeUsername || "").trim().toLowerCase())) {
      return true;
    }
  }

  // Check against the hardcoded super admin
  if (val === "emmilianaswai@gmail.com" && (!excludeUsername || "emmilianaswai@gmail.com" !== String(excludeUsername || "").trim().toLowerCase())) {
    return true;
  }

  // Check against all offline customers across all shops
  const allKeys = Object.keys(localStorage).filter((k) => k.startsWith(CUSTOMERS_KEY_PREFIX));
  for (const key of allKeys) {
    const customers = read(key, []);
    for (const c of customers) {
      const cEmail = String(c.email || "").trim().toLowerCase();
      const cPhone = String(c.phone || "").trim().toLowerCase();
      const cUsername = String(c.username || "").trim().toLowerCase();
      if (
        (val === cEmail || val === cPhone || val === cUsername) &&
        (!excludeUsername || cUsername !== String(excludeUsername || "").trim().toLowerCase())
      ) {
        return true;
      }
    }
  }

  return false;
}

export function saveOfflineCustomer(customer) {
  const shopId = customer.shopId || "";
  const customers = getOfflineCustomers(shopId);
  const existing = customers.find(
    (c) =>
      c.username?.toLowerCase() === customer.username?.toLowerCase() ||
      (customer.email &&
        c.email?.toLowerCase() === customer.email?.toLowerCase())
  );
  if (existing) {
    const updated = customers.map((c) =>
      c.username?.toLowerCase() === existing.username?.toLowerCase()
        ? { ...c, ...customer, id: c.id, shopId }
        : c
    );
    write(customersKey(shopId), updated);
    return existing.id;
  }
  const id = uid();
  write(customersKey(shopId), [...customers, { ...customer, id, shopId }]);
  return id;
}

export function verifyOfflineCustomer(identifier, password, shopId) {
  const customers = getOfflineCustomers(shopId || "");
  const match = customers.find(
    (c) =>
      c.username?.toLowerCase() === String(identifier || "").trim().toLowerCase() ||
      c.email?.toLowerCase() === String(identifier || "").trim().toLowerCase() ||
      c.phone?.toLowerCase() === String(identifier || "").trim().toLowerCase()
  );
  if (match && match.password === String(password || "")) return match;
  return null;
}

export function getOfflineCustomerById(id, shopId) {
  return getOfflineCustomers(shopId).find((c) => c.id === id) || null;
}

export function setSelectedShop(id) {
  if (id) {
    localStorage.setItem("shop_selected_shop", id);
    const shop = getShopById(id);
    if (shop) localStorage.setItem("shop_storeName", shop.name);
  } else {
    localStorage.removeItem("shop_selected_shop");
  }
}

export function getSelectedShop() {
  const id = localStorage.getItem("shop_selected_shop");
  return id ? getShopById(id) : null;
}
