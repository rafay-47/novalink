import { describe, it, expect } from "vitest";
import {
  getDateRangeBounds,
  formatDateForInput,
  parseDateInput,
  TimeframeRange,
} from "@/lib/date-ranges";

describe("Date Ranges Utility (lib/date-ranges.ts)", () => {
  // Reference date: August 15, 2026 14:30:00 local time
  const refDate = new Date(2026, 7, 15, 14, 30, 0);

  describe("formatDateForInput & parseDateInput", () => {
    it("formats a local Date to YYYY-MM-DD correctly without UTC shift", () => {
      const d = new Date(2026, 0, 5); // Jan 5, 2026
      expect(formatDateForInput(d)).toBe("2026-01-05");
    });

    it("parses YYYY-MM-DD back into local Date", () => {
      const parsed = parseDateInput("2026-11-28");
      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(2026);
      expect(parsed?.getMonth()).toBe(10); // 0-indexed November
      expect(parsed?.getDate()).toBe(28);
    });

    it("returns null for invalid inputs", () => {
      expect(parseDateInput("")).toBeNull();
      expect(parseDateInput("invalid-date")).toBeNull();
    });
  });

  describe("getDateRangeBounds", () => {
    it("calculates 'today' boundaries correctly", () => {
      const bounds = getDateRangeBounds("today", { referenceDate: refDate });
      expect(bounds.from).toBe(new Date(2026, 7, 15, 0, 0, 0, 0).toISOString());
      expect(bounds.to).toBe(new Date(2026, 7, 15, 23, 59, 59, 999).toISOString());
      expect(bounds.label).toContain("Today");
      expect(bounds.shortLabel).toBe("Today");
    });

    it("calculates 'yesterday' boundaries correctly", () => {
      const bounds = getDateRangeBounds("yesterday", { referenceDate: refDate });
      expect(bounds.from).toBe(new Date(2026, 7, 14, 0, 0, 0, 0).toISOString());
      expect(bounds.to).toBe(new Date(2026, 7, 14, 23, 59, 59, 999).toISOString());
      expect(bounds.label).toContain("Yesterday");
    });

    it("calculates 'this_month' (month) boundaries correctly", () => {
      const bounds = getDateRangeBounds("month", { referenceDate: refDate });
      expect(bounds.from).toBe(new Date(2026, 7, 1, 0, 0, 0, 0).toISOString());
      expect(bounds.to).toBe(new Date(2026, 7, 31, 23, 59, 59, 999).toISOString());
      expect(bounds.label).toContain("August 2026");
    });

    it("calculates 'previous_month' boundaries correctly in mid-year", () => {
      const bounds = getDateRangeBounds("previous_month", { referenceDate: refDate });
      // Previous month is July 2026 (July 1 to July 31)
      expect(bounds.from).toBe(new Date(2026, 6, 1, 0, 0, 0, 0).toISOString());
      expect(bounds.to).toBe(new Date(2026, 6, 31, 23, 59, 59, 999).toISOString());
      expect(bounds.label).toContain("July 2026");
      expect(bounds.shortLabel).toBe("Previous Month");
    });

    it("calculates 'previous_month' boundaries correctly when current month is January (year rollover)", () => {
      const janRef = new Date(2026, 0, 10, 10, 0, 0); // Jan 10, 2026
      const bounds = getDateRangeBounds("previous_month", { referenceDate: janRef });
      // Previous month is December 2025 (Dec 1 to Dec 31)
      expect(bounds.from).toBe(new Date(2025, 11, 1, 0, 0, 0, 0).toISOString());
      expect(bounds.to).toBe(new Date(2025, 11, 31, 23, 59, 59, 999).toISOString());
      expect(bounds.label).toContain("December 2025");
    });

    it("calculates 'last7days' boundaries correctly", () => {
      const bounds = getDateRangeBounds("last7days", { referenceDate: refDate });
      expect(bounds.from).toBe(new Date(2026, 7, 9, 0, 0, 0, 0).toISOString());
      expect(bounds.to).toBe(new Date(2026, 7, 15, 23, 59, 59, 999).toISOString());
    });

    it("calculates 'last30days' boundaries correctly", () => {
      const bounds = getDateRangeBounds("last30days", { referenceDate: refDate });
      expect(bounds.from).toBe(new Date(2026, 7, 15 - 29, 0, 0, 0, 0).toISOString());
      expect(bounds.to).toBe(new Date(2026, 7, 15, 23, 59, 59, 999).toISOString());
    });

    it("calculates 'year' (This Year) boundaries correctly", () => {
      const bounds = getDateRangeBounds("year", { referenceDate: refDate });
      expect(bounds.from).toBe(new Date(2026, 0, 1, 0, 0, 0, 0).toISOString());
      expect(bounds.to).toBe(new Date(2026, 11, 31, 23, 59, 59, 999).toISOString());
      expect(bounds.label).toContain("2026");
    });

    it("calculates 'previous_year' boundaries correctly", () => {
      const bounds = getDateRangeBounds("previous_year", { referenceDate: refDate });
      expect(bounds.from).toBe(new Date(2025, 0, 1, 0, 0, 0, 0).toISOString());
      expect(bounds.to).toBe(new Date(2025, 11, 31, 23, 59, 59, 999).toISOString());
      expect(bounds.label).toContain("2025");
    });

    it("calculates 'specific_date' boundaries for a selected day", () => {
      const bounds = getDateRangeBounds("specific_date", {
        specificDate: "2026-03-25",
        referenceDate: refDate,
      });
      expect(bounds.from).toBe(new Date(2026, 2, 25, 0, 0, 0, 0).toISOString());
      expect(bounds.to).toBe(new Date(2026, 2, 25, 23, 59, 59, 999).toISOString());
      expect(bounds.label).toContain("March 25, 2026");
    });

    it("calculates 'custom' range boundaries with start and end dates", () => {
      const bounds = getDateRangeBounds("custom", {
        startDate: "2026-06-01",
        endDate: "2026-06-15",
        referenceDate: refDate,
      });
      expect(bounds.from).toBe(new Date(2026, 5, 1, 0, 0, 0, 0).toISOString());
      expect(bounds.to).toBe(new Date(2026, 5, 15, 23, 59, 59, 999).toISOString());
      expect(bounds.label).toContain("Jun 1, 2026");
      expect(bounds.label).toContain("Jun 15, 2026");
    });

    it("handles flipped start and end dates in 'custom' gracefully", () => {
      const bounds = getDateRangeBounds("custom", {
        startDate: "2026-06-20",
        endDate: "2026-06-10",
        referenceDate: refDate,
      });
      expect(bounds.from).toBe(new Date(2026, 5, 10, 0, 0, 0, 0).toISOString());
      expect(bounds.to).toBe(new Date(2026, 5, 20, 23, 59, 59, 999).toISOString());
    });

    it("handles 'all' time returning null bounds", () => {
      const bounds = getDateRangeBounds("all", { referenceDate: refDate });
      expect(bounds.from).toBeNull();
      expect(bounds.to).toBeNull();
      expect(bounds.label).toBe("All Time");
    });
  });
});
