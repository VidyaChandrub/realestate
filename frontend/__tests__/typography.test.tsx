import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Canvas } from "@/components/prestate/builder/canvas";
import type { SectionInstance } from "@/lib/prestate/types";

function sec(over: Partial<SectionInstance>): SectionInstance {
  return {
    id: "s1",
    type: "pricing",
    label: "Pricing",
    icon: "Wallet",
    settings: {
      eyebrow: "",
      heading: "ManualTypography",
      text: "body copy",
      plans: [{ name: "3 BHK", area: "a", price: "₹1", per: "", features: [], cta: "Go" }],
    },
    style: { colors: {}, typography: {}, spacing: {}, layout: {}, responsive: {} },
    ...over,
  };
}

function styleOf(text: string, tag = "h2"): CSSStyleDeclaration | null {
  const el = document.querySelectorAll(tag);
  for (const e of el) if (e.textContent === text) return (e as HTMLElement).style;
  return null;
}

const FULL_TYPO = {
  fontFamily: "Lora",
  fontSize: 42,
  fontWeight: 300,
  lineHeight: 2,
  letterSpacing: 5,
  textTransform: "uppercase",
  textColor: "#ff0000",
};

describe("manual typography controls reach the canvas", () => {
  it("applies all seven overrides on a pricing widget heading", () => {
    const s = sec({ style: { colors: {}, typography: FULL_TYPO, spacing: {}, layout: {}, responsive: {} } });
    const { container } = render(
      <Canvas sections={[s]} selectedId={null} device="desktop" onSelect={() => {}} onMutate={() => {}} />,
    );
    const el = container.querySelector("h2");
    expect(el).not.toBeNull();
    expect(el!.textContent).toContain("ManualTypography");
    const st = (el as HTMLElement).style;
    expect(st.fontFamily).toContain("Lora");
    expect(st.fontSize).toBe("42px");
    expect(st.fontWeight).toBe("300");
    expect(st.lineHeight).toBe("2");
    expect(st.letterSpacing).toBe("5px");
    expect(st.textTransform).toBe("uppercase");
    expect(st.color).toBe("rgb(255, 0, 0)");
  });

  it("heading widget honours overrides over global tokens", () => {
    const s = sec({
      type: "heading",
      settings: { text: "HeadlineHere", tag: "h2", align: "center" },
      style: { colors: {}, typography: { fontSize: 64, textColor: "#123456" }, spacing: {}, layout: {}, responsive: {} },
    });
    const { container } = render(
      <Canvas sections={[s]} selectedId={null} device="desktop" onSelect={() => {}} onMutate={() => {}} />,
    );
    const h = container.querySelector("h2") as HTMLElement;
    expect(h.style.fontSize).toBe("64px");
    expect(h.style.color).toBe("rgb(18, 52, 86)");
  });

  it("mobile-only font size override is used exactly (not re-scaled)", () => {
    const s = sec({
      settings: { heading: "MobileSize", text: "" },
      style: {
        colors: {},
        typography: {},
        spacing: {},
        layout: {},
        responsive: { mobile: { typography: { fontSize: 20 } } },
      },
    });
    const { container } = render(
      <Canvas sections={[s]} selectedId={null} device="mobile" onSelect={() => {}} onMutate={() => {}} />,
    );
    const el = container.querySelector("h2") as HTMLElement;
    expect(el.textContent).toContain("MobileSize");
    expect(el.style.fontSize).toBe("20px");
  });

  it("unset typography keeps designed defaults (no accidental overrides)", () => {
    const s = sec({});
    const { container } = render(
      <Canvas sections={[s]} selectedId={null} device="desktop" onSelect={() => {}} onMutate={() => {}} />,
    );
    const el = container.querySelector("h2") as HTMLElement;
    // Designed default stays (pricing headings are 34px by design)…
    expect(el.style.fontSize).toBe("34px");
    // …and no manual colour leaks in.
    expect(el.style.color).toBe("");
  });

  it("typography set on a parent section cascades to children without their own", () => {
    const s = sec({
      type: "section",
      label: "Plain section",
      settings: { title: "", text: "" },
      style: {
        colors: {},
        typography: { fontFamily: "Lora", lineHeight: 2.2 },
        spacing: {},
        layout: {},
        responsive: {},
      },
    });
    const { container } = render(
      <Canvas sections={[s]} selectedId={null} device="desktop" onSelect={() => {}} onMutate={() => {}} />,
    );
    // sectionStyle lands on the styled band inside the section holder.
    const wrap = Array.from(container.querySelectorAll('[data-sec-id="s1"] *')).find(
      (e) => (e as HTMLElement).style.fontFamily.includes("Lora"),
    ) as HTMLElement | undefined;
    expect(wrap).toBeDefined();
    expect(wrap!.style.lineHeight).toBe("2.2");
  });

  const brand = {
    name: "Brand",
    tagline: "t",
    email: "b@b.co",
    phone: "+911234567890",
    primary: "#6D5DFC",
    accent: "#CDA45E",
    logo: "",
    headingFont: "Inter",
    bodyFont: "Inter",
    facebook: "",
    instagram: "",
    twitter: "",
    youtube: "",
    linkedin: "",
  } as never;

  it("header chrome honours font size / weight / colour from Style tab", () => {
    const header = {
      design: "classic" as const,
      menuLinks: [{ label: "Home", href: "#" }],
      menu: ["Home"],
      settings: {},
      style: {
        colors: {},
        typography: { fontSize: 40, fontWeight: 300, textColor: "#ff00ff" },
        spacing: {},
        layout: {},
        responsive: {},
      },
    };
    const footer = { design: "columns" as const, settings: {}, style: { colors: {}, typography: {}, spacing: {}, layout: {}, responsive: {} } };
    const { container } = render(
      <Canvas
        sections={[]}
        selectedId={null}
        device="desktop"
        onSelect={() => {}}
        onMutate={() => {}}
        chrome={{ header: header as never, footer: footer as never, brand }}
      />,
    );
    const styled = Array.from(container.querySelectorAll("*")).find((e) => (e as HTMLElement).style.fontSize === "40px") as HTMLElement | undefined;
    expect(styled).toBeDefined();
    expect(styled!.style.fontWeight).toBe("300");
    expect(styled!.style.color).toBe("rgb(255, 0, 255)");
  });

  it("text widget honours font family and colour overrides", () => {
    const s = sec({
      type: "text",
      settings: { html: "<p>RichText</p>" },
      style: { colors: {}, typography: { fontFamily: "Poppins", fontSize: 19, textColor: "#00aa00" }, spacing: {}, layout: {}, responsive: {} },
    });
    const { container } = render(
      <Canvas sections={[s]} selectedId={null} device="desktop" onSelect={() => {}} onMutate={() => {}} />,
    );
    const el = Array.from(container.querySelectorAll(".ps-rich")).find((e) => e.textContent === "RichText") as HTMLElement | undefined;
    expect(el).toBeDefined();
    expect(el!.style.fontFamily).toContain("Poppins");
    expect(el!.style.fontSize).toBe("19px");
    expect(el!.style.color).toBe("rgb(0, 170, 0)");
  });
});
