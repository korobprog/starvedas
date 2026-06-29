import {
  ClientFunnelStatus,
  LeadStatus,
  OrderStatus,
  PaymentStatus,
  Prisma
} from "@prisma/client";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { localeCookieName, normalizeLocale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { normalizePhoneNumber } from "@/lib/phone-validation";
import { getCurrentClientProfile } from "@/server/client-auth";
import {
  calculateOrderAmount,
  calculateSelectedOptionsAmount,
  createOrderSchema,
  getParticipantNames,
  getPriceUnitQuantity,
  normalizeOptional
} from "@/server/order-validation";
import { upsertClientProfileForFunnel } from "@/server/client-profiles";
import { createProdamusPaymentUrl } from "@/server/payform";
import {
  getPaymentProviderForCheckout,
  isCustomPaymentProviderCode
} from "@/server/payment-providers";
import { getCuratorForReferral } from "@/server/referrals";
import { shouldHideAdminSupportButtonsOnSourceDomain } from "@/server/organization-settings";
import { getServiceForOrder } from "@/server/services";
import { getSourceDomainFromHeaders } from "@/server/source-domain";
import { saveClientParticipants } from "@/server/saved-participants";
import { sendOrderCreatedEmail } from "@/server/email/order-emails";
import { getSiteUrlForSourceDomain } from "@/server/email/site-url";
import {
  captureOrderRevision,
  orderRevisionEventTypes
} from "@/server/order-revisions";
import { sendOrderCreatedTelegramNotification } from "@/server/telegram-notifications";

function createProviderPaymentUrl({
  amountRub,
  customer,
  description,
  failUrl,
  orderNumber,
  products,
  provider,
  receiptName,
  successUrl,
  vatTaxType
}: {
  amountRub: number;
  customer: {
    email?: string | null;
    name: string;
    phone?: string | null;
  };
  description: string;
  failUrl?: string;
  orderNumber: number;
  products?: Array<{
    name: string;
    priceRub: number;
    quantity: number;
    vatTaxType?: number;
  }>;
  provider: string;
  receiptName: string;
  successUrl?: string;
  vatTaxType: number;
}) {
  if (provider !== "prodamus") {
    throw new Error("Unsupported payment provider");
  }

  return createProdamusPaymentUrl({
    amountRub,
    customer,
    description,
    failUrl,
    orderNumber,
    products,
    receiptName,
    successUrl,
    vatTaxType
  });
}

function createOrderPublicToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function createResultUrl(baseUrl: string, path: string, publicToken: string) {
  const url = new URL(path, baseUrl);

  url.searchParams.set("order", publicToken);

  return url.toString();
}

async function findFirstStoredReferralSlug({
  clientId,
  email,
  phone,
  sourceDomain,
  telegram
}: {
  clientId?: string | null;
  email?: string | null;
  phone?: string | null;
  sourceDomain: string;
  telegram?: string | null;
}) {
  if (clientId) {
    const client = await prisma.clientProfile.findUnique({
      where: { id: clientId },
      select: { referralSlug: true }
    });

    if (client?.referralSlug) {
      return client.referralSlug;
    }
  }

  const identityWhere: Prisma.ClientProfileWhereInput[] = [];

  if (telegram) {
    identityWhere.push({ sourceDomain, telegram });
  }

  if (phone) {
    identityWhere.push({ phone, sourceDomain });
  }

  if (email) {
    identityWhere.push({ email, sourceDomain });
  }

  if (!identityWhere.length) {
    return null;
  }

  const client = await prisma.clientProfile.findFirst({
    orderBy: { createdAt: "asc" },
    select: { referralSlug: true },
    where: {
      OR: identityWhere,
      referralSlug: {
        not: null
      }
    }
  });

  return client?.referralSlug ?? null;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(localeCookieName)?.value);
  const json = await request.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: parsed.error.issues[0]?.message ?? "Некорректные данные заказа"
      },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const sourceDomain = getSourceDomainFromHeaders(request.headers);
  const names = getParticipantNames(data.participantsText);

  if (names.length !== data.participantCount) {
    return NextResponse.json(
      { message: "Количество участников не совпадает со списком" },
      { status: 400 }
    );
  }

  try {
    const currentClient = await getCurrentClientProfile();
    const customerEmail = normalizeOptional(data.customerEmail);
    const customerPhone = normalizePhoneNumber(
      data.customerPhone,
      data.customerPhoneCountry
    );
    const customerTelegram = normalizeOptional(data.customerTelegram);
    const firstStoredReferralSlug = await findFirstStoredReferralSlug({
      clientId: currentClient?.id,
      email: customerEmail,
      phone: customerPhone,
      sourceDomain,
      telegram: customerTelegram
    });
    const requestedReferralSlug =
      firstStoredReferralSlug ?? data.referralSlug ?? undefined;
    const [curator, service] = await Promise.all([
      getCuratorForReferral(requestedReferralSlug, sourceDomain),
      getServiceForOrder(data.serviceSlug, locale)
    ]);

    if (!curator || !service) {
      return NextResponse.json(
        { message: "Куратор или услуга не найдены" },
        { status: 404 }
      );
    }

    const hideAdminSupportButtons =
      await shouldHideAdminSupportButtonsOnSourceDomain({
        curatorSlug: curator.slug,
        sourceDomain
      });
    const supportEnabled = curator.supportEnabled && !hideAdminSupportButtons;

    const paymentProvider = await getPaymentProviderForCheckout(
      data.paymentProvider,
      curator.id,
      locale
    );

    if (!paymentProvider) {
      return NextResponse.json(
        { message: "Способ оплаты не включен" },
        { status: 400 }
      );
    }

    const isCustomPayment = isCustomPaymentProviderCode(paymentProvider.code);
    const initialLeadStatus = isCustomPayment
      ? LeadStatus.WAITING_PAYMENT_VERIFICATION
      : LeadStatus.WAITING_PAYMENT;
    const initialOrderStatus = isCustomPayment
      ? OrderStatus.WAITING_PAYMENT_VERIFICATION
      : OrderStatus.PENDING_PAYMENT;
    const initialPaymentStatus = isCustomPayment
      ? PaymentStatus.AWAITING_VERIFICATION
      : PaymentStatus.PENDING;
    const customPaymentPayload: Prisma.InputJsonObject | undefined =
      isCustomPayment
        ? {
            instructions: paymentProvider.instructions
              ? {
                  accountNumber:
                    paymentProvider.instructions.accountNumber ?? null,
                  bankName: paymentProvider.instructions.bankName ?? null,
                  instructions:
                    paymentProvider.instructions.instructions ?? null,
                  paymentComment:
                    paymentProvider.instructions.paymentComment ?? null,
                  phone: paymentProvider.instructions.phone ?? null,
                  recipientName:
                    paymentProvider.instructions.recipientName ?? null,
                  verificationPeriod:
                    paymentProvider.instructions.verificationPeriod ?? null
                }
              : null,
            providerCode: paymentProvider.code,
            providerName: paymentProvider.name
          }
        : undefined;

    const selectedServiceOptionIds = service.isSubscription
      ? []
      : Array.from(new Set(data.selectedServiceOptionIds));
    const mustSelectServiceOptions =
      !service.isSubscription &&
      (service.slug === "single-rite" || service.options.length > 0);

    if (mustSelectServiceOptions && selectedServiceOptionIds.length === 0) {
      return NextResponse.json(
        { message: "Выберите хотя бы один обряд" },
        { status: 400 }
      );
    }

    const selectedOptions = selectedServiceOptionIds.length
      ? await prisma.serviceOption.findMany({
          orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
          select: {
            description: true,
            id: true,
            priceRub: true,
            priceUnit: true,
            sortOrder: true,
            title: true
          },
          where: {
            active: true,
            id: { in: selectedServiceOptionIds },
            OR: [
              { eventStartsAt: null },
              { eventStartsAt: { gt: new Date() } }
            ],
            serviceId: service.id
          }
        })
      : [];

    if (selectedOptions.length !== selectedServiceOptionIds.length) {
      return NextResponse.json(
        { message: "Некоторые выбранные обряды недоступны" },
        { status: 400 }
      );
    }

    const amountRub = selectedOptions.length
      ? calculateSelectedOptionsAmount({
          options: selectedOptions,
          participantCount: data.participantCount,
          participantNames: names
        })
      : calculateOrderAmount({
          participantCount: data.participantCount,
          participantNames: names,
          priceRub: service.localizedPrice,
          priceUnit: service.priceUnit
        });
    const paymentDescription = selectedOptions.length
      ? `${service.localizedTitle}: ${selectedOptions.map((option) => option.title).join(", ")}`
      : service.localizedTitle;
    const referralSlug = requestedReferralSlug ?? curator.slug;
    const consentMailings = curator.showMailingConsentCheckbox
      ? data.consentMailings
      : false;

    const order = await prisma.$transaction(async (tx) => {
      const client = await upsertClientProfileForFunnel(tx, {
        clientId: currentClient?.id,
        consentMailings,
        consentMailingsSource: "checkout",
        consentPersonalData: true,
        curatorId: curator.id,
        email: customerEmail,
        name: data.customerName,
        phone: customerPhone,
        referralSlug,
        source: "site",
        sourceDomain,
        status: ClientFunnelStatus.DID_NOT_BUY,
        telegram: customerTelegram,
        telegramId: currentClient?.telegramId
      });

      await saveClientParticipants(tx, client.id, names);

      const order = await tx.order.create({
        data: {
          amountRub,
          currency: service.currency,
          consentPersonalData: true,
          customerEmail,
          customerName: data.customerName,
          customerPhone,
          customerTelegram,
          isSubscriptionSnapshot: service.isSubscription,
          leadStatus: initialLeadStatus,
          participantCount: data.participantCount,
          participantsText: data.participantsText,
          publicToken: createOrderPublicToken(),
          referralSlug,
          sourceDomain,
          status: initialOrderStatus,
          subscriptionEndsAtSnapshot: service.isSubscription
            ? service.subscriptionEndsAt
            : null,
          subscriptionStartsAtSnapshot: service.isSubscription
            ? service.subscriptionStartsAt
            : null,
          curator: {
            connect: {
              id: curator.id
            }
          },
          service: {
            connect: {
              id: service.id
            }
          },
          client: {
            connect: {
              id: client.id
            }
          },
          participants: {
            create: names.map((name, index) => ({
              fullName: name,
              sortOrder: index + 1
            }))
          },
          serviceOptions: selectedOptions.length
            ? {
                create: selectedOptions.map((option, index) => {
                  const quantity = getPriceUnitQuantity({
                    participantCount: data.participantCount,
                    participantNames: names,
                    priceUnit: option.priceUnit
                  });

                  return {
                    descriptionSnapshot: option.description,
                    optionId: option.id,
                    priceRubSnapshot: option.priceRub,
                    priceUnitSnapshot: option.priceUnit,
                    quantitySnapshot: quantity,
                    sortOrder: index + 1,
                    titleSnapshot: option.title,
                    totalRubSnapshot: option.priceRub * quantity
                  };
                })
              }
            : undefined,
          payment: {
            create: {
              amountRub,
              currency: service.currency,
              provider: paymentProvider.code,
              rawPayload: customPaymentPayload,
              status: initialPaymentStatus
            }
          },
          statusHistory: {
            create: {
              toStatus: initialLeadStatus,
              note: isCustomPayment
                ? "Заказ создан с резервной оплатой, ожидает проверки платежа"
                : "Заказ создан через сайт"
            }
          }
        },
        select: {
          amountRub: true,
          id: true,
          orderNumber: true,
          publicToken: true
        }
      });

      await captureOrderRevision(tx, {
        actorUserId: undefined,
        eventType: orderRevisionEventTypes.created,
        note: "Заказ создан через публичную форму",
        orderId: order.id
      });

      return order;
    });

    const resultBaseUrl = getSiteUrlForSourceDomain(sourceDomain);
    const paymentUrl = isCustomPayment
      ? undefined
      : createProviderPaymentUrl({
          amountRub: order.amountRub,
          customer: {
            email: customerEmail,
            name: data.customerName,
            phone: customerPhone
          },
          description: paymentDescription,
          failUrl: createResultUrl(
            resultBaseUrl,
            "/payment/fail",
            order.publicToken
          ),
          orderNumber: order.orderNumber,
          products: selectedOptions.length
            ? selectedOptions.map((option) => ({
                name: option.title,
                priceRub: option.priceRub,
                quantity: getPriceUnitQuantity({
                  participantCount: data.participantCount,
                  participantNames: names,
                  priceUnit: option.priceUnit
                }),
                vatTaxType: service.vatTaxType
              }))
            : undefined,
          provider: paymentProvider.code,
          receiptName: service.receiptName?.trim() || service.localizedTitle,
          successUrl: createResultUrl(
            resultBaseUrl,
            "/payment/success",
            order.publicToken
          ),
          vatTaxType: service.vatTaxType
        });

    await prisma.payment.update({
      where: {
        orderId: order.id
      },
      data: {
        paymentUrl,
        providerPaymentId: String(order.orderNumber),
        rawPayload: customPaymentPayload
      }
    });

    try {
      await sendOrderCreatedTelegramNotification({
        amountRub: order.amountRub,
        curatorName: curator.name,
        customerEmail,
        customerName: data.customerName,
        customerPhone,
        customerTelegram,
        orderNumber: order.orderNumber,
        participantCount: data.participantCount,
        participantNames: names,
        locale,
        selectedOptions: selectedOptions.map((option) => ({
          priceRub: option.priceRub,
          title: option.title
        })),
        serviceTitle: service.localizedTitle,
        sourceDomain,
        statusText: isCustomPayment
          ? "ожидает проверки оплаты"
          : "ожидает оплаты"
      });
    } catch (error) {
      console.error("Telegram order notification failed", error);
    }

    try {
      await sendOrderCreatedEmail(order.id);
    } catch (error) {
      console.error("Order created email failed", error);
    }

    return NextResponse.json({
      amountRub: order.amountRub,
      currency: service.currency,
      curatorName: curator.name,
      isCustomPayment,
      orderNumber: order.orderNumber,
      paymentInstructions: paymentProvider.instructions,
      paymentProviderName: paymentProvider.name,
      paymentStatus: initialPaymentStatus,
      paymentUrl,
      postPurchaseText: curator.postPurchaseText,
      postPurchaseTitle: curator.postPurchaseTitle,
      postPurchaseUrl: curator.postPurchaseUrl,
      supportButtonLabel: curator.supportButtonLabel,
      supportEnabled,
      supportUrl: curator.supportUrl
    });
  } catch (error) {
    console.error("Order creation failed", error);

    return NextResponse.json(
      { message: "Не удалось создать заказ" },
      { status: 500 }
    );
  }
}
