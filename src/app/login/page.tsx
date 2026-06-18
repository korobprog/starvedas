import type { Metadata } from "next";
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
        <p>Введите email и пароль, выданные администратором.</p>
        <LoginForm next={params.next} />
      </section>
    </main>
  );
}
