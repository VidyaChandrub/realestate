import { describe, expect, it } from "vitest";
import { collectUtmParams, conversionRate, queryFillValues, resolveConditionalDownload, resolveConditionalRedirect } from "@/lib/openpage/form-runtime";
import type { FormLeadField } from "@/lib/openpage/types";

describe("form runtime helpers", () => {
  it("collects UTM and source params", () => {
    const utm = collectUtmParams("?utm_source=google&utm_campaign=launch&foo=1");
    expect(utm.utm_source).toBe("google");
    expect(utm.utm_campaign).toBe("launch");
    expect(utm.foo).toBeUndefined();
  });

  it("fills defaults and query params", () => {
    const fields: FormLeadField[] = [
      { id: "n", type: "text", label: "Name", placeholder: "", required: false, defaultValue: "Ada", queryParam: "name" },
    ];
    expect(queryFillValues(fields, "?name=Rohan").n).toBe("Rohan");
    expect(queryFillValues(fields, "").n).toBe("Ada");
  });

  it("picks the first matching redirect rule", () => {
    const url = resolveConditionalRedirect(
      [
        { field: "budget", op: "eq", value: "High", url: "https://a.example" },
        { field: "budget", op: "eq", value: "Low", url: "https://b.example" },
      ],
      { budget: "Low" },
      "https://fallback",
    );
    expect(url).toBe("https://b.example");
  });

  it("picks a matching after-submit PDF or image download", () => {
    const file = resolveConditionalDownload(
      {
        pdf: { enabled: true, url: "https://cdn.example/default.pdf", filename: "default.pdf" },
        downloadRules: [
          { field: "plan", op: "eq", value: "2BHK", url: "https://cdn.example/2bhk.pdf", kind: "pdf", filename: "2bhk.pdf" },
          { field: "plan", op: "eq", value: "3BHK", url: "https://cdn.example/3bhk.jpg", kind: "image", filename: "3bhk.jpg" },
        ],
      },
      { plan: "3BHK" },
    );
    expect(file?.kind).toBe("image");
    expect(file?.url).toBe("https://cdn.example/3bhk.jpg");
  });
});
