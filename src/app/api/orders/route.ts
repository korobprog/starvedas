import {
  ClientFunnelStatus,
  LeadStatus,
  OrderStatus,
  PaymentStatus,
  PriceUnit,
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
import { getServiceForOrder, type OrderService } from "@/server/services";
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

type SelectedOptionRow = {
  description: string | null;
  id: string;
  priceRub: number;
  priceUnit: PriceUnit;
  sortOrder: number;
  title: string;
};

type ResolvedLine = {
  amountRub: number;
  names: string[];
  participantCount: number;
  participantsText: string;
  selectedOptions: SelectedOptionRow[];
  service: OrderService;
};

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
  const isMultiItem = Boolean(data.items && data.items.length > 0);
  const itemInputs = isMultiItem
    ? data.items!
    : [
        {
          serviceSlug: data.serviceSlug ?? "",
          selectedServiceOptionIds: data.selectedServiceOptionIds,
          participantCount: data.participantCount ?? 0,
          participantsText: data.participantsText ?? ""
        }
      ];

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
    const curator = await getCuratorForReferral(
      requestedReferralSlug,
      sourceDomain
    );

    if (!curator) {
      return NextResponse.json(
        { message: "Куратор не найден" },
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

    const lines: ResolvedLine[] = [];

    for (const input of itemInputs) {
      const service = await getServiceForOrder(input.serviceSlug, locale);

      if (!service) {
        return NextResponse.json(
          { message: "Услуга не найдена" },
          { status: 404 }
        );
      }

      const lineNames = getParticipantNames(input.participantsText);

      if (lineNames.length !== input.participantCount) {
        return NextResponse.json(
          { message: "Количество участников не совпадает со списком" },
          { status: 400 }
        );
      }

      const selectedServiceOptionIds = service.isSubscription
        ? []
        : Array.from(new Set(input.selectedServiceOptionIds));
      const mustSelectServiceOptions =
        !service.isSubscription &&
        (service.slug === "single-rite" || service.options.length > 0);

      if (mustSelectServiceOptions && selectedServiceOptionIds.length === 0) {
        return NextResponse.json(
          {
            message: `Выберите хотя бы один обряд: ${service.localizedTitle}`
          },
          { status: 400 }
        );
      }

      const selectedOptions: SelectedOptionRow[] = selectedServiceOptionIds.length
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

      const requiresParticipants =
        service.priceUnit !== PriceUnit.PER_ORDER ||
        selectedOptions.some(
          (option) => option.priceUnit !== PriceUnit.PER_ORDER
        );

      if (requiresParticipants && lineNames.length === 0) {
        return NextResponse.json(
          {
            message: `Добавьте участников для услуги: ${service.localizedTitle}`
          },
          { status: 400 }
        );
      }

      const amountRub = selectedOptions.length
        ? calculateSelectedOptionsAmount({
            options: selectedOptions,
            participantCount: lineNames.length,
            participantNames: lineNames
          })
        : calculateOrderAmount({
            participantCount: lineNames.length,
            participantNames: lineNames,
            priceRub: service.localizedPrice,
            priceUnit: service.priceUnit
          });

      lines.push({
        amountRub,
        names: lineNames,
        participantCount: lineNames.length,
        participantsText: lineNames.join("\n"),
        selectedOptions,
        service
      });
    }

    const primaryService = lines[0].service;
    const currency = primaryService.currency;
    const aggregateNames = lines.flatMap((line) => line.names);
    const aggregateParticipantsText = aggregateNames.join("\n");
    const aggregateParticipantCount = aggregateNames.length;
    const totalAmountRub = lines.reduce((sum, line) => sum + line.amountRub, 0);
    const paymentDescription = isMultiItem
      ? lines.map((line) => line.service.localizedTitle).join(", ")
      : lines[0].selectedOptions.length
        ? `${primaryService.localizedTitle}: ${lines[0].selectedOptions
            .map((option) => option.title)
            .join(", ")}`
        : primaryService.localizedTitle;
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

      await saveClientParticipants(tx, client.id, aggregateNames);

      const order = await tx.order.create({
        data: {
          amountRub: totalAmountRub,
          currency,
          consentPersonalData: true,
          customerEmail,
          customerName: data.customerName,
          customerPhone,
          customerTelegram,
          isMultiItem,
          isSubscriptionSnapshot: isMultiItem
            ? false
            : primaryService.isSubscription,
          leadStatus: initialLeadStatus,
          participantCount: aggregateParticipantCount,
          participantsText: aggregateParticipantsText,
          publicToken: createOrderPublicToken(),
          referralSlug,
          sourceDomain,
          status: initialOrderStatus,
          subscriptionEndsAtSnapshot:
            !isMultiItem && primaryService.isSubscription
              ? primaryService.subscriptionEndsAt
              : null,
          subscriptionStartsAtSnapshot:
            !isMultiItem && primaryService.isSubscription
              ? primaryService.subscriptionStartsAt
              : null,
          curator: { connect: { id: curator.id } },
          service: { connect: { id: primaryService.id } },
          client: { connect: { id: client.id } },
          payment: {
            create: {
              amountRub: totalAmountRub,
              currency,
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

      let participantSortOffset = 0;
      let optionSortOffset = 0;

      for (const [index, line] of lines.entries()) {
        const orderItemId = isMultiItem
          ? (
              await tx.orderItem.create({
                data: {
                  amountRub: line.amountRub,
                  currencySnapshot: line.service.currency,
                  isSubscriptionSnapshot: line.service.isSubscription,
                  order: { connect: { id: order.id } },
                  participantCount: line.participantCount,
                  participantsText: line.participantsText,
                  priceRubSnapshot: line.service.localizedPrice,
                  priceUnitSnapshot: line.service.priceUnit,
                  receiptNameSnapshot:
                    line.service.receiptName?.trim() ||
                    line.service.localizedTitle,
                  service: { connect: { id: line.service.id } },
                  sortOrder: index + 1,
                  subscriptionEndsAtSnapshot: line.service.isSubscription
                    ? line.service.subscriptionEndsAt
                    : null,
                  subscriptionStartsAtSnapshot: line.service.isSubscription
                    ? line.service.subscriptionStartsAt
                    : null,
                  titleSnapshot: line.service.localizedTitle,
                  vatTaxTypeSnapshot: line.service.vatTaxType
                },
                select: { id: true }
              })
            ).id
          : null;

        if (line.names.length) {
          await tx.orderParticipant.createMany({
            data: line.names.map((name, participantIndex) => ({
              fullName: name,
              orderId: order.id,
              orderItemId,
              sortOrder: participantSortOffset + participantIndex + 1
            }))
          });
          participantSortOffset += line.names.length;
        }

        if (line.selectedOptions.length) {
          await tx.orderServiceOption.createMany({
            data: line.selectedOptions.map((option, optionIndex) => {
              const quantity = getPriceUnitQuantity({
                participantCount: line.participantCount,
                participantNames: line.names,
                priceUnit: option.priceUnit
              });

              return {
                descriptionSnapshot: option.description,
                optionId: option.id,
                orderId: order.id,
                orderItemId,
                priceRubSnapshot: option.priceRub,
                priceUnitSnapshot: option.priceUnit,
                quantitySnapshot: quantity,
                serviceTitleSnapshot: isMultiItem
                  ? line.service.localizedTitle
                  : null,
                sortOrder: optionSortOffset + optionIndex + 1,
                titleSnapshot: option.title,
                totalRubSnapshot: option.priceRub * quantity
              };
            })
          });
          optionSortOffset += line.selectedOptions.length;
        }
      }

      await captureOrderRevision(tx, {
        actorUserId: undefined,
        eventType: orderRevisionEventTypes.created,
        note: "Заказ создан через публичную форму",
        orderId: order.id
      });

      return order;
    });

    const resultBaseUrl = getSiteUrlForSourceDomain(sourceDomain);
    const prodamusProducts = isMultiItem
      ? lines.flatMap((line) =>
          line.selectedOptions.length
            ? line.selectedOptions.map((option) => ({
                name: `${line.service.localizedTitle}: ${option.title}`,
                priceRub: option.priceRub,
                quantity: getPriceUnitQuantity({
                  participantCount: line.participantCount,
                  participantNames: line.names,
                  priceUnit: option.priceUnit
                }),
                vatTaxType: line.service.vatTaxType
              }))
            : [
                {
                  name: line.service.localizedTitle,
                  priceRub: line.service.localizedPrice,
                  quantity: getPriceUnitQuantity({
                    participantCount: line.participantCount,
                    participantNames: line.names,
                    priceUnit: line.service.priceUnit
                  }),
                  vatTaxType: line.service.vatTaxType
                }
              ]
        )
      : lines[0].selectedOptions.length
        ? lines[0].selectedOptions.map((option) => ({
            name: option.title,
            priceRub: option.priceRub,
            quantity: getPriceUnitQuantity({
              participantCount: lines[0].participantCount,
              participantNames: lines[0].names,
              priceUnit: option.priceUnit
            }),
            vatTaxType: primaryService.vatTaxType
          }))
        : undefined;
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
          products: prodamusProducts,
          provider: paymentProvider.code,
          receiptName:
            primaryService.receiptName?.trim() ||
            primaryService.localizedTitle,
          successUrl: createResultUrl(
            resultBaseUrl,
            "/payment/success",
            order.publicToken
          ),
          vatTaxType: primaryService.vatTaxType
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
        participantCount: aggregateParticipantCount,
        participantNames: aggregateNames,
        locale,
        selectedOptions: lines.flatMap((line) =>
          line.selectedOptions.map((option) => ({
            priceRub: option.priceRub,
            title: isMultiItem
              ? `${line.service.localizedTitle}: ${option.title}`
              : option.title
          }))
        ),
        serviceTitle: isMultiItem
          ? lines.map((line) => line.service.localizedTitle).join(", ")
          : primaryService.localizedTitle,
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
      currency,
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
