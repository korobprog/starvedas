import {
  LeadStatus,
  OrderStatus,
  ParticipantListStatus,
  ParticipantRowStatus,
  type PaymentStatus,
  PriceUnit,
  Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureSystemCurator } from "@/server/referrals";

type OrderRevisionTx = Prisma.TransactionClient;

export const orderRevisionEventTypes = {
  adminParticipantEdit: "admin_participant_edit",
  beforeRestore: "before_restore",
  clientEdit: "client_edit",
  created: "created",
  manualBackup: "manual_backup",
  manualPaymentConfirm: "manual_payment_confirm",
  participantListEdit: "participant_list_edit",
  participantRowEdit: "participant_row_edit",
  paymentReceipt: "payment_receipt",
  paymentWebhook: "payment_webhook",
  softDeleted: "soft_deleted",
  restored: "restored"
} as const;

export type OrderRevisionEventType =
  (typeof orderRevisionEventTypes)[keyof typeof orderRevisionEventTypes];

export const orderRecoveryFilterValues = ["all", "active", "deleted"] as const;

export type OrderRecoveryFilter = (typeof orderRecoveryFilterValues)[number];

const orderRevisionAggregateSelect = Prisma.validator<Prisma.OrderSelect>()({
  amountRub: true,
  clientId: true,
  consentPersonalData: true,
  createdAt: true,
  deletedAt: true,
  deletedById: true,
  deleteReason: true,
  currency: true,
  customerEmail: true,
  customerName: true,
  customerPhone: true,
  customerTelegram: true,
  curatorId: true,
  id: true,
  isMultiItem: true,
  isSubscriptionSnapshot: true,
  items: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      amountRub: true,
      createdAt: true,
      currencySnapshot: true,
      id: true,
      isSubscriptionSnapshot: true,
      participantCount: true,
      participantsText: true,
      priceRubSnapshot: true,
      priceUnitSnapshot: true,
      receiptNameSnapshot: true,
      serviceId: true,
      sortOrder: true,
      subscriptionEndsAtSnapshot: true,
      subscriptionStartsAtSnapshot: true,
      titleSnapshot: true,
      vatTaxTypeSnapshot: true
    }
  },
  leadStatus: true,
  orderNumber: true,
  participantCount: true,
  participants: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      createdAt: true,
      fullName: true,
      id: true,
      orderItemId: true,
      rowStatus: true,
      sortOrder: true,
      statisticianComment: true,
      updatedAt: true
    }
  },
  participantsText: true,
  participantList: {
    select: {
      bookmarked: true,
      createdAt: true,
      eventStartsAt: true,
      id: true,
      note: true,
      sentAt: true,
      serviceTitleOverride: true,
      status: true,
      updatedAt: true
    }
  },
  payment: {
    select: {
      amountRub: true,
      createdAt: true,
      currency: true,
      id: true,
      paidAt: true,
      paymentUrl: true,
      provider: true,
      providerPaymentId: true,
      rawPayload: true,
      receiptLabel: true,
      receiptUploadedAt: true,
      receiptUrl: true,
      status: true,
      updatedAt: true
    }
  },
  publicToken: true,
  referralSlug: true,
  serviceId: true,
  serviceOptions: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      createdAt: true,
      descriptionSnapshot: true,
      id: true,
      optionId: true,
      orderItemId: true,
      priceRubSnapshot: true,
      priceUnitSnapshot: true,
      quantitySnapshot: true,
      serviceTitleSnapshot: true,
      sortOrder: true,
      titleSnapshot: true,
      totalRubSnapshot: true
    }
  },
  source: true,
  sourceDomain: true,
  status: true,
  subscriptionEndsAtSnapshot: true,
  subscriptionStartsAtSnapshot: true,
  updatedAt: true,
  vedicGiftData: {
    select: {
      birthDate: true,
      birthTime: true,
      birthTimeUnknown: true,
      createdAt: true,
      email: true,
      firstName: true,
      id: true,
      lastName: true,
      notes: true,
      phone: true,
      processed: true,
      telegram: true,
      updatedAt: true
    }
  }
});

