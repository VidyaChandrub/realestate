"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { dashboardPathFor } from "@/lib/mock/sessions";
import { mapApiFieldErrors } from "@/lib/form-errors";
import { slugify } from "@/lib/slug";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Icon } from "@/components/icons";
import type { Plan } from "@/lib/types";
import { COUNTRY_META, COUNTRIES } from "@/lib/countries";

const FIELD_KEYS = [
  "first_name",
  "last_name",
  "company_name",
  "work_email",
  "phone_number",
  "city",
  "country",
  "password",
];

const STEPS = [
  { n: 1, label: "Account" },
  { n: 2, label: "Package" },
  { n: 3, label: "Templates" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    work_email: "",
    phone_number: "",
    city: "",
    country: "",
    password: "",
  });
  const [currency, setCurrency] = useState("");
  const [timezone, setTimezone] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // package & template selection
  const [plans, setPlans] = useState<Plan[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [previewTpl, setPreviewTpl] = useState<any | null>(null);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    };
  }

  function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const country = e.target.value;
    setForm((prev) => ({ ...prev, country }));
    setFieldErrors((prev) => ({ ...prev, country: "" }));
    const meta = COUNTRY_META[country];
    setCurrency(meta?.currencyLabel ?? "");
    setTimezone(meta?.timezone ?? "");
  }

  const [pendingOrg, setPendingOrg] = useState<{ name: string; email: string } | null>(null);

  // fetch plans & templates for registration (public)
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<Plan[]>("/plans");
        setPlans(Array.isArray(data) ? data : []);
      } catch {}
      finally { setLoadingPlans(false); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedPlanId) { setTemplates([]); setSelectedTemplateIds([]); return; }
    (async () => {
      setLoadingTemplates(true);
      try {
        const data = await apiFetch<any[]>("/templates");
        const list = Array.isArray(data) ? data : (data as any).data ?? [];
        setTemplates(list);
      } catch { setTemplates([]); }
      finally { setLoadingTemplates(false); }
    })();
  }, [selectedPlanId]);

  const selectedPlan = plans.find(p=>p.id===selectedPlanId) ?? null;
  const maxTemplates = (()=>{
    if(!selectedPlan) return 0;
    const raw=(selectedPlan.limits as any)?.templates;
    if(!raw || raw==="All"||raw==="Unlimited") return Infinity;
    const n=parseInt(String(raw),10); return Number.isNaN(n)?Infinity:n;
  })();

  const toggleTemplate = (id:string)=>{
    if(selectedTemplateIds.includes(id)) setSelectedTemplateIds(prev=>prev.filter(x=>x!==id));
    else {
      if(selectedTemplateIds.length>=maxTemplates) return;
      setSelectedTemplateIds(prev=>[...prev,id]);
    }
  };

  function validateStep(n:number): boolean {
    setGeneralError(null);
    if (n===1) {
      const required: (keyof typeof form)[] = ["first_name","last_name","company_name","work_email","phone_number","city","country","password"];
      for (const k of required) {
        if (!form[k]?.trim()) { setGeneralError(`${k.replace(/_/g," ")} is required`); return false; }
      }
      if (form.password.length < 8) { setGeneralError("Password must be at least 8 characters"); return false; }
      return true;
    }
    if (n===2) {
      if (!selectedPlanId) { setGeneralError("Please select a package"); return false; }
      return true;
    }
    if (n===3) {
      if (selectedTemplateIds.length===0) { setGeneralError(maxTemplates===Infinity ? "Select at least 1 template" : `Select 1-${maxTemplates} template(s) for ${selectedPlan?.name}`); return false; }
      if (selectedTemplateIds.length>maxTemplates) { setGeneralError(`Plan "${selectedPlan?.name}" allows max ${maxTemplates} template(s)`); return false; }
      if (!agreedToTerms) { setGeneralError("You must agree to the Terms of Service & Privacy Policy."); return false; }
      return true;
    }
    return true;
  }

  function nextStep() {
    if (!validateStep(step)) return;
    setGeneralError(null);
    setStep(s=> Math.min(3, s+1));
  }
  function prevStep() { setGeneralError(null); setStep(s=> Math.max(1, s-1)); }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateStep(3)) return;
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const payload:any = {
        ...form,
        currency: COUNTRY_META[form.country]?.currency ?? "",
        timezone,
        planId: selectedPlanId,
        billingCycle,
        templateIds: selectedTemplateIds,
      };
      const session: any = await signup(payload);
      if (session?.pending) {
        setPendingOrg({ name: form.company_name, email: form.work_email });
        return;
      }
      router.push(dashboardPathFor(session.role));
      router.refresh();
    } catch (err) {
      const { fieldErrors: fe, general } = mapApiFieldErrors(err, FIELD_KEYS);
      setFieldErrors(fe);
      setGeneralError(general);
      // if field error, go to step 1
      if (Object.keys(fe).length) setStep(1);
    } finally {
      setIsSubmitting(false);
    }
  }

  const subdomain = slugify(form.company_name);

  if (pendingOrg) {
    return (
      <div>
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <Icon name="alert" size={24} />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Pending approval
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Your organisation <b className="text-slate-800 dark:text-white">{pendingOrg.name}</b> has been created and is awaiting super admin approval.
          </p>
        </div>
        <div className="flex flex-col gap-4 rounded-2xl border border-amber-100 bg-amber-50 p-6 text-sm leading-relaxed text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-200">
          <p>
            We&apos;ve received your registration for <b>{pendingOrg.email}</b>. A super admin will review and approve your organisation. You&apos;ll be able to sign in after approval.
          </p>
          <ul className="list-disc pl-5">
            <li>Selected package: <b>{selectedPlan?.name ?? "—"}</b> ({billingCycle}) with {selectedTemplateIds.length} template(s)</li>
            <li>Approval usually takes a few minutes to a few hours</li>
            <li>You&apos;ll receive an email once activated (stub logged on server)</li>
          </ul>
        </div>
        <div className="mt-6 flex gap-3">
          <Link href="/login" className="flex-1">
            <Button size="lg" className="w-full">
              Go to sign in
            </Button>
          </Link>
          <button onClick={() => setPendingOrg(null)} className="btn btn-ghost">
            Register another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg">
          <Icon name="building" size={24} />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Create your organisation
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Step {step} of 3 — {step===1?"Account":step===2?"Choose package":"Select templates"}
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {STEPS.map(s=>(
          <div key={s.n} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${step===s.n?"bg-indigo-600 text-white": step> s.n?"bg-green-600 text-white":"bg-slate-200 text-slate-500"}`}>{step> s.n?<Icon name="check" size={12} />:s.n}</div>
            <span className={`text-xs font-semibold ${step===s.n?"text-slate-900 dark:text-white": step> s.n?"text-green-600":"text-slate-400"}`}>{s.label}</span>
            {s.n<3? <div className={`mx-2 h-0.5 w-8 ${step> s.n?"bg-green-600":"bg-slate-200"}`} /> : null}
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        {step===1 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" error={fieldErrors.first_name}>
                <Input required placeholder="Rohan" value={form.first_name} onChange={update("first_name")} autoComplete="given-name" />
              </Field>
              <Field label="Last name" error={fieldErrors.last_name}>
                <Input required placeholder="Shah" value={form.last_name} onChange={update("last_name")} autoComplete="family-name" />
              </Field>
            </div>
            <Field label="Company / Developer name" error={fieldErrors.company_name} hint={form.company_name ? undefined : "Your workspace will live at a subdomain based on this name."}>
              <Input required placeholder="Skyline Developers" value={form.company_name} onChange={update("company_name")} />
              {form.company_name && !fieldErrors.company_name ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Your workspace will live at <span className="font-semibold text-slate-700 dark:text-slate-200">{subdomain}</span>.ipixxel.in
                </p>
              ) : null}
            </Field>
            <Field label="Work email" error={fieldErrors.work_email}>
              <Input type="email" required placeholder="admin@skylinedev.com" value={form.work_email} onChange={update("work_email")} autoComplete="email" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone" error={fieldErrors.phone_number}>
                <Input required placeholder="+91 98250 41200" value={form.phone_number} onChange={update("phone_number")} autoComplete="tel" />
              </Field>
              <Field label="City" error={fieldErrors.city}>
                <Input required placeholder="Ahmedabad" value={form.city} onChange={update("city")} autoComplete="address-level2" />
              </Field>
            </div>
            <Field label="Country" error={fieldErrors.country}>
              <Select required value={form.country} onChange={handleCountryChange}>
                <option value="">Select country…</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            {form.country ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Currency" hint="Auto-set from country — cannot be changed here">
                  <Input value={currency} disabled readOnly />
                </Field>
                <Field label="Timezone" hint="Auto-set from country — cannot be changed here">
                  <Input value={timezone} disabled readOnly />
                </Field>
              </div>
            ) : null}
            <Field label="Password" error={fieldErrors.password}>
              <Input type="password" required minLength={8} placeholder="••••••••••" value={form.password} onChange={update("password")} autoComplete="new-password" />
            </Field>
          </>
        ) : null}

        {step===2 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-900 dark:text-white">Choose package * <span className="text-xs font-normal text-slate-500">— what we are giving</span></label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Billing:</span>
                <div className="flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-700">
                  {(["monthly","yearly"] as const).map(c=>(
                    <button key={c} type="button" onClick={()=>setBillingCycle(c)} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${billingCycle===c?"bg-slate-900 text-white dark:bg-white dark:text-slate-900":"text-slate-500"}`}>{c}</button>
                  ))}
                </div>
              </div>
            </div>
            {loadingPlans ? <p className="text-sm text-slate-500">Loading packages…</p> : (
              <div className="grid gap-3 sm:grid-cols-1">
                {plans.map(p=>{
                  const isSel = selectedPlanId===p.id;
                  const price = billingCycle==="monthly"? p.priceMonthly : p.priceYearly;
                  const per = billingCycle==="monthly"? "/mo" : "/yr";
                  const tplLimit = (p.limits as any)?.templates ?? "—";
                  return (
                    <div key={p.id} onClick={()=> setSelectedPlanId(p.id)} className={`cursor-pointer rounded-xl border-2 p-4 ${isSel?"border-indigo-600 bg-indigo-50 dark:bg-indigo-950/20":"border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"} ${p.isPopular?"ring-1 ring-indigo-100":""}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`badge ${p.badge}`}>{p.name}</span>
                          {p.isPopular? <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">POPULAR</span>:null}
                          <span className="text-2xl font-extrabold">₹{price.toLocaleString("en-IN")}<span className="text-xs font-medium text-slate-500">{per}</span></span>
                        </div>
                        <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] ${isSel?"border-indigo-600 bg-indigo-600 text-white":"border-slate-300"}`}>{isSel?<Icon name="check" size={10} />:""}</span>
                      </div>
                      <div className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">{p.description}</div>
                      <ul className="mt-2 grid gap-1 text-xs text-slate-600 dark:text-slate-400">
                        {p.features.slice(0,6).map(f=> <li key={f} className="flex gap-2"><span className="text-green-600"><Icon name="check" size={12} /></span>{f}</li>)}
                      </ul>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white dark:bg-white dark:text-slate-900">{tplLimit} templates</span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200">{p.limits?.projects} projects</span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200">{p.limits?.users} users</span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200">All features included</span>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">Color {p.color} · Badge {p.badge}</div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-slate-500">Starter = 1 template • Pro = 2 templates • Pro Max = All templates</p>
          </div>
        ) : null}

        {step===3 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-900 dark:text-white">Select templates * <span className="font-normal text-slate-500">— as per {selectedPlan?.name ?? "package"} limit ({selectedTemplateIds.length}/{maxTemplates===Infinity?"All":maxTemplates})</span></label>
              <span className="chip">{selectedTemplateIds.length} selected</span>
            </div>
            <p className="text-xs text-slate-500">Selected package <b>{selectedPlan?.name}</b> allows <b>{maxTemplates===Infinity?"All":maxTemplates}</b> template(s). Pick from all available templates below.</p>
            {loadingTemplates ? <p className="text-sm text-slate-500">Loading templates…</p> : templates.length===0 ? <p className="text-sm text-slate-500">No templates available.</p> : (
              <div className="grid gap-3 sm:grid-cols-2 max-h-72 overflow-auto p-1">
                {templates.map((tpl:any)=>{
                  const id=tpl.id;
                  const sel=selectedTemplateIds.includes(id);
                  const dis=!sel && selectedTemplateIds.length>=maxTemplates;
                  return (
                    <div key={id} onClick={()=> !dis && toggleTemplate(id)} className={`cursor-pointer overflow-hidden rounded-xl border-2 ${sel?"border-indigo-600":"border-slate-200 dark:border-slate-700"} ${dis?"opacity-40":""} relative`}>
                      <div className="h-24 bg-slate-100 dark:bg-slate-800" style={tpl.thumbnail? { background: `url(${tpl.thumbnail}) center/cover` }:undefined}>
                        <span className={`m-2 inline-block rounded-full px-2 py-1 text-[10px] font-bold text-white ${sel?"bg-indigo-600":"bg-black/60"}`}>{sel?<><Icon name="check" size={10} /> Selected</>: dis?"Max reached":"Select"}</span>
                        <button type="button" onClick={(e)=>{ e.stopPropagation(); setPreviewTpl(tpl); }} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-slate-700 shadow hover:bg-white" title="Preview">
                          <Icon name="eye" size={14} />
                        </button>
                      </div>
                      <div className="p-2">
                        <div className="text-xs font-bold">{tpl.name}</div>
                        <div className="text-[11px] text-slate-500">{tpl.slug} · {tpl.category || ""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {previewTpl ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={()=>setPreviewTpl(null)}>
                <div onClick={e=>e.stopPropagation()} className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
                  <div className="relative h-64 bg-slate-100 dark:bg-slate-800" style={previewTpl.thumbnail? { background: `url(${previewTpl.thumbnail}) center/cover` }:undefined}>
                    <button type="button" onClick={()=>setPreviewTpl(null)} className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/80">
                      <Icon name="close" size={16} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                      <div className="text-lg font-bold">{previewTpl.name}</div>
                      <div className="text-xs opacity-80">{previewTpl.slug} · {previewTpl.category || "No category"} · {previewTpl.template || previewTpl.baseDesignName || ""}</div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-2 text-sm font-semibold">Template Preview</div>
                    {previewTpl.thumbnail ? <img src={previewTpl.thumbnail} alt={previewTpl.name} className="h-auto w-full rounded-lg border" /> : <p className="text-sm text-slate-500">No thumbnail available</p>}
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={()=>{ if(!selectedTemplateIds.includes(previewTpl.id) && selectedTemplateIds.length<maxTemplates){ toggleTemplate(previewTpl.id); } setPreviewTpl(null); }} className={`rounded-full px-4 py-1.5 text-xs font-bold ${selectedTemplateIds.includes(previewTpl.id)?"bg-green-600 text-white":"bg-indigo-600 text-white"}`}>
                        {selectedTemplateIds.includes(previewTpl.id)?<><Icon name="check" size={12} /> Selected</>:"Select this template"}
                      </button>
                      <button type="button" onClick={()=>setPreviewTpl(null)} className="rounded-full border px-4 py-1.5 text-xs font-semibold">Close</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            <label className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400">
              <input type="checkbox" required checked={agreedToTerms} onChange={(e)=>{ setAgreedToTerms(e.target.checked); setGeneralError(null); }} className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800" />
              I agree to the Terms of Service &amp; Privacy Policy
            </label>
          </div>
        ) : null}

        {generalError ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {generalError}
          </p>
        ) : null}

        <div className="flex gap-3">
          {step>1 ? <Button type="button" variant="ghost" onClick={prevStep} className="flex-1">← Back</Button> : <div className="flex-1" />}
          {step<3 ? <Button type="button" onClick={nextStep} className="flex-1">Next →</Button> : (
            <Button type="submit" size="lg" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Creating your workspace…" : "Create organisation → Pending approval"}
            </Button>
          )}
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Sign in
        </Link>
      </p>
    </div>
  );
}
