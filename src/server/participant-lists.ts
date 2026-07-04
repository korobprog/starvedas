import {
  OrderStatus,
  ParticipantChangeAction,
  ParticipantListClaimRole,
  ParticipantListMessageRole,
  ParticipantListStatus,
  ParticipantRowStatus,
  Prisma,
  UserRole
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  formatChildRecordLines,
  formatLegacyChildRecordLines
} from "@/lib/shraddha";
import { prisma } from "@/lib/prisma";
import { isAdminRole, requireUser, type SessionUser } from "@/server/auth";
import { getCabinetCuratorIdForSessionUser } from "@/server/cabinet-curator";
import { notifyClientAfterParticipantNamesProcessed } from "@/server/client-participant-notifications";
import {
  captureOrderRevision,
  orderRevisionEventTypes
} from "@/server/order-revisions";
import { hasAcceptedStatisticianRole } from "@/server/statistician-role";
import { sendParticipantListTelegramNotification } from "@/server/telegram-notifications";

const participantListStatuses = Object.values(ParticipantListStatus) as [
  ParticipantListStatus,
  ...ParticipantListStatus[]
];
const participantRowStatuses = Object.values(ParticipantRowStatus) as [
  ParticipantRowStatus,
  ...ParticipantRowStatus[]
];

const listUpdateSchema = z.object({
  bookmarked: z.boolean(),
  eventStartsAt: z.string().trim().optional(),
  listId: z.string().trim().min(1),
  note: z.string().trim().max(2000).optional(),
  serviceTitleOverride: z.string().trim().max(240).optional(),
  status: z.enum(participantListStatuses)
});

const rowUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(240),
  listId: z.string().trim().min(1),
  participantId: z.string().trim().min(1),
  rowStatus: z.enum(participantRowStatuses),
  statisticianComment: z.string().trim().max(1000).optional()
});

const messageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  listId: z.string().trim().min(1)
});

const bulkProcessSchema = z.object({
  intent: z.enum(["selected", "all"]),
  listId: z.string().trim().min(1),
  participantIds: z.array(z.string().trim().min(1)).default([])
});

const bulkProcessListsSchema = z.object({
  listIds: z.array(z.string().trim().min(1)).default([])
});

const curatorClaimSchema = z.object({
  listId: z.string().trim().min(1)
});

export type ParticipantBulkProcessState = {
  error?: string;
  message?: string;
};

export type ParticipantListClaimState = {
  error?: string;
  message?: string;
};

export const participantListSelect =
  Prisma.validator<Prisma.ParticipantListSelect>()({
    bookmarked: true,
    changes: {
      orderBy: { createdAt: "desc" },
      select: {
        changedBy: { select: { name: true } },
        createdAt: true,
        fieldName: true,
        fromValue: true,
        id: true,
        note: true,
        toValue: true
      },
      take: 8
    },
    createdAt: true,
    claimedAt: true,
    claimedByCurator: { select: { id: true, name: true } },
    claimedByCuratorId: true,
    claimedByRole: true,
    claimedByUser: { select: { id: true, name: true } },
    claimedByUserId: true,
    copiedAt: true,
    eventStartsAt: true,
    id: true,
    messages: {
      orderBy: { createdAt: "desc" },
      select: {
        body: true,
        createdAt: true,
        id: true,
        sender: { select: { name: true } },
        senderRole: true
      },
      take: 8
    },
    note: true,
    order: {
      select: {
        createdAt: true,
        curator: { select: { id: true, name: true, telegramId: true } },
        customerEmail: true,
        customerComment: true,
        customerName: true,
        customerPhone: true,
        customerTelegram: true,
        id: true,
        orderNumber: true,
        payment: {
          select: {
            paidAt: true,
            receiptLabel: true,
            receiptUrl: true
          }
        },
        participants: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            fullName: true,
            id: true,
            rowStatus: true,
            statisticianComment: true
          }
        },
        childRecords: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            childCount: true,
            parentName: true,
            type: true
          }
        },
        service: {
          select: {
            id: true,
            title: true,
            shraddhaUnbornLabel: true,
            shraddhaDeceasedChildLabel: true
          }
        },
        serviceOptions: {
          orderBy: { sortOrder: "asc" },
          select: {
            option: { select: { eventStartsAt: true } },
            titleSnapshot: true
          }
        },
        status: true
      }
    },
    serviceTitleOverride: true,
    sentAt: true,
    status: true,
    updatedAt: true
  });

