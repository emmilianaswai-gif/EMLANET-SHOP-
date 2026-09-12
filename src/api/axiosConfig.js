import axios from "axios";
import { API_BASE } from "../config";

/* ------------------------------------------------------------------ *
 * Offline cache: every successful GET is stored locally so the app   *
 * keeps working (and keeps calculating profit) without internet.     *
 * ------------------------------------------------------------------ */

const CACHE_PREFIX = "ms_api_cache_v1:";
const CACHE_MAX_BYTES = 4 * 1024 * 1024; // 4 MB

// Cache is scoped per tenant so one shop can never see another shop's
// cached data on the same device.
function cacheNamespace() {
  const shopId = localStorage.getItem("shop_id");
  return shopId && /^\d+$/.test(String(shopId)) ? `shop_${shopId}` : "global";
}

function cacheKey(url) {
  return `${cacheNamespace()}:${url}`;
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + cacheKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && "data" in parsed ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(CACHE_PREFIX + cacheKey(key), JSON.stringify({ data: value, ts: Date.now() }));
    pruneCache();
  } catch {
    // Storage full/unavailable - the app simply runs without cache.
  }
}

function pruneCache() {
  try {
    let total = 0;
    const entries = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(CACHE_PREFIX)) continue;
      const raw = localStorage.getItem(k) || "";
      total += raw.length;
      try {
        entries.push({ k, ts: JSON.parse(raw).ts || 0, size: raw.length });
      } catch {
        localStorage.removeItem(k);
      }
    }
    if (total <= CACHE_MAX_BYTES) return;
    entries.sort((a, b) => a.ts - b.ts);
    for (const e of entries) {
      if (total <= CACHE_MAX_BYTES) break;
      total -= e.size;
      localStorage.removeItem(e.k);
    }
  } catch {
    // ignore
  }
}

function markOffline(offline) {
  global.window.__ms_offline = offline;
  try {
    global.window.dispatchEvent(new Event("msOfflineChange"));
  } catch {
    // ignore
  }
}

/* ------------------------------------------------------------------ *
 * Offline write support: when a create/update/delete cannot reach the *
 * server, apply it to the local cache right away (so the UI reflects  *
 * the change on the spot), queue the operation, and replay the queue  *
 * when the connection comes back.                                     *
 * ------------------------------------------------------------------ */

const PENDING_OPS_PREFIX = "ms_pending_ops_v1:";
let _pendingSeq = 0;
let _syncing = false;

function pendingOpsKey() {
  return PENDING_OPS_PREFIX + cacheNamespace();
}

