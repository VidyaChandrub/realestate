"use client";

import { useState } from "react";

interface PasswordInputProps {
  className?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  id?: string;
}

// Shared show/hide toggle for every password field in the auth flows
// (registration wizard, login, reset password) — plain markup to match how
// these pages already build inputs (no shared input/icon component in use
// here), so it drops straight into an existing `.field` wrapper in place of
// a raw `<input type="password">`.
export function PasswordInput({
  className = "inp",
  value,
  onChange,
  placeholder,
  autoComplete,
  id,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <input
        id={id}
        className={className}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{ paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 6,
          lineHeight: 1,
          fontSize: 15,
          color: "var(--muted)",
        }}
      >
        {visible ? "🙈" : "👁️"}
      </button>
    </div>
  );
}
