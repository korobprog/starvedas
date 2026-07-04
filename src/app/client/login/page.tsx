import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { TelegramMiniAppAutoLogin } from "@/components/telegram-mini-app-auto-login";
import { applySiteBrandToText } from "@/lib/site-branding";
import { getCurrentUser } from "@/server/auth";
import { getCurrentClientProfile } from "@/server/client-auth";
import { getRequestSiteBrand } from "@/server/site-branding";

function getSafeClientNext(next?: string) {
  if (!next || !next.startsWith("/client") || next.startsWith("//")) {
    return "/client";
  }

  if (next.startsWith("/client/login")) {
    return "/client";
  }

  return next;
}

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getRequestSiteBrand();

  return {
    robots: {
      follow: false,
      index: false
    },
    title: applySiteBrandToText("Вход в личный кабинет, StarVedas", brand.name)
  };
}

export default async function ClientLoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [client, user, params, brand] = await Promise.all([
    getCurrentClientProfile(),
    getCurrentUser(),
    searchParams,
    getRequestSiteBrand()
  ]);
  const safeNext = getSafeClientNext(params.next);

  if (client) {
    redirect(safeNext);
  }

  const isStaffSignedIn = Boolean(user && user.role !== "CLIENT");

  return (
    <main className="simple-page">
      <section className="simple-card">
        <p className="eyebrow">{brand.name}</p>
        <h1>Вход в личный кабинет клиента</h1>
        <p>
          Эта страница только для клиентов. Вход администратора, куратора или
          статиста здесь не переводит в админку — для команды есть отдельная
          страница входа.
        </p>
        <TelegramMiniAppAutoLogin redirectPath={safeNext} />
        {isStaffSignedIn ? (
          <div className="login-help">
            <strong>Вы уже вошли как сотрудник</strong>
            <p>
              Чтобы открыть клиентский кабинет, войдите клиентским email или
              создайте клиентский кабинет. Админ-панель остаётся доступна через
              отдельный вход.
            </p>
            <div className="form-actions">
              <Link className="button" href="/admin/curators">
                Перейти в админку
              </Link>
            </div>
          </div>
        ) : null}
        <LoginForm
          next={safeNext}
          scope="client"
          submitLabel="Войти как клиент"
        />
        <div className="login-help">
          <strong>Нет клиентского кабинета?</strong>
          <p>Создайте кабинет или вернитесь к форме записи на сайте.</p>
          <div className="form-actions login-help-actions">
            <Link className="button button--primary" href="/client/register">
              Создать кабинет
            </Link>
            <Link className="button" href="/#signup">
              Перейти к форме записи
            </Link>
            <Link className="button" href="/admin/login">
              Вход для команды
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
