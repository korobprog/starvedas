import { NextResponse } from "next/server";
import {
  getUnseenSalesState,
  markSalesSeen
} from "@/server/sales-notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getUnseenSalesState();

  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store" }
  });
}

export async function POST() {
  const marked = await markSalesSeen();

  if (!marked) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ count: 0, ok: true });
}
