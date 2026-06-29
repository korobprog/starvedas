import { cookies, headers } from "next/headers";
import Link from "next/link";
import { SupportCta } from "@/components/support-cta";
import { VedicGiftForm } from "@/components/vedic-gift-form";
import { getPaymentResultCopy } from "@/i18n/payment-result-copy";
import { localeCookieName } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { shouldHideAdminSupportButtonsOnSourceDomain } from "@/server/organization-settings";
import { getAssignedCuratorFromCookie } from "@/server/referrals";
import { getSourceDomainFromHeaders } from "@/server/source-domain";

async function getOrderPostPurchase(publicToken?: string) {
  if (!publicToken) {
    return null;
  }

  try {
    return await prisma.order.findFirst({
      where: {
        deletedAt: null,
        publicToken
      },
      select: {
        curator: {
          select: {
            name: true,
            slug: true,
            postPurchaseText: true,
            postPurchaseTitle: true,
            postPurchaseUrl: true,
            supportButtonLabel: true,
            supportEnabled: true,
            supportUrl: true
          }
        },
        id: true,
        orderNumber: true,
        service: {
          select: {
            slug: true,
            vedicGiftDescription: true,
            vedicGiftEnabled: true,
            vedicGiftTitle: true
          }
        },
        sourceDomain: true,
        client: {
          select: {
            email: true,
            name: true,
            phone: true,
            telegram: true
          }
        },
        customerEmail: true,
        customerName: true,
        customerPhone: true,
        customerTelegram: true,
        vedicGiftData: {
          select: {
            id: true
          }
        }
      }
    });
  } catch {
    return null;
  }
}

export default async function PaymentSuccessPage({
  searchParams
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const cookieStore = await cookies();
  const params = await searchParams;
  const copy = getPaymentResultCopy(cookieStore.get(localeCookieName)?.value);
  const order = await getOrderPostPurchase(params.order);
  const sourceDomain =
    order?.sourceDomain ?? getSourceDomainFromHeaders(await headers());
  const supportCurator =
    order?.curator ??
    (await getAssignedCuratorFromCookie(sourceDomain).catch(() => null));
  const hideAdminSupportButtons = supportCurator
    ? await shouldHideAdminSupportButtonsOnSourceDomain({
        curatorSlug: supportCurator.slug,
        sourceDomain
      })
    : false;

  const showVedicGift = Boolean(order?.service?.vedicGiftEnabled);
  const initialContactName = order?.client?.name ?? order?.customerName;
  const initialContactEmail =
    order?.client?.email ?? order?.customerEmail ?? undefined;
  const initialContactPhone =
    order?.client?.phone ?? order?.customerPhone ?? undefined;
  const initialContactTelegram =
    order?.client?.telegram ?? order?.customerTelegram ?? undefined;

  return (
    <main className="simple-page">
      <section className="simple-card simple-card--success">
        <p className="eyebrow">{copy.success.eyebrow}</p>
        <h1>{copy.success.title}</h1>
        <p>{copy.success.text}</p>
        {order && (
          <div className="post-purchase-box">
            <p>
              Заказ #{order.orderNumber}, куратор:{" "}
              <strong>{order.curator.name}</strong>
            </p>
            {order.curator.postPurchaseTitle && (
              <h2>{order.curator.postPurchaseTitle}</h2>
            )}
            {order.curator.postPurchaseText && (
              <p>{order.curator.postPurchaseText}</p>
            )}
            {order.curator.postPurchaseUrl && (
              <a
                className="button"
                href={order.curator.postPurchaseUrl}
                rel="noreferrer"
                target="_blank"
              >
                Открыть ссылку куратора
              </a>
            )}
          </div>
        )}
        {supportCurator && (
          <SupportCta
            curatorName={supportCurator.name}
            note="Если после оплаты остались вопросы, напишите куратору."
            supportButtonLabel={supportCurator.supportButtonLabel}
            supportEnabled={
              supportCurator.supportEnabled && !hideAdminSupportButtons
            }
            supportUrl={supportCurator.supportUrl}
          />
        )}
        <Link className="button button--primary" href="/">
          {copy.success.backHome}
        </Link>
      </section>
      {showVedicGift && order?.service && order?.curator && order?.id && (
        <section className="simple-card">
          <VedicGiftForm
            alreadySubmitted={Boolean(order.vedicGiftData)}
            description={
              order.service.vedicGiftDescription?.trim() ||
              "Пожалуйста, укажите данные для составления разбора по ведической астрологии (Джйотиш)."
            }
            initialEmail={initialContactEmail}
            initialName={initialContactName}
            initialPhone={initialContactPhone}
            initialTelegram={initialContactTelegram}
            orderId={order.id}
            title={
              order.service.vedicGiftTitle?.trim() ||
              "🎁 Подарок: ведический астрологический разбор"
            }
          />
        </section>
      )}
    </main>
  );
}
