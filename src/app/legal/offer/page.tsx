import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { formatLocalizedPrice } from "@/i18n/pricing";
import { getOfferCopy } from "@/i18n/offer-copy";
import { localeCookieName } from "@/i18n/config";
import { services } from "@/lib/site-data";
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

  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Юридические документы</p>
        <h1>{copy.pageTitle}</h1>
        <p className="legal-lead">{copy.lead}</p>

        <div className="legal-sections">
          <section>
            <h2>{copy.sections.provider.title}</h2>
            <p>
              {copy.sections.provider.body
                .replace("{{seller}}", contact.seller)
                .replace("{{inn}}", contact.inn)
                .replace("{{ogrnip}}", contact.ogrnip)
                .replace("{{email}}", contact.email)}
            </p>
            {settings?.bankDetails && <p>{settings.bankDetails}</p>}
            {settings?.publicRecipientName && (
              <p>
                {copy.sections.provider.recipient.replace(
                  "{{name}}",
                  settings.publicRecipientName
                )}
              </p>
            )}
          </section>

          <section>
            <h2>{copy.sections.subject.title}</h2>
            <p>{copy.sections.subject.body1}</p>
            <p>{copy.sections.subject.body2}</p>
          </section>

          <section>
            <h2>{copy.sections.services.title}</h2>
            <p>{copy.sections.services.body}</p>
            <ul className="legal-list">
              {services.map((service) => (
                <li key={service.slug}>
                  <strong>{service.title}</strong> -{" "}
                  {formatLocalizedPrice(service.priceRub, locale, {
                    perName: service.priceUnit === "PER_NAME"
                  })}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>{copy.sections.order.title}</h2>
            <p>{copy.sections.order.body1}</p>
            <p>{copy.sections.order.body2}</p>
          </section>

          <section>
            <h2>{copy.sections.payment.title}</h2>
            <p>{copy.sections.payment.body}</p>
          </section>

          <section>
            <h2>{copy.sections.refund.title}</h2>
            <p>{copy.sections.refund.body}</p>
          </section>
        </div>

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
