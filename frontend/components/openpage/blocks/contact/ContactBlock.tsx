"use client";

import type { BlockConfig } from "../types";
import { useOpenPageRuntime } from "@/components/openpage/runtime/OpenPageRuntime";
import { DynamicLeadForm } from "@/components/openpage/dynamic-lead-form";
import { findFormById, loadFormLibrary } from "@/lib/openpage/forms-store";
import { mergeFormLibraries } from "@/lib/openpage/resolve-form";

export function ContactBlock({ block }: { block: BlockConfig }) {
  const runtime = useOpenPageRuntime();
  const title = typeof block.props.title === "string" ? block.props.title : "Get in Touch";
  const subtitle = typeof block.props.subtitle === "string" ? block.props.subtitle : "";
  const formId = typeof block.props.formId === "string" ? block.props.formId : "";
  const library = typeof window !== "undefined" ? loadFormLibrary() : [];
  const forms = mergeFormLibraries(runtime.forms, library);
  const form = formId ? findFormById(formId, forms) : forms[0];

  return (
    <section className="px-6 @md:px-10 py-16 @md:py-20">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl @md:text-3xl font-bold tracking-tight mb-2">{title}</h2>
          {subtitle ? <p className="text-text-2 text-sm">{subtitle}</p> : null}
        </div>
        <div className="rounded-2xl border border-border-default bg-bg-2 p-6">
          {form ? (
            <DynamicLeadForm
              form={form}
              live={runtime.live}
              pageId={runtime.pageId}
              place="contact"
              projectName={runtime.projectName}
              projectId={runtime.projectId}
              unitId={runtime.unitId}
            />
          ) : (
            <p className="text-sm text-text-3 text-center">
              Attach a Form Builder form in Properties to collect leads here.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
