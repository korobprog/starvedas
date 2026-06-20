import Link from "next/link";
import { CuratorMiniAppLogin } from "@/components/curator-mini-app-login";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CuratorMiniAppPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const nextPath = firstParam(params.next);

  return (
    <main className="page-shell">
      <section className="content-section content-section--narrow">
        <div className="section-heading">
          <p className="eyebrow">Кабинет куратора</p>
          <h1>Вход через Telegram</h1>
          <p>
            Если ваш Telegram ID привязан администратором, мы откроем кабинет
            куратора внутри Mini App.
          </p>
        </div>
        <div className="telegram-auth-card">
          <CuratorMiniAppLogin nextPath={nextPath} />
        </div>
        <Link className="button" href="/login">
          Войти по email и паролю
        </Link>
      </section>
    </main>
  );
}
