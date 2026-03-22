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

export type ReportHeatmapPoint = {
  latitude: number;
  longitude: number;
  /** Optional ISO-8601 datetime string from reports.created_at. */
  time?: string;
};
//the dummy data till the database is properly set up
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
  }
];

const safeTownKey = (town: unknown) =>
  String(town ?? "")
    .trim()
    .toLowerCase();

const isValidCoordinate = (lat: number, lng: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180;

const toRadians = (deg: number) => (deg * Math.PI) / 180;

function distanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

/**
 * Aggregates SOS alerts by town and returns a single representative lat/lng per town
 * (mean coordinate) plus the total count.
 */
export function aggregateSosAlertsByTown(
  alerts?: SosAlert[] | null,
): SosTownAggregate[] {
  const input = Array.isArray(alerts) ? alerts : [];

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

  for (const a of input) {
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

/**
 * Clusters report points by geographic proximity and returns centroid averages.
 * Useful when you only have lat/lng and do not want town reverse-geocoding.
 */
export function aggregateReportsByProximity(
  reports?: ReportHeatmapPoint[] | null,
  radiusKm: number = 4,
): SosTownAggregate[] {
  if (radiusKm <= 0) {
    throw new Error("radiusKm must be greater than 0");
  }

  const input = Array.isArray(reports) ? reports : [];
  const clusters: Array<{
    sumLat: number;
    sumLng: number;
    count: number;
    lastTime: string;
  }> = [];

  for (const report of input) {
    if (!isValidCoordinate(report.latitude, report.longitude)) {
      continue;
    }

    const reportTime = report.time ?? "";
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < clusters.length; i += 1) {
      const cluster = clusters[i];
      const centerLat = cluster.sumLat / cluster.count;
      const centerLng = cluster.sumLng / cluster.count;
      const d = distanceKm(report.latitude, report.longitude, centerLat, centerLng);

      if (d <= radiusKm && d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    }

    if (bestIndex === -1) {
      clusters.push({
        sumLat: report.latitude,
        sumLng: report.longitude,
        count: 1,
        lastTime: reportTime,
      });
      continue;
    }

    const target = clusters[bestIndex];
    target.sumLat += report.latitude;
    target.sumLng += report.longitude;
    target.count += 1;
    if (reportTime > target.lastTime) {
      target.lastTime = reportTime;
    }
  }

  return clusters
    .map((cluster, index) => ({
      town: `Cluster ${index + 1}`,
      latitude: cluster.sumLat / cluster.count,
      longitude: cluster.sumLng / cluster.count,
      count: cluster.count,
      lastTime: cluster.lastTime,
    }))
    .sort((a, b) => b.count - a.count);
}