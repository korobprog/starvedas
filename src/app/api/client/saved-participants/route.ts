import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentClientProfile } from "@/server/client-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const client = await getCurrentClientProfile();

  if (!client) {
    return NextResponse.json({ authenticated: false, participants: [] });
  }

  const participants = await prisma.savedParticipant.findMany({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      fullName: true,
      id: true
    },
    take: 200,
    where: {
      clientId: client.id
    }
  });

  return NextResponse.json({
    authenticated: true,
    client: {
      consentMailings: client.consentMailings,
      consentPersonalData: client.consentPersonalData,
      email: client.email,
      name: client.name,
      phone: client.phone,
      telegram: client.telegram
    },
    participants
  });
}
