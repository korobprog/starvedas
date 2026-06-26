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
        { message: "Проверьте заполненные поля формы" },
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
        { message: "Укажите корректную дату рождения" },
        { status: 400 }
      );
    }

    if (!birthTimeUnknown && !birthTime) {
      return NextResponse.json(
        {
          message:
            "Укажите время рождения или отметьте, что точное время неизвестно"
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
          message: "Подарочный разбор доступен только для месячного абонемента"
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
      { message: "Не удалось сохранить данные" },
      { status: 500 }
    );
  }
}
