import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { getPaymentSecurityCopy } from "@/i18n/payment-security-copy";
import { localeCookieName } from "@/i18n/config";
import { applySiteBrandToText } from "@/lib/site-branding";
import { getRequestSiteBrand } from "@/server/site-branding";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getRequestSiteBrand();

  return {
    title: applySiteBrandToText("Безопасность платежей, StarVedas", brand.name),
    description: applySiteBrandToText(
      "Как StarVedas обрабатывает оплату и защищает платежные данные.",
      brand.name
    )
  };
}

export default async function PaymentSecurityPage() {
  const cookieStore = await cookies();
  const brand = await getRequestSiteBrand();
  const copy = getPaymentSecurityCopy(
    cookieStore.get(localeCookieName)?.value,
    brand.name
  );

  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Безопасность</p>
        <h1>{copy.pageTitle}</h1>
        <p className="legal-lead">{copy.lead}</p>

        <div className="legal-sections">
          <section>
            <h2>{copy.cardTitle}</h2>
            <p>{copy.cardText}</p>
          </section>

          <section>
            <h2>{copy.statusTitle}</h2>
            <p>{copy.statusText}</p>
          </section>

          <section>
            <h2>{copy.failTitle}</h2>
            <p>{copy.failText}</p>
          </section>
        </div>

        <div className="legal-actions">
          <Link className="button button--primary" href="/payment">
            {copy.actions.payment}
          </Link>
          <Link className="button" href="/payment/methods">
            {copy.actions.methods}
          </Link>
        </div>
      </article>
    </main>
  );
}
