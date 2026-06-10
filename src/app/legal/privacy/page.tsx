import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { getPrivacyCopy } from "@/i18n/privacy-copy";
import { localeCookieName } from "@/i18n/config";
import { getPublicOrganizationSettings } from "@/server/organization-settings";

export const metadata: Metadata = {
  title: "Политика конфиденциальности, StarVedas",
  description: "Политика StarVedas в отношении обработки персональных данных."
};

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const cookieStore = await cookies();
  const copy = getPrivacyCopy(cookieStore.get(localeCookieName)?.value);
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
              {section.body.map((paragraph) => (
                <p key={paragraph}>
                  {paragraph
                    .replace("{{seller}}", contact.seller)
                    .replace("{{email}}", contact.email)}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="legal-actions">
          <Link className="button button--primary" href="/#signup">
            {copy.actions.signup}
          </Link>
          <Link className="button" href="/contacts">
            {copy.actions.contacts}
          </Link>
        </div>
      </article>
    </main>
  );
}
