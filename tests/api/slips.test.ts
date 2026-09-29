import { describe, it, expect, vi } from "vitest";
import { GET, POST } from "@/app/api/admin/slips/route";
import { prisma } from "@/lib/prisma";
import { bot } from "@/bot";

describe("Admin Slips API Route Tests", () => {
  it("GET should return deposit slips with serialized BigInt user IDs", async () => {
    prisma.depositSlip.findMany = vi.fn().mockResolvedValue([
      {
        id: 1,
        userId: 5,
        provider: "KBZ_PAY",
        amountMmk: 5000,
        status: "PENDING",
        telegramFileId: "file_123",
        createdAt: new Date(),
        user: {
          id: 5,
          telegramId: BigInt(123456789),
          username: "testuser",
          firstName: "Test",
          lastName: null,
          mmkBalance: 0,
        },
      },
    ]);

    const req = new Request("http://localhost/api/admin/slips");
    const res = await GET(req);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.data.length).toBe(1);
    expect(json.data[0].user.telegramId).toBe("123456789");
  });

  it("should approve slip and increment user balance on POST with action APPROVE", async () => {
    prisma.depositSlip.findUnique = vi.fn().mockResolvedValue({
      id: 1,
      userId: 5,
      amountMmk: 5000,
      status: "PENDING",
      user: { id: 5, telegramId: BigInt(123456789) },
    });

    prisma.$transaction = vi.fn().mockResolvedValue([
      { id: 1, status: "APPROVED" },
      { id: 5, mmkBalance: 5000 },
    ]);

    bot.api.sendMessage = vi.fn().mockResolvedValue({});

    const req = new Request("http://localhost/api/admin/slips", {
      method: "POST",
      body: JSON.stringify({
        slipId: 1,
        action: "APPROVE",
        amountMmk: 5000,
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.status).toBe("APPROVED");
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("should reject slip on POST with action REJECT", async () => {
    prisma.depositSlip.findUnique = vi.fn().mockResolvedValue({
      id: 2,
      userId: 5,
      status: "PENDING",
      user: { id: 5, telegramId: BigInt(123456789) },
    });

    prisma.depositSlip.update = vi.fn().mockResolvedValue({
      id: 2,
      status: "REJECTED",
    });

    bot.api.sendMessage = vi.fn().mockResolvedValue({});

    const req = new Request("http://localhost/api/admin/slips", {
      method: "POST",
      body: JSON.stringify({
        slipId: 2,
        action: "REJECT",
        note: "Slip is invalid",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.status).toBe("REJECTED");
  });
});
