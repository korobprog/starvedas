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
  type ChildRecordInputParsed,
  createOrderSchema,
  getParticipantNames,
  getPriceUnitQuantity,
  normalizeOptional
} from "@/server/order-validation";
import { formatChildRecordLines, getChildUnitsTotal } from "@/lib/shraddha";
import { upsertClientProfileForFunnel } from "@/server/client-profiles";
import { createProdamusPaymentUrl } from "@/server/payform";
import {
  getPaymentProviderForCheckout,
  isCustomPaymentProviderCode
} from "@/server/payment-providers";
import { getCuratorReferralAssignment } from "@/server/referrals";
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
  paidContent,
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
  paidContent?: string;
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
    paidContent,
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

function createClientOrderUrl(
  baseUrl: string,
  publicToken: string,
  searchParams?: Record<string, string>
) {
  const url = new URL(
    `/client/orders/${encodeURIComponent(publicToken)}`,
    baseUrl
  );

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function formatPaidContent({
  amountRub,
  clientOrderUrl,
  orderNumber,
  products,
  receiptName
}: {
  amountRub: number;
  clientOrderUrl: string;
  orderNumber: number;
  products?: Array<{
    name: string;
    priceRub: number;
    quantity: number;
  }>;
  receiptName: string;
}) {
  const items = products?.length
    ? products
    : [
        {
          name: receiptName,
          priceRub: amountRub,
          quantity: 1
        }
      ];
  const itemText = items
    .map(
      (item) =>
        `${item.name} — ${item.priceRub.toLocaleString("ru-RU")} ₽ × ${
          item.quantity
        }`
    )
    .join("; ");
  const text = `Спасибо за оплату заказа №${orderNumber}. Доступ к материалам и инструкциям по заказу: ${clientOrderUrl}. Состав заказа: ${itemText}.`;

  return text.slice(0, 4096);
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
  childRecords: ChildRecordInputParsed[];
  childRecordLines: string[];
  childUnits: number;
  names: string[];
  participantCount: number;
  participantsText: string;
  selectedOptions: SelectedOptionRow[];
  service: OrderService;
  workNames: string[];
  workParticipantCount: number;
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
          participantsText: data.participantsText ?? "",
          childRecords: data.childRecords
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
      data.referralSlug ?? firstStoredReferralSlug ?? undefined;
    const { curator, referralLink } = await getCuratorReferralAssignment(
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

      const selectedOptions: SelectedOptionRow[] =
        selectedServiceOptionIds.length
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

      // Записи о нерожденных/умерших детях учитываются только для услуг с
      // включённым режимом Шраддха; иначе игнорируются.
      const childRecords = service.shraddhaModeEnabled
        ? (input.childRecords ?? [])
        : [];
      const childUnits = getChildUnitsTotal(childRecords);
      const childRecordLines = formatChildRecordLines(childRecords, {
        unbornLabel: service.shraddhaUnbornLabel ?? undefined,
        deceasedChildLabel: service.shraddhaDeceasedChildLabel ?? undefined
      });
      const workNames = [...lineNames, ...childRecordLines];

      const requiresParticipants =
        service.priceUnit !== PriceUnit.PER_ORDER ||
        selectedOptions.some(
          (option) => option.priceUnit !== PriceUnit.PER_ORDER
        );

      // Для Шраддха-режима достаточно указать детей, даже без списка усопших.
      if (requiresParticipants && lineNames.length === 0 && childUnits === 0) {
        return NextResponse.json(
          {
            message: `Добавьте участников для услуги: ${service.localizedTitle}`
          },
          { status: 400 }
        );
      }

      const amountRub = selectedOptions.length
        ? calculateSelectedOptionsAmount({
            childUnits,
            options: selectedOptions,
            participantCount: lineNames.length,
            participantNames: lineNames
          })
        : calculateOrderAmount({
            childUnits,
            participantCount: lineNames.length,
            participantNames: lineNames,
            priceRub: service.localizedPrice,
            priceUnit: service.priceUnit
          });

      lines.push({
        amountRub,
        childRecords,
        childRecordLines,
        childUnits,
        names: lineNames,
        participantCount: lineNames.length,
        participantsText: lineNames.join("\n"),
        selectedOptions,
        service,
        workNames,
        workParticipantCount: workNames.length
      });
    }

    const primaryService = lines[0].service;
    const currency = primaryService.currency;
    const aggregateNames = lines.flatMap((line) => line.names);
    const aggregateWorkNames = lines.flatMap((line) => line.workNames);
    const aggregateParticipantsText = aggregateWorkNames.join("\n");
    const aggregateParticipantCount = aggregateWorkNames.length;
    const aggregateChildRecordLines = lines.flatMap(
      (line) => line.childRecordLines
    );
    const totalAmountRub = lines.reduce((sum, line) => sum + line.amountRub, 0);
    const paymentDescription = isMultiItem
      ? lines.map((line) => line.service.localizedTitle).join(", ")
      : lines[0].selectedOptions.length
        ? `${primaryService.localizedTitle}: ${lines[0].selectedOptions
            .map((option) => option.title)
            .join(", ")}`
        : primaryService.localizedTitle;
    const referralSlug = requestedReferralSlug ?? curator.slug;
    const referralLinkTitleSnapshot =
      referralLink?.title?.trim() || referralLink?.slug || null;
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
          customerComment: data.customerComment || null,
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
          referralLink: referralLink
            ? { connect: { id: referralLink.id } }
            : undefined,
          referralLinkTitleSnapshot,
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
      let childRecordSortOffset = 0;

      for (const [index, line] of lines.entries()) {
        const orderItemId = isMultiItem
          ? (
              await tx.orderItem.create({
                data: {
                  amountRub: line.amountRub,
                  currencySnapshot: line.service.currency,
                  isSubscriptionSnapshot: line.service.isSubscription,
                  order: { connect: { id: order.id } },
                  participantCount: line.workParticipantCount,
                  participantsText: line.workNames.join("\n"),
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

        if (line.workNames.length) {
          await tx.orderParticipant.createMany({
            data: line.workNames.map((name, participantIndex) => ({
              fullName: name,
              orderId: order.id,
              orderItemId,
              sortOrder: participantSortOffset + participantIndex + 1
            }))
          });
          participantSortOffset += line.workNames.length;
        }

        if (line.childRecords.length) {
          await tx.orderChildRecord.createMany({
            data: line.childRecords.map((record, recordIndex) => ({
              type: record.type,
              parentName: record.parentName,
              childCount: record.childCount,
              orderId: order.id,
              orderItemId,
              sortOrder: childRecordSortOffset + recordIndex + 1
            }))
          });
          childRecordSortOffset += line.childRecords.length;
        }

        if (line.selectedOptions.length) {
          await tx.orderServiceOption.createMany({
            data: line.selectedOptions.map((option, optionIndex) => {
              const quantity = getPriceUnitQuantity({
                childUnits: line.childUnits,
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
                  childUnits: line.childUnits,
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
                    childUnits: line.childUnits,
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
              childUnits: lines[0].childUnits,
              participantCount: lines[0].participantCount,
              participantNames: lines[0].names,
              priceUnit: option.priceUnit
            }),
            vatTaxType: primaryService.vatTaxType
          }))
        : undefined;
    const clientOrderUrl = createClientOrderUrl(
      resultBaseUrl,
      order.publicToken
    );
    const successUrl = currentClient?.telegramId
      ? createClientOrderUrl(resultBaseUrl, order.publicToken, {
          payment: "processing"
        })
      : createResultUrl(resultBaseUrl, "/payment/success", order.publicToken);
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
          paidContent: formatPaidContent({
            amountRub: order.amountRub,
            clientOrderUrl,
            orderNumber: order.orderNumber,
            products: prodamusProducts,
            receiptName:
              primaryService.receiptName?.trim() ||
              primaryService.localizedTitle
          }),
          products: prodamusProducts,
          provider: paymentProvider.code,
          receiptName:
            primaryService.receiptName?.trim() || primaryService.localizedTitle,
          successUrl,
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
        childRecordLines: aggregateChildRecordLines,
        curatorName: curator.name,
        customerEmail,
        customerComment: data.customerComment || null,
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
      clientOrderPath: `/client/orders/${order.publicToken}`,
      clientOrderUrl,
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
