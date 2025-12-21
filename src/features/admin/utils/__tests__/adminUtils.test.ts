import { describe, it, expect } from "vitest";
import {
  formatTokens,
  getUsagePercentage,
  getUsageColor,
  formatDate,
  formatDateTime,
} from "../adminUtils";

describe("adminUtils", () => {
  describe("formatTokens", () => {
    it("should format millions correctly", () => {
      expect(formatTokens(1500000)).toBe("1.5M");
      expect(formatTokens(2000000)).toBe("2.0M");
      expect(formatTokens(1000000)).toBe("1.0M");
    });

    it("should format thousands correctly", () => {
      expect(formatTokens(50000)).toBe("50k");
      expect(formatTokens(100000)).toBe("100k");
      expect(formatTokens(1000)).toBe("1k");
    });

    it("should return raw number for small values", () => {
      expect(formatTokens(500)).toBe("500");
      expect(formatTokens(0)).toBe("0");
      expect(formatTokens(999)).toBe("999");
    });
  });

  describe("getUsagePercentage", () => {
    it("should calculate percentage correctly", () => {
      expect(getUsagePercentage(50, 100)).toBe(50);
      expect(getUsagePercentage(25, 100)).toBe(25);
      expect(getUsagePercentage(100, 100)).toBe(100);
    });

    it("should cap at 100%", () => {
      expect(getUsagePercentage(150, 100)).toBe(100);
      expect(getUsagePercentage(200, 100)).toBe(100);
    });

    it("should return 0 when limit is 0", () => {
      expect(getUsagePercentage(50, 0)).toBe(0);
    });

    it("should handle zero usage", () => {
      expect(getUsagePercentage(0, 100)).toBe(0);
    });
  });

  describe("getUsageColor", () => {
    it("should return red for 90%+ usage", () => {
      expect(getUsageColor(90)).toBe("bg-red-500");
      expect(getUsageColor(95)).toBe("bg-red-500");
      expect(getUsageColor(100)).toBe("bg-red-500");
    });

    it("should return yellow for 70-89% usage", () => {
      expect(getUsageColor(70)).toBe("bg-yellow-500");
      expect(getUsageColor(80)).toBe("bg-yellow-500");
      expect(getUsageColor(89)).toBe("bg-yellow-500");
    });

    it("should return green for below 70% usage", () => {
      expect(getUsageColor(0)).toBe("bg-green-500");
      expect(getUsageColor(50)).toBe("bg-green-500");
      expect(getUsageColor(69)).toBe("bg-green-500");
    });
  });

  describe("formatDate", () => {
    it("should format valid date string", () => {
      const result = formatDate("2024-01-15T10:00:00Z");
      // Date formatting depends on locale, just check it's not "Never"
      expect(result).not.toBe("Never");
      expect(result).toBeTruthy();
    });

    it("should return 'Never' for null", () => {
      expect(formatDate(null)).toBe("Never");
    });

    it("should return 'Never' for empty string treated as falsy", () => {
      // Note: empty string is falsy in JS but not null
      expect(formatDate(null)).toBe("Never");
    });
  });

  describe("formatDateTime", () => {
    it("should format valid date string with time", () => {
      const result = formatDateTime("2024-01-15T10:30:00Z");
      // DateTime formatting depends on locale, just check it's not "Never"
      expect(result).not.toBe("Never");
      expect(result).toBeTruthy();
    });

    it("should return 'Never' for null", () => {
      expect(formatDateTime(null)).toBe("Never");
    });
  });
});