function readPendingOps() {
  try {
    const raw = localStorage.getItem(pendingOpsKey());
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writePendingOps(ops) {
  try {
    localStorage.setItem(pendingOpsKey(), JSON.stringify(ops));
  } catch {
    // ignore
  }
}

function genLocalId() {
  _pendingSeq += 1;
  return -(Math.abs(Date.now()) + _pendingSeq);
}

function isNumericSegment(s) {
  return /^-?\d+$/.test(s);
}

// "/sales/5" -> "/sales"; "/sale-items" -> "/sale-items"
function collectionOf(url) {
  const u = String(url || "").split("?")[0];
  const parts = u.split("/").filter(Boolean);
  if (parts.length > 1 && isNumericSegment(parts[parts.length - 1])) parts.pop();
  return "/" + parts.join("/");
}

function urlId(url) {
  const u = String(url || "").split("?")[0];
  const parts = u.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  return last && isNumericSegment(last) ? Number(last) : null;
}

function applyOfflineMutation(method, url, body, assignedId) {
  const coll = collectionOf(url);
  const cache = readCache(coll);
  if (cache == null) return; // nothing cached yet – still queued for sync
  const isPaged = !Array.isArray(cache) && cache && Array.isArray(cache.content);
  const list = Array.isArray(cache) ? cache : isPaged ? cache.content : null;
  if (!list) return; // singular resource – just queued

  const id = assignedId != null ? assignedId : urlId(url);

  if (method === "post") {
    list.unshift({ ...(body || {}), id });
    // Expand nested sale items so offline sales also show up under /sale-items.
    if (Array.isArray(body && body.saleItems)) {
      const siCache = readCache("/sale-items");
      const siArr = Array.isArray(siCache)
        ? siCache
        : siCache && Array.isArray(siCache.content)
          ? siCache.content
          : null;
      if (siArr) {
        const items = body.saleItems.map((si) => ({ ...si, sale: { ...(si.sale || {}), id } }));
        siArr.unshift(...items);
        writeCache("/sale-items", siCache);
      }
    }
  } else if (method === "put") {
    const idx = list.findIndex((x) => String(x && x.id) === String(id));
    if (idx >= 0) list[idx] = { ...list[idx], ...(body || {}), id };
    else list.unshift({ ...(body || {}), id });
  } else if (method === "delete") {
    const idx = list.findIndex((x) => String(x && x.id) === String(id));
    if (idx >= 0) list.splice(idx, 1);
  }

  writeCache(coll, isPaged ? cache : list);
}

function offlineWriteResponse(config, method) {
  const url = config?.url || "";
  let body = config?.data;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = undefined;
    }
  }
  const op = { method, url, data: body };
  let assignedId = null;
  if (method === "post") {
    assignedId = genLocalId();
    op.localId = assignedId;
  }
  const ops = readPendingOps();
  ops.push(op);
  writePendingOps(ops);
  applyOfflineMutation(method, url, body, assignedId);
  markOffline(true);
  const payload = body && typeof body === "object" && !(body instanceof FormData) ? body : {};
  return Promise.resolve({
    data: { ...payload, id: assignedId != null ? assignedId : urlId(url) },
    status: method === "post" ? 201 : 200,
    statusText: "OK (queued offline)",
    headers: {},
    config,
  });
}

// Replace local (negative) ids with real server ids during replay.
function rewriteRefs(value, mapping) {
  if (Array.isArray(value)) return value.map((v) => rewriteRefs(v, mapping));
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value)) {
      const v = value[k];
      out[k] = typeof v === "number" && mapping[v] != null ? mapping[v] : rewriteRefs(v, mapping);
    }
    return out;
  }
  return value;
}

function rewriteUrl(url, mapping) {
  return String(url)
    .split("/")
    .map((p) => {
      const n = Number(p);
      return mapping[n] != null ? String(mapping[n]) : p;
    })
    .join("/");
}

async function syncPendingOps() {
  if (_syncing) return;
  const ops = readPendingOps();
  if (!ops.length) return;
  _syncing = true;
  const mapping = {};
  const remaining = [];
  try {
    for (const op of ops) {
      try {
        const resolvedUrl = rewriteUrl(op.url, mapping);
        const resolvedData = op.data ? rewriteRefs(op.data, mapping) : undefined;
        const opts = { __skipRetry: true, __isReplay: true };
        let res;
        if (op.method === "delete") res = await api.delete(resolvedUrl, opts);
        else if (op.method === "put") res = await api.put(resolvedUrl, resolvedData, opts);
        else res = await api.post(resolvedUrl, resolvedData, opts);
        if (op.method === "post" && op.localId != null && res && res.data && res.data.id != null) {
          mapping[op.localId] = res.data.id;
        }
      } catch {
        remaining.push(op); // keep for the next attempt
      }
    }
    writePendingOps(remaining);
    if (remaining.length === 0) markOffline(false);
  } finally {
    _syncing = false;
  }
}

const MAX_RETRIES = 4;
const RETRY_BASE_DELAY = 2000;
const MAX_TIMEOUT = 60000;

// Pending (debounced) 401 session-wipe timer, so a single transient 401 can't
// log the user out while other requests are still succeeding.
let _wipe401Timer = null;

const api = axios.create({
  baseURL: API_BASE || "http://localhost:8080/api",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  config.__retryCount = config.__retryCount || 0;
  config.timeout = config.timeout || MAX_TIMEOUT;
  return config;
});

