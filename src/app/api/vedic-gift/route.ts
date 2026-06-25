import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const vedicGiftSchema = z.object({
  birthDate: z.string().trim().min(1),
  birthTime: z.string().trim().optional().nullable(),
  birthTimeUnknown: z.boolean().optional(),
  email: z.string().trim().email(),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  orderId: z.string().trim().min(1),
  phone: z.string().trim().optional().nullable(),
  telegram: z.string().trim().optional().nullable()
});

export async function POST(request: Request) {
  try {
    const parsed = vedicGiftSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { message: "????????? ???????????? ???? ?????" },
        { status: 400 }
      );
    }

    const {
      birthDate,
      birthTime,
      birthTimeUnknown = false,
      email,
      firstName,
      lastName,
      orderId,
      phone,
      telegram
    } = parsed.data;

    const parsedBirthDate = new Date(`${birthDate}T00:00:00.000Z`);
    if (Number.isNaN(parsedBirthDate.getTime())) {
      return NextResponse.json(
        { message: "??????? ?????????? ???? ????????" },
        { status: 400 }
      );
    }

    if (!birthTimeUnknown && !birthTime) {
      return NextResponse.json(
        {
          message:
            "??????? ????? ???????? ??? ????????, ??? ?????? ????? ??????????"
        },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        service: { select: { slug: true } }
      }
    });

    if (!order || order.service.slug !== "monthly-pass") {
      return NextResponse.json(
        {
          message: "?????????? ?????? ???????? ?????? ??? ????????? ??????????"
        },
        { status: 403 }
      );
    }

    const vedicGiftData = await prisma.vedicGiftData.upsert({
      where: { orderId: order.id },
      create: {
        lastName,
        firstName,
        email,
        birthDate: parsedBirthDate,
        birthTime: birthTimeUnknown ? null : birthTime,
        birthTimeUnknown,
        phone: phone || null,
        telegram: telegram || null,
        orderId: order.id
      },
      update: {
        lastName,
        firstName,
        email,
        birthDate: parsedBirthDate,
        birthTime: birthTimeUnknown ? null : birthTime,
        birthTimeUnknown,
        phone: phone || null,
        telegram: telegram || null,
        processed: false
      }
    });

    return NextResponse.json({
      success: true,
      data: { id: vedicGiftData.id }
    });
  } catch (error) {
    console.error("Vedic gift API error:", error);
    return NextResponse.json(
      { message: "?????????? ?????? ???????" },
      { status: 500 }
    );
  }
}
