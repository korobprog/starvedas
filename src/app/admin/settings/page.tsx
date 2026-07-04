import { requireAdminUser } from "@/server/auth";
import { saveMaintenanceSettings } from "@/server/site-settings-actions";
import { getMaintenanceSettings } from "@/server/site-settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdminUser("/admin/settings");

  const [{ saved }, maintenance] = await Promise.all([
    searchParams,
    getMaintenanceSettings()
  ]);

  return (
    <div className="admin-grid">
      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <h2>Настройки сайта</h2>
            <p className="admin-muted">
              Управляйте сервисным режимом и публичными сообщениями сайта.
            </p>
          </div>
          {saved === "1" ? (
            <span className="status-pill status-pill--success">Сохранено</span>
          ) : null}
        </div>
      </section>

      <section className="admin-card">
        <h2>Сервисный режим</h2>
        <p className="admin-muted">
          Когда режим включен, весь публичный сайт показывает страницу
          обновления. Вход в админку и сама админка остаются доступными.
        </p>

        <form action={saveMaintenanceSettings} className="admin-form">
          <label className="checkbox-field maintenance-toggle-field">
            <input
              defaultChecked={maintenance.mode}
              name="maintenanceMode"
              type="checkbox"
            />
            <span>
              Включить сервисный режим
              <small>
                Пользователи увидят страницу “На сайте идут обновления”.
              </small>
            </span>
          </label>

          <label className="field">
            <span>Telegram администратора</span>
            <input
              defaultValue={maintenance.adminTelegram}
              name="maintenanceTelegram"
              placeholder="@art_om108"
              type="text"
            />
          </label>

          <label className="field">
            <span>Сообщение на сервисной странице</span>
            <textarea
              defaultValue={maintenance.message}
              name="maintenanceMessage"
              rows={5}
            />
          </label>

          <div className="admin-card__actions">
            <button className="button button--primary" type="submit">
              Сохранить настройки
            </button>
            <a className="button" href="/maintenance?preview=1" target="_blank">
              Открыть предпросмотр
            </a>
          </div>
        </form>
      </section>

      <section className="admin-card maintenance-preview-card">
        <h2>Что увидит пользователь</h2>
        <div className="maintenance-preview">
          <span className="maintenance-preview__sun" aria-hidden="true" />
          <p className="eyebrow">Сервисный режим</p>
          <h3>На сайте идут обновления</h3>
          <p>
            {maintenance.message.split("\n").map((line, index) => (
              <span key={`${line}-${index}`}>
                {line}
                <br />
              </span>
            ))}
          </p>
          <a
            className="button button--primary"
            href={maintenance.adminTelegramUrl}
          >
            Написать администратору
          </a>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <h2>Что можно добавить сюда позже</h2>
        <ul className="admin-list">
          <li>баннеры и временные объявления на главной;</li>
          <li>настройки контактов поддержки;</li>
          <li>служебные тексты для страниц оплаты и кабинета;</li>
          <li>переключатели экспериментальных функций.</li>
        </ul>
      </section>
    </div>
  );
}
