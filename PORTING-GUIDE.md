# Porting Guide — React/Vite → React Native (Expo SDK 57)

You are converting individual pages from the existing web app into React
Native screens. **Read ONLY the original files you are assigned; NEVER modify
them.** Write new `.jsx` files into the target `src/Pages` or `src/Dashboard`
folder. Keep the exact component name and default export from the original so
`App.jsx` imports keep working.

## Folders
- Original (read-only): `E:\frontend\Frontend-MAMA-SWAI\Shop frontend\my-app\src\Pages` and `...\src\Dashboard`
- Target (write):      `E:\frontend\Shop frontend with react native\my-app\src\Pages` and `...\src\Dashboard`

## Import map (use these instead of the old libraries)
| Web app used            | Use this RN replacement |
|-------------------------|--------------------------|
| `react-router-dom` (Link, useNavigate) | `useNav()` / `redirect()` / `nav()` from `../navigation/nav` (Pages are one level below `src`, so `../navigation/nav`) |
| `lucide-react` icons    | `@expo/vector-icons` `<Ionicons name="cube-outline" size={16} color={colors.slate600} />` |
| `recharts`              | `BarChart, LineChart, PieChart, ChartCard` from `../components/ui` |
| `jspdf`, `jspdf-autotable` | `exportPdf({ title, columns, rows, footerNote })`, `exportCsv(filename, csv)` from `../utils/export` |
| `FileReader` + canvas image compression | `pickAndResizeImage()` from `../utils/imageUtils` |
| `window.confirm(...)`  | `await confirmDialog(msg, title)` from `../utils/confirm` (bare `confirm`/`alert` also patched, but `await` them) |
| `<input>`, `<textarea>`, `<select>`, `<button>` | `TextField` (multiline for textarea), `SelectField`, `Button` from `../components/ui` |
| `<table>`              | FlatList / mapped `View` rows inside `Card` from `../components/ui` |
| `<img>`               | `<Image source={{ uri }} style={...} />` from react-native |
| `window.location.href = '/x'` | `redirect('/x')` |
| `useNavigate()(to)` / navigate(to) | `useNav()(to)` |
| `location.pathname`    | `useRoutePath()` from `../navigation/nav` |

## React Native element mapping
- `<div>` → `<View>`, `<span>/<p>` → `<Text>`, `<h1..h6>` → `<Text>` with fontWeight/size.
- `onClick` → `onPress`; `<button>` → `<Pressable>` or `ui/Button`.
- Layouts: use `flexDirection: "row"` with `flex: 1` weights instead of floats.
- CSS classes/string inline styles → `StyleSheet.create`; convert `"10px"` → `10`, `"100%"` → `"100%"` (percent strings are allowed in RN).
- gap: RN 0.86 supports `gap` in styles — use it for spacing instead of `margin`.
- All new UI must use the design tokens: `import { colors, font, radius, spacing, shadow, money, statusColor } from "../theme";`

## Navigation rules
- After a successful login/logout in your page, call:
  `global.window.dispatchEvent(new Event("roleChanged"))` so the AuthProvider
  switches the auth/main stack. Login stores `shop_auth_token`, `shop_role`,
  `shop_auth_user` in `localStorage` (the shim). Keep doing exactly what the
  original did, then dispatch the event.
- The `Logout` page just clears auth keys, dispatches `roleChanged`, and calls
  `redirect('/login')` (or `nav('/login')`).

## Data fetching
- `api` from `../api/axiosConfig` works identically (offline cache, queue,
  401 resets, auth/tenant headers all handled). Keep all api calls/logic EXACT
  as the original — only the rendering changes.

## Keep THIS logic identical (do not simplify)
- All api calls, math, filtering, sorting, debt/profit calculations, status
  formatting, localStorage keys, and `window.dispatchEvent(new Event(...))`
  usage. The goal is 1:1 feature parity with a native look and feel.

## Charts (Dashboard files only)
- Use `BarChart, LineChart, PieChart, ChartCard` from `../components/ui`.
  - `BarChart data={[{label, value}]}` / `LineChart data={[{label, value}]}`.
  - `PieChart data={[{label, value, color}]}` (donut).
  - `ChartCard title subtitle` wraps any chart.
- recharts props like `dataKey`, custom tooltips, margin, etc. do NOT exist —
  adapt to the simple primitives while keeping the same data series.

## Do NOT do
- Do not import css files. Do not use DOM APIs (`getElementById`,
  `querySelector`, `document.body`). `localStorage` / `window` events / global
  `alert`/`confirm` are shimmed and safe. Do not use `react-router-dom`.
- Do not add new npm dependencies.
- Do not run builds (`npx expo export` etc.) — the coordinator does the final
  bundle check. Just write the files.

## Verification per file
- After writing each screen, re-open it and do a quick self-review: every
  import path correct, no `.css`, no `react-router`, all `onPress`, JSX valid.