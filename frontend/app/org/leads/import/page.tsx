"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
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
import { Field, FormAlert, FormPage, formPageStyles } from "@/components/forms/form-page";
import type { LeadImportResult } from "@/lib/types";

// Import leads from CSV — full page (was ImportLeadsModal). Same parsing,
// limits, target picker, import call, toast and results view.

const LEADS_PATH = "/org/leads";
const NO_TARGET_ERROR = "Select the project or standalone unit to import these leads into.";

/** Flash-message wording, e.g. "3 of 5 leads added successfully". */
function importSummary(res: LeadImportResult): string {
  const noun = res.total === 1 ? "lead" : "leads";
  return `${res.created} of ${res.total} ${noun} added successfully`;
}

export default function ImportLeadsPage() {
  const { isLoading, isOrgAdmin, hasPermission } = useAuth();
  if (isLoading) return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
  // Same gate as the Lead Center's "Import CSV" button.
  if (!(isOrgAdmin() || hasPermission("crm", "add"))) {
    return (
      <div className="form-alert">
        You don&apos;t have permission to import leads. <Link href={LEADS_PATH}>Back to Lead Center</Link>
      </div>
    );
  }
  return <ImportLeadsForm />;
}

function ImportLeadsForm() {
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

  async function runImport(e: React.FormEvent) {
    e.preventDefault();
    if (importing || !rows || rows.length === 0) return;
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  async function downloadSample() {
    setDownloading(true);
    try {
      downloadCsv("leads-import-sample.csv", sampleLeadCsvRows());
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

  return (
    <FormPage
      eyebrow="CRM · Leads"
      title="Import leads from CSV"
      subtitle="Add many leads at once from a spreadsheet."
      backHref={LEADS_PATH}
      backLabel="Back to Lead Center"
    >
      {result && summaryTone ? (
        <div className={formPageStyles.panel}>
          <div
            role="status"
            style={{
              padding: "14px 16px",
              borderRadius: 12,
              background: summaryTone.bg,
              color: summaryTone.fg,
              fontWeight: 600,
              fontSize: 14,
              marginBottom: 20,
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
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8 }}>Skipped rows</div>
              <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 12 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>Row</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((row) => (
                      <tr key={row.row}>
                        <td className="mono">{row.row}</td>
                        <td>{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          <div className={formPageStyles.actions}>
            <button type="button" className={formPageStyles.btn} onClick={reset}>
              Import another file
            </button>
            <Link href={LEADS_PATH} className={formPageStyles.btnPrimary}>
              <Icon name="check" size={16} /> Done
            </Link>
          </div>
        </div>
      ) : (
        <form className={formPageStyles.panel} onSubmit={runImport}>
          <div className={formPageStyles.hint} style={{ marginTop: 0, marginBottom: 20 }}>
            <Icon name="info" size={14} />
            <span>
              Columns: <b>Name</b>, <b>Phone</b>, <b>Email</b> — all three are required. Rows with a missing or invalid
              value are skipped and listed after the import. Pick the project or standalone unit these leads belong to
              below — every row in the file goes to it. Up to {LEAD_IMPORT_MAX_ROWS} rows per file.
            </span>
          </div>

          <Field htmlFor="il-target" label="Project or standalone unit *" icon="building">
            <InventoryBindFields
              accessToken={accessToken}
              value={target}
              onChange={(next) => {
                setTarget(next);
                if (next.kind !== "none" && error === NO_TARGET_ERROR) setError("");
              }}
              disabled={importing}
              required
              hideLabel
              hint="All leads in this file are added to the selected project or unit."
            />
          </Field>

          <div style={{ marginBottom: 16 }}>
            <button
              type="button"
              className={formPageStyles.btn}
              onClick={() => void downloadSample()}
              disabled={downloading}
            >
              <Icon name="download" size={15} /> {downloading ? "Preparing…" : "Download sample CSV"}
            </button>
          </div>

          <Field htmlFor="il-file" label="CSV file *" icon="document">
            <label className="drop" style={{ display: "block" }}>
              <input
                id="il-file"
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
          </Field>

          <FormAlert message={error || null} />

          <div className={formPageStyles.actions}>
            <Link
              href={LEADS_PATH}
              className={formPageStyles.btn}
              aria-disabled={importing || undefined}
              onClick={(e) => {
                if (importing) e.preventDefault();
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              className={formPageStyles.btnPrimary}
              disabled={importing || !rows || rows.length === 0}
            >
              <Icon name="upload" size={16} />
              {importing ? "Importing…" : rows ? `Import ${rows.length} lead${rows.length === 1 ? "" : "s"}` : "Import"}
            </button>
          </div>
        </form>
      )}
    </FormPage>
  );
}
