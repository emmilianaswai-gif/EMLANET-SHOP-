// Browser shim layer for React Native.
//
// The original web app uses `localStorage`, `sessionStorage`, `window` events
// and `navigator.onLine` synchronously across the whole codebase. React Native
// has none of those, so this module provides drop-in replacements backed by
// AsyncStorage (pre-hydrated at boot) so the existing logic ports cleanly.

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

const LS_PREFIX = "ls:";
const SS_PREFIX = "ss:";

// Full AsyncStorage key -> serialized value. Populated once at startup.
const _map = new Map();

export async function hydrateStorage() {
  try {
    if (_map.size > 0) return;
    const keys = await AsyncStorage.getAllKeys();
    const entries = await AsyncStorage.multiGet(keys);
    for (const [k, v] of entries) {
      if (v != null) _map.set(k, v);
    }
  } catch {
    // storage unavailable - run with empty in-memory store
  }
}

function persist(key, value) {
  try {
    if (value == null) {
      AsyncStorage.removeItem(key).catch(() => {});
    } else {
      AsyncStorage.setItem(key, value).catch(() => {});
    }
  } catch {
    // ignore
  }
}

class StorageShim {
  constructor(prefix, session) {
    this._prefix = prefix;
    this._session = session;
  }

  _keys() {
    const out = [];
    _map.forEach((_v, k) => {
      if (k.startsWith(this._prefix)) out.push(k);
    });
    return out;
  }

  getItem(key) {
    const v = _map.get(this._prefix + key);
    return v === undefined ? null : v;
  }

  setItem(key, value) {
    const k = this._prefix + key;
    const s = String(value);
    _map.set(k, s);
    if (!this._session) persist(k, s);
  }

  removeItem(key) {
    const k = this._prefix + key;
    _map.delete(k);
    if (!this._session) persist(k, null);
  }

  clear() {
    const toRemove = this._keys();
    for (const k of toRemove) _map.delete(k);
    if (!this._session && toRemove.length) {
      AsyncStorage.multiRemove(toRemove).catch(() => {});
    }
  }

  key(i) {
    const keys = this._keys();
    const idx = Number(i);
    if (idx < 0 || idx >= keys.length) return null;
    return keys[idx].slice(this._prefix.length);
  }

  get length() {
    return this._keys().length;
  }
}

class EventShim {
  constructor(type) {
    this.type = type;
  }
}

class EventTargetShim {
  constructor() {
    this._listeners = new Map();
  }

  addEventListener(type, fn) {
    if (typeof fn !== "function") return;
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(fn);
  }

  removeEventListener(type, fn) {
    this._listeners.get(type)?.delete(fn);
  }

  dispatchEvent(event) {
    const type = event && event.type;
    const fns = this._listeners.get(type);
    if (fns) {
      for (const fn of [...fns]) {
        try {
          fn.call(null, event);
        } catch {
          // ignore listener errors
        }
      }
    }
    return true;
  }
}

function install() {
  // Navigation / location. React Native has no real URL bar, so `pathname`
  // mirrors the currently active route (maintained by src/navigation/nav.js).
  const windowTarget = new EventTargetShim();
  windowTarget.location = {
    pathname: "",
    search: "",
    hash: "",
    origin: "app",
    reload: () => {},
    assign: () => {},
    replace: () => {},
    // Preserve the web app's string URL state so things like
    // localStorage-keys or message text that embed pathname still work.
  };
  windowTarget.__ms_offline = false;
  windowTarget.document = new EventTargetShim();
  windowTarget.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
  windowTarget.scrollTo = () => {};
  windowTarget.requestAnimationFrame = (cb) => requestAnimationFrame(cb);
  windowTarget.cancelAnimationFrame = (id) => cancelAnimationFrame(id);

  global.window = windowTarget;
  global.window.window = windowTarget;
  global.window.global = global;

  global.document = windowTarget.document;
  global.Event = EventShim;

  global.localStorage = new StorageShim(LS_PREFIX, false);
  global.sessionStorage = new StorageShim(SS_PREFIX, true);

  global.navigator = {
    ...(global.navigator || {}),
    onLine: true,
    userAgent: "",
  };

  if (typeof AbortController === "undefined") {
    // Minimal AbortController fallback for very old runtimes.
    global.AbortController = class {
      constructor() {
        this.signal = { aborted: false, onabort: null, addEventListener() {}, removeEventListener() {} };
        this.abort = () => {
          this.signal.aborted = true;
        };
      }
    };
  }

  // Keep navigator.onLine / window.__ms_offline in sync with reality.
  NetInfo.addEventListener((state) => {
    const isOnline = state.isConnected !== false && state.isInternetReachable !== false;
    global.navigator.onLine = isOnline;
    global.window.__ms_offline = !isOnline;
  });
}

install();

// Called by src/navigation/nav.js whenever the active route changes so that
// any code referencing window.location.pathname gets the right value.
let _windowTarget = global.window;
export function setPath(path) {
  if (_windowTarget?.location) _windowTarget.location.pathname = path || "";
}

export { EventShim, EventTargetShim, StorageShim };