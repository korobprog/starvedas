import { cookies } from "next/headers";
import Link from "next/link";
import { PaymentMethodList } from "@/components/payment-method-list";
import { getPaymentCopy } from "@/i18n/payment-copy";
import { localeCookieName } from "@/i18n/config";
import { getActivePaymentMethods } from "@/server/payment-methods";

export const dynamic = "force-dynamic";

export default async function PaymentPage() {
  const cookieStore = await cookies();
  const copy = getPaymentCopy(cookieStore.get(localeCookieName)?.value);
  const paymentMethods = await getActivePaymentMethods();

  return (
    <main className="legal-page">
      <section className="legal-card">
        <p className="eyebrow">Оплата</p>
        <h1>{copy.pageTitle}</h1>
        <p className="legal-lead">{copy.lead}</p>

        <div className="legal-sections">
          <section>
            <h2>{copy.sectionTitle}</h2>
            <ol className="legal-list">
              <li>{copy.step1}</li>
              <li>{copy.step2}</li>
              <li>{copy.step3}</li>
              <li>{copy.step4}</li>
              <li>{copy.step5}</li>
            </ol>
          </section>

          <section>
            <h2>{copy.methodsTitle}</h2>
            <PaymentMethodList methods={paymentMethods} />
          </section>

          <section>
            <h2>Важная информация</h2>
            <p>{copy.warning}</p>
          </section>
        </div>

        <div className="legal-actions">
          <Link className="button button--primary" href="/#signup">
            {copy.actions.signup}
          </Link>
          <Link className="button" href="/payment/security">
            {copy.actions.security}
          </Link>
          <Link className="button" href="/refund">
            {copy.actions.refund}
          </Link>
        </div>
      </section>
    </main>
  );
}
