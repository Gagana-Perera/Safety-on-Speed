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
  // High density cluster
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
    latitude: 6.9147,
    longitude: 79.8489,
    town: "Colombo",
    type: "119",
    time: "2026-03-19T08:27:00.000Z",
  },
  {
    latitude: 6.9062,
    longitude: 79.873,
    town: "Colombo",
    type: "1990",
    time: "2026-03-19T08:33:00.000Z",
  },
  {
    latitude: 6.8999,
    longitude: 79.8577,
    town: "Colombo",
    type: "118",
    time: "2026-03-19T08:41:00.000Z",
  },

  // Medium density cluster
  {
    latitude: 6.9623,
    longitude: 79.899,
    town: "Kelaniya",
    type: "119",
    time: "2026-03-19T09:10:00.000Z",
  },
  {
    latitude: 6.9557,
    longitude: 79.9132,
    town: "Kelaniya",
    type: "119",
    time: "2026-03-19T09:18:00.000Z",
  },
  {
    latitude: 6.9714,
    longitude: 79.9025,
    town: "Kelaniya",
    type: "1990",
    time: "2026-03-19T09:24:00.000Z",
  },

  // Medium density cluster
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
    latitude: 6.7222,
    longitude: 79.9049,
    town: "Panadura",
    type: "118",
    time: "2026-03-19T10:11:00.000Z",
  },

  // Low density points
  {
    latitude: 7.29,
    longitude: 80.6337,
    town: "Kandy",
    type: "119",
    time: "2026-03-19T07:40:00.000Z",
  },
  {
    latitude: 6.9274,
    longitude: 79.8616,
    town: "Borella",
    type: "1990",
    time: "2026-03-19T10:45:00.000Z",
  },
  {
    latitude: 6.0535,
    longitude: 80.221,
    town: "Galle",
    type: "119",
    time: "2026-03-19T11:20:00.000Z",
  },
  {
    latitude: 7.4863,
    longitude: 80.3647,
    town: "Kurunegala",
    type: "118",
    time: "2026-03-19T12:05:00.000Z",
  },
  {
    latitude: 7.9403,
    longitude: 81.0188,
    town: "Dambulla",
    type: "119",
    time: "2026-03-19T12:34:00.000Z",
  },
  {
    latitude: 8.5874,
    longitude: 81.2152,
    town: "Trincomalee",
    type: "1990",
    time: "2026-03-19T13:12:00.000Z",
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
