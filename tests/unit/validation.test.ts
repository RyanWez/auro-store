import { describe, it, expect } from "vitest";
import { sessionManager } from "@/bot/session";

describe("Bot Session & Input Validation Tests", () => {
  it("should manage session state per user correctly", () => {
    sessionManager.clear(999);
    expect(sessionManager.get(999).step).toBe("IDLE");

    sessionManager.set(999, {
      step: "WAITING_CUSTOM_QTY",
      productId: 42,
    });

    const session = sessionManager.get(999);
    expect(session.step).toBe("WAITING_CUSTOM_QTY");
    expect(session.productId).toBe(42);

    sessionManager.clear(999);
    expect(sessionManager.get(999).step).toBe("IDLE");
  });

  it("should validate custom quantity within 1 to 10 range", () => {
    const maxLimit = 10;
    const isValidQty = (input: string) => {
      const val = parseInt(input.trim(), 10);
      return !isNaN(val) && val >= 1 && val <= maxLimit;
    };

    expect(isValidQty("1")).toBe(true);
    expect(isValidQty("5")).toBe(true);
    expect(isValidQty("10")).toBe(true);

    // Invalid values
    expect(isValidQty("0")).toBe(false);
    expect(isValidQty("-1")).toBe(false);
    expect(isValidQty("11")).toBe(false);
    expect(isValidQty("100")).toBe(false);
    expect(isValidQty("abc")).toBe(false);
  });
});
