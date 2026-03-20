import { aggregateSosAlertsByTown } from "../services/sosHeatmap";

describe("aggregateSosAlertsByTown", () => {
  it("groups by town and counts correctly", () => {
    const out = aggregateSosAlertsByTown([
      {
        latitude: 1,
        longitude: 2,
        town: "Colombo",
        type: "119",
        time: "2026-03-19T00:00:00.000Z",
      },
      {
        latitude: 3,
        longitude: 4,
        town: "Colombo",
        type: "119",
        time: "2026-03-19T01:00:00.000Z",
      },
      {
        latitude: 9,
        longitude: 10,
        town: "Kandy",
        type: "119",
        time: "2026-03-19T02:00:00.000Z",
      },
    ]);

    expect(out).toHaveLength(2);

    const colombo = out.find((x) => x.town === "Colombo");
    expect(colombo?.count).toBe(2);
    expect(colombo?.latitude).toBe(2);
    expect(colombo?.longitude).toBe(3);
    expect(colombo?.lastTime).toBe("2026-03-19T01:00:00.000Z");

    const kandy = out.find((x) => x.town === "Kandy");
    expect(kandy?.count).toBe(1);
  });

  it("ignores empty town values", () => {
    const out = aggregateSosAlertsByTown([
      {
        latitude: 1,
        longitude: 2,
        town: " ",
        type: "119",
        time: "2026-03-19T00:00:00.000Z",
      },
    ]);
    expect(out).toHaveLength(0);
  });
});
