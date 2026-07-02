import Link from "next/link";
import { ClientAuthRequired } from "@/components/client-auth-required";
import { getCurrentClientProfile } from "@/server/client-auth";
import { getPublicClientVideoMaterials } from "@/server/client-video-materials";

export const dynamic = "force-dynamic";

export default async function ClientMaterialsPage() {
  const client = await getCurrentClientProfile();

  if (!client) {
    return (
      <ClientAuthRequired
        description="Войдите в личный кабинет, чтобы открыть видео инструкции и материалы."
        nextPath="/client/materials"
        title="Видео материалы доступны клиентам"
      />
    );
  }

  const materials = await getPublicClientVideoMaterials();

  return (
    <main className="page-shell client-cabinet-shell">
      <section className="content-section content-section--narrow client-cabinet-section">
        <div className="section-heading">
          <p className="eyebrow">Личный кабинет</p>
          <h1>Видео материалы</h1>
          <p>
            Здесь собраны инструкции и видео для клиентов StarVedas. Если нужно
            уточнить детали по вашей покупке, напишите куратору из кабинета.
          </p>
        </div>
        <div className="form-actions client-cabinet-actions">
          <Link className="button" href="/client">
            ← В кабинет
          </Link>
          <Link className="button button--primary" href="/#signup">
            Купить новый абонемент
          </Link>
        </div>
      </section>

      <section className="content-section content-section--narrow client-cabinet-section">
        {materials.length === 0 ? (
          <div className="telegram-auth-card">
            <strong>Видео пока не добавлены</strong>
            <p>Когда администратор опубликует материалы, они появятся здесь.</p>
          </div>
        ) : (
          <div className="client-video-material-list">
            {materials.map((material) => (
              <article className="telegram-auth-card" key={material.id}>
                <div className="client-video-material-card__header">
                  <strong>{material.title}</strong>
                  {material.description && <p>{material.description}</p>}
                </div>
                <video controls preload="metadata" src={material.videoUrl}>
                  Ваш браузер не поддерживает видео.
                </video>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
