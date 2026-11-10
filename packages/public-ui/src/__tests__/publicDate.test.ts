import { describe, expect, it } from "vitest";
import { formatPublicCardDate, formatPublicYear } from "../publicDate";

describe("public date formatting", () => {
  it("uses Taiwan calendar dates across UTC midnight on both server and client", () => {
    expect(formatPublicCardDate("2026-10-30T16:51:00.000Z")).toEqual({
      label: "2026/10/31",
      time: "2026-10-30T16:51:00.000Z",
    });
  });

  it("uses the Taiwan year at the UTC year boundary", () => {
    expect(formatPublicYear(Date.parse("2024-12-31T16:00:00.000Z"))).toBe("2025");
  });

  it("omits missing or invalid card dates", () => {
    expect(formatPublicCardDate(null)).toEqual({});
    expect(formatPublicCardDate("not a date")).toEqual({});
  });
});
