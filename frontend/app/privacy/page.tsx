import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/icons";

export const metadata: Metadata = {
  title: "Privacy Policy | iPixxel Realty",
  description: "How iPixxel Realty collects, uses and protects your information.",
};

// Placeholder copy — replace with the reviewed legal text before launch.
const LAST_UPDATED = "30 September 2026";
const CONTACT_EMAIL = "privacy@ipixxel.ae";

const SECTIONS: { id: string; title: string; body: React.ReactNode }[] = [
  {
    id: "information-we-collect",
    title: "1. Information we collect",
    body: (
      <>
        <p>We collect information you provide directly and information generated when you use the platform:</p>
        <ul>
          <li><strong>Account details</strong> — name, email address, phone number, role and organisation.</li>
          <li><strong>Business data</strong> — projects, units, leads, notes, uploaded media and landing page content you create.</li>
          <li><strong>Lead enquiries</strong> — details submitted by visitors through forms on websites built with iPixxel Realty.</li>
          <li><strong>Usage data</strong> — log data, device and browser type, IP address and pages visited.</li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "2. How we use your information",
    body: (
      <ul>
        <li>To provide, operate and maintain the platform and its features.</li>
        <li>To manage subscriptions, billing and account security.</li>
        <li>To send service notifications, such as invitations, password resets and subscription reminders.</li>
        <li>To analyse usage and improve performance and reliability.</li>
        <li>To comply with legal obligations and enforce our terms.</li>
      </ul>
    ),
  },
  {
    id: "sharing",
    title: "3. How we share information",
    body: (
      <>
        <p>We do not sell your personal information. We share it only:</p>
        <ul>
          <li>With service providers who host data, store files or deliver email on our behalf.</li>
          <li>Within your organisation, according to the roles and permissions your admin configures.</li>
          <li>When required by law, or to protect the rights and safety of our users and the platform.</li>
        </ul>
      </>
    ),
  },
  {
    id: "organisations",
    title: "4. Organisations and lead data",
    body: (
      <p>
        Organisations using iPixxel Realty control the lead and customer data they collect through their websites.
        For that data, the organisation is the data controller and we act as a processor. Please contact the
        relevant organisation directly for questions about how it handles your enquiry.
      </p>
    ),
  },
  {
    id: "retention",
    title: "5. Data retention",
    body: (
      <p>
        We keep information for as long as your account is active or as needed to provide the service. When an
        account is closed, we delete or anonymise data within a reasonable period, except where we must keep it
        for legal, tax or security reasons.
      </p>
    ),
  },
  {
    id: "security",
    title: "6. Security",
    body: (
      <p>
        We use industry-standard safeguards, including encrypted connections, hashed passwords and role-based
        access controls. No method of transmission or storage is completely secure, so we cannot guarantee
        absolute security.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "7. Cookies",
    body: (
      <p>
        We use essential cookies and local storage to keep you signed in and remember your preferences. Websites
        built on the platform may use additional analytics or tracking tools configured by their owners.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "8. Your rights",
    body: (
      <p>
        Depending on where you live, you may have the right to access, correct, delete or export your personal
        information, or to object to certain processing. To make a request, contact us using the details below.
      </p>
    ),
  },
  {
    id: "changes",
    title: "9. Changes to this policy",
    body: (
      <p>
        We may update this policy from time to time. When we make material changes, we will update the date at the
        top of this page and, where appropriate, notify you by email or in the app.
      </p>
    ),
  },
  {
    id: "contact",
    title: "10. Contact us",
    body: (
      <p>
        If you have questions about this policy, email us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <main className="flex-1 bg-slate-50 px-4 py-12 sm:px-6 sm:py-16 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/" className="mb-10 inline-flex items-center gap-2">
          <BrandMark size={28} />
          <span className="text-lg font-semibold text-slate-900 dark:text-white">iPixxel Realty</span>
        </Link>

        <header className="mb-8 border-b border-slate-200 pb-8 dark:border-slate-800">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Last updated: {LAST_UPDATED}</p>
          <p className="mt-6 text-base leading-7 text-slate-600 dark:text-slate-300">
            This Privacy Policy explains how iPixxel Realty (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses and
            protects information when you use our real estate platform, including the dashboard, CRM and websites
            built with it.
          </p>
        </header>

        <nav className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Contents</p>
          <ol className="grid gap-1.5 text-sm sm:grid-cols-2">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-white"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-8">
              <h2 className="mb-3 text-xl font-semibold text-slate-900 dark:text-white">{section.title}</h2>
              <div className="space-y-3 text-base leading-7 text-slate-600 dark:text-slate-300 [&_a]:font-medium [&_a]:text-slate-900 [&_a]:underline dark:[&_a]:text-white [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-slate-800 dark:[&_strong]:text-slate-100 [&_ul]:space-y-2">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-16 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          &copy; {new Date().getFullYear()} iPixxel Realty. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
