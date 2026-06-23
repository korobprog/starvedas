import { sendEmail } from "@/server/email/mailer";
import { getSiteUrlForSourceDomain } from "@/server/email/site-url";
import { buildRegistrationEmail } from "@/server/email/templates";

function normalizeEmail(value?: string | null) {
  const trimmed = value?.trim().toLowerCase();

  return trimmed || null;
}

export async function sendClientRegistrationEmail({
  email,
  name,
  sourceDomain
}: {
  email: string;
  name: string;
  sourceDomain?: string | null;
}) {
  const to = normalizeEmail(email);

  if (!to) {
    return {
      reason: "Email клиента не указан",
      skipped: true as const
    };
  }

  const template = buildRegistrationEmail({
    loginUrl: `${getSiteUrlForSourceDomain(sourceDomain)}/login`,
    name
  });

  return sendEmail({
    html: template.html,
    subject: template.subject,
    text: template.text,
    to
  });
}