export type ParticipantListRow = Prisma.ParticipantListGetPayload<{
  select: typeof participantListSelect;
}>;

function revalidateParticipantListWorkspaces() {
  revalidatePath("/statistician");
  revalidatePath("/cabinet");
  revalidatePath("/admin/participants");
}

function isStatisticianRole(role: UserRole) {
  return role === UserRole.STATISTICIAN || isAdminRole(role);
}

function requireStatisticianLike(user: SessionUser) {
  if (!isStatisticianRole(user.role)) {
    throw new Error("Недостаточно прав для работы со списками статиста");
  }
}

function parseOptionalDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Некорректная дата начала мероприятия");
  }

  const date = new Date(`${value}T00:00:00.000`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Некорректная дата начала мероприятия");
  }

  return date;
}

function firstEventDate(order: {
  serviceOptions: Array<{ option: { eventStartsAt: Date | null } | null }>;
}) {
  return (
    order.serviceOptions
      .map((item) => item.option?.eventStartsAt ?? null)
      .find((date): date is Date => Boolean(date)) ?? null
  );
}

async function userMessageRole(user: SessionUser) {
  if (user.role === UserRole.CURATOR) {
    return ParticipantListMessageRole.CURATOR;
  }

  if (await hasAcceptedStatisticianRole(user)) {
    return ParticipantListMessageRole.STATISTICIAN;
  }

  return ParticipantListMessageRole.ADMIN;
}

function formatFieldValue(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return value == null ? null : String(value);
}

async function getListAccess(listId: string, user: SessionUser) {
  const list = await prisma.participantList.findUnique({
    where: { id: listId },
    select: {
      id: true,
      order: {
        select: {
          curatorId: true,
          curator: { select: { name: true, telegramId: true } },
          orderNumber: true
        }
      }
    }
  });

  if (!list) {
    throw new Error("Список не найден");
  }

  if (isStatisticianRole(user.role)) {
    return list;
  }

  if (
    user.role === UserRole.CURATOR &&
    list.order.curatorId === user.curator?.id
  ) {
    return list;
  }

  throw new Error("Нет доступа к списку участников");
}

export async function claimParticipantListByCurator({
  curatorId,
  listId,
  userId
}: {
  curatorId: string;
  listId: string;
  userId: string | null;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const list = await tx.participantList.findUnique({
      where: { id: listId },
      select: {
        claimedAt: true,
        claimedByCuratorId: true,
        claimedByRole: true,
        claimedByUserId: true,
        copiedAt: true,
        id: true,
        order: {
          select: {
            curatorId: true,
            id: true,
            orderNumber: true,
            status: true
          }
        },
        status: true
      }
    });

    if (!list) {
      throw new Error("Список не найден");
    }

    if (list.order.status !== OrderStatus.PAID) {
      throw new Error("Список можно забрать только после оплаты заказа");
    }

    if (list.order.curatorId !== curatorId) {
      throw new Error("Этот список принадлежит другому куратору");
    }

    if (
      list.claimedByRole &&
      (list.claimedByRole !== ParticipantListClaimRole.CURATOR ||
        list.claimedByCuratorId !== curatorId)
    ) {
      throw new Error("Список уже забрал другой исполнитель");
    }

    if (
      list.claimedByRole === ParticipantListClaimRole.CURATOR &&
      list.claimedByCuratorId === curatorId &&
      list.copiedAt
    ) {
      return { alreadyClaimed: true, orderNumber: list.order.orderNumber };
    }

    const now = new Date();
    const nextData = {
      claimedAt: list.claimedAt ?? now,
      claimedByCuratorId: curatorId,
      claimedByRole: ParticipantListClaimRole.CURATOR,
      claimedByUserId: userId,
      copiedAt: now,
      status: ParticipantListStatus.IN_WORK
    };

    const changes = [
      ["status", list.status, nextData.status],
      ["claimedByRole", list.claimedByRole, nextData.claimedByRole],
      [
        "claimedByCuratorId",
        list.claimedByCuratorId,
        nextData.claimedByCuratorId
      ],
      ["claimedByUserId", list.claimedByUserId, nextData.claimedByUserId],
      ["claimedAt", list.claimedAt, nextData.claimedAt],
      ["copiedAt", list.copiedAt, nextData.copiedAt]
    ].filter(([, from, to]) => formatFieldValue(from) !== formatFieldValue(to));

    if (!changes.length) {
      return { alreadyClaimed: true, orderNumber: list.order.orderNumber };
    }

    await captureOrderRevision(tx, {
      actorUserId: userId ?? undefined,
      eventType: orderRevisionEventTypes.participantListEdit,
      note: "Куратор подтвердил копирование списка участников",
      orderId: list.order.id
    });

    await tx.participantList.update({
      data: nextData,
      where: { id: list.id }
    });

    await tx.participantListChange.createMany({
      data: changes.map(([fieldName, fromValue, toValue]) => ({
        changedById: userId,
        fieldName: String(fieldName),
        fromValue: formatFieldValue(fromValue),
        listId: list.id,
        note: "Куратор подтвердил, что список скопирован",
        toValue: formatFieldValue(toValue)
      }))
    });

    return { alreadyClaimed: false, orderNumber: list.order.orderNumber };
  });

  revalidateParticipantListWorkspaces();

  return result;
}

