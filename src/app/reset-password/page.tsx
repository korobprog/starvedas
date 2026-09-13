import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { applySiteBrandToText } from "@/lib/site-branding";
import { isPasswordResetTokenUsable } from "@/server/password-reset";
import { getRequestSiteBrand } from "@/server/site-branding";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getRequestSiteBrand();

  return {
    // Токен в адресе не должен уходить сторонним сайтам через Referer.
    referrer: "no-referrer",
    robots: {
      follow: false,
      index: false
    },
    title: applySiteBrandToText("Новый пароль, StarVedas", brand.name)
  };
}

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const [params, brand] = await Promise.all([
    searchParams,
    getRequestSiteBrand()
  ]);
  const token = params.token?.trim() ?? "";
  const usable = token ? await isPasswordResetTokenUsable(token) : false;

  return (
    <main className="simple-page">
      <section
        className={usable ? "simple-card" : "simple-card simple-card--warning"}
      >
        <p className="eyebrow">{brand.name}</p>
        {usable ? (
          <>
            <h1>Новый пароль</h1>
            <p>
              Придумайте новый пароль не короче 8 символов. После сохранения
              все прежние входы в аккаунт будут завершены.
            </p>
            <ResetPasswordForm token={token} />
          </>
        ) : (
          <>
            <h1>Ссылка недействительна</h1>
            <p>
              Ссылка для восстановления пароля устарела или уже была
              использована. Запросите новую — она придёт на ваш email.
            </p>
            <div className="form-actions">
              <Link className="button button--primary" href="/forgot-password">
                Запросить новую ссылку
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
