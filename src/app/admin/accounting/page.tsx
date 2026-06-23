import { CopyAccountingLinkButton } from "@/components/copy-accounting-link-button";
import {
  saveAccountantEmailAction,
  saveAccountingSpreadsheetAction,
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
    return "?";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function statusLabel(status: string) {
  switch (status) {
    case "OK":
      return "??????";
    case "ERROR":
      return "??????";
    case "SYNCING":
      return "?????????????";
    default:
      return "??? ?? ?????????";
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
            <h2>???????????</h2>
          </div>
        </div>
        <p className="admin-muted">
          ????? ??????????? ??? ??????????? Google Sheets-???????: ???
          starvedas.ru ? chintamanidhama.ru. ???????? ????????? ?????? ? ????
          ?????; ??????? ????? ??? ?????????? ? ??????? ??????????.
        </p>
        <p className="form-warning">
          ???? ????????? ??????? ?? ????? ??????? ??????? ?????????????,
          ???????? Google Sheet ???????, ????????? ?? ?????????? ???????? ???
          Editor ? ???????? ?????? ??? ID ??????? ? ??????????????? ???? ????.
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
              <dt>??????</dt>
              <dd>{statusLabel(report.lastSyncStatus)}</dd>
            </div>
            <div>
              <dt>????????? ?????????????</dt>
              <dd>{formatDateTime(report.lastSyncedAt)}</dd>
            </div>
            <div>
              <dt>????????</dt>
              <dd>{report.operationCount}</dd>
            </div>
            <div>
              <dt>?????? ??????</dt>
              <dd>
                {formatDateTime(report.lastSyncedPeriodStart)} ?{" "}
                {formatDateTime(report.lastSyncedPeriodEnd)}
              </dd>
            </div>
            <div>
              <dt>Email ??????????</dt>
              <dd>{report.accountantEmail || "?? ?????"}</dd>
            </div>
            <div>
              <dt>Google ???????</dt>
              <dd>
                {report.spreadsheetUrl ? (
                  <a href={report.spreadsheetUrl} rel="noreferrer" target="_blank">
                    ??????? ???????
                  </a>
                ) : (
                  "?? ??????"
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
              ??????? ???????
            </a>
            <CopyAccountingLinkButton url={report.spreadsheetUrl} />
            <form action={syncAccountingReportAction}>
              <input
                name="sourceDomain"
                type="hidden"
                value={report.sourceDomain}
              />
              <button className="button" type="submit">
                ???????? ??????
              </button>
            </form>
          </div>

          <form action={saveAccountingSpreadsheetAction} className="admin-form">
            <input
              name="sourceDomain"
              type="hidden"
              value={report.sourceDomain}
            />
            <label className="field">
              <span>Google ??????? ??? ??????</span>
              <input
                defaultValue={report.spreadsheetUrl ?? report.spreadsheetId ?? ""}
                name="spreadsheet"
                placeholder="https://docs.google.com/spreadsheets/d/... ??? ID"
                type="text"
              />
            </label>
            <button className="button button--primary" type="submit">
              ????????? ???????
            </button>
          </form>

          <form action={saveAccountantEmailAction} className="admin-form">
            <input
              name="sourceDomain"
              type="hidden"
              value={report.sourceDomain}
            />
            <label className="field">
              <span>????????? ?????? ??????????</span>
              <input
                defaultValue={report.accountantEmail ?? ""}
                name="accountantEmail"
                placeholder="accountant@example.com"
                type="email"
              />
            </label>
            <button className="button button--primary" type="submit">
              ????????? email ? ?????? ??????
            </button>
          </form>

          <div>
            <h3>????????? ?????????????</h3>
            {report.logs.length > 0 ? (
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>?????</th>
                      <th>??????</th>
                      <th>????????</th>
                      <th>?????????</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.logs.map((log) => (
                      <tr key={log.id}>
                        <td>{formatDateTime(log.startedAt)}</td>
                        <td>{statusLabel(log.status)}</td>
                        <td>{log.operationCount}</td>
                        <td>{log.message ?? "?"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="admin-muted">????? ????????????? ???? ???.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