async function ensureParticipantLists(where: Prisma.OrderWhereInput) {
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      participantList: { select: { id: true } },
      serviceOptions: {
        select: {
          option: { select: { eventStartsAt: true } }
        },
        orderBy: { sortOrder: "asc" }
      }
    },
    where: {
      ...where,
      deletedAt: null
    }
  });
  const missing = orders.filter((order) => !order.participantList);

  if (!missing.length) {
    return;
  }

  await prisma.participantList.createMany({
    data: missing.map((order) => ({
      eventStartsAt: firstEventDate(order),
      orderId: order.id
    })),
    skipDuplicates: true
  });
}

async function ensureChildRecordParticipantRows(where: Prisma.OrderWhereInput) {
  const orders = await prisma.order.findMany({
    select: {
      childRecords: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          childCount: true,
          parentName: true,
          type: true
        }
      },
      id: true,
      participants: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          fullName: true,
          sortOrder: true
        }
      },
      service: {
        select: {
          shraddhaDeceasedChildLabel: true,
          shraddhaUnbornLabel: true
        }
      }
    },
    where: {
      ...where,
      deletedAt: null
    }
  });

  for (const order of orders) {
    if (!order.childRecords.length) {
      continue;
    }

    const childLines = formatChildRecordLines(order.childRecords, {
      unbornLabel: order.service.shraddhaUnbornLabel ?? undefined,
      deceasedChildLabel: order.service.shraddhaDeceasedChildLabel ?? undefined
    });
    const legacyChildLines = formatLegacyChildRecordLines(order.childRecords, {
      unbornLabel: order.service.shraddhaUnbornLabel ?? undefined,
      deceasedChildLabel: order.service.shraddhaDeceasedChildLabel ?? undefined
    });

    if (!childLines.length) {
      continue;
    }

    let renamedLegacyChildLines = false;

    for (const [index, legacyLine] of legacyChildLines.entries()) {
      const nextLine = childLines[index];

      if (!nextLine || legacyLine === nextLine) {
        continue;
      }

      const hasNextLine = order.participants.some(
        (participant) => participant.fullName === nextLine
      );
      const legacyParticipant = order.participants.find(
        (participant) => participant.fullName === legacyLine
      );

      if (!legacyParticipant || hasNextLine) {
        continue;
      }

      await prisma.orderParticipant.updateMany({
        where: {
          fullName: legacyLine,
          orderId: order.id
        },
        data: {
          fullName: nextLine
        }
      });

      for (const participant of order.participants) {
        if (participant.fullName === legacyLine) {
          participant.fullName = nextLine;
          renamedLegacyChildLines = true;
          break;
        }
      }
    }

    const existingCounts = new Map<string, number>();

    for (const participant of order.participants) {
      existingCounts.set(
        participant.fullName,
        (existingCounts.get(participant.fullName) ?? 0) + 1
      );
    }

    const missing: string[] = [];

    for (const line of childLines) {
      const currentCount = existingCounts.get(line) ?? 0;

      if (currentCount > 0) {
        existingCounts.set(line, currentCount - 1);
      } else {
        missing.push(line);
      }
    }

    if (!missing.length && !renamedLegacyChildLines) {
      continue;
    }

    const nextParticipantNames = [
      ...order.participants.map((participant) => participant.fullName),
      ...missing
    ];

    if (!missing.length) {
      await prisma.order.update({
        data: {
          participantCount: nextParticipantNames.length,
          participantsText: nextParticipantNames.join("\n")
        },
        where: { id: order.id }
      });
      continue;
    }

    const maxSortOrder = order.participants.reduce(
      (max, participant) => Math.max(max, participant.sortOrder),
      0
    );

    await prisma.$transaction([
      prisma.orderParticipant.createMany({
        data: missing.map((fullName, index) => ({
          fullName,
          orderId: order.id,
          sortOrder: maxSortOrder + index + 1
        }))
      }),
      prisma.order.update({
        data: {
          participantCount: nextParticipantNames.length,
          participantsText: nextParticipantNames.join("\n")
        },
        where: { id: order.id }
      })
    ]);
  }
}

