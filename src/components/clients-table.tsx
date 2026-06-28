import {
  MailingExportTools,
  type MailingExportRow
} from "@/components/mailing-export-tools";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { formatMoney } from "@/i18n/pricing";
import { formatStatus } from "@/lib/status-labels";
import { transferClientsToCuratorAction } from "@/server/client-profile-actions";

export type ClientTableRow = {
  _count: {
    orders: number;
  };
  boughtAt: Date | null;
  checkoutStartedAt: Date | null;
  consentMailings: boolean;
  createdAt: Date;
  curator: {
    name: string;
  } | null;
  didNotBuyAt: Date | null;
  email: string | null;
  id: string;
  lastVisitedAt: Date | null;
  name: string;
  orders: Array<{
    amountRub: number;
    currency: string;
    createdAt: Date;
    orderNumber: number;
    payment: {
      status: string;
    } | null;
    service: {
      title: string;
    };
    serviceOptions?: Array<{
      priceRubSnapshot: number;
      titleSnapshot: string;
    }>;
    sourceDomain?: string | null;
    status: string;
  }>;
  phone: string | null;
  referralSlug: string | null;
  source: string;
  sourceDomain?: string | null;
  status: string;
  telegram: string | null;
  updatedAt: Date;
};

export type ClientTransferCuratorOption = {
  id: string;
  name: string;
};

function formatDate(date: Date | null) {
  return date ? date.toLocaleDateString("ru-RU") : "—";
}

function formatContacts(client: {
  email: string | null;
  phone: string | null;
  telegram: string | null;
}) {
  return [client.telegram, client.phone, client.email]
    .filter(Boolean)
    .join(", ");
}

function getStatusDate(client: ClientTableRow) {
  if (client.status === "BOUGHT") {
    return client.boughtAt;
  }

  if (client.status === "DID_NOT_BUY") {
    return client.didNotBuyAt;
  }

  if (client.status === "STARTED_CHECKOUT") {
    return client.checkoutStartedAt;
  }

  return client.lastVisitedAt ?? client.createdAt;
}

function toMailingRows(clients: ClientTableRow[]): MailingExportRow[] {
  return clients
    .filter((client) => client.consentMailings && formatContacts(client))
    .map((client) => ({
      contact: formatContacts(client),
      curatorName: client.curator?.name ?? "Не назначен",
      email: client.email ?? "",
      name: client.name,
      phone: client.phone ?? "",
      status: formatStatus(client.status),
      telegram: client.telegram ?? ""
    }));
}

export function ClientsTable({
  clients,
  curators,
  emptyText
}: {
  clients: ClientTableRow[];
  curators?: ClientTransferCuratorOption[];
  emptyText: string;
}) {
  const mailingRows = toMailingRows(clients);
  const canTransferClients = Boolean(curators?.length);

  if (clients.length === 0) {
    return <p className="admin-muted">{emptyText}</p>;
  }

  return (
    <>
      <MailingExportTools rows={mailingRows} />
      <p className="admin-muted">
        В выгрузку попадают только клиенты с согласием на рассылки и указанными
        контактами: {mailingRows.length}.
      </p>
      <form action={transferClientsToCuratorAction} className="admin-form">
        {canTransferClients && (
          <div className="filter-form">
            <label className="field">
              <span>Перевести выбранных к куратору</span>
              <select name="targetCuratorId" required>
                <option value="">Выберите куратора</option>
                {curators?.map((curator) => (
                  <option key={curator.id} value={curator.id}>
                    {curator.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="filter-form__actions">
              <AdminSubmitButton
                className="button button--primary"
                pendingLabel="Переводим…"
              >
                Перевести выбранных
              </AdminSubmitButton>
            </div>
          </div>
        )}
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {canTransferClients && <th aria-label="Выбор" />}
                <th>Клиент</th>
                <th>Сегмент</th>
                <th>Рассылка</th>
                <th>Куратор</th>
                <th>Последний заказ</th>
                <th>Источник</th>
                <th>Дата статуса</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const lastOrder = client.orders[0];

                return (
                  <tr key={client.id}>
                    {canTransferClients && (
                      <td>
                        <input
                          aria-label={`Выбрать клиента ${client.name}`}
                          name="clientIds"
                          type="checkbox"
                          value={client.id}
                        />
                      </td>
                    )}
                    <td>
                      <strong>{client.name}</strong>
                      <br />
                      {formatContacts(client) || "Контакты не указаны"}
                    </td>
                    <td>{formatStatus(client.status)}</td>
                    <td>
                      {client.consentMailings
                        ? "согласие есть"
                        : "нет согласия"}
                    </td>
                    <td>{client.curator?.name ?? "Не назначен"}</td>
                    <td>
                      {lastOrder ? (
                        <>
                          #{lastOrder.orderNumber}, {lastOrder.service.title}
                          {lastOrder.serviceOptions?.length ? (
                            <ul className="rite-summary-list">
                              {lastOrder.serviceOptions.map((option) => (
                                <li key={option.titleSnapshot}>
                                  {option.titleSnapshot} ?{" "}
                                  {formatMoney(
                                    option.priceRubSnapshot,
                                    lastOrder.currency
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <br />
                          {formatMoney(
                            lastOrder.amountRub,
                            lastOrder.currency
                          )}{" "}
                          / {formatStatus(lastOrder.status)}
                          {lastOrder.payment?.status
                            ? ` / ${formatStatus(lastOrder.payment.status)}`
                            : ""}
                          <br />
                          Всего заказов: {client._count.orders}
                        </>
                      ) : (
                        "Заказов нет"
                      )}
                    </td>
                    <td>
                      {client.sourceDomain ?? client.source}
                      {client.referralSlug ? ` / ${client.referralSlug}` : ""}
                    </td>
                    <td>{formatDate(getStatusDate(client))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </form>
    </>
  );
}
