import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { sendEmail, verifyEmailTransport } from "@/server/email/mailer";
import { buildRegistrationEmail } from "@/server/email/templates";

async function requireEmailTester() {
  const user = await getCurrentUser();

  if (
    !user ||
    (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)
  ) {
    return null;
  }

  return user;
}

function normalizeEmail(value?: string | null) {
  const trimmed = value?.trim().toLowerCase();

  return trimmed || null;
}

export async function GET() {
  const user = await requireEmailTester();

  if (!user) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    return NextResponse.json(await verifyEmailTransport());
  } catch {
    return NextResponse.json(
      { message: "SMTP connection failed", ok: false },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await requireEmailTester();

  if (!user) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    to?: string;
  };
  const to = normalizeEmail(body.to) ?? user.email;

  try {
    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000"
    ).replace(/\/+$/, "");
    const template = buildRegistrationEmail({
      loginUrl: `${siteUrl}/admin/login`,
      name: user.name
    });
    const result = await sendEmail({
      html: template.html,
      subject: `Тест SMTP — ${template.subject}`,
      text: template.text,
      to
    });

    return NextResponse.json({ ok: true, result });
  } catch {
    return NextResponse.json(
      { message: "Test email failed", ok: false },
      { status: 500 }
    );
  }
}
