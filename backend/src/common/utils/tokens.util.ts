import { randomBytes, randomInt, createHash } from 'crypto';

const DURATION_UNITS_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

// Parses simple durations like "15m", "30d", "1h" into milliseconds.
export function parseDuration(value: string, fallbackMs = 30 * 86_400_000): number {
  const raw = (value ?? '').trim().toLowerCase();
  const match = /^(\d+)\s*(ms|s|m|h|d|min|mins|minutes|hr|hrs|hours|day|days|w|week|weeks)$/.exec(
    raw,
  );
  if (!match) {
    return fallbackMs;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const key =
    unit === 'min' || unit === 'mins' || unit === 'minutes'
      ? 'm'
      : unit === 'hr' || unit === 'hrs' || unit === 'hours'
        ? 'h'
        : unit === 'day' || unit === 'days'
          ? 'd'
          : unit === 'w' || unit === 'week' || unit === 'weeks'
            ? 'd'
            : unit;
  const factor = unit === 'w' || unit === 'week' || unit === 'weeks' ? 7 : 1;
  return amount * factor * (DURATION_UNITS_MS[key] ?? fallbackMs);
}

export function generateRandomToken(bytes = 64): string {
  return randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const TEMP_PASSWORD_CHARSET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';

export function generateNumericCode(digits = 6): string {
  const max = 10 ** digits;
  return randomInt(0, max).toString().padStart(digits, '0');
}

export function generateTempPassword(length = 12): string {
  const bytes = randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += TEMP_PASSWORD_CHARSET[bytes[i] % TEMP_PASSWORD_CHARSET.length];
  }
  return password;
}
