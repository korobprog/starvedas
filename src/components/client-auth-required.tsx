import Link from "next/link";
import { TelegramMiniAppAutoLogin } from "@/components/telegram-mini-app-auto-login";

type ClientAuthRequiredProps = {
  description?: string;
  nextPath: string;
  title?: string;
};

export function ClientAuthRequired({
  description = "Войдите по email или зарегистрируйтесь, чтобы открыть личный кабинет.",
  nextPath,
  title = "Войдите в личный кабинет"
}: ClientAuthRequiredProps) {
  const safeNextPath =
    nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/client";
  const loginHref = `/login?next=${encodeURIComponent(safeNextPath)}`;

  return (
    <main className="page-shell client-cabinet-shell">
      <section className="content-section content-section--narrow client-cabinet-section client-cabinet-section--login">
        <div className="section-heading">
          <p className="eyebrow">Личный кабинет</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <TelegramMiniAppAutoLogin redirectPath={safeNextPath} />
        <div className="form-actions client-cabinet-actions client-login-actions">
          <Link className="button button--primary" href={loginHref}>
            Войти по email
          </Link>
          <Link className="button" href="/client/register">
            Зарегистрироваться
          </Link>
          <Link className="button" href="/#signup">
            Перейти к форме записи
          </Link>
        </div>
      </section>
    </main>
  );
}