const orderRevisionListSelect = Prisma.validator<Prisma.OrderRevisionSelect>()({
  actorUser: {
    select: {
      id: true,
      name: true
    }
  },
  createdAt: true,
  eventType: true,
  id: true,
  note: true,
  snapshot: true,
  sourceRevisionId: true
});

export type OrderRevisionAggregate = Prisma.OrderGetPayload<{
  select: typeof orderRevisionAggregateSelect;
}>;

export type OrderRevisionListItem = Prisma.OrderRevisionGetPayload<{
  select: typeof orderRevisionListSelect;
}>;

export type OrderRevisionSnapshot = {
  capturedAt: string;
  order: {
    amountRub: number;
    clientId: string | null;
    consentPersonalData: boolean;
    createdAt: string;
    deletedAt: string | null;
    deletedById: string | null;
    deleteReason: string | null;
    currency: string;
    customerEmail: string | null;
    customerName: string;
    customerPhone: string | null;
    customerTelegram: string | null;
    curatorId: string;
    id: string;
    isMultiItem: boolean;
    isSubscriptionSnapshot: boolean;
    leadStatus: LeadStatus;
    orderNumber: number;
    participantCount: number;
    participantsText: string;
    publicToken: string;
    referralSlug: string | null;
    serviceId: string;
    source: string;
    sourceDomain: string;
    status: OrderStatus;
    subscriptionEndsAtSnapshot: string | null;
    subscriptionStartsAtSnapshot: string | null;
    updatedAt: string;
  };
  items: Array<{
    amountRub: number;
    createdAt: string;
    currencySnapshot: string;
    id: string;
    isSubscriptionSnapshot: boolean;
    participantCount: number;
    participantsText: string;
    priceRubSnapshot: number;
    priceUnitSnapshot: PriceUnit;
    receiptNameSnapshot: string | null;
    serviceId: string;
    sortOrder: number;
    subscriptionEndsAtSnapshot: string | null;
    subscriptionStartsAtSnapshot: string | null;
    titleSnapshot: string;
    vatTaxTypeSnapshot: number;
  }>;
  participantList: {
    bookmarked: boolean;
    createdAt: string;
    eventStartsAt: string | null;
    id: string;
    note: string | null;
    sentAt: string | null;
    serviceTitleOverride: string | null;
    status: ParticipantListStatus;
    updatedAt: string;
  } | null;
  participants: Array<{
    createdAt: string;
    fullName: string;
    id: string;
    orderItemId: string | null;
    rowStatus: ParticipantRowStatus;
    sortOrder: number;
    statisticianComment: string | null;
    updatedAt: string;
  }>;
  payment: {
    amountRub: number;
    createdAt: string;
    currency: string;
    id: string;
    paidAt: string | null;
    paymentUrl: string | null;
    provider: string;
    providerPaymentId: string | null;
    rawPayload: Prisma.JsonValue | null;
    receiptLabel: string | null;
    receiptUploadedAt: string | null;
    receiptUrl: string | null;
    status: PaymentStatus;
    updatedAt: string;
  } | null;
  serviceOptions: Array<{
    createdAt: string;
    descriptionSnapshot: string | null;
    id: string;
    optionId: string | null;
    orderItemId: string | null;
    priceRubSnapshot: number;
    priceUnitSnapshot: PriceUnit;
    quantitySnapshot: number;
    serviceTitleSnapshot: string | null;
    sortOrder: number;
    titleSnapshot: string;
    totalRubSnapshot: number;
  }>;
  vedicGiftData: {
    birthDate: string;
    birthTime: string | null;
    birthTimeUnknown: boolean;
    createdAt: string;
    email: string;
    firstName: string;
    id: string;
    lastName: string;
    notes: string | null;
    phone: string | null;
    processed: boolean;
    telegram: string | null;
    updatedAt: string;
  } | null;
};

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export function serializeOrderAggregate(
  order: OrderRevisionAggregate
): OrderRevisionSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    order: {
      amountRub: order.amountRub,
      clientId: order.clientId,
      consentPersonalData: order.consentPersonalData,
      createdAt: order.createdAt.toISOString(),
      deletedAt: toIsoString(order.deletedAt),
      deletedById: order.deletedById,
      deleteReason: order.deleteReason,
      currency: order.currency,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerTelegram: order.customerTelegram,
      curatorId: order.curatorId,
      id: order.id,
      isMultiItem: order.isMultiItem,
      isSubscriptionSnapshot: order.isSubscriptionSnapshot,
      leadStatus: order.leadStatus,
      orderNumber: order.orderNumber,
      participantCount: order.participantCount,
      participantsText: order.participantsText,
      publicToken: order.publicToken,
      referralSlug: order.referralSlug,
      serviceId: order.serviceId,
      source: order.source,
      sourceDomain: order.sourceDomain,
      status: order.status,
      subscriptionEndsAtSnapshot: toIsoString(order.subscriptionEndsAtSnapshot),
      subscriptionStartsAtSnapshot: toIsoString(
        order.subscriptionStartsAtSnapshot
      ),
      updatedAt: order.updatedAt.toISOString()
    },
    items: order.items.map((item) => ({
      amountRub: item.amountRub,
      createdAt: item.createdAt.toISOString(),
      currencySnapshot: item.currencySnapshot,
      id: item.id,
      isSubscriptionSnapshot: item.isSubscriptionSnapshot,
      participantCount: item.participantCount,
      participantsText: item.participantsText,
      priceRubSnapshot: item.priceRubSnapshot,
      priceUnitSnapshot: item.priceUnitSnapshot,
      receiptNameSnapshot: item.receiptNameSnapshot,
      serviceId: item.serviceId,
      sortOrder: item.sortOrder,
      subscriptionEndsAtSnapshot: toIsoString(item.subscriptionEndsAtSnapshot),
      subscriptionStartsAtSnapshot: toIsoString(
        item.subscriptionStartsAtSnapshot
      ),
      titleSnapshot: item.titleSnapshot,
      vatTaxTypeSnapshot: item.vatTaxTypeSnapshot
    })),
    participantList: order.participantList
      ? {
          bookmarked: order.participantList.bookmarked,
          createdAt: order.participantList.createdAt.toISOString(),
          eventStartsAt: toIsoString(order.participantList.eventStartsAt),
          id: order.participantList.id,
          note: order.participantList.note,
          sentAt: toIsoString(order.participantList.sentAt),
          serviceTitleOverride: order.participantList.serviceTitleOverride,
          status: order.participantList.status,
          updatedAt: order.participantList.updatedAt.toISOString()
        }
      : null,
    participants: order.participants.map((participant) => ({
      createdAt: participant.createdAt.toISOString(),
      fullName: participant.fullName,
      id: participant.id,
      orderItemId: participant.orderItemId,
      rowStatus: participant.rowStatus,
      sortOrder: participant.sortOrder,
      statisticianComment: participant.statisticianComment,
      updatedAt: participant.updatedAt.toISOString()
    })),
    payment: order.payment
      ? {
          amountRub: order.payment.amountRub,
          createdAt: order.payment.createdAt.toISOString(),
          currency: order.payment.currency,
          id: order.payment.id,
          paidAt: toIsoString(order.payment.paidAt),
          paymentUrl: order.payment.paymentUrl,
          provider: order.payment.provider,
          providerPaymentId: order.payment.providerPaymentId,
          rawPayload: order.payment.rawPayload ?? null,
          receiptLabel: order.payment.receiptLabel,
          receiptUploadedAt: toIsoString(order.payment.receiptUploadedAt),
          receiptUrl: order.payment.receiptUrl,
          status: order.payment.status,
          updatedAt: order.payment.updatedAt.toISOString()
        }
      : null,
    serviceOptions: order.serviceOptions.map((option) => ({
      createdAt: option.createdAt.toISOString(),
      descriptionSnapshot: option.descriptionSnapshot,
      id: option.id,
      optionId: option.optionId,
      orderItemId: option.orderItemId,
      priceRubSnapshot: option.priceRubSnapshot,
      priceUnitSnapshot: option.priceUnitSnapshot,
      quantitySnapshot: option.quantitySnapshot,
      serviceTitleSnapshot: option.serviceTitleSnapshot,
      sortOrder: option.sortOrder,
      titleSnapshot: option.titleSnapshot,
      totalRubSnapshot: option.totalRubSnapshot
    })),
    vedicGiftData: order.vedicGiftData
      ? {
          birthDate: order.vedicGiftData.birthDate.toISOString(),
          birthTime: order.vedicGiftData.birthTime,
          birthTimeUnknown: order.vedicGiftData.birthTimeUnknown,
          createdAt: order.vedicGiftData.createdAt.toISOString(),
          email: order.vedicGiftData.email,
          firstName: order.vedicGiftData.firstName,
          id: order.vedicGiftData.id,
          lastName: order.vedicGiftData.lastName,
          notes: order.vedicGiftData.notes,
          phone: order.vedicGiftData.phone,
          processed: order.vedicGiftData.processed,
          telegram: order.vedicGiftData.telegram,
          updatedAt: order.vedicGiftData.updatedAt.toISOString()
        }
      : null
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseOrderRevisionSnapshot(
  snapshot: Prisma.JsonValue | null
): OrderRevisionSnapshot {
  if (!isRecord(snapshot) || !isRecord(snapshot.order)) {
    throw new Error("Некорректный снимок заказа");
  }

  return snapshot as unknown as OrderRevisionSnapshot;
}

