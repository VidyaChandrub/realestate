import { describe, expect, it } from "vitest";
import { buildCsv, parseCsv } from "@/lib/csv";
import { LEAD_IMPORT_MAX_ROWS, parseLeadCsv, sampleLeadCsvRows } from "@/lib/lead-import";

describe("parseCsv", () => {
  it("handles quotes, embedded commas/newlines, CRLF and a BOM", () => {
    const text = '﻿Name,Note\r\n"Rao, Asha","said ""hi""\nthen left"\r\nVikram,plain';
    expect(parseCsv(text)).toEqual([
      ["Name", "Note"],
      ["Rao, Asha", 'said "hi"\nthen left'],
      ["Vikram", "plain"],
    ]);
  });

  it("round-trips through buildCsv", () => {
    const rows = [["a,b", 'q"t', "line\nbreak"], ["x", "", "z"]];
    expect(parseCsv(buildCsv(rows))).toEqual(rows);
  });
});

describe("parseLeadCsv", () => {
  it("maps rows by header name (any order / spelling) and keeps line numbers", () => {
    const res = parseLeadCsv(
      "Project Name,Email Address,Mobile,Full Name\n" +
        "Skyline, asha@example.com ,+91 98250 41200,Asha Rao\n" +
        "\n" +
        "Skyline,,99099 12345,Vikram\n",
    );
    expect(res).toEqual({
      rows: [
        { rowNumber: 2, name: "Asha Rao", phone: "+91 98250 41200", email: "asha@example.com", project: "Skyline" },
        { rowNumber: 4, name: "Vikram", phone: "99099 12345", email: "", project: "Skyline" },
      ],
    });
  });

  it("reports missing required columns", () => {
    const res = parseLeadCsv("Name,Phone\nAsha,123\n");
    expect(res).toEqual({ error: expect.stringContaining("Missing columns: Email, Project") });
  });

  it("rejects an empty file or one with only a header", () => {
    expect(parseLeadCsv("")).toEqual({ error: "The file is empty." });
    expect(parseLeadCsv("Name,Phone,Email,Project\n")).toEqual({
      error: "The file has no lead rows below the header.",
    });
  });

  it(`rejects more than ${LEAD_IMPORT_MAX_ROWS} rows`, () => {
    const body = Array.from({ length: LEAD_IMPORT_MAX_ROWS + 1 }, (_, i) => `N${i},1234567,a${i}@x.co,P`).join("\n");
    const res = parseLeadCsv(`Name,Phone,Email,Project\n${body}`);
    expect("error" in res && res.error).toContain(`at most ${LEAD_IMPORT_MAX_ROWS}`);
  });

  it("builds a sample that parses back into complete rows", () => {
    const res = parseLeadCsv(buildCsv(sampleLeadCsvRows(["Skyline Heights"])));
    expect("rows" in res && res.rows.every((r) => r.name && r.phone && r.email && r.project === "Skyline Heights")).toBe(
      true,
    );
  });
});
