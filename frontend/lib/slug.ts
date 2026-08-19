// Client-side approximation of backend/src/common/utils/slug.util.ts.
// The backend is the source of truth and may append a numeric suffix on collision.
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "org";
}
