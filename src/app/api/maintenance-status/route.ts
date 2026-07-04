import { NextResponse } from "next/server";
import { getMaintenanceSettings } from "@/server/site-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getMaintenanceSettings();

  return NextResponse.json({
    mode: settings.mode
  });
}
