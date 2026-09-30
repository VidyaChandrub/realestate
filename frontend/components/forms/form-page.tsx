"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { PasswordInput } from "@/components/auth/password-input";
import styles from "./form-page.module.css";

// Presentational building blocks for the full-width create / edit form pages
// (org Users, Platform Team members and roles). No state or data handling
// lives here — each page keeps its own validation and submit logic.

export { styles as formPageStyles };

export function FormPage({
  eyebrow,
  title,
  subtitle,
  backHref,
  backLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <Link href={backHref} className={styles.back} aria-label={backLabel}>
            <Icon name="chevron-left" size={18} />
          </Link>
          <div>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className={styles.alert} role="alert">
      <Icon name="alert" size={16} />
      {message}
    </div>
  );
}

export function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export function FormSection({ title }: { title: string }) {
  return <div className={styles.section}>{title}</div>;
}

export function Field({
  htmlFor,
  label,
  icon,
  note,
  error,
  hint,
  hintId,
  children,
}: {
  htmlFor: string;
  label: string;
  icon: IconName;
  /** Muted text after the label, e.g. "(optional)". */
  note?: string;
  error?: string;
  hint?: React.ReactNode;
  hintId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={htmlFor} className={styles.label}>
        <span className={styles.labelIcon} aria-hidden="true">
          <Icon name={icon} size={16} />
        </span>
        <span>
          {label}
          {note ? <span className={styles.labelNote}> {note}</span> : null}
        </span>
      </label>
      {children}
      {error ? (
        <div className={styles.error} role="alert">
          <Icon name="alert" size={14} />
          <span>{error}</span>
        </div>
      ) : hint ? (
        <div className={styles.hint} id={hintId}>
          <Icon name="info" size={14} />
          <span>{hint}</span>
        </div>
      ) : null}
    </div>
  );
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> & {
  icon?: IconName;
  invalid?: boolean;
};

export function TextInput({ icon, invalid, ...props }: InputProps) {
  return (
    <div className={styles.control} data-invalid={invalid || undefined}>
      {icon ? (
        <span className={styles.lead} aria-hidden="true">
          <Icon name={icon} size={17} />
        </span>
      ) : null}
      <input {...props} aria-invalid={invalid || undefined} className={styles.input} />
    </div>
  );
}

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
  icon?: IconName;
  invalid?: boolean;
};

export function SelectInput({ icon, invalid, children, ...props }: SelectProps) {
  return (
    <div className={styles.control} data-invalid={invalid || undefined} data-disabled={props.disabled || undefined}>
      {icon ? (
        <span className={styles.lead} aria-hidden="true">
          <Icon name={icon} size={17} />
        </span>
      ) : null}
      <select {...props} aria-invalid={invalid || undefined} className={styles.select}>
        {children}
      </select>
      <span className={styles.chevron} aria-hidden="true">
        <Icon name="chevron-down" size={16} />
      </span>
    </div>
  );
}

type TextAreaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
  invalid?: boolean;
};

export function TextArea({ invalid, ...props }: TextAreaProps) {
  return (
    <div className={styles.control} data-invalid={invalid || undefined}>
      <textarea {...props} aria-invalid={invalid || undefined} className={styles.textarea} />
    </div>
  );
}

/** Mobile number input with a fixed dial-code prefix (from the Country field). */
export function PhoneInput({ prefix, invalid, ...props }: InputProps & { prefix: string }) {
  return (
    <div className={styles.control} data-invalid={invalid || undefined}>
      <span className={styles.prefix} aria-hidden="true">
        {prefix}
      </span>
      <input {...props} aria-invalid={invalid || undefined} className={styles.input} />
    </div>
  );
}

export function PasswordField({
  id,
  value,
  onChange,
  placeholder,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <div className={styles.control} data-invalid={invalid || undefined}>
      <span className={styles.lead} aria-hidden="true">
        <Icon name="key" size={17} />
      </span>
      <div className={styles.passwordSlot}>
        <PasswordInput
          id={id}
          className={styles.input}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="new-password"
        />
      </div>
    </div>
  );
}

export function FormActions({
  cancelHref,
  busy,
  submitDisabled,
  submitLabel,
  busyLabel,
  submitIcon = "check",
}: {
  cancelHref: string;
  busy: boolean;
  submitDisabled?: boolean;
  submitLabel: string;
  busyLabel: string;
  submitIcon?: IconName;
}) {
  return (
    <div className={styles.actions}>
      <Link
        href={cancelHref}
        className={styles.btn}
        aria-disabled={busy || undefined}
        onClick={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        Cancel
      </Link>
      <button type="submit" className={styles.btnPrimary} disabled={busy || submitDisabled}>
        <Icon name={submitIcon} size={16} />
        {busy ? busyLabel : submitLabel}
      </button>
    </div>
  );
}
