import { describe, expect, it } from "vitest";
import {
  allMissing,
  missingOn,
  projectRequirements,
  type ProjectRequiredValues,
} from "@/lib/project-validation";

// A fully valid project as far as the required-field rules go. Note there is
// deliberately no RERA number in it.
const VALID: ProjectRequiredValues = {
  name: "Palm Residency",
  projectType: "Apartments",
  currency: "INR",
  status: "active",
  priceMin: "6200000",
  address: "1 SG Highway",
  city: "Ahmedabad",
  managerId: "user-1",
};

describe("project required-field rules (Step 1)", () => {
  it("does not require a RERA registration number", () => {
    const ids = Object.values(projectRequirements(VALID))
      .flat()
      .map((f) => f.id);
    expect(ids).not.toContain("reraId");
    expect(allMissing(projectRequirements(VALID))).toEqual([]);
  });

  it("requires a status", () => {
    const step1 = missingOn(projectRequirements({ ...VALID, status: "" }), 0);
    expect(step1.map((f) => f.id)).toEqual(["status"]);
    expect(step1[0].label).toBe("Status");
  });

  it("still requires name, project type and currency on Step 1", () => {
    const step1 = missingOn(
      projectRequirements({ ...VALID, name: " ", projectType: "", currency: "" }),
      0,
    );
    expect(step1.map((f) => f.id).sort()).toEqual(["currency", "name", "projectType"]);
  });
});
