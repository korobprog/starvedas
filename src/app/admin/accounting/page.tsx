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
    return "\u2014";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function statusLabel(status: string) {
  switch (status) {
    case "OK":
      return "\u0413\u043e\u0442\u043e\u0432\u043e";
    case "ERROR":
      return "\u041e\u0448\u0438\u0431\u043a\u0430";
    case "SYNCING":
      return "\u0421\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0430\u0446\u0438\u044f";
    default:
      return "\u0415\u0449\u0435 \u043d\u0435 \u0437\u0430\u043f\u0443\u0441\u043a\u0430\u043b\u0438";
  }
}

export default async function AdminAccountingPage() {
  await requireSuperAdminUser("/admin/accounting");

  const reports = await getAccountingDashboard();

  return (
    <div className="admin-grid accounting-grid">
      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <p className="eyebrow">Google Sheets</p>
            <h2>&#x0411;&#x0443;&#x0445;&#x0433;&#x0430;&#x043b;&#x0442;&#x0435;&#x0440;&#x0438;&#x044f;</h2>
          </div>
        </div>
        <p className="admin-muted">
          &#x0417;&#x0434;&#x0435;&#x0441;&#x044c; &#x043e;&#x0431;&#x043d;&#x043e;&#x0432;&#x043b;&#x044f;&#x044e;&#x0442;&#x0441;&#x044f; &#x0434;&#x0432;&#x0435; &#x043d;&#x0435;&#x0437;&#x0430;&#x0432;&#x0438;&#x0441;&#x0438;&#x043c;&#x044b;&#x0435; Google Sheets-&#x0432;&#x0438;&#x0442;&#x0440;&#x0438;&#x043d;&#x044b;: &#x0434;&#x043b;&#x044f; starvedas.ru &#x0438; chintamanidhama.ru. &#x041e;&#x0441;&#x043d;&#x043e;&#x0432;&#x043d;&#x043e;&#x0435; &#x0445;&#x0440;&#x0430;&#x043d;&#x0438;&#x043b;&#x0438;&#x0449;&#x0435; &#x0434;&#x0430;&#x043d;&#x043d;&#x044b;&#x0445; &mdash; &#x0431;&#x0430;&#x0437;&#x0430; &#x0441;&#x0430;&#x0439;&#x0442;&#x0430;; &#x0442;&#x0430;&#x0431;&#x043b;&#x0438;&#x0446;&#x044b; &#x043d;&#x0443;&#x0436;&#x043d;&#x044b; &#x0434;&#x043b;&#x044f; &#x043e;&#x0442;&#x0447;&#x0435;&#x0442;&#x043d;&#x043e;&#x0441;&#x0442;&#x0438; &#x0438; &#x0434;&#x043e;&#x0441;&#x0442;&#x0443;&#x043f;&#x0430; &#x0431;&#x0443;&#x0445;&#x0433;&#x0430;&#x043b;&#x0442;&#x0435;&#x0440;&#x0430;.
        </p>
        <p className="form-warning">
          &#x0415;&#x0441;&#x043b;&#x0438; &#x0441;&#x0435;&#x0440;&#x0432;&#x0438;&#x0441;&#x043d;&#x044b;&#x0439; &#x0430;&#x043a;&#x043a;&#x0430;&#x0443;&#x043d;&#x0442; &#x043d;&#x0435; &#x043c;&#x043e;&#x0436;&#x0435;&#x0442; &#x0441;&#x043e;&#x0437;&#x0434;&#x0430;&#x0442;&#x044c; &#x0442;&#x0430;&#x0431;&#x043b;&#x0438;&#x0446;&#x0443; &#x0430;&#x0432;&#x0442;&#x043e;&#x043c;&#x0430;&#x0442;&#x0438;&#x0447;&#x0435;&#x0441;&#x043a;&#x0438;, &#x0441;&#x043e;&#x0437;&#x0434;&#x0430;&#x0439;&#x0442;&#x0435; Google Sheet &#x0432;&#x0440;&#x0443;&#x0447;&#x043d;&#x0443;&#x044e;, &#x0440;&#x0430;&#x0441;&#x0448;&#x0430;&#x0440;&#x044c;&#x0442;&#x0435; &#x0435;&#x0435; &#x0441;&#x0435;&#x0440;&#x0432;&#x0438;&#x0441;&#x043d;&#x043e;&#x043c;&#x0443; &#x0430;&#x043a;&#x043a;&#x0430;&#x0443;&#x043d;&#x0442;&#x0443; &#x043a;&#x0430;&#x043a; Editor &#x0438; &#x0432;&#x0441;&#x0442;&#x0430;&#x0432;&#x044c;&#x0442;&#x0435; &#x0441;&#x0441;&#x044b;&#x043b;&#x043a;&#x0443; &#x0438;&#x043b;&#x0438; ID &#x0442;&#x0430;&#x0431;&#x043b;&#x0438;&#x0446;&#x044b; &#x0432; &#x0441;&#x043e;&#x043e;&#x0442;&#x0432;&#x0435;&#x0442;&#x0441;&#x0442;&#x0432;&#x0443;&#x044e;&#x0449;&#x0435;&#x0435; &#x043f;&#x043e;&#x043b;&#x0435; &#x043d;&#x0438;&#x0436;&#x0435;.
        </p>
      </section>

      {reports.map((report) => (
        <section className="admin-card accounting-card" key={report.sourceDomain}>
          <div className="admin-card__header">
            <div>
              <p className="eyebrow">{report.sourceDomain}</p>
              <h2>{accountingReportTitles[report.sourceDomain]}</h2>
            </div>
          </div>

          <dl className="admin-summary-list">
            <div><dt>&#x0421;&#x0442;&#x0430;&#x0442;&#x0443;&#x0441;</dt><dd>{statusLabel(report.lastSyncStatus)}</dd></div>
            <div><dt>&#x041f;&#x043e;&#x0441;&#x043b;&#x0435;&#x0434;&#x043d;&#x044f;&#x044f; &#x0441;&#x0438;&#x043d;&#x0445;&#x0440;&#x043e;&#x043d;&#x0438;&#x0437;&#x0430;&#x0446;&#x0438;&#x044f;</dt><dd>{formatDateTime(report.lastSyncedAt)}</dd></div>
            <div><dt>&#x041e;&#x043f;&#x0435;&#x0440;&#x0430;&#x0446;&#x0438;&#x0439;</dt><dd>{report.operationCount}</dd></div>
            <div><dt>&#x041f;&#x0435;&#x0440;&#x0438;&#x043e;&#x0434; &#x0434;&#x0430;&#x043d;&#x043d;&#x044b;&#x0445;</dt><dd>{formatDateTime(report.lastSyncedPeriodStart)} &mdash; {formatDateTime(report.lastSyncedPeriodEnd)}</dd></div>
            <div><dt>Email &#x0431;&#x0443;&#x0445;&#x0433;&#x0430;&#x043b;&#x0442;&#x0435;&#x0440;&#x0430;</dt><dd>{report.accountantEmail || "\u043d\u0435 \u0437\u0430\u0434\u0430\u043d"}</dd></div>
            <div>
              <dt>Google &#x0442;&#x0430;&#x0431;&#x043b;&#x0438;&#x0446;&#x0430;</dt>
              <dd>{report.spreadsheetUrl ? (<a href={report.spreadsheetUrl} rel="noreferrer" target="_blank">&#x041e;&#x0442;&#x043a;&#x0440;&#x044b;&#x0442;&#x044c; &#x0442;&#x0430;&#x0431;&#x043b;&#x0438;&#x0446;&#x0443;</a>) : ("\u043d\u0435 \u0437\u0430\u0434\u0430\u043d\u0430")}</dd>
            </div>
          </dl>

          {report.lastSyncError ? <p className="form-error accounting-error">{report.lastSyncError}</p> : null}

          <div className="admin-card__actions accounting-actions">
            <a className="button button--primary" href={report.spreadsheetUrl ?? "#"} rel="noreferrer" target="_blank" aria-disabled={!report.spreadsheetUrl}>&#x041e;&#x0442;&#x043a;&#x0440;&#x044b;&#x0442;&#x044c; &#x0442;&#x0430;&#x0431;&#x043b;&#x0438;&#x0446;&#x0443;</a>
            <CopyAccountingLinkButton url={report.spreadsheetUrl} />
            <form action={syncAccountingReportAction}>
              <input name="sourceDomain" type="hidden" value={report.sourceDomain} />
              <button className="button" type="submit">&#x041e;&#x0431;&#x043d;&#x043e;&#x0432;&#x0438;&#x0442;&#x044c; &#x0441;&#x0435;&#x0439;&#x0447;&#x0430;&#x0441;</button>
            </form>
          </div>

          <form action={saveAccountingSpreadsheetAction} className="admin-form">
            <input name="sourceDomain" type="hidden" value={report.sourceDomain} />
            <label className="field">
              <span>Google &#x0442;&#x0430;&#x0431;&#x043b;&#x0438;&#x0446;&#x0430; &#x0434;&#x043b;&#x044f; &#x043e;&#x0442;&#x0447;&#x0435;&#x0442;&#x0430;</span>
              <input defaultValue={report.spreadsheetUrl ?? report.spreadsheetId ?? ""} name="spreadsheet" placeholder={"https://docs.google.com/spreadsheets/d/... \u0438\u043b\u0438 ID"} type="text" />
            </label>
            <button className="button button--primary" type="submit">&#x0421;&#x043e;&#x0445;&#x0440;&#x0430;&#x043d;&#x0438;&#x0442;&#x044c; &#x0442;&#x0430;&#x0431;&#x043b;&#x0438;&#x0446;&#x0443;</button>
          </form>

          <form action={saveAccountantEmailAction} className="admin-form">
            <input name="sourceDomain" type="hidden" value={report.sourceDomain} />
            <label className="field">
              <span>&#x041d;&#x0430;&#x0441;&#x0442;&#x0440;&#x043e;&#x0438;&#x0442;&#x044c; &#x0434;&#x043e;&#x0441;&#x0442;&#x0443;&#x043f; &#x0431;&#x0443;&#x0445;&#x0433;&#x0430;&#x043b;&#x0442;&#x0435;&#x0440;&#x0443;</span>
              <input defaultValue={report.accountantEmail ?? ""} name="accountantEmail" placeholder="accountant@example.com" type="email" />
            </label>
            <button className="button button--primary" type="submit">&#x0421;&#x043e;&#x0445;&#x0440;&#x0430;&#x043d;&#x0438;&#x0442;&#x044c; email &#x0438; &#x0432;&#x044b;&#x0434;&#x0430;&#x0442;&#x044c; &#x0434;&#x043e;&#x0441;&#x0442;&#x0443;&#x043f;</button>
          </form>

          <div>
            <h3>&#x041f;&#x043e;&#x0441;&#x043b;&#x0435;&#x0434;&#x043d;&#x0438;&#x0435; &#x0441;&#x0438;&#x043d;&#x0445;&#x0440;&#x043e;&#x043d;&#x0438;&#x0437;&#x0430;&#x0446;&#x0438;&#x0438;</h3>
            {report.logs.length > 0 ? (
              <div className="table-wrap accounting-log-wrap"><table className="admin-table accounting-log-table"><thead><tr><th>&#x0421;&#x0442;&#x0430;&#x0440;&#x0442;</th><th>&#x0421;&#x0442;&#x0430;&#x0442;&#x0443;&#x0441;</th><th>&#x041e;&#x043f;&#x0435;&#x0440;&#x0430;&#x0446;&#x0438;&#x0439;</th><th>&#x0421;&#x043e;&#x043e;&#x0431;&#x0449;&#x0435;&#x043d;&#x0438;&#x0435;</th></tr></thead><tbody>{report.logs.map((log) => (<tr key={log.id}><td>{formatDateTime(log.startedAt)}</td><td>{statusLabel(log.status)}</td><td>{log.operationCount}</td><td>{log.message ?? "\u2014"}</td></tr>))}</tbody></table></div>
            ) : (<p className="admin-muted">&#x041b;&#x043e;&#x0433;&#x043e;&#x0432; &#x0441;&#x0438;&#x043d;&#x0445;&#x0440;&#x043e;&#x043d;&#x0438;&#x0437;&#x0430;&#x0446;&#x0438;&#x0438; &#x043f;&#x043e;&#x043a;&#x0430; &#x043d;&#x0435;&#x0442;.</p>)}
          </div>
        </section>
      ))}
    </div>
  );
}

