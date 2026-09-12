const FIRST_USE_KEY = "ms_first_use";
const DISMISS_KEY = "ms_update_dismissed_until";

// Ask the user to update one month after first using the app.
const UPDATE_AFTER_DAYS = 30;
// Don't nag again for a week after the user taps "Later".
const DISMISS_FOR_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

// Records (and returns) the day the user first opened the app on this device.
export function getFirstUseDate() {
  let ts = Number(localStorage.getItem(FIRST_USE_KEY) || 0);
  if (!ts || Number.isNaN(ts)) {
    ts = Date.now();
    try {
      localStorage.setItem(FIRST_USE_KEY, String(ts));
    } catch {
      // ignore
    }
  }
  return ts;
}

export function isUpdateDue() {
  const firstUse = getFirstUseDate();
  const dueAt = firstUse + UPDATE_AFTER_DAYS * DAY_MS;
  const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return Date.now() >= dueAt && Date.now() >= dismissedUntil;
}

export function dismissUpdate() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_FOR_DAYS * DAY_MS));
  } catch {
    // ignore
  }
}

// The web app reloads to pick up new service-worker builds. React Native apps
// update through the app stores / Expo updates, so in this port applying an
// update is a no-op: we just mark it as dismissed.
export async function checkAndApplyUpdate() {
  return;
}