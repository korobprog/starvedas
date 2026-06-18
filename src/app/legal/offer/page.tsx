import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { MarkdownContent } from "@/components/markdown-content";
import { getOfferCopy } from "@/i18n/offer-copy";
import { localeCookieName } from "@/i18n/config";
import { getOfferDocumentMarkdown } from "@/server/legal-documents";
import { getPublicOrganizationSettings } from "@/server/organization-settings";

export const metadata: Metadata = {
  title: "Публичная оферта, StarVedas",
  description:
    "Условия оформления заявки и оплаты услуг по организации участия в церемониях StarVedas."
};

export const dynamic = "force-dynamic";

export default async function OfferPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get(localeCookieName)?.value;
  const copy = getOfferCopy(locale);
  const { contact, settings } = await getPublicOrganizationSettings();
  const offer = await getOfferDocumentMarkdown({ contact, locale, settings });

  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Юридические документы</p>
        <h1>{offer.title}</h1>

        <MarkdownContent content={offer.content} />

        <div className="legal-actions">
          <Link className="button button--primary" href="/#signup">
            {copy.actions.signup}
          </Link>
          <Link className="button" href="/refund">
            {copy.actions.refund}
          </Link>
        </div>
      </article>
    </main>
  );
}
