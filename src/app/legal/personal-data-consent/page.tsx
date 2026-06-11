import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { getConsentCopy } from "@/i18n/consent-copy";
import { localeCookieName } from "@/i18n/config";
import { applyLegalPlaceholders } from "@/lib/legal-content";
import { getPublicOrganizationSettings } from "@/server/organization-settings";

export const metadata: Metadata = {
  title: "Согласие на обработку персональных данных, StarVedas",
  description:
    "Согласие клиента на обработку персональных данных при оформлении заявки StarVedas."
};

export const dynamic = "force-dynamic";

export default async function PersonalDataConsentPage() {
  const cookieStore = await cookies();
  const copy = getConsentCopy(cookieStore.get(localeCookieName)?.value);
  const { contact } = await getPublicOrganizationSettings();

  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Юридические документы</p>
        <h1>{copy.pageTitle}</h1>
        <p className="legal-lead">{copy.lead}</p>

        <div className="legal-sections">
          {copy.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              <p>{applyLegalPlaceholders(section.body, contact)}</p>
            </section>
          ))}
        </div>

        <div className="legal-actions">
          <Link className="button button--primary" href="/#signup">
            {copy.actions.form}
          </Link>
          <Link className="button" href="/legal/privacy">
            {copy.actions.privacy}
          </Link>
        </div>
      </article>
    </main>
  );
}
