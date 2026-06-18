import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { getRefundCopy } from "@/i18n/refund-copy";
import { localeCookieName } from "@/i18n/config";
import { applySiteBrandToText } from "@/lib/site-branding";
import { getPublicOrganizationSettings } from "@/server/organization-settings";
import { getRequestSiteBrand } from "@/server/site-branding";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getRequestSiteBrand();

  return {
    title: applySiteBrandToText("Условия возврата, StarVedas", brand.name),
    description: applySiteBrandToText(
      "Условия отмены заказа и возврата оплаты на сайте StarVedas.",
      brand.name
    )
  };
}

export const dynamic = "force-dynamic";

export default async function RefundPage() {
  const cookieStore = await cookies();
  const copy = getRefundCopy(cookieStore.get(localeCookieName)?.value);
  const { contact } = await getPublicOrganizationSettings();

  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Оплата и возврат</p>
        <h1>{copy.pageTitle}</h1>
        <p className="legal-lead">{copy.lead}</p>

        <div className="legal-sections">
          <section>
            <h2>{copy.requestTitle}</h2>
            <p>{copy.requestText.replace("{{email}}", contact.email)}</p>
          </section>

          <section>
            <h2>{copy.section1Title}</h2>
            <p>{copy.section1Text}</p>
          </section>

          <section>
            <h2>{copy.section2Title}</h2>
            <p>{copy.section2Text}</p>
          </section>

          <section>
            <h2>{copy.section3Title}</h2>
            <p>{copy.section3Text}</p>
          </section>

          <section>
            <h2>{copy.section4Title}</h2>
            <p>{copy.section4Text}</p>
          </section>
        </div>

        <div className="legal-actions">
          <Link className="button button--primary" href="/contacts">
            {copy.actions.contact}
          </Link>
          <Link className="button" href="/payment">
            {copy.actions.payment}
          </Link>
        </div>
      </article>
    </main>
  );
}