async function getOrderAggregate(
  tx: OrderRevisionTx,
  orderId: string
): Promise<OrderRevisionAggregate | null> {
  return tx.order.findUnique({
    where: { id: orderId },
    select: orderRevisionAggregateSelect
  });
}

export async function captureOrderRevision(
  tx: OrderRevisionTx,
  {
    actorUserId,
    eventType,
    note,
    orderId,
    sourceRevisionId
  }: {
    actorUserId?: string | null;
    eventType: OrderRevisionEventType;
    note?: string | null;
    orderId: string;
    sourceRevisionId?: string | null;
  }
) {
  const order = await getOrderAggregate(tx, orderId);

  if (!order) {
    return null;
  }

  return tx.orderRevision.create({
    data: {
      actorUserId: actorUserId ?? null,
      eventType,
      note: note?.trim() || null,
      orderId,
      snapshot: serializeOrderAggregate(order) as Prisma.InputJsonValue,
      sourceRevisionId: sourceRevisionId ?? null
    }
  });
}

function parseSnapshotDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function getOrderRevisionEventLabel(eventType: string) {
  const labels: Record<string, string> = {
    [orderRevisionEventTypes.adminParticipantEdit]: "Правка участника админом",
    [orderRevisionEventTypes.beforeRestore]: "Автоснимок перед восстановлением",
    [orderRevisionEventTypes.clientEdit]: "Изменение клиентом",
    [orderRevisionEventTypes.created]: "Создание заказа",
    [orderRevisionEventTypes.manualBackup]: "Ручной бэкап",
    [orderRevisionEventTypes.manualPaymentConfirm]:
      "Ручное подтверждение оплаты",
    [orderRevisionEventTypes.participantListEdit]:
      "Изменение списка участников",
    [orderRevisionEventTypes.participantRowEdit]: "Изменение строки участника",
    [orderRevisionEventTypes.paymentReceipt]: "Изменение чека",
    [orderRevisionEventTypes.paymentWebhook]: "Webhook оплаты",
    [orderRevisionEventTypes.softDeleted]: "Мягкое удаление заказа",
    [orderRevisionEventTypes.restored]: "Восстановление из бэкапа"
  };

  return labels[eventType] ?? eventType;
}

