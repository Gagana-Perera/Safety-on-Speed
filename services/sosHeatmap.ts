export type SosAlert = {
  latitude: number;
  longitude: number;
  town: string;
  type: string;
  /** ISO-8601 datetime string */
  time: string;
};

export type SosTownAggregate = {
  town: string;
  latitude: number;
  longitude: number;
  count: number;
  /** Most recent alert time in this town (ISO string). */
  lastTime: string;
};

/**
 * Dummy SOS alert events.
 *
 * Replace this with DB data later (same shape).
 */
export const dummySosAlerts: SosAlert[] = [
  {
    latitude: 6.933,
    longitude: 79.85,
    town: "Colombo",
    type: "119",
    time: "2026-03-19T08:05:00.000Z",
  },
  {
    latitude: 6.9271,
    longitude: 79.8612,
    town: "Colombo",
    type: "119",
    time: "2026-03-19T08:20:00.000Z",
  },
  {
    latitude: 6.9623,
    longitude: 79.899,
    town: "Kelaniya",
    type: "119",
    time: "2026-03-19T09:10:00.000Z",
  },
  {
    latitude: 6.717,
    longitude: 79.908,
    town: "Panadura",
    type: "119",
    time: "2026-03-19T10:02:00.000Z",
  },
  {
    latitude: 6.7056,
    longitude: 79.907,
    town: "Panadura",
    type: "119",
    time: "2026-03-19T10:06:00.000Z",
  },
  {
    latitude: 7.29,
    longitude: 80.6337,
    town: "Kandy",
    type: "119",
    time: "2026-03-19T07:40:00.000Z",
  },
];

const safeTownKey = (town: unknown) =>
  String(town ?? "")
    .trim()
    .toLowerCase();

/**
 * Aggregates SOS alerts by town and returns a single representative lat/lng per town
 * (mean coordinate) plus the total count.
 */
export function aggregateSosAlertsByTown(
  alerts: SosAlert[],
): SosTownAggregate[] {
  const byTown = new Map<
    string,
    {
      town: string;
      sumLat: number;
      sumLng: number;
      count: number;
      lastTime: string;
    }
  >();

  for (const a of alerts) {
    const key = safeTownKey(a.town);
    if (!key) continue;

    const existing = byTown.get(key);
    const lastTime =
      existing && existing.lastTime > a.time ? existing.lastTime : a.time;

    if (!existing) {
      byTown.set(key, {
        town: a.town,
        sumLat: a.latitude,
        sumLng: a.longitude,
        count: 1,
        lastTime,
      });
      continue;
    }

    existing.sumLat += a.latitude;
    existing.sumLng += a.longitude;
    existing.count += 1;
    existing.lastTime = lastTime;
  }

  return [...byTown.values()]
    .map((t) => ({
      town: t.town,
      latitude: t.sumLat / t.count,
      longitude: t.sumLng / t.count,
      count: t.count,
      lastTime: t.lastTime,
    }))
    .sort((a, b) => b.count - a.count);
}
