import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";

function safeFileName(name) {
  const cleaned = String(name || "export")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 80);
  return /\.(csv|pdf)$/i.test(cleaned) ? cleaned : `${cleaned}.csv`;
}

const shareable = async () => {
  try {
    return await Sharing.isAvailableAsync();
  } catch {
    return false;
  }
};

// Share a plain-text payload (CSV, log lines, etc) via the share sheet.
export async function exportShareText(filename, content) {
  const ok = await shareable();
  if (!ok) return;
  const uri = FileSystem.cacheDirectory + safeFileName(filename);
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(uri, { mimeType: "text/plain", dialogTitle: filename });
}

// Share a CSV string.
export async function exportCsv(filename, csvString) {
  await exportShareText(filename, csvString);
}

// Build & share a PDF with a title and a simple table (autoTable-style API).
export async function exportPdf({
  title = "Report",
  filename = "report.pdf",
  columns = [],
  rows = [],
  footerNote = "",
  landscape = false,
  html = "",
}) {
  const ok = await shareable();
  if (!ok) return;
  const escapes = (v) =>
    String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const thead =
    columns && columns.length
      ? `<thead><tr>${columns.map((c) => `<th>${escapes(c)}</th>`).join("")}</tr></thead>`
      : "";
  const tbody =
    rows && rows.length
      ? rows
          .map(
            (r) =>
              `<tr>${(Array.isArray(r) ? r : []).map((c) => `<td>${escapes(c)}</td>`).join("")}</tr>`
          )
          .join("")
      : "";

  const htmlDoc =
    html ||
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; padding: 24px; color:#0f172a; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      .muted { color:#64748b; font-size: 11px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background:#f1f5f9; text-align:left; padding: 7px 8px; font-weight:700; border-bottom: 2px solid #e2e8f0; }
      td { padding: 6px 8px; border-bottom: 1px solid #eef2f7; }
      tr:nth-child(even) td { background:#fafbfc; }
      .foot { margin-top: 14px; color:#64748b; font-size:10px; }
    </style></head><body>
      <h1>${escapes(title)}</h1>
      <div class="muted">EMLANETSHOP — ${new Date().toLocaleDateString()}</div>
      <table>${thead}${tbody}</table>
      ${footerNote ? `<div class="foot">${escapes(footerNote)}</div>` : ""}
    </body></html>`;

  const { uri } = await Print.printToFileAsync({
    html: htmlDoc,
    ...(landscape ? { width: 842, height: 595 } : {}),
  });

  const baseName = safeFileName(filename).replace(/\.csv$/i, ".pdf");
  const pdfUri = FileSystem.cacheDirectory + baseName;
  if (pdfUri !== uri) {
    await FileSystem.copyAsync({ from: uri, to: pdfUri });
  }
  await Sharing.shareAsync(pdfUri, { mimeType: "application/pdf", dialogTitle: title });
}