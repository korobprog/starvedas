import { CopyAccountingLinkButton } from "@/components/copy-accounting-link-button";
import {
  saveAccountantEmailAction,
  syncAccountingReportAction
} from "@/server/accounting-actions";
import {
  accountingReportTitles,
  getAccountingDashboard
} from "@/server/accounting-reports";
import { requireSuperAdminUser } from "@/server/auth";

export const dynamic = "force-dynamic";

function formatDateTime(value: Date | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function statusLabel(status: string) {
  switch (status) {
    case "OK":
      return "Готово";
    case "ERROR":
      return "Ошибка";
    case "SYNCING":
      return "Синхронизация";
    default:
      return "Еще не запускали";
  }
}

export default async function AdminAccountingPage() {
  await requireSuperAdminUser("/admin/accounting");

  const reports = await getAccountingDashboard();

  return (
    <div className="admin-grid">
      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <p className="eyebrow">Google Sheets</p>
            <h2>Бухгалтерия</h2>
          </div>
        </div>
        <p className="admin-muted">
          Здесь создаются и обновляются две независимые Google Sheets-витрины:
          для starvedas.ru и chintamanidhama.ru. Основное хранилище данных —
          база сайта; таблицы нужны для отчетности и доступа бухгалтера.
        </p>
        <p className="form-warning">
          Для синхронизации настройте service account в переменных окружения:
          GOOGLE_SERVICE_ACCOUNT_JSON или GOOGLE_SERVICE_ACCOUNT_EMAIL +
          GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY. Бухгалтеру выдается доступ только
          на чтение по email.
        </p>
      </section>

      {reports.map((report) => (
        <section className="admin-card" key={report.sourceDomain}>
          <div className="admin-card__header">
            <div>
              <p className="eyebrow">{report.sourceDomain}</p>
              <h2>{accountingReportTitles[report.sourceDomain]}</h2>
            </div>
          </div>

          <dl className="admin-summary-list">
            <div>
              <dt>Статус</dt>
              <dd>{statusLabel(report.lastSyncStatus)}</dd>
            </div>
            <div>
              <dt>Последняя синхронизация</dt>
              <dd>{formatDateTime(report.lastSyncedAt)}</dd>
            </div>
            <div>
              <dt>Операций</dt>
              <dd>{report.operationCount}</dd>
            </div>
            <div>
              <dt>Период данных</dt>
              <dd>
                {formatDateTime(report.lastSyncedPeriodStart)} —{" "}
                {formatDateTime(report.lastSyncedPeriodEnd)}
              </dd>
            </div>
            <div>
              <dt>Email бухгалтера</dt>
              <dd>{report.accountantEmail || "не задан"}</dd>
            </div>
            <div>
              <dt>Google таблица</dt>
              <dd>
                {report.spreadsheetUrl ? (
                  <a href={report.spreadsheetUrl} rel="noreferrer" target="_blank">
                    Открыть таблицу
                  </a>
                ) : (
                  "будет создана при первой синхронизации"
                )}
              </dd>
            </div>
          </dl>

          {report.lastSyncError ? (
            <p className="form-error">{report.lastSyncError}</p>
          ) : null}

          <div className="admin-card__actions">
            <a
              className="button button--primary"
              href={report.spreadsheetUrl ?? "#"}
              rel="noreferrer"
              target="_blank"
              aria-disabled={!report.spreadsheetUrl}
            >
              Открыть таблицу
            </a>
            <CopyAccountingLinkButton url={report.spreadsheetUrl} />
            <form action={syncAccountingReportAction}>
              <input
                name="sourceDomain"
                type="hidden"
                value={report.sourceDomain}
              />
              <button className="button" type="submit">
                Обновить сейчас
              </button>
            </form>
          </div>

          <form action={saveAccountantEmailAction} className="admin-form">
            <input
              name="sourceDomain"
              type="hidden"
              value={report.sourceDomain}
            />
            <label className="field">
              <span>Настроить доступ бухгалтеру</span>
              <input
                defaultValue={report.accountantEmail ?? ""}
                name="accountantEmail"
                placeholder="accountant@example.com"
                type="email"
              />
            </label>
            <button className="button button--primary" type="submit">
              Сохранить email и выдать доступ
            </button>
          </form>

          <div>
            <h3>Последние синхронизации</h3>
            {report.logs.length > 0 ? (
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Старт</th>
                      <th>Статус</th>
                      <th>Операций</th>
                      <th>Сообщение</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.logs.map((log) => (
                      <tr key={log.id}>
                        <td>{formatDateTime(log.startedAt)}</td>
                        <td>{statusLabel(log.status)}</td>
                        <td>{log.operationCount}</td>
                        <td>{log.message ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="admin-muted">Логов синхронизации пока нет.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
