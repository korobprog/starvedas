import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClientRegistrationForm } from "@/components/client-registration-form";
import { applySiteBrandToText } from "@/lib/site-branding";
import { getCurrentClientProfile } from "@/server/client-auth";
import { getCuratorForReferral, referralCookieName } from "@/server/referrals";
import { getRequestSiteBrand } from "@/server/site-branding";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getRequestSiteBrand();

  return {
    robots: {
      follow: false,
      index: false
    },
    title: applySiteBrandToText("Регистрация клиента, StarVedas", brand.name)
  };
}

export default async function ClientRegisterPage({
  searchParams
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const [client, params, cookieStore, brand] = await Promise.all([
    getCurrentClientProfile(),
    searchParams,
    cookies(),
    getRequestSiteBrand()
  ]);

  if (client) {
    redirect("/client");
  }

  const referralSlug =
    params.ref?.trim() || cookieStore.get(referralCookieName)?.value || "";
  const curator = await getCuratorForReferral(referralSlug, brand.sourceDomain);

  return (
    <main className="simple-page">
      <section className="simple-card">
        <p className="eyebrow">{brand.name}</p>
        <h1>Регистрация клиента</h1>
        <p>
          Создайте профиль, чтобы видеть покупки, быстро повторять прошлые
          заказы и сохранять связь с куратором.
        </p>
        <div className="telegram-auth-card">
          <strong>Ваш куратор: {curator.name}</strong>
          <p>
            Если вы пришли по реферальной ссылке, профиль будет закреплен за
            этим куратором.
          </p>
        </div>
        <ClientRegistrationForm referralSlug={referralSlug || curator.slug} />
        <p className="form-note">
          Уже есть аккаунт? <Link href="/login?next=%2Fclient">Войти</Link>
        </p>
      </section>
    </main>
  );
}
