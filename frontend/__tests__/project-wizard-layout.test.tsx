import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Step 2 of the create wizard renders per the picked project type's layout.
// A `tower` type must look exactly as before; a `cluster` type has no floors,
// no BHK configurations and its own typed fields.
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

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ accessToken: "test-token", user: { org_id: "org-1" } }),
}));

const type = (id: string, name: string, layout: string, extra = {}) => ({
  id, orgId: "org-1", name, layout, groupLabel: null, projectFields: [], unitFields: [], sortOrder: 0, inUse: 0, ...extra,
});

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(async (path: string) => {
    if (path.startsWith("/org/users")) return { data: [] };
    if (path === "/org/settings") return { name: "Skyline Developers" };
    if (path.startsWith("/org/templates")) return { data: [] };
    return {};
  }),
  getOrgCatalogOptions: vi.fn(async () => []),
  getOrgProjectTypes: vi.fn(async () => [
    type("t1", "Apartments", "tower"),
    type("t2", "Plots", "cluster", {
      groupLabel: "Sector",
      projectFields: [
        { key: "number_of_plots", label: "Number of plots", type: "number", required: true },
        { key: "total_land", label: "Total land", type: "number", required: false, unit: "acres" },
      ],
      unitFields: [{ key: "corner", label: "Corner plot", type: "yesno", required: false }],
    }),
    type("t3", "Farmhouses", "individual"),
  ]),
  addCommonProjectTypes: vi.fn(),
  getOrgLandingPages: vi.fn(async () => []),
  getProjectSalesAgentCandidates: vi.fn(async () => ({ data: [], total: 0 })),
  getProjectManagerCandidates: vi.fn(async () => ({ data: [], total: 0 })),
  setProjectSalesAgents: vi.fn(async () => ({})),
}));

const { default: AddNewProjectPage } = await import("@/app/org/projects/add-new-project/page");

async function toStep2(user: ReturnType<typeof userEvent.setup>, typeName: string) {
  const nameInput = screen.getByPlaceholderText("e.g. Palm Residency");
  await user.click(nameInput);
  await user.paste("Test Project");
  await user.click(await screen.findByText(typeName));
  await user.click(screen.getByRole("button", { name: /Continue/ }));
  expect(await screen.findByRole("heading", { name: /Inventory & configuration/ })).toBeInTheDocument();
}

beforeEach(() => window.localStorage.clear());
afterEach(() => window.localStorage.clear());

describe("project wizard — Step 2 follows the project type's layout", () => {
  it("tower: shows exactly the apartment inventory controls", async () => {
    const user = userEvent.setup();
    render(<AddNewProjectPage />);
    await toStep2(user, "Apartments");

    expect(screen.getByText(/Unit configurations \(select all\)/)).toBeInTheDocument();
    expect(screen.getByText("No. of towers / blocks")).toBeInTheDocument();
    expect(screen.getByText("Floors / structure")).toBeInTheDocument();
    expect(screen.getByText("Carpet area range (sqft)")).toBeInTheDocument();
    expect(screen.getByText("Total land area")).toBeInTheDocument();
    // No template fields → no per-project field customiser to clutter it.
    expect(screen.queryByText(/Customise this project/)).not.toBeInTheDocument();
  });

  it("cluster: no floors / BHK, group count in the type's own word, typed fields", async () => {
    const user = userEvent.setup();
    render(<AddNewProjectPage />);
    await toStep2(user, "Plots");

    expect(screen.queryByText(/Unit configurations/)).not.toBeInTheDocument();
    expect(screen.queryByText("Floors / structure")).not.toBeInTheDocument();
    expect(screen.queryByText("Carpet area range (sqft)")).not.toBeInTheDocument();
    expect(screen.queryByText("No. of towers / blocks")).not.toBeInTheDocument();
    expect(screen.getByText("No. of sectors")).toBeInTheDocument();
    expect(screen.getByText("Number of plots")).toBeInTheDocument();
    expect(screen.getByText("Total land")).toBeInTheDocument();
    expect(screen.getByText(/Customise this project/)).toBeInTheDocument();
  });

  it("cluster: a required type field blocks Continue until it is filled", async () => {
    const user = userEvent.setup();
    render(<AddNewProjectPage />);
    await toStep2(user, "Plots");

    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByText("Number of plots is required.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Inventory & configuration/ })).toBeInTheDocument();
  });

  it("individual: no grouping at all", async () => {
    const user = userEvent.setup();
    render(<AddNewProjectPage />);
    await toStep2(user, "Farmhouses");

    expect(screen.queryByText(/No\. of/)).not.toBeInTheDocument();
    expect(screen.queryByText("Floors / structure")).not.toBeInTheDocument();
    expect(screen.queryByText(/Unit configurations/)).not.toBeInTheDocument();
  });
});
