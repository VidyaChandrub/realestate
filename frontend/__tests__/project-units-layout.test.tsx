import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// The project Units page follows the project's structure layout: `tower`
// keeps the apartment experience; `cluster` groups by the type's own word,
// has no floors / configurations, and shows the project's unit fields.
class NoopIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = "";
  thresholds = [];
}
vi.stubGlobal("IntersectionObserver", NoopIntersectionObserver);

const state = vi.hoisted(() => ({ layout: "cluster" as "tower" | "cluster" }));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "p1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/org/projects/p1/units",
}));
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ accessToken: "t", user: { org_id: "org-1" } }),
}));

const project = () => ({
  id: "p1", name: "Green Acres", status: "active", location: null, reraId: null, manager: null,
  currency: "INR", possession: null, towerCount: 2, floorsDescription: null,
  layout: state.layout, groupLabel: state.layout === "cluster" ? "Sector" : null,
  projectType: state.layout === "cluster" ? "Plots" : "Apartments",
  projectFieldTemplate: [],
  unitFieldTemplate:
    state.layout === "cluster"
      ? [
          { key: "dimensions", label: "Dimensions", type: "text", required: false },
          { key: "corner_plot", label: "Corner plot", type: "yesno", required: false },
        ]
      : [],
  customFields: {},
  unitTypes: [], configurations: [], rollup: { totalUnitsPlanned: 0, unitsCreated: 2, unitsAvailable: 2, unitsBooked: 0, unitsHeld: 0, unitsSold: 0 },
});

const unit = (id: string, unitNo: string, extra = {}) => ({
  id, unitNo, orgId: "org-1", projectId: "p1", status: "available", configuration: null, variantLabel: null,
  carpetSqft: null, builtupSqft: null, area: null, tower: null, floor: null, facing: null, parking: null,
  price: null, pricePerSqft: null, pricePerSqftBasis: null, customFields: {}, galleryUrls: [], floorPlanUrl: null,
  createdBy: null, updatedBy: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", ...extra,
});

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(async (path: string) => {
    if (path === "/org/projects/p1") return project();
    if (path === "/org/projects/p1/units") {
      return state.layout === "cluster"
        ? [
            unit("u1", "P-1", { tower: "S1", area: 2000, price: 4000000, pricePerSqft: 2000, customFields: { dimensions: "40x50", corner_plot: true } }),
            unit("u2", "P-2", { tower: "S2", area: 1500 }),
          ]
        : [
            unit("u1", "A-101", { tower: "A", floor: 3, configuration: "2 BHK", carpetSqft: 1000, pricePerSqftBasis: "carpet" }),
            unit("u2", "A-102", { tower: "A", floor: 4, configuration: "2 BHK", carpetSqft: 1000, pricePerSqftBasis: "carpet" }),
          ];
    }
    if (path === "/org/settings") return { name: "Org", unitPriceBasis: "carpet" };
    return {};
  }),
  getOrgCatalogOptions: vi.fn(async () => [
    { id: "c1", orgId: "org-1", category: "unit_type", label: "2 BHK", sortOrder: 0, createdAt: "", updatedAt: "" },
  ]),
}));

const { default: UnitsPage } = await import("@/app/org/projects/[id]/units/page");

describe("project Units page — follows the project's layout", () => {
  it("cluster: groups by the type's word, no floors / configurations, unit fields as columns", async () => {
    state.layout = "cluster";
    render(<UnitsPage />);

    expect(await screen.findByText("Availability — Sector S1")).toBeInTheDocument();
    expect(screen.getByText("Availability — Sector S2")).toBeInTheDocument();
    expect(screen.queryByText(/Availability — Tower/)).not.toBeInTheDocument();
    expect(screen.queryByText("＋ Add configuration")).not.toBeInTheDocument();

    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(expect.arrayContaining(["Sector", "Area (sqft)", "Dimensions", "Corner plot"]));
    expect(headers).not.toContain("Floor");
    expect(headers).not.toContain("Config");
    expect(headers).not.toContain("Carpet");
    expect(within(table).getByText("40x50")).toBeInTheDocument();
    expect(within(table).getByText("Yes")).toBeInTheDocument();
    // price/sqft carries no carpet / built-up basis
    expect(within(table).getByText(/2,000\.00 \/ sqft$/)).toBeInTheDocument();
  });

  it("cluster: the add-unit form has an area and the group, but no configuration or floor", async () => {
    state.layout = "cluster";
    const user = userEvent.setup();
    render(<UnitsPage />);
    await user.click(await screen.findByRole("button", { name: /Add unit/ }));

    expect(await screen.findByText("Area (sqft)", { selector: "label" })).toBeInTheDocument();
    expect(screen.getByText("Sector", { selector: "label" })).toBeInTheDocument();
    expect(screen.getByText("Dimensions", { selector: "label" })).toBeInTheDocument();
    expect(screen.queryByText(/^Configuration/, { selector: "label" })).not.toBeInTheDocument();
    expect(screen.queryByText("Floor", { selector: "label" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Carpet area/, { selector: "label" })).not.toBeInTheDocument();
  });

  it("tower: still the apartment experience", async () => {
    state.layout = "tower";
    const user = userEvent.setup();
    render(<UnitsPage />);

    expect(await screen.findByText("Availability — Tower A")).toBeInTheDocument();
    expect(screen.getByText("＋ Add configuration")).toBeInTheDocument();
    const headers = within(screen.getByRole("table")).getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(expect.arrayContaining(["Tower", "Config", "Carpet", "Floor"]));

    await user.click(screen.getByRole("button", { name: /Add unit/ }));
    expect(await screen.findByText(/^Configuration/, { selector: "label" })).toBeInTheDocument();
    expect(screen.getByText("Floor", { selector: "label" })).toBeInTheDocument();
    expect(screen.getByText("Carpet area (sqft)", { selector: "label" })).toBeInTheDocument();
    expect(screen.queryByText("Area (sqft)", { selector: "label" })).not.toBeInTheDocument();
  });
});
