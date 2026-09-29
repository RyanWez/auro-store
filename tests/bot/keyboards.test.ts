import { describe, it, expect } from "vitest";
import {
  createQuantityKeyboard,
  createCategoryKeyboard,
  mainMenuKeyboard,
} from "@/bot/keyboards";

describe("Bot Keyboards Builder Tests (Strict 1, 5, 10 Limits)", () => {
  it("should have main menu buttons for Buy, Orders, Wallet, Profile, Support", () => {
    const buttons = mainMenuKeyboard.inline_keyboard;
    expect(buttons.length).toBeGreaterThanOrEqual(4);

    const buttonTexts = buttons.flat().map((b) => b.text);
    expect(buttonTexts.some((t) => t.includes("Buy Products"))).toBe(true);
    expect(buttonTexts.some((t) => t.includes("Wallet"))).toBe(true);
    expect(buttonTexts.some((t) => t.includes("Support"))).toBe(true);
  });

  it("should generate presets strictly for [1], [5], [10] only and enforce max limit 10", () => {
    // Product with 449 stock, max limit = 10
    const kb = createQuantityKeyboard(50, 1, 449, 2500, 10);
    const buttonTexts = kb.inline_keyboard.flat().map((b) => b.text);

    // Stepper buttons
    expect(buttonTexts).toContain("➖");
    expect(buttonTexts).toContain("🔢 1");
    expect(buttonTexts).toContain("➕");

    // Presets should ONLY contain 1, 5, 10 (NO 20, 30, 50, 100, 449)
    expect(buttonTexts).toContain("✅ 1");
    expect(buttonTexts).toContain("5");
    expect(buttonTexts).toContain("10");
    expect(buttonTexts).not.toContain("20");
    expect(buttonTexts).not.toContain("30");
    expect(buttonTexts).not.toContain("50");
    expect(buttonTexts).not.toContain("100");
    expect(buttonTexts).not.toContain("449");

    // Stepper + buttons should not exceed 10
    // If current is 10, plus button shouldn't go above 10
    const kb10 = createQuantityKeyboard(50, 10, 449, 2500, 10);
    const plusButton = kb10.inline_keyboard[0][2] as any;
    expect(plusButton.callback_data).toBe("qty_50_10"); // clamped to 10
  });

  it("should filter presets if stock is lower than 10 (e.g. stock = 3)", () => {
    const kb = createQuantityKeyboard(50, 1, 3, 2500, 10);
    const buttonTexts = kb.inline_keyboard.flat().map((b) => b.text);

    expect(buttonTexts).toContain("✅ 1");
    expect(buttonTexts).not.toContain("5");
    expect(buttonTexts).not.toContain("10");
  });

  it("should format categories cleanly without {pe:...} tags", () => {
    const categories = [
      { id: 1, name: "{pe:12345} ChatGPT" },
      { id: 2, name: "{pe:67890} Netflix" },
    ];
    const kb = createCategoryKeyboard(categories);
    const buttonTexts = kb.inline_keyboard.flat().map((b) => b.text);

    expect(buttonTexts).toContain("ChatGPT");
    expect(buttonTexts).toContain("Netflix");
    expect(buttonTexts.some((t) => t.includes("{pe:"))).toBe(false);
  });
});
