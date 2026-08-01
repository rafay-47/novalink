import { describe, it, expect } from "vitest";
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  generateInvoiceNumber,
  hasEnvVars,
} from "@/lib/utils";

describe("Utility Functions (lib/utils.ts)", () => {
  describe("cn", () => {
    it("combines class names and resolves tailwind conflicts", () => {
      expect(cn("px-2 py-1", "bg-red-500", "px-4")).toBe("py-1 bg-red-500 px-4");
      expect(cn("text-red-500", undefined, null, "font-bold")).toBe("text-red-500 font-bold");
    });
  });

  describe("formatCurrency", () => {
    it("formats positive numbers to PKR currency string without decimals", () => {
      const formatted = formatCurrency(50000);
      expect(formatted).toContain("50,000");
    });

    it("handles zero gracefully", () => {
      const formatted = formatCurrency(0);
      expect(formatted).toContain("0");
    });

    it("handles negative values gracefully", () => {
      const formatted = formatCurrency(-1500);
      expect(formatted).toContain("1,500");
    });
  });

  describe("formatDate & formatDateTime", () => {
    it("formats date strings into MMM d, yyyy format", () => {
      const dateStr = "2026-05-15T10:30:00Z";
      expect(formatDate(dateStr)).toBe("May 15, 2026");
    });

    it("formats date strings into date with time format", () => {
      const dateStr = "2026-05-15T10:30:00Z";
      const formatted = formatDateTime(dateStr);
      expect(formatted).toContain("May 15, 2026");
    });
  });

  describe("generateInvoiceNumber", () => {
    it("generates a unique invoice number starting with INV-", () => {
      const inv1 = generateInvoiceNumber();
      const inv2 = generateInvoiceNumber();

      expect(inv1).toMatch(/^INV-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(inv2).toMatch(/^INV-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(inv1).not.toBe(inv2);
    });
  });

  describe("hasEnvVars", () => {
    it("evaluates truthy when publishable key and url are set", () => {
      expect(hasEnvVars).toBeTruthy();
    });
  });
});
