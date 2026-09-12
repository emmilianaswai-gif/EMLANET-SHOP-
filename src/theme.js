// Design tokens shared by every screen, mirroring the original web app's
// Tailwind-style palette. Organized as [light, dark] pairs where relevant.

export const colors = {
  primary: "#2563eb",
  primaryDark: "#1e40af",
  primaryLight: "#eff6ff",
  danger: "#ef4444",
  dangerDark: "#dc2626",
  dangerLight: "#fef2f2",
  success: "#059669",
  successLight: "#ecfdf5",
  warning: "#d97706",
  warningLight: "#fef3c7",
  info: "#0891b2",
  infoLight: "#ecfeff",

  slate900: "#0f172a",
  slate800: "#1e293b",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate300: "#cbd5e1",
  slate200: "#e2e8f0",
  slate100: "#f1f5f9",
  slate50: "#f8fafc",

  white: "#ffffff",
  black: "#000000",
};

export const bg = {
  page: colors.slate50,
  card: colors.white,
  header: colors.slate800,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
};

export const font = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
};

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  raised: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
};

export const border = `1px solid ${colors.slate200}`;

// Helper: status badge colors used across sales / stock / orders lists.
export function statusColor(status) {
  const s = String(status || "").toLowerCase();
  if (/paid|delivered|approved|ok|active|success/.test(s)) return { bg: colors.successLight, fg: colors.success };
  if (/unpaid|pending|new|processing|low|expiring/.test(s)) return { bg: colors.warningLight, fg: colors.warning };
  if (/rejected|expired|out|suspended|overdue|debt/.test(s)) return { bg: colors.dangerLight, fg: colors.danger };
  return { bg: colors.slate100, fg: colors.slate600 };
}

export function money(n) {
  return `TZS ${Number(n || 0).toLocaleString()}`;
}