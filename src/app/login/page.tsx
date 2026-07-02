import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { applySiteBrandToText } from "@/lib/site-branding";
import { getCurrentUser } from "@/server/auth";
import { getCurrentClientProfile } from "@/server/client-auth";
import { getRequestSiteBrand } from "@/server/site-branding";

function firstPathSegment(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }

  if (next.startsWith("/client")) {
    return "client";
  }

  if (
    next.startsWith("/admin") ||
    next.startsWith("/cabinet") ||
    next.startsWith("/statistician")
  ) {
    return "staff";
  }

  return null;
}

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
  const [user, client, params, brand] = await Promise.all([
    getCurrentUser(),
    getCurrentClientProfile(),
    searchParams,
    getRequestSiteBrand()
  ]);
  const target = firstPathSegment(params.next);

  if (target === "client") {
    redirect(
      `/client/login?next=${encodeURIComponent(params.next ?? "/client")}`
    );
  }

  if (target === "staff") {
    redirect(
      `/admin/login?next=${encodeURIComponent(params.next ?? "/admin/curators")}`
    );
  }

  return (
    <main className="simple-page">
      <section className="simple-card">
        <p className="eyebrow">{brand.name}</p>
        <h1>Выберите страницу входа</h1>
        <p>
          Клиентский кабинет и админская панель теперь разделены, чтобы
          служебный аккаунт не уводил вас не в тот раздел.
        </p>
        <div className="form-actions">
          <Link className="button button--primary" href="/client/login">
            Войти как клиент
          </Link>
          <Link className="button" href="/admin/login">
            Войти в админку / кабинет команды
          </Link>
        </div>
        {client ? (
          <p className="form-note">
            Клиентский кабинет уже открыт: <Link href="/client">перейти</Link>.
          </p>
        ) : null}
        {user && user.role !== "CLIENT" ? (
          <p className="form-note">
            Вы уже вошли как сотрудник:{" "}
            <Link href="/admin/curators">админка</Link>
            {" · "}
            <Link href="/cabinet">кабинет куратора</Link>
          </p>
        ) : null}
      </section>
    </main>
  );
}
