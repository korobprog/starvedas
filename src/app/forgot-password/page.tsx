import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { applySiteBrandToText } from "@/lib/site-branding";
import { getRequestSiteBrand } from "@/server/site-branding";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getRequestSiteBrand();

  return {
    robots: {
      follow: false,
      index: false
    },
    title: applySiteBrandToText("Восстановление пароля, StarVedas", brand.name)
  };
}

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const [params, brand] = await Promise.all([
    searchParams,
    getRequestSiteBrand()
  ]);
  const loginHref =
    params.scope === "client" ? "/client/login" : "/admin/login";

  return (
    <main className="simple-page">
      <section className="simple-card">
        <p className="eyebrow">{brand.name}</p>
        <h1>Восстановление пароля</h1>
        <p>
          Укажите email, с которым вы входите. Мы отправим письмо со ссылкой,
          по которой можно задать новый пароль.
        </p>
        <ForgotPasswordForm />
        <p className="form-note">
          Вспомнили пароль? <Link href={loginHref}>Вернуться ко входу</Link>
        </p>
      </section>
    </main>
  );
}
