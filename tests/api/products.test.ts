import { describe, it, expect, vi } from "vitest";
import { GET, PATCH } from "@/app/api/admin/products/route";
import { prisma } from "@/lib/prisma";

describe("Admin Products API Route Tests", () => {
  it("GET should return products and categories", async () => {
    prisma.product.findMany = vi.fn().mockResolvedValue([
      { id: 1, name: "Product A", mmkPrice: 15000, categoryId: 10 },
    ]);
    prisma.category.findMany = vi.fn().mockResolvedValue([
      { id: 10, name: "Category 10" },
    ]);

    const req = new Request("http://localhost:3000/api/admin/products");
    const res = await GET(req);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.data.length).toBe(1);
    expect(json.categories.length).toBe(1);
  });

  it("PATCH should update product price or visibility", async () => {
    prisma.product.update = vi.fn().mockResolvedValue({
      id: 1,
      name: "Product A",
      mmkPrice: 20000,
      isCustomPrice: true,
      isVisible: true,
    });

    const req = new Request("http://localhost:3000/api/admin/products", {
      method: "PATCH",
      body: JSON.stringify({ id: 1, mmkPrice: 20000, isCustomPrice: true }),
    });

    const res = await PATCH(req);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.data.mmkPrice).toBe(20000);
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ mmkPrice: 20000, isCustomPrice: true }),
      })
    );
  });
});
