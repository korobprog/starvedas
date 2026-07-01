import { OrderStatus, PaymentStatus } from "@prisma/client";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { PaymentReceiptLink } from "@/components/payment-receipt-link";
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
        publicToken: true,
        status: true,
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
        payment: {
          select: {
            receiptLabel: true,
            status: true,
            receiptUrl: true
          }
        },
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
  const isPaymentConfirmed = Boolean(
    order?.status === OrderStatus.PAID &&
    order.payment?.status === PaymentStatus.SUCCEEDED
  );
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
        <h1>
          {order && !isPaymentConfirmed
            ? "Проверяем оплату"
            : copy.success.title}
        </h1>
        <p>
          {order && !isPaymentConfirmed
            ? "Платёжная форма вернула вас на сайт. Финальный статус берём из защищённого webhook-подтверждения."
            : copy.success.text}
        </p>
        {order && isPaymentConfirmed && (
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
            {order.payment?.receiptUrl && (
              <PaymentReceiptLink
                label={order.payment.receiptLabel}
                url={order.payment.receiptUrl}
              />
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
        {order && !isPaymentConfirmed && (
          <div className="post-purchase-box">
            <p>
              Возврат из платежной формы получен, но мы ещё ждём подтверждение
              оплаты от платёжной системы.
            </p>
            <p className="form-note">
              Доступ к материалам куратора откроется после webhook-подтверждения
              оплаты. Обычно это занимает несколько секунд — обновите страницу
              или откройте покупку в личном кабинете.
            </p>
            <Link
              className="button"
              href={`/client/orders/${order.publicToken}`}
            >
              Открыть покупку
            </Link>
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
      {isPaymentConfirmed &&
        showVedicGift &&
        order?.service &&
        order?.curator &&
        order?.id && (
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