export async function ensureAllPaidParticipantLists() {
  await ensureChildRecordParticipantRows({ status: OrderStatus.PAID });
  await ensureParticipantLists({ status: OrderStatus.PAID });
}

export async function ensurePaidOrderParticipantList(orderId: string) {
  await ensureChildRecordParticipantRows({
    id: orderId,
    status: OrderStatus.PAID
  });
  await ensureParticipantLists({ id: orderId, status: OrderStatus.PAID });

  return prisma.participantList.findUnique({
    select: { id: true },
    where: { orderId }
  });
}

export async function getStatisticianParticipantLists() {
  await ensureAllPaidParticipantLists();

  return prisma.participantList.findMany({
    orderBy: [
      { bookmarked: "desc" },
      { eventStartsAt: "asc" },
      { updatedAt: "desc" }
    ],
    select: participantListSelect,
    where: {
      order: {
        deletedAt: null,
        status: OrderStatus.PAID
      }
    }
  });
}

export async function getStatisticianParticipantListsByFilter(
  filter: "all" | "processed" | "unprocessed" = "unprocessed"
) {
  const lists = await getStatisticianParticipantLists();

  if (filter === "all") {
    return lists;
  }

  return lists.filter((list) => {
    if (
      filter === "unprocessed" &&
      list.claimedByRole === ParticipantListClaimRole.CURATOR
    ) {
      return false;
    }

    const hasParticipants = list.order.participants.length > 0;
    const allProcessed =
      hasParticipants &&
      list.order.participants.every(
        (participant) => participant.rowStatus === ParticipantRowStatus.CHECKED
      );

    return filter === "processed" ? allProcessed : !allProcessed;
  });
}

export async function bulkProcessParticipantsAction(
  _state: ParticipantBulkProcessState,
  formData: FormData
): Promise<ParticipantBulkProcessState> {
  "use server";
  const user = await requireUser(
    [UserRole.STATISTICIAN, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    "/statistician"
  );
  requireStatisticianLike(user);

  const parsed = bulkProcessSchema.safeParse({
    intent: formData.get("intent"),
    listId: formData.get("listId"),
    participantIds: formData.getAll("participantIds")
  });

  if (!parsed.success) {
    return { error: "Выберите имена для обработки" };
  }

  await getListAccess(parsed.data.listId, user);

  const list = await prisma.participantList.findUnique({
    where: { id: parsed.data.listId },
    select: {
      id: true,
      orderId: true,
      order: {
        select: {
          participants: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              fullName: true,
              id: true,
              rowStatus: true
            }
          }
        }
      }
    }
  });

  if (!list) {
    return { error: "Список не найден" };
  }

  const requestedIds =
    parsed.data.intent === "all"
      ? list.order.participants.map((participant) => participant.id)
      : parsed.data.participantIds;
  const requestedSet = new Set(requestedIds);
  const participantsToProcess = list.order.participants.filter(
    (participant) =>
      requestedSet.has(participant.id) &&
      participant.rowStatus !== ParticipantRowStatus.CHECKED
  );

  if (!participantsToProcess.length) {
    return { error: "Нет необработанных выбранных имён" };
  }

  await prisma.$transaction(async (tx) => {
    await captureOrderRevision(tx, {
      actorUserId: user.id,
      eventType: orderRevisionEventTypes.participantListEdit,
      note: "Статист отметил имена обработанными",
      orderId: list.orderId
    });

    await tx.orderParticipant.updateMany({
      data: {
        rowStatus: ParticipantRowStatus.CHECKED
      },
      where: {
        id: { in: participantsToProcess.map((participant) => participant.id) }
      }
    });

    await tx.participantListChange.createMany({
      data: participantsToProcess.map((participant) => ({
        changedById: user.id,
        fieldName: `participant:${participant.id}:rowStatus`,
        fromValue: participant.rowStatus,
        listId: list.id,
        toValue: ParticipantRowStatus.CHECKED
      }))
    });

    const processedIds = new Set(
      participantsToProcess.map((participant) => participant.id)
    );
    const allProcessed = list.order.participants.every(
      (participant) =>
        participant.rowStatus === ParticipantRowStatus.CHECKED ||
        processedIds.has(participant.id)
    );

    if (allProcessed) {
      await tx.participantList.update({
        data: {
          status: ParticipantListStatus.CHECKED
        },
        where: { id: list.id }
      });
    }
  });

  revalidateParticipantListWorkspaces();
  await notifyClientAfterParticipantNamesProcessed(list.orderId);

  return {
    message: `Обработано имён: ${participantsToProcess.length}`
  };
}

