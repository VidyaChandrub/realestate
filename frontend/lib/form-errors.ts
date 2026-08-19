import { ApiError } from "./api";

export interface FieldErrorResult {
  fieldErrors: Record<string, string>;
  general: string | null;
}

// Maps a failed apiFetch() call to per-field messages where possible, falling
// back to a general form error for anything that can't be attributed to a
// known field (e.g. NestJS ValidationPipe messages are "<field> must be ...",
// while other exceptions like ConflictException are a single plain string).
export function mapApiFieldErrors(
  err: unknown,
  fieldKeys: string[],
): FieldErrorResult {
  if (!(err instanceof ApiError)) {
    return {
      fieldErrors: {},
      general: err instanceof Error ? err.message : "Something went wrong.",
    };
  }

  const rawMessage = err.body?.message;
  const messages = Array.isArray(rawMessage)
    ? rawMessage
    : [rawMessage ?? err.message];

  const fieldErrors: Record<string, string> = {};
  const leftover: string[] = [];

  for (const message of messages) {
    const key = fieldKeys.find((k) => message.startsWith(`${k} `));
    if (key) {
      fieldErrors[key] ??= capitalize(message);
    } else {
      leftover.push(message);
    }
  }

  if (leftover.length && !fieldErrors.work_email && !fieldErrors.email) {
    const emailKey = fieldKeys.find((k) => k === "work_email" || k === "email");
    const emailMsgIndex = leftover.findIndex((m) => /email/i.test(m));
    if (emailKey && emailMsgIndex !== -1) {
      fieldErrors[emailKey] = capitalize(leftover[emailMsgIndex]);
      leftover.splice(emailMsgIndex, 1);
    }
  }

  return { fieldErrors, general: leftover.length ? leftover.join(" ") : null };
}

function capitalize(message: string): string {
  return message.charAt(0).toUpperCase() + message.slice(1);
}
