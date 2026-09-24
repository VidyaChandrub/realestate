// Minimal RFC 4180 CSV helpers — enough for importing/exporting simple tables
// without pulling in a parsing library.

/**
 * Parse CSV text into rows of cells. Handles quoted fields (with embedded
 * commas, newlines and doubled "" quotes), CRLF / LF / CR line endings and a
 * leading UTF-8 BOM (Excel adds one). Cells are returned untrimmed.
 */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (ch === "\r" && src[i + 1] === "\n") i++;
    } else {
      cell += ch;
    }
  }
  // Last line without a trailing newline.
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Serialise rows to CSV text (CRLF line endings, quoted where needed). */
export function buildCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

/** Trigger a browser download of `rows` as a UTF-8 CSV file (BOM for Excel). */
export function downloadCsv(filename: string, rows: string[][]): void {
  const blob = new Blob([`﻿${buildCsv(rows)}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