export async function bulkProcessParticipantListsAction(
  _state: ParticipantBulkProcessState,
  formData: FormData
): Promise<ParticipantBulkProcessState> {
  "use server";
  const user = await requireUser(
    [UserRole.STATISTICIAN, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    "/statistician"
  );
  requireStatisticianLike(user);

  const parsed = bulkProcessListsSchema.safeParse({
    listIds: formData.getAll("listIds")
  });

  if (!parsed.success) {
    return { error: "Выберите списки для обработки" };
  }

  const listIds = [...new Set(parsed.data.listIds)];

  if (!listIds.length) {
    return { error: "Нет списков для обработки" };
  }

  const lists = await prisma.participantList.findMany({
    select: {
      id: true,
      orderId: true,
      order: {
        select: {
          participants: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              fullName: true,
              id: true,
              rowStatus: true
            }
          }
        }
      }
    },
    where: {
      id: { in: listIds },
      order: {
        deletedAt: null,
        status: OrderStatus.PAID
      }
    }
  });

  if (!lists.length) {
    return { error: "Оплаченные списки не найдены" };
  }

  const participantsToProcess = lists.flatMap((list) =>
    list.order.participants
      .filter(
        (participant) => participant.rowStatus !== ParticipantRowStatus.CHECKED
      )
      .map((participant) => ({
        ...participant,
        listId: list.id,
        orderId: list.orderId
      }))
  );

  if (!participantsToProcess.length) {
    return { error: "В выбранных списках нет необработанных имён" };
  }

  await prisma.$transaction(async (tx) => {
    for (const list of lists) {
      const listParticipantsToProcess = participantsToProcess.filter(
        (participant) => participant.listId === list.id
      );

      if (!listParticipantsToProcess.length) {
        continue;
      }

      await captureOrderRevision(tx, {
        actorUserId: user.id,
        eventType: orderRevisionEventTypes.participantListEdit,
        note: "Статист подтвердил копирование и отметил список обработанным",
        orderId: list.orderId
      });

      await tx.orderParticipant.updateMany({
        data: {
          rowStatus: ParticipantRowStatus.CHECKED
        },
        where: {
          id: {
            in: listParticipantsToProcess.map((participant) => participant.id)
          }
        }
      });

      await tx.participantListChange.createMany({
        data: listParticipantsToProcess.map((participant) => ({
          changedById: user.id,
          fieldName: `participant:${participant.id}:rowStatus`,
          fromValue: participant.rowStatus,
          listId: list.id,
          toValue: ParticipantRowStatus.CHECKED
        }))
      });

      const processedIds = new Set(
        listParticipantsToProcess.map((participant) => participant.id)
      );
      const allProcessed = list.order.participants.every(
        (participant) =>
          participant.rowStatus === ParticipantRowStatus.CHECKED ||
          processedIds.has(participant.id)
      );

      if (allProcessed) {
        await tx.participantList.update({
          data: {
            status: ParticipantListStatus.CHECKED
          },
          where: { id: list.id }
        });
      }
    }
  });

  revalidateParticipantListWorkspaces();
  await Promise.all(
    [
      ...new Set(
        participantsToProcess.map((participant) => participant.orderId)
      )
    ].map((orderId) => notifyClientAfterParticipantNamesProcessed(orderId))
  );

  return {
    message: `Обработано имён: ${participantsToProcess.length}`
  };
}

