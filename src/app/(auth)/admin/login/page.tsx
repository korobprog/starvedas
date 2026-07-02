import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { applySiteBrandToText } from "@/lib/site-branding";
import { getCurrentUser, getDefaultUserPath } from "@/server/auth";
import { getRequestSiteBrand } from "@/server/site-branding";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getRequestSiteBrand();

  return {
    robots: {
      follow: false,
      index: false
    },
    title: applySiteBrandToText("Вход для команды, StarVedas", brand.name)
  };
}

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [user, params, brand] = await Promise.all([
    getCurrentUser(),
    searchParams,
    getRequestSiteBrand()
  ]);

  if (user && user.role !== "CLIENT") {
    redirect(getDefaultUserPath(user.role));
  }

  return (
    <main className="simple-page">
      <section className="simple-card">
        <p className="eyebrow">{brand.name}</p>
        <h1>Вход для админки и команды</h1>
        <p>
          Эта страница только для администраторов, кураторов и статистов. После
          входа вы попадёте в рабочую панель, а не в личный кабинет клиента.
        </p>
        <LoginForm
          next={params.next}
          scope="staff"
          submitLabel="Войти в рабочую панель"
        />
        <div className="login-help">
          <strong>Как войти первому администратору</strong>
          <p>
            Первый администратор создаётся при первичной настройке из переменных
            окружения <code>ADMIN_EMAIL</code> и <code>ADMIN_PASSWORD</code>.
            Если его ещё нет, добавьте переменные на сервере и один раз
            запустите <code>npm run seed:init</code>.
          </p>
        </div>
        <div className="login-help">
          <strong>Нужен клиентский кабинет?</strong>
          <p>
            Для клиентов используется отдельный вход. Служебный аккаунт через
            него не откроет админку.
          </p>
          <div className="form-actions">
            <Link className="button" href="/client/login">
              Войти как клиент
            </Link>
            <Link className="button" href="/client/register">
              Создать клиентский кабинет
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
