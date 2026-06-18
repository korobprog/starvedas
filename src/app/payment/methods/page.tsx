import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { PaymentMethodList } from "@/components/payment-method-list";
import { getPaymentMethodsCopy } from "@/i18n/payment-methods-copy";
import { localeCookieName } from "@/i18n/config";
import { applySiteBrandToText } from "@/lib/site-branding";
import { getActivePaymentMethods } from "@/server/payment-methods";
import { getRequestSiteBrand } from "@/server/site-branding";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getRequestSiteBrand();

  return {
    title: applySiteBrandToText("Способы оплаты, StarVedas", brand.name),
    description: applySiteBrandToText(
      "Доступные способы оплаты заказов StarVedas.",
      brand.name
    )
  };
}

export const dynamic = "force-dynamic";

export default async function PaymentMethodsPage() {
  const cookieStore = await cookies();
  const copy = getPaymentMethodsCopy(cookieStore.get(localeCookieName)?.value);
  const paymentMethods = await getActivePaymentMethods();

  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Оплата</p>
        <h1>{copy.pageTitle}</h1>
        <p className="legal-lead">{copy.lead}</p>

        <PaymentMethodList methods={paymentMethods} />

        <div className="legal-sections">
          <section>
            <h2>{copy.beforeTitle}</h2>
            <p>{copy.beforeText}</p>
          </section>

          <section>
            <h2>{copy.afterTitle}</h2>
            <p>{copy.afterText}</p>
          </section>
        </div>

        <div className="legal-actions">
          <Link className="button button--primary" href="/#signup">
            {copy.actions.signup}
          </Link>
          <Link className="button" href="/payment/security">
            {copy.actions.security}
          </Link>
        </div>
      </article>
    </main>
  );
}
