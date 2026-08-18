export const INDIAN_MOBILE_NUMBER_LENGTH = 10;

export function sanitizeIndianMobileNumber(
  value: string | null | undefined,
): string {
  return (value ?? "").replace(/\D/g, "").slice(0, INDIAN_MOBILE_NUMBER_LENGTH);
}

export function getIndianMobileNumberError(
  value: string | null | undefined,
): string {
  const mobileNumber = value ?? "";

  if (!mobileNumber.trim()) {
    return "Please specify mobile number.";
  }

  if (
    !/^\d+$/.test(mobileNumber) ||
    mobileNumber.length !== INDIAN_MOBILE_NUMBER_LENGTH
  ) {
    return "Mobile number must be 10 digits.";
  }

  return "";
}

export function formatIndianMobileNumber(
  value: string | null | undefined,
): string {
  const mobileNumber = sanitizeIndianMobileNumber(value);

  return mobileNumber ? `+91 ${mobileNumber}` : "";
}
