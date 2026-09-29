import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/products
 * Fetch all products with their categories
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");

    const where: any = {};
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    if (categoryId && categoryId !== "ALL") {
      where.categoryId = parseInt(categoryId, 10);
    }

    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: [{ categoryId: "asc" }, { name: "asc" }],
      }),
      prisma.category.findMany({
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ ok: true, data: products, categories });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/products
 * Update product pricing or visibility
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, mmkPrice, isCustomPrice, isVisible } = body;

    if (!id || typeof id !== "number") {
      return NextResponse.json({ ok: false, error: "Invalid product ID" }, { status: 400 });
    }

    const updateData: any = {};
    if (typeof mmkPrice === "number") updateData.mmkPrice = mmkPrice;
    if (typeof isCustomPrice === "boolean") updateData.isCustomPrice = isCustomPrice;
    if (typeof isVisible === "boolean") updateData.isVisible = isVisible;

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