// Attach auth token and tenant (shop) header automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("shop_auth_token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Multi-tenant: scope every request to the logged-in shop.
    // Only sent when a numeric backend shop id is known.
    const shopId = localStorage.getItem("shop_id");
    if (shopId && /^\d+$/.test(String(shopId))) {
      config.headers = config.headers || {};
      config.headers["X-Tenant-Id"] = String(shopId);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response: cache successful GETs, retry network errors, fall back to cache
api.interceptors.response.use(
  (response) => {
    const cfg = response.config;
    const method = (cfg?.method || "get").toLowerCase();
    if (method === "get" && cfg?.url && response.status >= 200 && response.status < 300) {
      writeCache(cfg.url, response.data);
    }
    if (method === "get") {
      markOffline(false);
      if (!_syncing) syncPendingOps();
    }
    // A request succeeded: cancel any pending 401 wipe (transient failure).
    if (_wipe401Timer) {
      clearTimeout(_wipe401Timer);
      _wipe401Timer = null;
    }
    return response;
  },
  async (error) => {
    const config = error.config;

    if (error.response) {
      if (error.response.status === 401) {
        const url = config?.url || "";
        // Bad credentials on the auth routes are never a session death.
        const isAuthRoute = url.includes("/auth/login") || url.includes("/auth/register");
        // Offline-first sessions use a local token the server can never
        // validate. A 401 for one of those is expected (we're in offline mode),
        // so never wipe the session - serve cached data for GETs instead.
        const storedToken = localStorage.getItem("shop_auth_token") || "";
        const isLocalToken =
          storedToken === "local_admin_token" || storedToken === "local_customer_token";

        if (isLocalToken) {
          const method = (config?.method || "get").toLowerCase();
          if (method === "get") {
            const cached = config?.url ? readCache(config.url) : null;
            if (cached) {
              markOffline(true);
              return Promise.resolve({
                data: cached,
                status: 200,
                statusText: "OK (from cache)",
                headers: {},
                config: { ...config, __fromCache: true },
              });
            }
          }
          return Promise.reject(error);
        }

        // Only an authenticated request that failed can mean a dead session.
        const hadToken = !!config?.headers?.Authorization;

        if (hadToken && !isAuthRoute) {
          // Debounce the wipe: wait briefly so concurrent requests can decide.
          // If anything succeeds in between, the wipe is cancelled (transient
          // single-request failure). Only a genuinely dead session keeps
          // producing 401s and still logs the user out.
          if (_wipe401Timer) clearTimeout(_wipe401Timer);
          _wipe401Timer = setTimeout(() => {
            _wipe401Timer = null;
            localStorage.removeItem("shop_auth_token");
            localStorage.removeItem("shop_id");
            localStorage.removeItem("shop_name");
            global.window.dispatchEvent(new Event("roleChanged"));
          }, 1500);
        }
      }
      // Suppress 409 Conflict on exchange-storing requests (backend constraint issue)
      if (error.response.status === 409 && config?.url?.includes("/exchange-storing")) {
        return Promise.resolve({ data: error.response.data });
      }
      return Promise.reject(error);
    }

    // No response = timeout or network error.
    const method = (config?.method || "get").toLowerCase();
    const isGet = method === "get";
    const offlineNow = global.navigator && global.navigator.onLine === false;
    const cached = config?.url ? readCache(config.url) : null;

    if (isGet && cached) {
      markOffline(true);
      return Promise.resolve({
        data: cached,
        status: 200,
        statusText: "OK (from cache)",
        headers: {},
        config: { ...config, __fromCache: true },
      });
    }

    // No cached data: retry idempotent requests with backoff (unless truly offline).
    const retryable = config && (method === "get" || method === "put" || method === "delete") && !config.__skipRetry && !offlineNow;

    if (retryable && (config.__retryCount || 0) < MAX_RETRIES) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      const delay = RETRY_BASE_DELAY * 2 ** (config.__retryCount - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    markOffline(true);

    // Server unreachable on a write: apply it to the local cache right away
    // so the change shows immediately, queue it, and sync later. Replayed
    // ops must never be queued again.
    if (!isGet && !config.__isReplay) {
      return offlineWriteResponse(config, method);
    }

    return Promise.reject(error);
  }
);

export default api;