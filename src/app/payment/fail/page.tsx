import { cookies, headers } from "next/headers";
import Link from "next/link";
import { SupportCta } from "@/components/support-cta";
import { getPaymentResultCopy } from "@/i18n/payment-result-copy";
import { localeCookieName } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { shouldHideAdminSupportButtonsOnSourceDomain } from "@/server/organization-settings";
import { getAssignedCuratorFromCookie } from "@/server/referrals";
import { getSourceDomainFromHeaders } from "@/server/source-domain";

async function getOrderSupport(publicToken?: string) {
  if (!publicToken) {
    return null;
  }

  try {
    return await prisma.order.findUnique({
      where: {
        publicToken
      },
      select: {
        curator: {
          select: {
            name: true,
            slug: true,
            supportButtonLabel: true,
            supportEnabled: true,
            supportUrl: true
          }
        },
        sourceDomain: true
      }
    });
  } catch {
    return null;
  }
}

export default async function PaymentFailPage({
  searchParams
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const cookieStore = await cookies();
  const params = await searchParams;
  const copy = getPaymentResultCopy(cookieStore.get(localeCookieName)?.value);
  const order = await getOrderSupport(params.order);
  const supportCurator =
    order?.curator ?? (await getAssignedCuratorFromCookie().catch(() => null));
  const sourceDomain =
    order?.sourceDomain ?? getSourceDomainFromHeaders(await headers());
  const hideAdminSupportButtons = supportCurator
    ? await shouldHideAdminSupportButtonsOnSourceDomain({
        curatorSlug: supportCurator.slug,
        sourceDomain
      })
    : false;

  return (
    <main className="simple-page">
      <section className="simple-card simple-card--warning">
        <p className="eyebrow">{copy.fail.eyebrow}</p>
        <h1>{copy.fail.title}</h1>
        <p>{copy.fail.text}</p>
        {supportCurator && (
          <SupportCta
            curatorName={supportCurator.name}
            note="Если оплата не прошла или нужен другой способ, напишите куратору."
            supportButtonLabel={supportCurator.supportButtonLabel}
            supportEnabled={
              supportCurator.supportEnabled && !hideAdminSupportButtons
            }
            supportUrl={supportCurator.supportUrl}
          />
        )}
        <Link className="button button--primary" href="/#signup">
          {copy.fail.backToSignup}
        </Link>
      </section>
    </main>
  );
}
