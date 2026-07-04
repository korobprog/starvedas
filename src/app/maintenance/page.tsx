import { redirect } from "next/navigation";
import { MaintenanceGame } from "@/components/maintenance-game";
import { getMaintenanceSettings } from "@/server/site-settings";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: {
    follow: false,
    index: false
  },
  title: "На сайте идут обновления"
};

export default async function MaintenancePage({
  searchParams
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const settings = await getMaintenanceSettings();
  const { preview } = await searchParams;

  if (!settings.mode && preview !== "1") {
    redirect("/");
  }

  return (
    <main className="maintenance-page">
      <div className="maintenance-page__mandala" aria-hidden="true" />
      <section className="maintenance-hero">
        <div className="maintenance-hero__content">
          <p className="eyebrow">StarVedas обновляется</p>
          <h1>На сайте идут обновления</h1>
          <div className="maintenance-hero__message">
            {settings.message.split("\n").map((line, index) => (
              <p key={`${line}-${index}`}>{line}</p>
            ))}
          </div>
          <div className="maintenance-hero__actions">
            <a
              className="button button--primary"
              href={settings.adminTelegramUrl}
              rel="noreferrer"
              target="_blank"
            >
              Написать администратору {settings.adminTelegram}
            </a>
          </div>
        </div>

        <div className="maintenance-hero__fire" aria-hidden="true">
          <span className="maintenance-hero__aura" />
          <span className="maintenance-hero__flame maintenance-hero__flame--outer" />
          <span className="maintenance-hero__flame maintenance-hero__flame--middle" />
          <span className="maintenance-hero__flame maintenance-hero__flame--inner" />
          <span className="maintenance-hero__bowl" />
        </div>
      </section>

      <MaintenanceGame />
    </main>
  );
}