async function resolveClientId(
  tx: OrderRevisionTx,
  clientId: string | null
): Promise<string | null> {
  if (!clientId) {
    return null;
  }

  const client = await tx.clientProfile.findUnique({
    where: { id: clientId },
    select: { id: true }
  });

  return client?.id ?? null;
}

async function resolveUserId(
  tx: OrderRevisionTx,
  userId: string | null
): Promise<string | null> {
  if (!userId) {
    return null;
  }

  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  return user?.id ?? null;
}

async function resolveCuratorId(
  tx: OrderRevisionTx,
  curatorId: string
): Promise<string> {
  const curator = await tx.curator.findUnique({
    where: { id: curatorId },
    select: { id: true }
  });

  if (curator) {
    return curator.id;
  }

  return (await ensureSystemCurator()).id;
}

export async function softDeleteOrder(
  tx: OrderRevisionTx,
  {
    actorUserId,
    deleteReason,
    nextCuratorId,
    orderId
  }: {
    actorUserId: string;
    deleteReason?: string | null;
    nextCuratorId?: string | null;
    orderId: string;
  }
) {
  const order = await getOrderAggregate(tx, orderId);

  if (!order) {
    throw new Error("Заказ не найден");
  }

  if (order.deletedAt) {
    if (nextCuratorId && order.curatorId !== nextCuratorId) {
      await tx.order.update({
        where: { id: orderId },
        data: {
          curatorId: nextCuratorId
        }
      });
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber
    };
  }

  await captureOrderRevision(tx, {
    actorUserId,
    eventType: orderRevisionEventTypes.manualBackup,
    note:
      deleteReason?.trim() ||
      "Автоматический бэкап перед мягким удалением заказа",
    orderId
  });

  await tx.order.update({
    where: { id: orderId },
    data: {
      curatorId: nextCuratorId ?? order.curatorId,
      deletedAt: new Date(),
      deletedById: actorUserId,
      deleteReason: deleteReason?.trim() || null
    }
  });

  await captureOrderRevision(tx, {
    actorUserId,
    eventType: orderRevisionEventTypes.softDeleted,
    note: deleteReason?.trim() || "Заказ помечен как удалённый",
    orderId
  });

  return {
    orderId: order.id,
    orderNumber: order.orderNumber
  };
}

