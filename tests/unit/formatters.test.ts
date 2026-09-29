import { describe, it, expect } from "vitest";
import {
  sanitizeUpstreamText,
  formatMmk,
  formatUsd,
  generateExternalOrderId,
} from "@/lib/utils/formatters";

describe("Formatters & Sanitization Unit Tests", () => {
  it("should strip upstream {pe:...} emoji codes cleanly", () => {
    const rawCategory = "{pe:4956506857901392912} steam";
    expect(sanitizeUpstreamText(rawCategory)).toBe("steam");

    const rawProduct = "{pe:6174520215376763867}🤶 Claude $100 API Key 1 Month";
    expect(sanitizeUpstreamText(rawProduct)).toBe("🤶 Claude $100 API Key 1 Month");
  });

  it("should sanitize multi-line descriptions with custom tags", () => {
    const rawDesc =
      "{pe:5282961772972615494}💰 $100 API Credits\n{pe:5413879192267805083}🗓 Valid for 30 Days";
    const cleaned = sanitizeUpstreamText(rawDesc);
    expect(cleaned).toBe("💰 $100 API Credits\n🗓 Valid for 30 Days");
  });

  it("should handle empty or null values gracefully", () => {
    expect(sanitizeUpstreamText(null)).toBe("");
    expect(sanitizeUpstreamText(undefined)).toBe("");
    expect(sanitizeUpstreamText("")).toBe("");
  });

  it("should format MMK currency with commas and Ks suffix", () => {
    expect(formatMmk(5000)).toBe("5,000 Ks");
    expect(formatMmk(1250000)).toBe("1,250,000 Ks");
    expect(formatMmk(0)).toBe("0 Ks");
  });

  it("should format USD currency with 2 decimals", () => {
    expect(formatUsd(0.45)).toBe("$0.45");
    expect(formatUsd(12.5)).toBe("$12.50");
    expect(formatUsd(0)).toBe("$0.00");
  });

  it("should generate a valid idempotent external order ID", () => {
    const orderId = generateExternalOrderId(42);
    expect(orderId).toMatch(/^aura_ord_\d+_42_[a-z0-9]+$/);
  });
});
