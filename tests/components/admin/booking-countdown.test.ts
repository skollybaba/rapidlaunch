import { describe, expect, it } from "vitest";

import {
  format,
  formatCountdownTitle,
} from "@/components/admin/booking-countdown";

describe("booking countdown format", () => {
  it("labels elapsed bookings as started", () => {
    expect(format(0)).toBe("Started");
    expect(format(-42)).toBe("Started");
  });

  it("shows days, hours and minutes for long waits", () => {
    expect(format(2 * 86400 + 19 * 3600 + 48 * 60)).toBe("2d 19h 48m");
  });

  it("shows hours, minutes and seconds within a day", () => {
    expect(format(59 * 60 + 3)).toBe("59m 3s");
    expect(format(3 * 3600 + 5 * 60 + 7)).toBe("3h 5m 7s");
  });

  it("drops seconds once days are shown", () => {
    expect(format(86400 + 3600 + 61)).toBe("1d 1h 1m");
  });
});

describe("booking countdown title formatting", () => {
  it("is deterministic and locale-independent for the same instant", () => {
    const titles = [
      "2026-09-12T12:00:00.000Z",
      "2026-09-24T13:11:12.000Z",
      "2026-09-19T15:00:00.000+01:00",
    ].map(formatCountdownTitle);

    expect(titles[0]).toBe("12/09/2026, 12:00:00");
    expect(titles[1]).toBe("24/09/2026, 13:11:12");
    expect(titles[2]).toBe("19/09/2026, 14:00:00");
  });

  it("renderers UTC even when the host timezone is not UTC", () => {
    const prev = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      expect(formatCountdownTitle("2026-09-12T12:00:00.000Z")).toBe(
        "12/09/2026, 12:00:00"
      );
    } finally {
      if (prev === undefined) delete process.env.TZ;
      else process.env.TZ = prev;
    }
  });

  it("falls back to the raw input when the date is invalid", () => {
    expect(formatCountdownTitle("not-a-date")).toBe("not-a-date");
    expect(formatCountdownTitle("")).toBe("");
  });
});