export async function restoreOrderRevision(
  tx: OrderRevisionTx,
  {
    actorUserId,
    revisionId
  }: {
    actorUserId: string;
    revisionId: string;
  }
) {
  const revision = await tx.orderRevision.findUnique({
    where: { id: revisionId },
    select: {
      id: true,
      note: true,
      orderId: true,
      snapshot: true
    }
  });

  if (!revision) {
    throw new Error("Резервная копия не найдена");
  }

  const currentOrder = await getOrderAggregate(tx, revision.orderId);

  if (!currentOrder) {
    throw new Error("Заказ не найден");
  }

  const snapshot = parseOrderRevisionSnapshot(revision.snapshot);

  await captureOrderRevision(tx, {
    actorUserId,
    eventType: orderRevisionEventTypes.beforeRestore,
    note: `Автоматический снимок перед восстановлением из копии ${revision.id}`,
    orderId: revision.orderId,
    sourceRevisionId: revision.id
  });

  const restoredClientId = await resolveClientId(tx, snapshot.order.clientId);
  const restoredCuratorId = await resolveCuratorId(
    tx,
    snapshot.order.curatorId
  );
  const restoredDeletedById = await resolveUserId(
    tx,
    snapshot.order.deletedById
  );

  await tx.order.update({
    where: { id: revision.orderId },
    data: {
      amountRub: snapshot.order.amountRub,
      clientId: restoredClientId,
      consentPersonalData: snapshot.order.consentPersonalData,
      currency: snapshot.order.currency,
      customerEmail: snapshot.order.customerEmail,
      customerName: snapshot.order.customerName,
      customerPhone: snapshot.order.customerPhone,
      customerTelegram: snapshot.order.customerTelegram,
      curatorId: restoredCuratorId,
      deletedAt: parseSnapshotDate(snapshot.order.deletedAt),
      deletedById: restoredDeletedById,
      deleteReason: snapshot.order.deleteReason,
      isMultiItem: snapshot.order.isMultiItem ?? false,
      leadStatus: snapshot.order.leadStatus,
      participantCount: snapshot.order.participantCount,
      participantsText: snapshot.order.participantsText,
      referralSlug: snapshot.order.referralSlug,
      source: snapshot.order.source,
      sourceDomain: snapshot.order.sourceDomain,
      status: snapshot.order.status,
      subscriptionEndsAtSnapshot: parseSnapshotDate(
        snapshot.order.subscriptionEndsAtSnapshot
      ),
      subscriptionStartsAtSnapshot: parseSnapshotDate(
        snapshot.order.subscriptionStartsAtSnapshot
      )
    }
  });

  if (snapshot.payment) {
    await tx.payment.upsert({
      where: {
        orderId: revision.orderId
      },
      update: {
        amountRub: snapshot.payment.amountRub,
        currency: snapshot.payment.currency,
        paidAt: parseSnapshotDate(snapshot.payment.paidAt),
        paymentUrl: snapshot.payment.paymentUrl,
        provider: snapshot.payment.provider,
        providerPaymentId: snapshot.payment.providerPaymentId,
        rawPayload: (snapshot.payment.rawPayload ??
          Prisma.JsonNull) as Prisma.InputJsonValue,
        receiptLabel: snapshot.payment.receiptLabel,
        receiptUploadedAt: parseSnapshotDate(
          snapshot.payment.receiptUploadedAt
        ),
        receiptUrl: snapshot.payment.receiptUrl,
        status: snapshot.payment.status
      },
      create: {
        amountRub: snapshot.payment.amountRub,
        currency: snapshot.payment.currency,
        orderId: revision.orderId,
        paidAt: parseSnapshotDate(snapshot.payment.paidAt),
        paymentUrl: snapshot.payment.paymentUrl,
        provider: snapshot.payment.provider,
        providerPaymentId: snapshot.payment.providerPaymentId,
        rawPayload: (snapshot.payment.rawPayload ??
          Prisma.JsonNull) as Prisma.InputJsonValue,
        receiptLabel: snapshot.payment.receiptLabel,
        receiptUploadedAt: parseSnapshotDate(
          snapshot.payment.receiptUploadedAt
        ),
        receiptUrl: snapshot.payment.receiptUrl,
        status: snapshot.payment.status
      }
    });
  }

  const snapshotItems = snapshot.items ?? [];
  const validItemIds = new Set<string>();

  for (const item of snapshotItems) {
    const service = await tx.service.findUnique({
      where: { id: item.serviceId },
      select: { id: true }
    });

    if (!service) {
      continue;
    }

    const itemData = {
      amountRub: item.amountRub,
      currencySnapshot: item.currencySnapshot,
      isSubscriptionSnapshot: item.isSubscriptionSnapshot,
      participantCount: item.participantCount,
      participantsText: item.participantsText,
      priceRubSnapshot: item.priceRubSnapshot,
      priceUnitSnapshot: item.priceUnitSnapshot,
      receiptNameSnapshot: item.receiptNameSnapshot,
      serviceId: item.serviceId,
      sortOrder: item.sortOrder,
      subscriptionEndsAtSnapshot: parseSnapshotDate(
        item.subscriptionEndsAtSnapshot
      ),
      subscriptionStartsAtSnapshot: parseSnapshotDate(
        item.subscriptionStartsAtSnapshot
      ),
      titleSnapshot: item.titleSnapshot,
      vatTaxTypeSnapshot: item.vatTaxTypeSnapshot
    };

    await tx.orderItem.upsert({
      where: { id: item.id },
      update: itemData,
      create: { id: item.id, orderId: revision.orderId, ...itemData }
    });

    validItemIds.add(item.id);
  }

  const resolveSnapshotItemId = (orderItemId: string | null | undefined) =>
    orderItemId && validItemIds.has(orderItemId) ? orderItemId : null;

  const currentParticipants = [...currentOrder.participants];
  const snapshotParticipants = snapshot.participants;
  const sharedCount = Math.min(
    currentParticipants.length,
    snapshotParticipants.length
  );

  for (let index = 0; index < sharedCount; index += 1) {
    const currentParticipant = currentParticipants[index];
    const snapshotParticipant = snapshotParticipants[index];

    await tx.orderParticipant.update({
      where: { id: currentParticipant.id },
      data: {
        fullName: snapshotParticipant.fullName,
        rowStatus: snapshotParticipant.rowStatus,
        sortOrder: snapshotParticipant.sortOrder,
        statisticianComment: snapshotParticipant.statisticianComment
      }
    });
  }

  if (currentParticipants.length > snapshotParticipants.length) {
    await tx.orderParticipant.deleteMany({
      where: {
        id: {
          in: currentParticipants
            .slice(snapshotParticipants.length)
            .map((participant) => participant.id)
        }
      }
    });
  }

  if (snapshotParticipants.length > currentParticipants.length) {
    await tx.orderParticipant.createMany({
      data: snapshotParticipants
        .slice(currentParticipants.length)
        .map((participant) => ({
          fullName: participant.fullName,
          orderId: revision.orderId,
          orderItemId: resolveSnapshotItemId(participant.orderItemId),
          rowStatus: participant.rowStatus,
          sortOrder: participant.sortOrder,
          statisticianComment: participant.statisticianComment
        }))
    });
  }

  await tx.orderServiceOption.deleteMany({
    where: { orderId: revision.orderId }
  });

  if (snapshot.serviceOptions.length > 0) {
    await tx.orderServiceOption.createMany({
      data: snapshot.serviceOptions.map((option) => ({
        descriptionSnapshot: option.descriptionSnapshot,
        optionId: option.optionId,
        orderId: revision.orderId,
        orderItemId: resolveSnapshotItemId(option.orderItemId),
        priceRubSnapshot: option.priceRubSnapshot,
        priceUnitSnapshot: option.priceUnitSnapshot,
        quantitySnapshot: option.quantitySnapshot,
        serviceTitleSnapshot: option.serviceTitleSnapshot ?? null,
        sortOrder: option.sortOrder,
        titleSnapshot: option.titleSnapshot,
        totalRubSnapshot: option.totalRubSnapshot
      }))
    });
  }

  if (snapshot.participantList) {
    await tx.participantList.upsert({
      where: {
        orderId: revision.orderId
      },
      update: {
        bookmarked: snapshot.participantList.bookmarked,
        eventStartsAt: parseSnapshotDate(
          snapshot.participantList.eventStartsAt
        ),
        note: snapshot.participantList.note,
        sentAt: parseSnapshotDate(snapshot.participantList.sentAt),
        serviceTitleOverride: snapshot.participantList.serviceTitleOverride,
        status: snapshot.participantList.status
      },
      create: {
        bookmarked: snapshot.participantList.bookmarked,
        eventStartsAt: parseSnapshotDate(
          snapshot.participantList.eventStartsAt
        ),
        note: snapshot.participantList.note,
        orderId: revision.orderId,
        sentAt: parseSnapshotDate(snapshot.participantList.sentAt),
        serviceTitleOverride: snapshot.participantList.serviceTitleOverride,
        status: snapshot.participantList.status
      }
    });
  }

  if (snapshot.vedicGiftData) {
    await tx.vedicGiftData.upsert({
      where: {
        orderId: revision.orderId
      },
      update: {
        birthDate: new Date(snapshot.vedicGiftData.birthDate),
        birthTime: snapshot.vedicGiftData.birthTime,
        birthTimeUnknown: snapshot.vedicGiftData.birthTimeUnknown,
        email: snapshot.vedicGiftData.email,
        firstName: snapshot.vedicGiftData.firstName,
        lastName: snapshot.vedicGiftData.lastName,
        notes: snapshot.vedicGiftData.notes,
        phone: snapshot.vedicGiftData.phone,
        processed: snapshot.vedicGiftData.processed,
        telegram: snapshot.vedicGiftData.telegram
      },
      create: {
        birthDate: new Date(snapshot.vedicGiftData.birthDate),
        birthTime: snapshot.vedicGiftData.birthTime,
        birthTimeUnknown: snapshot.vedicGiftData.birthTimeUnknown,
        email: snapshot.vedicGiftData.email,
        firstName: snapshot.vedicGiftData.firstName,
        lastName: snapshot.vedicGiftData.lastName,
        notes: snapshot.vedicGiftData.notes,
        orderId: revision.orderId,
        phone: snapshot.vedicGiftData.phone,
        processed: snapshot.vedicGiftData.processed,
        telegram: snapshot.vedicGiftData.telegram
      }
    });
  }

  if (currentOrder.leadStatus !== snapshot.order.leadStatus) {
    await tx.leadStatusHistory.create({
      data: {
        changedById: actorUserId,
        fromStatus: currentOrder.leadStatus,
        note: `Заказ восстановлен из резервной копии ${revision.id}`,
        orderId: revision.orderId,
        toStatus: snapshot.order.leadStatus
      }
    });
  }

  await captureOrderRevision(tx, {
    actorUserId,
    eventType: orderRevisionEventTypes.restored,
    note: revision.note?.trim()
      ? `Восстановлено из копии ${revision.id}: ${revision.note.trim()}`
      : `Восстановлено из копии ${revision.id}`,
    orderId: revision.orderId,
    sourceRevisionId: revision.id
  });

  return {
    orderId: revision.orderId,
    orderNumber: currentOrder.orderNumber
  };
}

