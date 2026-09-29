import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/admin/settings/route";
import { PUT, GET } from "@/app/api/admin/settings/route";
import { prisma } from "@/lib/prisma";

describe("Admin Settings API Route Tests", () => {
  it("should return settings map on GET", async () => {
    prisma.setting.findMany = vi.fn().mockResolvedValue([
      { key: "usd_exchange_rate", value: "4850" },
      { key: "max_purchase_limit", value: "10" },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(data.ok).toBe(true);
    expect(data.data.usd_exchange_rate).toBe("4850");
    expect(data.data.max_purchase_limit).toBe("10");
  });

  it("should update settings map on PUT", async () => {
    prisma.setting.upsert = vi.fn().mockResolvedValue({ key: "max_purchase_limit", value: "10" });

    const req = new Request("http://localhost/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ max_purchase_limit: "10" }),
    });

    const response = await PUT(req);
    const data = await response.json();

    expect(data.ok).toBe(true);
    expect(prisma.setting.upsert).toHaveBeenCalled();
  });
});
