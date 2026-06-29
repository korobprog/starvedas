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
    title: applySiteBrandToText("Вход, StarVedas", brand.name)
  };
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const brand = await getRequestSiteBrand();

  if (user) {
    redirect(getDefaultUserPath(user.role));
  }

  return (
    <main className="simple-page">
      <section className="simple-card">
        <p className="eyebrow">{brand.name}</p>
        <h1>Вход в кабинет</h1>
        <p>
          Введите email и пароль. Клиенты попадут в личный кабинет, кураторы и
          администраторы — в рабочий кабинет.
        </p>
        <div className="login-help">
          <strong>Как войти администратору</strong>
          <ol>
            <li>
              Первый администратор создаётся при первичной настройке сайта из
              переменных окружения <code>ADMIN_EMAIL</code> и{" "}
              <code>ADMIN_PASSWORD</code>.
            </li>
            <li>
              Введите эти email и пароль ниже. После входа администратор
              автоматически попадёт в админку.
            </li>
            <li>
              Если администратора ещё нет, добавьте эти переменные на сервере и
              один раз запустите первичную инициализацию:{" "}
              <code>npm run seed:init</code>.
            </li>
          </ol>
          <div className="form-actions">
            <Link
              className="button button--primary"
              href="/login?next=%2Fadmin%2Fcurators"
            >
              Войти в админку
            </Link>
            <Link className="button" href="/login?next=%2Fcabinet">
              Войти в кабинет
            </Link>
          </div>
        </div>
        <LoginForm next={params.next} />
      </section>
    </main>
  );
}
