import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UpstreamClient, UpstreamApiError } from "@/lib/upstream";

describe("Upstream Partner API Client Unit Tests", () => {
  let client: UpstreamClient;
  const mockApiKey = "sk_live_test_123456789";

  beforeEach(() => {
    client = new UpstreamClient({
      baseUrl: "http://mock-upstream.test/api/partner/v1",
      apiKey: mockApiKey,
      timeoutMs: 2000,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch balance successfully", async () => {
    const mockBalanceResponse = {
      ok: true,
      balance: "1.00",
      currency: "USD",
      userId: 8777968077,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockBalanceResponse,
    });

    const balance = await client.getBalance();
    expect(balance.ok).toBe(true);
    expect(balance.balance).toBe("1.00");
    expect(balance.userId).toBe(8777968077);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://mock-upstream.test/api/partner/v1/balance",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockApiKey}`,
        }),
      })
    );
  });

  it("should fetch and clean categories", async () => {
    const mockCategoriesResponse = {
      ok: true,
      data: [
        { categoryId: 10, name: "{pe:5069075201950483359} GEMINI AI" },
        { categoryId: 25, name: "{pe:5453962468478962129} CHAT GPT" },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCategoriesResponse,
    });

    const categories = await client.getCategories();
    expect(categories.length).toBe(2);
    expect(categories[0].cleanName).toBe("GEMINI AI");
    expect(categories[1].cleanName).toBe("CHAT GPT");
  });

  it("should create order and return delivery keys", async () => {
    const mockOrderResponse = {
      ok: true,
      order: {
        orderId: 481,
        externalOrderId: "aura_ord_1001",
        productId: 50,
        productName: "Claude API Key",
        quantity: 1,
        unitPrice: 3.0,
        total: 3.0,
        currency: "USD",
        status: "COMPLETED",
      },
      delivery: {
        type: "TEXT",
        lines: ["sk-ant-test-key-12345"],
      },
      balanceAfter: "0.70",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOrderResponse,
    });

    const orderRes = await client.createOrder({
      productId: 50,
      quantity: 1,
      externalOrderId: "aura_ord_1001",
    });

    expect(orderRes.ok).toBe(true);
    expect(orderRes.delivery?.lines).toContain("sk-ant-test-key-12345");
  });

  it("should throw UpstreamApiError on insufficient balance", async () => {
    const mockErrorResponse = {
      ok: false,
      error: {
        code: "INSUFFICIENT_BALANCE",
        message: "Your partner wallet balance is too low.",
        required: 3.0,
        balance: 1.0,
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => mockErrorResponse,
    });

    await expect(
      client.createOrder({
        productId: 50,
        quantity: 1,
        externalOrderId: "aura_ord_1002",
      })
    ).rejects.toThrow(UpstreamApiError);
  });

  it("should validate order parameters before sending request", async () => {
    await expect(
      client.createOrder({
        productId: 0,
        quantity: 1,
        externalOrderId: "aura_ord_1003",
      })
    ).rejects.toThrow("Invalid order parameters");

    await expect(
      client.createOrder({
        productId: 50,
        quantity: 0,
        externalOrderId: "aura_ord_1004",
      })
    ).rejects.toThrow("Invalid order parameters");
  });
});
