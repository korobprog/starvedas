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

function createResultUrl(
  requestUrl: string,
  path: string,
  publicToken: string
) {
  const url = new URL(path, requestUrl);

  url.searchParams.set("order", publicToken);

  return url.toString();
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
    const [curator, service] = await Promise.all([
      getCuratorForReferral(data.referralSlug),
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

    const selectedServiceOptionIds = Array.from(
      new Set(data.selectedServiceOptionIds)
    );

    if (
      service.slug === "single-rite" &&
      selectedServiceOptionIds.length === 0
    ) {
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

    if (service.slug !== "single-rite" && selectedOptions.length > 0) {
      return NextResponse.json(
        { message: "Карточки обрядов доступны только для раздела Один обряд" },
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
    const customerEmail = normalizeOptional(data.customerEmail);
    const customerPhone = normalizePhoneNumber(
      data.customerPhone,
      data.customerPhoneCountry
    );
    const customerTelegram = normalizeOptional(data.customerTelegram);
    const referralSlug = data.referralSlug ?? curator.slug;
    const consentMailings = curator.showMailingConsentCheckbox
      ? data.consentMailings
      : false;

    const order = await prisma.$transaction(async (tx) => {
      const client = await upsertClientProfileForFunnel(tx, {
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
        telegram: customerTelegram
      });

      return tx.order.create({
        data: {
          amountRub,
          currency: service.currency,
          consentPersonalData: true,
          customerEmail,
          customerName: data.customerName,
          customerPhone,
          customerTelegram,
          leadStatus: initialLeadStatus,
          participantCount: data.participantCount,
          participantsText: data.participantsText,
          publicToken: createOrderPublicToken(),
          sourceDomain,
          status: initialOrderStatus,
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
    });

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
            request.url,
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
            request.url,
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
    } catch {
      console.error("Telegram order notification failed");
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
  } catch {
    console.error("Order creation failed");

    return NextResponse.json(
      { message: "Не удалось создать заказ" },
      { status: 500 }
    );
  }
}
