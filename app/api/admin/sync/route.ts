import { NextResponse } from "next/server";
import { syncUpstreamCatalog } from "@/lib/sync";

export const dynamic = "force-dynamic";

/**
 * Sync Catalog & Balance with Upstream API
 */
export async function POST() {
  try {
    const result = await syncUpstreamCatalog();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
