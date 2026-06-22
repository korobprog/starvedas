import type { Prisma } from "@prisma/client";

const maxSavedParticipantsPerClient = 200;

export function normalizeSavedParticipantName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeSavedParticipantNames(names: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const name of names) {
    const normalized = normalizeSavedParticipantName(name);
    const key = normalized.toLocaleLowerCase("ru");

    if (!normalized || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

export async function saveClientParticipants(
  tx: Prisma.TransactionClient,
  clientId: string | null | undefined,
  names: string[]
) {
  if (!clientId) {
    return;
  }

  const normalizedNames = normalizeSavedParticipantNames(names);

  if (!normalizedNames.length) {
    return;
  }

  const existingCount = await tx.savedParticipant.count({
    where: { clientId }
  });
  const availableSlots = Math.max(
    maxSavedParticipantsPerClient - existingCount,
    0
  );

  if (availableSlots < 1) {
    return;
  }

  await tx.savedParticipant.createMany({
    data: normalizedNames.slice(0, availableSlots).map((fullName) => ({
      clientId,
      fullName
    })),
    skipDuplicates: true
  });
}
