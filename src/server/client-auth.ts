import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";

export const clientSessionCookieName = "starvedas_client_session";

const sessionMaxAgeSeconds = 60 * 60 * 24 * 90;

type ClientSessionPayload = {
  clientId: string;
  exp: number;
};

function getSessionSecret() {
  return (
    process.env.AUTH_SECRET ??
    process.env.SESSION_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "starvedas-local-client-session-secret"
  );
}

function sign(value: string) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function createClientSessionToken(payload: ClientSessionPayload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${data}.${sign(data)}`;
}

function parseClientSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [data, signature] = token.split(".");

  if (!data || !signature || sign(data) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    ) as ClientSessionPayload;

    if (!payload.clientId || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function setClientSession(clientId: string) {
  const cookieStore = await cookies();
  const token = createClientSessionToken({
    clientId,
    exp: Date.now() + sessionMaxAgeSeconds * 1000
  });

  cookieStore.set(clientSessionCookieName, token, {
    httpOnly: true,
    maxAge: sessionMaxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

export async function clearClientSession() {
  const cookieStore = await cookies();

  cookieStore.delete(clientSessionCookieName);
}

export async function getCurrentClientProfile() {
  const cookieStore = await cookies();
  const payload = parseClientSessionToken(
    cookieStore.get(clientSessionCookieName)?.value
  );

  if (payload) {
    const client = await findClientProfile({ id: payload.clientId });

    if (client) {
      return client;
    }
  }

  const user = await getCurrentUser();

  if (user?.role !== "CLIENT") {
    return null;
  }

  return findClientProfile({ userId: user.id });
}

function findClientProfile(where: { id: string } | { userId: string }) {
  return prisma.clientProfile.findUnique({
    where,
    select: {
      consentMailings: true,
      consentPersonalData: true,
      curator: {
        select: {
          id: true,
          name: true,
          slug: true,
          supportButtonLabel: true,
          supportEnabled: true,
          supportUrl: true
        }
      },
      email: true,
      id: true,
      name: true,
      phone: true,
      referralSlug: true,
      telegram: true,
      telegramFirstName: true,
      telegramId: true,
      telegramLastName: true,
      telegramPhotoUrl: true
    }
  });
}