export async function markOrderParticipantListProcessedByTelegram({
  orderId,
  telegramId
}: {
  orderId: string;
  telegramId: number | string;
}) {
  const statistician = await prisma.user.findFirst({
    where: {
      active: true,
      role: UserRole.STATISTICIAN,
      telegramId: String(telegramId)
    },
    select: {
      id: true,
      name: true
    }
  });

  if (!statistician) {
    return {
      ok: false as const,
      reason: "У вас нет доступа к обработке этих имён."
    };
  }

  const order = await prisma.order.findFirst({
    where: {
      deletedAt: null,
      id: orderId,
      status: OrderStatus.PAID
    },
    select: {
      id: true,
      orderNumber: true,
      participantList: { select: { id: true } },
      participants: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          fullName: true,
          id: true,
          rowStatus: true
        }
      },
      serviceOptions: {
        orderBy: { sortOrder: "asc" },
        select: {
          option: { select: { eventStartsAt: true } }
        }
      }
    }
  });

  if (!order) {
    return {
      ok: false as const,
      reason: "Оплаченный заказ не найден."
    };
  }

  if (!order.participants.length) {
    return {
      ok: false as const,
      reason: "В заказе нет имён для обработки."
    };
  }

  const participantsToProcess = order.participants.filter(
    (participant) => participant.rowStatus !== ParticipantRowStatus.CHECKED
  );

  if (!participantsToProcess.length) {
    await notifyClientAfterParticipantNamesProcessed(order.id);

    return {
      ok: true as const,
      alreadyProcessed: true,
      count: 0,
      orderNumber: order.orderNumber,
      statisticianName: statistician.name
    };
  }

  await prisma.$transaction(async (tx) => {
    await captureOrderRevision(tx, {
      actorUserId: statistician.id,
      eventType: orderRevisionEventTypes.participantListEdit,
      note: "Статист отметил все имена обработанными через Telegram",
      orderId: order.id
    });

    const participantList = order.participantList
      ? order.participantList
      : await tx.participantList.create({
          data: {
            eventStartsAt: firstEventDate(order),
            orderId: order.id
          },
          select: { id: true }
        });

    await tx.orderParticipant.updateMany({
      data: {
        rowStatus: ParticipantRowStatus.CHECKED
      },
      where: {
        id: { in: participantsToProcess.map((participant) => participant.id) }
      }
    });

    await tx.participantList.update({
      data: {
        status: ParticipantListStatus.CHECKED
      },
      where: { id: participantList.id }
    });

    await tx.participantListChange.createMany({
      data: participantsToProcess.map((participant) => ({
        changedById: statistician.id,
        fieldName: `participant:${participant.id}:rowStatus`,
        fromValue: participant.rowStatus,
        listId: participantList.id,
        toValue: ParticipantRowStatus.CHECKED
      }))
    });
  });

  revalidateParticipantListWorkspaces();
  await notifyClientAfterParticipantNamesProcessed(order.id);

  return {
    ok: true as const,
    alreadyProcessed: false,
    count: participantsToProcess.length,
    orderNumber: order.orderNumber,
    statisticianName: statistician.name
  };
}

export async function getCuratorParticipantLists(curatorId: string) {
  await ensureChildRecordParticipantRows({
    curatorId,
    status: OrderStatus.PAID
  });
  await ensureParticipantLists({ curatorId, status: OrderStatus.PAID });

  return prisma.participantList.findMany({
    orderBy: [{ eventStartsAt: "asc" }, { updatedAt: "desc" }],
    select: participantListSelect,
    where: {
      order: {
        curatorId,
        deletedAt: null,
        status: OrderStatus.PAID
      }
    }
  });
}

