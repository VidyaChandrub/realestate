// Order-sensitive for arrays (section order is real content), order-
// insensitive for object keys — Postgres JSONB round-trips and client-side
// (re)serialization can legitimately reorder an object's keys for
// identical data, and a naive JSON.stringify comparison would false-positive
// on that alone, which is exactly the failure mode we can't afford here
// (see OrgLandingPagesService.update — a false "changed" reverts an
// approved/published page to draft on every save, unprovoked).
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (key) => Object.prototype.hasOwnProperty.call(bObj, key) && deepEqual(aObj[key], bObj[key]),
  );
}
