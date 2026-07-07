import Link from "next/link";
import {
  curatorSalesStatusOptions,
  getCuratorSalesReport
} from "@/server/curator-sales-report";
import type { CuratorSalesSearchParams } from "@/server/curator-sales-report";
import { formatStatus } from "@/lib/status-labels";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return date.toLocaleDateString("ru-RU");
}

function formatAmount(amount: number) {
  return amount.toLocaleString("ru-RU");
}

function buildQueryString(searchParams: CuratorSalesSearchParams | undefined) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) {
          params.append(key, item);
        }
      }
      continue;
    }

    if (value) {
      params.set(key, value);
    }
  }

  return params.toString();
}

export default async function AdminCuratorSalesPage({
  searchParams
}: Readonly<{
  searchParams?: Promise<CuratorSalesSearchParams>;
}>) {
  const rawSearchParams = await searchParams;
  const report = await getCuratorSalesReport(rawSearchParams);
  const {
    filterOptions,
    filters,
    monthlySummaries,
    productSummaries,
    referralSummaries,
    rows,
    stats,
    summaries
  } = report;
  const queryString = buildQueryString(rawSearchParams);
  const exportHref = queryString
    ? `/admin/curator-sales/export?${queryString}`
    : "/admin/curator-sales/export";
  const maxMonthlyAmount = Math.max(
    1,
    ...monthlySummaries.map((summary) => Math.max(0, summary.netAmount))
  );
  const topCuratorSummaries = summaries.slice(0, 8);
  const maxCuratorAmount = Math.max(
    1,
    ...topCuratorSummaries.map((summary) => Math.max(0, summary.netAmount))
  );

  return (
    <div className="admin-grid">
      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <h2>Продажи кураторов</h2>
            <p className="admin-muted">
              Детализация продаж по кураторам, партнерским ссылкам, продуктам и
              клиентам. Период фильтруется по дате создания заказа, а в таблице
              показывается дата оплаты, если она есть.
            </p>
          </div>
          <div className="admin-card__actions">
            <Link className="button" href={exportHref}>
              Скачать CSV
            </Link>
          </div>
        </div>

        <div className="stats-grid">
          <div>
            <strong>{stats.salesCount}</strong>
            <span>всего продаж</span>
          </div>
          <div>
            <strong>{formatAmount(stats.netAmount)}</strong>
            <span>общая сумма</span>
          </div>
          <div>
            <strong>{stats.uniqueCustomers}</strong>
            <span>уникальных клиентов</span>
          </div>
          <div>
            <strong>{stats.curatorsCount}</strong>
            <span>кураторов</span>
          </div>
          <div>
            <strong>{stats.referralSourcesCount}</strong>
            <span>партнерских источников</span>
          </div>
        </div>

        <form className="admin-form filter-form">
          <label className="field field--checkbox">
            <input
              defaultChecked={filters.usePeriod}
              name="usePeriod"
              type="checkbox"
              value="1"
            />
            <span>Использовать период</span>
          </label>
          <label className="field">
            <span>Дата продажи / создания заказа с</span>
            <input
              defaultValue={filters.dateFrom}
              name="dateFrom"
              type="date"
            />
          </label>
          <label className="field">
            <span>Дата продажи / создания заказа по</span>
            <input defaultValue={filters.dateTo} name="dateTo" type="date" />
          </label>
          <label className="field">
            <span>Куратор</span>
            <select defaultValue={filters.curatorId} name="curatorId">
              <option value="">Все кураторы</option>
              {filterOptions.curators.map((curator) => (
                <option key={curator.id} value={curator.id}>
                  {curator.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Партнер / источник</span>
            <select defaultValue={filters.referralSlug} name="referralSlug">
              <option value="">Все партнерские ссылки</option>
              {filterOptions.referralLinks.map((link) => (
                <option key={link.slug} value={link.slug}>
                  {link.title?.trim() ||
                    (link.isPrimary ? "Основная ссылка" : link.slug)}
                  {" — "}
                  {link.curatorName}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Продукт</span>
            <select defaultValue={filters.serviceId} name="serviceId">
              <option value="">Все продукты</option>
              {filterOptions.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Мероприятие / опция</span>
            <input
              defaultValue={filters.optionQuery}
              name="optionQuery"
              placeholder="Название опции"
              type="search"
            />
          </label>
          <label className="field">
            <span>Статус</span>
            <select defaultValue={filters.status} name="status">
              <option value="ALL">Все статусы</option>
              {curatorSalesStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>ФИО клиента</span>
            <input
              defaultValue={filters.customerName}
              name="customerName"
              type="search"
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              defaultValue={filters.customerEmail}
              name="customerEmail"
              type="search"
            />
          </label>
          <label className="field">
            <span>Телефон</span>
            <input
              defaultValue={filters.customerPhone}
              name="customerPhone"
              type="search"
            />
          </label>
          <label className="field">
            <span>Источник сайта</span>
            <select defaultValue={filters.sourceDomain} name="sourceDomain">
              <option value="">Все источники</option>
              <option value="starvedas.ru">starvedas.ru</option>
              <option value="chintamanidhama.ru">chintamanidhama.ru</option>
            </select>
          </label>
          <div className="filter-form__actions">
            <button className="button button--primary" type="submit">
              Применить фильтры
            </button>
            <Link className="button" href="/admin/curator-sales">
              Сбросить
            </Link>
          </div>
        </form>
      </section>

      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <h2>Графики и группировка по месяцу</h2>
            <p className="admin-muted">
              Динамика считается по дате оплаты, если она есть, иначе по дате
              создания заказа.
            </p>
          </div>
        </div>

        <div className="sales-charts">
          <div className="sales-chart">
            <h3>Динамика по месяцам</h3>
            <div
              className="sales-chart__bars"
              aria-label="Динамика продаж по месяцам"
            >
              {monthlySummaries.map((summary) => {
                const height = summary.netAmount
                  ? Math.max(
                      6,
                      Math.round(
                        (Math.max(0, summary.netAmount) / maxMonthlyAmount) *
                          100
                      )
                    )
                  : 4;

                return (
                  <div className="sales-chart__bar-column" key={summary.month}>
                    <div className="sales-chart__bar-track">
                      <div
                        className="sales-chart__bar"
                        style={{ height: `${height}%` }}
                        title={`${summary.monthLabel}: ${formatAmount(summary.netAmount)}`}
                      />
                    </div>
                    <strong>{formatAmount(summary.netAmount)}</strong>
                    <span>{summary.monthLabel}</span>
                  </div>
                );
              })}
              {!monthlySummaries.length && (
                <p className="admin-muted">Нет данных для графика.</p>
              )}
            </div>
          </div>

          <div className="sales-chart">
            <h3>Топ кураторов по итогу</h3>
            <div
              className="sales-chart__rows"
              aria-label="Топ кураторов по сумме"
            >
              {topCuratorSummaries.map((summary) => {
                const width = summary.netAmount
                  ? Math.max(
                      6,
                      Math.round(
                        (Math.max(0, summary.netAmount) / maxCuratorAmount) *
                          100
                      )
                    )
                  : 4;

                return (
                  <div className="sales-chart__row" key={summary.curatorId}>
                    <span>{summary.curatorName}</span>
                    <div className="sales-chart__row-track">
                      <div
                        className="sales-chart__row-bar"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <strong>{formatAmount(summary.netAmount)}</strong>
                  </div>
                );
              })}
              {!topCuratorSummaries.length && (
                <p className="admin-muted">Нет данных для графика.</p>
              )}
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Месяц</th>
                <th>Продаж</th>
                <th>Клиентов</th>
                <th>Сумма</th>
                <th>Возвраты</th>
                <th>Итого</th>
              </tr>
            </thead>
            <tbody>
              {monthlySummaries.map((summary) => (
                <tr key={summary.month}>
                  <td>{summary.monthLabel}</td>
                  <td>{summary.salesCount}</td>
                  <td>{summary.customers}</td>
                  <td>{formatAmount(summary.grossAmount)}</td>
                  <td>{formatAmount(summary.refundsAmount)}</td>
                  <td>{formatAmount(summary.netAmount)}</td>
                </tr>
              ))}
              {!monthlySummaries.length && (
                <tr>
                  <td colSpan={6}>
                    По выбранным фильтрам месячных данных нет.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <h2>Сводка по кураторам</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Куратор</th>
                <th>Продаж</th>
                <th>Клиентов</th>
                <th>Партнеров / источников</th>
                <th>Сумма</th>
                <th>Возвраты</th>
                <th>Итого</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => (
                <tr key={summary.curatorId}>
                  <td>{summary.curatorName}</td>
                  <td>{summary.salesCount}</td>
                  <td>{summary.customers}</td>
                  <td>{summary.partners}</td>
                  <td>{formatAmount(summary.grossAmount)}</td>
                  <td>{formatAmount(summary.refundsAmount)}</td>
                  <td>{formatAmount(summary.netAmount)}</td>
                </tr>
              ))}
              {!summaries.length && (
                <tr>
                  <td colSpan={7}>По выбранным фильтрам продаж не найдено.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <h2>Сводка по партнерским ссылкам</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Куратор</th>
                <th>Партнер / источник</th>
                <th>Код ссылки</th>
                <th>Продаж</th>
                <th>Клиентов</th>
                <th>Сумма</th>
                <th>Возвраты</th>
                <th>Итого</th>
              </tr>
            </thead>
            <tbody>
              {referralSummaries.map((summary) => (
                <tr
                  key={`${summary.curatorId}:${summary.referralLinkId || summary.referralSlug || "none"}`}
                >
                  <td>{summary.curatorName}</td>
                  <td>{summary.partnerLabel}</td>
                  <td>{summary.referralSlug || "—"}</td>
                  <td>{summary.salesCount}</td>
                  <td>{summary.customers}</td>
                  <td>{formatAmount(summary.grossAmount)}</td>
                  <td>{formatAmount(summary.refundsAmount)}</td>
                  <td>{formatAmount(summary.netAmount)}</td>
                </tr>
              ))}
              {!referralSummaries.length && (
                <tr>
                  <td colSpan={8}>
                    По выбранным фильтрам источники не найдены.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <h2>Сводка по продуктам</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Куратор</th>
                <th>Продукт</th>
                <th>Продаж</th>
                <th>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {productSummaries.map((summary) => (
                <tr key={`${summary.curatorId}:${summary.serviceId}`}>
                  <td>{summary.curatorName}</td>
                  <td>{summary.serviceTitle}</td>
                  <td>{summary.salesCount}</td>
                  <td>{formatAmount(summary.grossAmount)}</td>
                </tr>
              ))}
              {!productSummaries.length && (
                <tr>
                  <td colSpan={4}>
                    По выбранным фильтрам продукты не найдены.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <h2>Детальные продажи</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Заказ</th>
                <th>Куратор</th>
                <th>Партнер / источник</th>
                <th>Код ссылки</th>
                <th>Продукт</th>
                <th>Мероприятие</th>
                <th>ФИО клиента</th>
                <th>Сумма</th>
                <th>Валюта</th>
                <th>Email</th>
                <th>Телефон</th>
                <th>Telegram</th>
                <th>Статус</th>
                <th>Оплата</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.saleDate)}</td>
                  <td>#{row.orderNumber}</td>
                  <td>{row.curatorName}</td>
                  <td>{row.partnerLabel}</td>
                  <td>{row.referralSlug || "—"}</td>
                  <td>{row.serviceTitle}</td>
                  <td>{row.serviceOptionsLabel || "—"}</td>
                  <td>{row.customerName}</td>
                  <td>{formatAmount(row.amountRub)}</td>
                  <td>{row.currency}</td>
                  <td>{row.customerEmail || "—"}</td>
                  <td>{row.customerPhone || "—"}</td>
                  <td>{row.customerTelegram || "—"}</td>
                  <td>
                    <span className="badge">
                      {formatStatus(row.orderStatus)}
                    </span>
                  </td>
                  <td>
                    {row.paymentStatus ? formatStatus(row.paymentStatus) : "—"}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={15}>По выбранным фильтрам продаж не найдено.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
