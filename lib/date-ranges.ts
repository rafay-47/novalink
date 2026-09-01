import { format } from "date-fns";

export type TimeframeRange =
  | "today"
  | "yesterday"
  | "week"
  | "last7days"
  | "month"
  | "previous_month"
  | "last30days"
  | "year"
  | "previous_year"
  | "specific_date"
  | "custom"
  | "all";

export interface DateRangeOptions {
  specificDate?: string; // YYYY-MM-DD
  startDate?: string;    // YYYY-MM-DD
  endDate?: string;      // YYYY-MM-DD
  referenceDate?: Date;  // Reference date for relative calculations (defaults to new Date())
}

export interface DateRangeBounds {
  from: string | null;
  to: string | null;
  label: string;
  shortLabel: string;
}

export const TIMEFRAME_PRESET_OPTIONS: { value: TimeframeRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "month", label: "This Month" },
  { value: "previous_month", label: "Previous Month" },
  { value: "last30days", label: "Last 30 Days" },
  { value: "year", label: "This Year" },
  { value: "previous_year", label: "Previous Year" },
  { value: "specific_date", label: "Specific Date..." },
  { value: "custom", label: "Custom Range..." },
  { value: "all", label: "All Time" },
];

/**
 * Formats a Date object to YYYY-MM-DD string according to local time
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD string into a local Date object
 */
export function parseDateInput(str: string): Date | null {
  if (!str) return null;
  const parts = str.split("-").map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return null;
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/**
 * Computes ISO boundary strings and labels for any given timeframe
 */
export function getDateRangeBounds(
  range: TimeframeRange,
  options?: DateRangeOptions
): DateRangeBounds {
  const now = options?.referenceDate ? new Date(options.referenceDate) : new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  switch (range) {
    case "today": {
      const start = new Date(currentYear, currentMonth, currentDate, 0, 0, 0, 0);
      const end = new Date(currentYear, currentMonth, currentDate, 23, 59, 59, 999);
      return {
        from: start.toISOString(),
        to: end.toISOString(),
        label: `Today (${format(start, "MMM d, yyyy")})`,
        shortLabel: "Today",
      };
    }

    case "yesterday": {
      const yDate = new Date(currentYear, currentMonth, currentDate - 1);
      const start = new Date(yDate.getFullYear(), yDate.getMonth(), yDate.getDate(), 0, 0, 0, 0);
      const end = new Date(yDate.getFullYear(), yDate.getMonth(), yDate.getDate(), 23, 59, 59, 999);
      return {
        from: start.toISOString(),
        to: end.toISOString(),
        label: `Yesterday (${format(yDate, "MMM d, yyyy")})`,
        shortLabel: "Yesterday",
      };
    }

    case "week": {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // Distance to Monday
      const monday = new Date(currentYear, currentMonth, currentDate - diff, 0, 0, 0, 0);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
      return {
        from: monday.toISOString(),
        to: sunday.toISOString(),
        label: `This Week (${format(monday, "MMM d")} - ${format(sunday, "MMM d, yyyy")})`,
        shortLabel: "This Week",
      };
    }

    case "last7days": {
      const start = new Date(currentYear, currentMonth, currentDate - 6, 0, 0, 0, 0);
      const end = new Date(currentYear, currentMonth, currentDate, 23, 59, 59, 999);
      return {
        from: start.toISOString(),
        to: end.toISOString(),
        label: `Last 7 Days (${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")})`,
        shortLabel: "Last 7 Days",
      };
    }

    case "month": {
      const start = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
      const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
      return {
        from: start.toISOString(),
        to: end.toISOString(),
        label: `This Month (${format(start, "MMMM yyyy")})`,
        shortLabel: "This Month",
      };
    }

    case "previous_month": {
      // Month - 1 correctly handles January rollover to December of previous year
      const start = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
      const end = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
      return {
        from: start.toISOString(),
        to: end.toISOString(),
        label: `Previous Month (${format(start, "MMMM yyyy")})`,
        shortLabel: "Previous Month",
      };
    }

    case "last30days": {
      const start = new Date(currentYear, currentMonth, currentDate - 29, 0, 0, 0, 0);
      const end = new Date(currentYear, currentMonth, currentDate, 23, 59, 59, 999);
      return {
        from: start.toISOString(),
        to: end.toISOString(),
        label: `Last 30 Days (${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")})`,
        shortLabel: "Last 30 Days",
      };
    }

    case "year": {
      const start = new Date(currentYear, 0, 1, 0, 0, 0, 0);
      const end = new Date(currentYear, 11, 31, 23, 59, 59, 999);
      return {
        from: start.toISOString(),
        to: end.toISOString(),
        label: `This Year (${currentYear})`,
        shortLabel: "This Year",
      };
    }

    case "previous_year": {
      const prevYear = currentYear - 1;
      const start = new Date(prevYear, 0, 1, 0, 0, 0, 0);
      const end = new Date(prevYear, 11, 31, 23, 59, 59, 999);
      return {
        from: start.toISOString(),
        to: end.toISOString(),
        label: `Previous Year (${prevYear})`,
        shortLabel: "Previous Year",
      };
    }

    case "specific_date": {
      const parsed = parseDateInput(options?.specificDate || "") || now;
      const start = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
      const end = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999);
      return {
        from: start.toISOString(),
        to: end.toISOString(),
        label: `Specific Date (${format(start, "MMMM d, yyyy")})`,
        shortLabel: format(start, "MMM d, yyyy"),
      };
    }

    case "custom": {
      const sParsed = parseDateInput(options?.startDate || "") || now;
      const eParsed = parseDateInput(options?.endDate || "") || now;
      const [minDate, maxDate] = sParsed <= eParsed ? [sParsed, eParsed] : [eParsed, sParsed];

      const start = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate(), 0, 0, 0, 0);
      const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate(), 23, 59, 59, 999);
      return {
        from: start.toISOString(),
        to: end.toISOString(),
        label: `Custom Range (${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")})`,
        shortLabel: `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`,
      };
    }

    case "all":
    default:
      return {
        from: null,
        to: null,
        label: "All Time",
        shortLabel: "All Time",
      };
  }
}
