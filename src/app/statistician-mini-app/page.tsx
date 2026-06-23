import Link from "next/link";
import type { CSSProperties } from "react";
import { StatisticianMiniAppLogin } from "@/components/statistician-mini-app-login";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const miniAppShellStyle: CSSProperties = {
  alignItems: "start",
  display: "grid",
  justifyItems: "center",
  minHeight: "100dvh",
  overflowX: "hidden",
  padding:
    "max(24px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(30px, calc(env(safe-area-inset-bottom, 0px) + 20px)) max(16px, env(safe-area-inset-left, 0px))"
};

const miniAppCardStyle: CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(255, 244, 223, 0.86))",
  border: "1px solid rgba(216, 154, 43, 0.26)",
  borderRadius: "28px",
  boxShadow: "0 20px 54px rgba(86, 48, 13, 0.13)",
  display: "grid",
  gap: "18px",
  maxWidth: "100%",
  padding: "clamp(22px, 6vw, 42px)",
  width: "min(680px, 100%)"
};

const miniAppHeadingStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
  minWidth: 0
};

const miniAppTitleStyle: CSSProperties = {
  fontSize: "clamp(2.15rem, 11vw, 3.35rem)",
  lineHeight: 0.95,
  margin: 0,
  overflowWrap: "anywhere"
};

const miniAppLeadStyle: CSSProperties = {
  color: "var(--text)",
  lineHeight: 1.55,
  margin: 0,
  maxWidth: "58ch",
  overflowWrap: "anywhere"
};

const miniAppTelegramCardStyle: CSSProperties = {
  borderRadius: "22px",
  margin: 0,
  maxWidth: "100%",
  minWidth: 0,
  padding: "16px",
  width: "100%"
};

const miniAppButtonStyle: CSSProperties = {
  justifySelf: "start",
  maxWidth: "100%",
  minWidth: 0,
  textAlign: "center",
  whiteSpace: "normal",
  width: "min(100%, 360px)"
};

export default async function StatisticianMiniAppPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const nextPath = firstParam(params.next);

  return (
    <main
      className="page-shell statistician-mini-app-shell"
      style={miniAppShellStyle}
    >
      <section className="statistician-mini-app-card" style={miniAppCardStyle}>
        <div className="section-heading" style={miniAppHeadingStyle}>
          <p className="eyebrow">Кабинет статиста</p>
          <h1 style={miniAppTitleStyle}>Вход через Telegram</h1>
          <p style={miniAppLeadStyle}>
            Если ваш Telegram ID привязан к пользователю со статусом статиста,
            кабинет откроется внутри Mini App.
          </p>
        </div>
        <div
          className="telegram-auth-card statistician-mini-app-telegram-card"
          style={miniAppTelegramCardStyle}
        >
          <StatisticianMiniAppLogin nextPath={nextPath} />
        </div>
        <Link className="button" href="/login" style={miniAppButtonStyle}>
          Войти по email и паролю
        </Link>
      </section>
    </main>
  );
}
