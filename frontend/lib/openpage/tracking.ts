const EVENTS_KEY = "prestate.tracking.events.v1";

export type TrackingCounts = {
  view: number;
  form: number;
  whatsapp: number;
  call: number;
  brochure: number;
};

const EMPTY: TrackingCounts = { view: 0, form: 0, whatsapp: 0, call: 0, brochure: 0 };

function allEvents(): Record<string, TrackingCounts> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, TrackingCounts>) : {};
  } catch {
    return {};
  }
}

export function bumpTracking(pageId: string, key: keyof TrackingCounts) {
  if (typeof window === "undefined" || !pageId) return;
  const all = allEvents();
  const cur = { ...EMPTY, ...all[pageId] };
  cur[key] += 1;
  all[pageId] = cur;
  try {
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(all));
  } catch {
    /* quota */
  }
  window.dispatchEvent(new CustomEvent("prestate:track", { detail: { pageId, key } }));
}
