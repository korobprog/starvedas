import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { getContactsCopy } from "@/i18n/contacts-copy";
import { localeCookieName } from "@/i18n/config";
import { applySiteBrandToText } from "@/lib/site-branding";
import { getPublicOrganizationSettings } from "@/server/organization-settings";
import { getRequestSiteBrand } from "@/server/site-branding";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getRequestSiteBrand();

  return {
    title: applySiteBrandToText("Контакты, StarVedas", brand.name),
    description: applySiteBrandToText(
      "Контакты и данные исполнителя StarVedas.",
      brand.name
    )
  };
}

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const cookieStore = await cookies();
  const copy = getContactsCopy(cookieStore.get(localeCookieName)?.value);
  const { contact } = await getPublicOrganizationSettings();

  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Контакты</p>
        <h1>{copy.pageTitle}</h1>
        <p className="legal-lead">{copy.lead}</p>

        <dl className="details-list">
          <div>
            <dt>{copy.labels.operator}</dt>
            <dd>{contact.seller}</dd>
          </div>
          <div>
            <dt>{copy.labels.inn}</dt>
            <dd>{contact.inn}</dd>
          </div>
          <div>
            <dt>{copy.labels.ogrn}</dt>
            <dd>{contact.ogrnip}</dd>
          </div>
          <div>
            <dt>{copy.labels.address}</dt>
            <dd>{contact.address}</dd>
          </div>
          <div>
            <dt>{copy.labels.email}</dt>
            <dd>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </dd>
          </div>
          <div>
            <dt>{copy.labels.phone}</dt>
            <dd>
              <a href={`tel:${contact.phone.replaceAll(" ", "")}`}>
                {contact.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt>{copy.labels.telegram}</dt>
            <dd>
              <a href={contact.telegram}>{contact.telegram}</a>
            </dd>
          </div>
          <div>
            <dt>{copy.labels.support}</dt>
            <dd>{contact.supportHours}</dd>
          </div>
        </dl>

        <div className="legal-actions">
          <Link className="button button--primary" href="/#signup">
            {copy.actions.signup}
          </Link>
          <Link className="button" href="/legal/privacy">
            {copy.actions.privacy}
          </Link>
        </div>
      </article>
    </main>
  );
}
