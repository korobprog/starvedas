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
          <p className="eyebrow">Telegram Mini App</p>
          <h1>Вход через Telegram</h1>
          <p>
            По реферальной ссылке откроем клиентский кабинет. Если Telegram ID
            привязан администратором к куратору, откроем кабинет куратора.
          </p>
        </div>
        <div className="telegram-auth-card">
          <CuratorMiniAppLogin nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
