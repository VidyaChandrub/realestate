const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isLikelyUuid = (value: string): boolean => UUID_PATTERN.test(String(value).trim());

export const safeDisplayValue = (value: unknown): string => {
  if (value == null) return "";
  const text = String(value).trim();
  if (!text || isLikelyUuid(text)) return "";
  return text;
};

export function getHighestQualifications(
  user: any,
  eduMap: Map<string, string>,
  format: "table" | "csv" = "table"
): string {
  const educationList = Array.isArray(user?.education) ? user.education : [];

  const qualifications = educationList
    .map((e: any) => {
      if (e?.highestQualificationId == null) return "";
      return safeDisplayValue(eduMap.get(String(e.highestQualificationId)));
    })
    .filter(Boolean);

  const seen = new Set<string>();
  const uniqueQualifications = qualifications.filter((q: string) => {
    if (seen.has(q)) return false;
    seen.add(q);
    return true;
  });

  if (uniqueQualifications.length > 0) {
    return uniqueQualifications.join(", ");
  }

  // Fallback to user.highestQualificationId
  if (user?.highestQualificationId) {
    const fallbackValue = safeDisplayValue(eduMap.get(String(user.highestQualificationId)));
    if (fallbackValue) {
      return fallbackValue;
    }
  }

  return format === "csv" ? "" : "N/A";
}

export function getYearsOfPassing(
  user: any,
  format: "table" | "csv" = "table"
): string {
  const educationList = Array.isArray(user?.education) ? user.education : [];

  const years = educationList
    .map((e: any) => {
      if (e?.yearOfPassing == null) return "";
      return safeDisplayValue(e.yearOfPassing);
    })
    .filter(Boolean);

  const seen = new Set<string>();
  const uniqueYears = years.filter((y: string) => {
    if (seen.has(y)) return false;
    seen.add(y);
    return true;
  });

  if (uniqueYears.length > 0) {
    return uniqueYears.join(", ");
  }

  return format === "csv" ? "" : "N/A";
}
