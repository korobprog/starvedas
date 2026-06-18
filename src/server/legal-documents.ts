import type { OrganizationSettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { LegalContact } from "@/lib/legal-content";
import { applyLegalPlaceholders } from "@/lib/legal-content";
import { getOfferCopy } from "@/i18n/offer-copy";
import { formatLocalizedPrice } from "@/i18n/pricing";
import { services } from "@/lib/site-data";

export const offerDocumentSlug = "public-offer";

type OfferMarkdownInput = {
  contact: LegalContact;
  locale?: string | null;
  settings?: OrganizationSettings | null;
};

function applyExtendedPlaceholders(text: string, contact: LegalContact) {
  return applyLegalPlaceholders(text, contact).replaceAll(
    "{{telegram}}",
    contact.telegram
  );
}

function appendSection(lines: string[], title: string, body: string | string[]) {
  lines.push("", `## ${title}`, "");

  if (Array.isArray(body)) {
    body.forEach((paragraph) => lines.push(paragraph, ""));
    return;
  }

  lines.push(body, "");
}

function buildFallbackOfferMarkdown({
  contact,
  locale,
  settings
}: OfferMarkdownInput) {
  const copy = getOfferCopy(locale);
  const lines: string[] = [applyLegalPlaceholders(copy.lead, contact), ""];

  appendSection(lines, copy.sections.general.title, copy.sections.general.body);

  lines.push(`## ${copy.sections.provider.title}`, "");
  lines.push(copy.sections.provider.body, "");
  if (settings?.bankDetails) {
    lines.push(settings.bankDetails, "");
  }
  if (settings?.publicRecipientName) {
    lines.push(
      copy.sections.provider.recipient.replace(
        "{{name}}",
        settings.publicRecipientName
      ),
      ""
    );
  }

  appendSection(lines, copy.sections.subject.title, copy.sections.subject.body);

  lines.push(`## ${copy.sections.services.title}`, "");
  lines.push(copy.sections.services.body, "");
  services.forEach((service) => {
    lines.push(
      `- **${service.title}** — ${formatLocalizedPrice(
        service.priceRub,
        locale,
        {
          perName: service.priceUnit === "PER_NAME"
        }
      )}`
    );
  });

  appendSection(lines, copy.sections.order.title, copy.sections.order.body);
  appendSection(lines, copy.sections.payment.title, copy.sections.payment.body);
  appendSection(
    lines,
    copy.sections.specialConditions.title,
    copy.sections.specialConditions.body
  );
  appendSection(
    lines,
    copy.sections.liability.title,
    copy.sections.liability.body
  );
  appendSection(lines, copy.sections.refund.title, copy.sections.refund.body);
  appendSection(lines, copy.sections.term.title, copy.sections.term.body);

  return {
    content: applyExtendedPlaceholders(lines.join("\n").trim(), contact),
    title: copy.pageTitle
  };
}

export async function getOfferDocumentMarkdown(input: OfferMarkdownInput) {
  const fallback = buildFallbackOfferMarkdown(input);

  try {
    const document = await prisma.legalDocument.findFirst({
      where: {
        active: true,
        slug: offerDocumentSlug,
        type: "OFFER"
      },
      orderBy: { updatedAt: "desc" }
    });

    if (document?.content.trim()) {
      return {
        content: applyExtendedPlaceholders(document.content, input.contact),
        title: document.title || fallback.title
      };
    }
  } catch {
    // If the database is temporarily unavailable, keep the legal page readable.
  }

  return fallback;
}

export async function getEditableOfferDocument() {
  return prisma.legalDocument.findFirst({
    where: {
      slug: offerDocumentSlug,
      type: "OFFER"
    },
    orderBy: { updatedAt: "desc" }
  });
}