export async function claimParticipantListByCuratorAction(
  _state: ParticipantListClaimState,
  formData: FormData
): Promise<ParticipantListClaimState> {
  "use server";
  const user = await requireUser(
    [UserRole.CURATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    "/cabinet?section=lists"
  );

  const parsed = curatorClaimSchema.safeParse({
    listId: formData.get("listId")
  });

  if (!parsed.success) {
    return { error: "Некорректный список" };
  }

  const curatorId = await getCabinetCuratorIdForSessionUser(user);

  if (!curatorId) {
    return { error: "Куратор не найден" };
  }

  try {
    const result = await claimParticipantListByCurator({
      curatorId,
      listId: parsed.data.listId,
      userId: user.id
    });

    revalidateParticipantListWorkspaces();

    return {
      message: result.alreadyClaimed
        ? `Список #${result.orderNumber} уже был в работе у куратора`
        : `Список #${result.orderNumber} отмечен как скопированный`
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Не удалось отметить список как скопированный"
    };
  }
}

export async function updateParticipantListAction(formData: FormData) {
  "use server";
  const user = await requireUser(
    [UserRole.STATISTICIAN, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    "/statistician"
  );
  requireStatisticianLike(user);

  const parsed = listUpdateSchema.safeParse({
    bookmarked: formData.get("bookmarked") === "on",
    eventStartsAt: formData.get("eventStartsAt") || undefined,
    listId: formData.get("listId"),
    note: formData.get("note") || undefined,
    serviceTitleOverride: formData.get("serviceTitleOverride") || undefined,
    status: formData.get("status")
  });

  if (!parsed.success) {
    throw new Error("Некорректные данные списка");
  }

  await getListAccess(parsed.data.listId, user);

  const current = await prisma.participantList.findUnique({
    where: { id: parsed.data.listId },
    select: {
      bookmarked: true,
      eventStartsAt: true,
      note: true,
      orderId: true,
      serviceTitleOverride: true,
      status: true
    }
  });

  if (!current) {
    throw new Error("Список не найден");
  }

  const nextEventStartsAt = parseOptionalDate(parsed.data.eventStartsAt);
  const nextData = {
    bookmarked: parsed.data.bookmarked,
    eventStartsAt: nextEventStartsAt,
    note: parsed.data.note || null,
    sentAt:
      parsed.data.status === ParticipantListStatus.SENT ? new Date() : null,
    serviceTitleOverride: parsed.data.serviceTitleOverride || null,
    status: parsed.data.status
  };
  const changes = [
    ["status", current.status, nextData.status],
    ["bookmarked", current.bookmarked, nextData.bookmarked],
    ["eventStartsAt", current.eventStartsAt, nextData.eventStartsAt],
    [
      "serviceTitleOverride",
      current.serviceTitleOverride,
      nextData.serviceTitleOverride
    ],
    ["note", current.note, nextData.note]
  ].filter(([, from, to]) => formatFieldValue(from) !== formatFieldValue(to));

  await prisma.$transaction(async (tx) => {
    await captureOrderRevision(tx, {
      actorUserId: user.id,
      eventType: orderRevisionEventTypes.participantListEdit,
      note: "Изменены статус или заметки списка участников",
      orderId: current.orderId
    });

    await tx.participantList.update({
      data: nextData,
      where: { id: parsed.data.listId }
    });

    if (changes.length) {
      await tx.participantListChange.createMany({
        data: changes.map(([fieldName, fromValue, toValue]) => ({
          changedById: user.id,
          fieldName: String(fieldName),
          fromValue: formatFieldValue(fromValue),
          listId: parsed.data.listId,
          toValue: formatFieldValue(toValue)
        }))
      });
    }
  });

  revalidateParticipantListWorkspaces();
  await notifyClientAfterParticipantNamesProcessed(current.orderId);
}

export async function updateParticipantListRowAction(formData: FormData) {
  "use server";
  const user = await requireUser(
    [UserRole.STATISTICIAN, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    "/statistician"
  );
  requireStatisticianLike(user);

  const parsed = rowUpdateSchema.safeParse({
    fullName: formData.get("fullName"),
    listId: formData.get("listId"),
    participantId: formData.get("participantId"),
    rowStatus: formData.get("rowStatus"),
    statisticianComment: formData.get("statisticianComment") || undefined
  });

  if (!parsed.success) {
    throw new Error("Некорректные данные участника");
  }

  await getListAccess(parsed.data.listId, user);

  const participant = await prisma.orderParticipant.findUnique({
    where: { id: parsed.data.participantId },
    select: {
      fullName: true,
      id: true,
      orderId: true,
      rowStatus: true,
      statisticianComment: true
    }
  });

  if (!participant) {
    throw new Error("Участник не найден");
  }

  const nextComment = parsed.data.statisticianComment || null;
  const changedName = participant.fullName !== parsed.data.fullName;
  const changedStatus = participant.rowStatus !== parsed.data.rowStatus;
  const changedComment = participant.statisticianComment !== nextComment;

  if (!changedName && !changedStatus && !changedComment) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await captureOrderRevision(tx, {
      actorUserId: user.id,
      eventType: orderRevisionEventTypes.participantRowEdit,
      note: "Изменена строка участника в списке",
      orderId: participant.orderId
    });

    await tx.orderParticipant.update({
      data: {
        fullName: parsed.data.fullName,
        rowStatus: parsed.data.rowStatus,
        statisticianComment: nextComment
      },
      where: { id: participant.id }
    });

    if (changedName) {
      const participants = await tx.orderParticipant.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { fullName: true },
        where: { orderId: participant.orderId }
      });

      await tx.order.update({
        data: {
          participantCount: participants.length,
          participantsText: participants.map((item) => item.fullName).join("\n")
        },
        where: { id: participant.orderId }
      });

      await tx.participantChangeHistory.create({
        data: {
          action: ParticipantChangeAction.UPDATED,
          changedById: user.id,
          fromFullName: participant.fullName,
          note: "Правка участника статистом",
          participantId: participant.id,
          toFullName: parsed.data.fullName
        }
      });
    }

    const listChanges = [];

    if (changedName) {
      listChanges.push({
        changedById: user.id,
        fieldName: `participant:${participant.id}:fullName`,
        fromValue: participant.fullName,
        listId: parsed.data.listId,
        toValue: parsed.data.fullName
      });
    }

    if (changedStatus) {
      listChanges.push({
        changedById: user.id,
        fieldName: `participant:${participant.id}:rowStatus`,
        fromValue: participant.rowStatus,
        listId: parsed.data.listId,
        toValue: parsed.data.rowStatus
      });
    }

    if (changedComment) {
      listChanges.push({
        changedById: user.id,
        fieldName: `participant:${participant.id}:comment`,
        fromValue: participant.statisticianComment,
        listId: parsed.data.listId,
        toValue: nextComment
      });
    }

    if (listChanges.length) {
      await tx.participantListChange.createMany({ data: listChanges });
    }

    if (changedStatus) {
      const participants = await tx.orderParticipant.findMany({
        select: { rowStatus: true },
        where: { orderId: participant.orderId }
      });
      const allProcessed =
        participants.length > 0 &&
        participants.every(
          (item) => item.rowStatus === ParticipantRowStatus.CHECKED
        );

      if (allProcessed) {
        await tx.participantList.update({
          data: {
            status: ParticipantListStatus.CHECKED
          },
          where: { id: parsed.data.listId }
        });
      }
    }
  });

  revalidateParticipantListWorkspaces();
  await notifyClientAfterParticipantNamesProcessed(participant.orderId);
}

export async function sendParticipantListMessageAction(formData: FormData) {
  "use server";
  const user = await requireUser(
    [
      UserRole.CURATOR,
      UserRole.STATISTICIAN,
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN
    ],
    "/cabinet"
  );
  const parsed = messageSchema.safeParse({
    body: formData.get("body"),
    listId: formData.get("listId")
  });

  if (!parsed.success) {
    throw new Error("Сообщение не может быть пустым");
  }

  const list = await getListAccess(parsed.data.listId, user);
  const senderRole = await userMessageRole(user);

  await prisma.participantListMessage.create({
    data: {
      body: parsed.data.body,
      listId: parsed.data.listId,
      senderId: user.id,
      senderRole
    }
  });

  await sendParticipantListTelegramNotification({
    body: parsed.data.body,
    curatorName: list.order.curator.name,
    curatorTelegramId: list.order.curator.telegramId,
    listId: parsed.data.listId,
    orderNumber: list.order.orderNumber,
    senderName: user.name,
    senderRole
  });

  revalidateParticipantListWorkspaces();
}