export async function searchOrdersForRecovery(
  query: string,
  filter: OrderRecoveryFilter = "all"
) {
  const normalizedQuery = query.trim();
  const numericOrderNumber = Number(normalizedQuery);
  const filterWhere =
    filter === "active"
      ? { deletedAt: null }
      : filter === "deleted"
        ? { deletedAt: { not: null } }
        : {};

  return prisma.order.findMany({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      _count: {
        select: {
          revisions: true
        }
      },
      customerEmail: true,
      customerName: true,
      deletedAt: true,
      deletedBy: {
        select: {
          name: true
        }
      },
      deleteReason: true,
      id: true,
      leadStatus: true,
      orderNumber: true,
      payment: {
        select: {
          status: true
        }
      },
      service: {
        select: {
          title: true
        }
      },
      status: true,
      updatedAt: true
    },
    take: 25,
    where: normalizedQuery
      ? {
          ...filterWhere,
          OR: [
            Number.isInteger(numericOrderNumber)
              ? { orderNumber: numericOrderNumber }
              : undefined,
            {
              customerName: {
                contains: normalizedQuery,
                mode: "insensitive"
              }
            },
            {
              customerEmail: {
                contains: normalizedQuery,
                mode: "insensitive"
              }
            },
            {
              publicToken: {
                contains: normalizedQuery,
                mode: "insensitive"
              }
            }
          ].filter(Boolean) as Prisma.OrderWhereInput[]
        }
      : filterWhere
  });
}

export async function getOrderRecoveryDetail(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      customerEmail: true,
      customerName: true,
      deletedAt: true,
      deletedBy: {
        select: {
          id: true,
          name: true
        }
      },
      deleteReason: true,
      id: true,
      leadStatus: true,
      orderNumber: true,
      payment: {
        select: {
          status: true
        }
      },
      revisions: {
        orderBy: [{ createdAt: "desc" }],
        select: orderRevisionListSelect,
        take: 50
      },
      service: {
        select: {
          title: true
        }
      },
      status: true,
      updatedAt: true
    }
  });
}

export async function getCurrentOrderSnapshot(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: orderRevisionAggregateSelect
  });

  return order ? serializeOrderAggregate(order) : null;
}
