import { ClientFunnelStatus, Prisma } from "@prisma/client";

type ClientProfileTx = Prisma.TransactionClient;

type ClientProfileInput = {
  clientId?: string | null;
  consentMailings?: boolean;
  consentMailingsSource?: string;
  consentPersonalData?: boolean;
  curatorId?: string | null;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  referralSlug?: string | null;
  source?: string;
  sourceDomain?: string;
  telegram?: string | null;
  telegramId?: string | null;
  visitorId?: string | null;
};

const statusPriority: Record<ClientFunnelStatus, number> = {
  [ClientFunnelStatus.VISITED]: 0,
  [ClientFunnelStatus.STARTED_CHECKOUT]: 1,
  [ClientFunnelStatus.DID_NOT_BUY]: 2,
  [ClientFunnelStatus.BOUGHT]: 3
};

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();

  return trimmed || null;
}

function normalizeEmail(value?: string | null) {
  return normalizeText(value)?.toLocaleLowerCase("ru") ?? null;
}

function chooseStatus(
  currentStatus: ClientFunnelStatus | undefined,
  nextStatus: ClientFunnelStatus
) {
  if (!currentStatus) {
    return nextStatus;
  }

  return statusPriority[nextStatus] > statusPriority[currentStatus]
    ? nextStatus
    : currentStatus;
}

function getStatusTimestampData(status: ClientFunnelStatus, date: Date) {
  if (status === ClientFunnelStatus.VISITED) {
    return { lastVisitedAt: date };
  }

  if (status === ClientFunnelStatus.STARTED_CHECKOUT) {
    return { checkoutStartedAt: date };
  }

  if (status === ClientFunnelStatus.DID_NOT_BUY) {
    return { didNotBuyAt: date };
  }

  return { boughtAt: date };
}

function getIdentityWhere({
  email,
  phone,
  sourceDomain,
  telegram,
  telegramId
}: {
  email: string | null;
  phone: string | null;
  sourceDomain: string;
  telegram: string | null;
  telegramId: string | null;
}) {
  const identityWhere: Prisma.ClientProfileWhereInput[] = [];

  if (telegramId) {
    identityWhere.push({ telegramId });
  }

  if (telegram) {
    identityWhere.push({ telegram, sourceDomain });
  }

  if (phone) {
    identityWhere.push({ phone, sourceDomain });
  }

  if (email) {
    identityWhere.push({ email, sourceDomain });
  }

  return identityWhere;
}

export async function recordClientFunnelEvent(
  tx: ClientProfileTx,
  input: ClientProfileInput & {
    clientId?: string | null;
    status: ClientFunnelStatus;
  }
) {
  await tx.clientEvent.create({
    data: {
      clientId: input.clientId ?? undefined,
      curatorId: input.curatorId ?? undefined,
      referralSlug: normalizeText(input.referralSlug),
      source: input.source ?? "site",
      status: input.status,
      visitorId: normalizeText(input.visitorId)
    }
  });
}

export async function upsertClientProfileForFunnel(
  tx: ClientProfileTx,
  input: ClientProfileInput & {
    fallbackName?: string;
    status: ClientFunnelStatus;
  }
) {
  const now = new Date();
  const email = normalizeEmail(input.email);
  const phone = normalizeText(input.phone);
  const telegram = normalizeText(input.telegram);
  const telegramId = normalizeText(input.telegramId);
  const name = normalizeText(input.name) ?? input.fallbackName ?? "Клиент";
  const sourceDomain = input.sourceDomain ?? "starvedas.ru";
  const identityWhere = getIdentityWhere({
    email,
    phone,
    sourceDomain,
    telegram,
    telegramId
  });
  const existing = input.clientId
    ? await tx.clientProfile.findUnique({
        where: {
          id: input.clientId
        },
        select: {
          consentMailings: true,
          curatorId: true,
          id: true,
          referralSlug: true,
          status: true
        }
      })
    : identityWhere.length
      ? await tx.clientProfile.findFirst({
          orderBy: {
            updatedAt: "desc"
          },
          select: {
            consentMailings: true,
            curatorId: true,
            id: true,
            referralSlug: true,
            status: true
          },
          where: {
            OR: identityWhere
          }
        })
      : null;
  const nextStatus = chooseStatus(existing?.status, input.status);
  const consentMailings = existing?.consentMailings || input.consentMailings;
  const preservedReferralSlug = normalizeText(existing?.referralSlug);
  const inputReferralSlug = normalizeText(input.referralSlug);
  const resolvedReferralSlug = inputReferralSlug ?? preservedReferralSlug;
  const resolvedCuratorId = inputReferralSlug
    ? (input.curatorId ?? undefined)
    : preservedReferralSlug
      ? (existing?.curatorId ?? undefined)
      : (input.curatorId ?? undefined);
  const data = {
    consentMailings: Boolean(consentMailings),
    consentMailingsAt:
      input.consentMailings && !existing?.consentMailings ? now : undefined,
    consentMailingsSource:
      input.consentMailings && !existing?.consentMailings
        ? (input.consentMailingsSource ?? "site")
        : undefined,
    consentPersonalData: input.consentPersonalData || undefined,
    curatorId: resolvedCuratorId,
    email,
    name,
    phone,
    referralSlug: resolvedReferralSlug,
    source: input.source ?? "site",
    sourceDomain,
    status: nextStatus,
    telegram,
    telegramId: telegramId ?? undefined,
    ...getStatusTimestampData(input.status, now)
  } satisfies Prisma.ClientProfileUncheckedUpdateInput;

  const client = existing
    ? await tx.clientProfile.update({
        where: {
          id: existing.id
        },
        data,
        select: {
          id: true
        }
      })
    : await tx.clientProfile.create({
        data: {
          ...data,
          consentPersonalData: Boolean(input.consentPersonalData)
        },
        select: {
          id: true
        }
      });

  await recordClientFunnelEvent(tx, {
    ...input,
    clientId: client.id,
    status: input.status
  });

  return client;
}

export async function markOrderClientBought(
  tx: ClientProfileTx,
  orderId: string,
  source: string
) {
  const order = await tx.order.findUnique({
    where: {
      id: orderId
    },
    select: {
      clientId: true,
      curatorId: true,
      source: true,
      sourceDomain: true
    }
  });

  if (!order?.clientId) {
    return;
  }

  const now = new Date();

  await tx.clientProfile.update({
    where: {
      id: order.clientId
    },
    data: {
      boughtAt: now,
      curatorId: order.curatorId,
      status: ClientFunnelStatus.BOUGHT
    }
  });

  await recordClientFunnelEvent(tx, {
    clientId: order.clientId,
    curatorId: order.curatorId,
    source: order.source || source,
    status: ClientFunnelStatus.BOUGHT
  });
}
