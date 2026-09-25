"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/icons";
import { importCrmLeads } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { downloadCsv } from "@/lib/csv";
import {
  InventoryBindFields,
  inventoryBindPayload,
  type InventoryBindValue,
} from "@/components/org/inventory-bind-fields";
import {
  LEAD_IMPORT_MAX_BYTES,
  LEAD_IMPORT_MAX_ROWS,
  parseLeadCsv,
  sampleLeadCsvRows,
  type LeadImportRow,
} from "@/lib/lead-import";
import type { LeadImportResult } from "@/lib/types";

const NO_TARGET_ERROR = "Select the project or standalone unit to import these leads into.";

/** Download the sample import sheet (Name, Phone, Email). */
export async function downloadLeadImportSample(): Promise<void> {
  downloadCsv("leads-import-sample.csv", sampleLeadCsvRows());
}

/** Flash-message wording, e.g. "3 of 5 leads added successfully". */
export function importSummary(res: LeadImportResult): string {
  const noun = res.total === 1 ? "lead" : "leads";
  return `${res.created} of ${res.total} ${noun} added successfully`;
}

/** Mount only while open (`{open ? <ImportLeadsModal … /> : null}`) so each open starts clean. */
export function ImportLeadsModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  /** Called after an import that added at least one lead. */
  onImported: (result: LeadImportResult) => void;
}) {
  const { toast } = useToast();
  const { accessToken } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<LeadImportRow[] | null>(null);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<LeadImportResult | null>(null);
  // The project or standalone unit every row in the file is imported into.
  const [target, setTarget] = useState<InventoryBindValue>({ kind: "none" });

  function reset() {
    setFileName("");
    setRows(null);
    setError("");
    setResult(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setRows(null);
    setError("");
    setResult(null);
    if (!file) {
      setFileName("");
      return;
    }
    setFileName(file.name);
    if (!/\.csv$/i.test(file.name)) {
      setError("Choose a .csv file. In Excel use File → Save As → CSV.");
      return;
    }
    if (file.size > LEAD_IMPORT_MAX_BYTES) {
      setError("The file is larger than 2 MB. Split it into smaller files.");
      return;
    }
    try {
      const parsed = parseLeadCsv(await file.text());
      if ("error" in parsed) setError(parsed.error);
      else setRows(parsed.rows);
    } catch {
      setError("Could not read the file. Make sure it is a valid CSV.");
    }
  }

  async function runImport() {
    if (!rows || rows.length === 0) return;
    if (target.kind === "none") {
      setError(NO_TARGET_ERROR);
      return;
    }
    setImporting(true);
    setError("");
    try {
      const res = await importCrmLeads(inventoryBindPayload(target), rows);
      setResult(res);
      toast({
        title: importSummary(res),
        description:
          res.failed > 0
            ? `${res.failed} row${res.failed === 1 ? " was" : "s were"} skipped because of missing or invalid data.`
            : undefined,
        variant: res.created === 0 ? "error" : res.failed > 0 ? "warning" : "success",
      });
      if (res.created > 0) onImported(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  async function downloadSample() {
    setDownloading(true);
    try {
      await downloadLeadImportSample();
    } finally {
      setDownloading(false);
    }
  }

  const summaryTone = !result
    ? null
    : result.created === 0
      ? { bg: "var(--rose-050, #fff1f2)", fg: "var(--rose, #e11d48)" }
      : result.failed > 0
        ? { bg: "var(--amber-050, #fffbeb)", fg: "var(--amber, #b45309)" }
        : { bg: "var(--green-050, #f0fdf4)", fg: "var(--green, #16a34a)" };

  const footer = result ? (
    <>
      <button type="button" className="btn btn-ghost" onClick={reset}>
        Import another file
      </button>
      <button type="button" className="btn btn-primary" onClick={onClose}>
        Done
      </button>
    </>
  ) : (
    <>
      <button type="button" className="btn btn-ghost" onClick={onClose} disabled={importing}>
        Cancel
      </button>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => void runImport()}
        disabled={importing || !rows || rows.length === 0}
      >
        {importing ? "Importing…" : rows ? `Import ${rows.length} lead${rows.length === 1 ? "" : "s"}` : "Import"}
      </button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeDisabled={importing}
      title="Import leads from CSV"
      description="Add many leads at once from a spreadsheet."
      footer={footer}
    >
      {result && summaryTone ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div
            role="status"
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: summaryTone.bg,
              color: summaryTone.fg,
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {importSummary(result)}
            {result.failed > 0 ? (
              <div style={{ fontWeight: 400, fontSize: 13, marginTop: 4 }}>
                {result.failed} row{result.failed === 1 ? " was" : "s were"} not added. Fix them in your file and import
                just those rows again.
              </div>
            ) : null}
          </div>
          {result.errors.length > 0 ? (
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Skipped rows</div>
              <div
                style={{
                  maxHeight: 220,
                  overflowY: "auto",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                }}
              >
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>Row</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e) => (
                      <tr key={e.row}>
                        <td className="mono">{e.row}</td>
                        <td>{e.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <div className="help" style={{ margin: 0 }}>
            Columns: <b>Name</b>, <b>Phone</b>, <b>Email</b> — all three are required. Rows with a missing or invalid
            value are skipped and listed after the import. Pick the project or standalone unit these leads belong to
            below — every row in the file goes to it. Up to {LEAD_IMPORT_MAX_ROWS} rows per file.
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 240px", minWidth: 0 }}>
              <InventoryBindFields
                accessToken={accessToken}
                value={target}
                onChange={(next) => {
                  setTarget(next);
                  if (next.kind !== "none" && error === NO_TARGET_ERROR) setError("");
                }}
                disabled={importing}
                required
                hint="All leads in this file are added to the selected project or unit."
              />
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 20 }}
              onClick={() => void downloadSample()}
              disabled={downloading}
            >
              <Icon name="download" size={14} /> {downloading ? "Preparing…" : "Download sample CSV"}
            </button>
          </div>
          <label className="drop" style={{ display: "block" }}>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => void onFile(e)}
              disabled={importing}
              style={{ display: "none" }}
            />
            <Icon name="document" size={18} />
            <div style={{ marginTop: 6 }}>
              {fileName ? (
                <b style={{ color: "var(--ink, inherit)" }}>{fileName}</b>
              ) : (
                <>
                  Click to choose a <b>.csv</b> file
                </>
              )}
            </div>
            {rows ? (
              <div style={{ fontSize: 12.5, marginTop: 4 }}>
                {rows.length} row{rows.length === 1 ? "" : "s"} found
              </div>
            ) : null}
          </label>
          {error ? (
            <div role="alert" style={{ color: "var(--rose, #b91c1c)", fontSize: 13 }}>
              {error}
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
