import {
  ParticipantExportTools,
  type ParticipantExportRow
} from "@/components/participant-export-tools";
import { formatStatus } from "@/lib/status-labels";
import { updateParticipantAction } from "@/server/order-actions";

type ParticipantRow = {
  fullName: string;
  history: Array<{
    changedBy: {
      name: string;
    } | null;
    createdAt: Date;
    fromFullName: string | null;
    id: string;
    note: string | null;
    toFullName: string | null;
  }>;
  id: string;
  order: {
    createdAt: Date;
    curator: {
      name: string;
    };
    customerEmail: string | null;
    customerName: string;
    customerPhone: string | null;
    customerTelegram: string | null;
    orderNumber: number;
    payment: {
      status: string;
    } | null;
    service: {
      title: string;
    };
    status: string;
  };
};

function formatContacts(order: {
  customerEmail: string | null;
  customerPhone: string | null;
  customerTelegram: string | null;
}) {
  return [order.customerTelegram, order.customerPhone, order.customerEmail]
    .filter(Boolean)
    .join(", ");
}

function formatDate(date: Date) {
  return date.toLocaleDateString("ru-RU");
}

function toExportRows(participants: ParticipantRow[]): ParticipantExportRow[] {
  return participants.map((participant) => ({
    contact: formatContacts(participant.order) || "Не указаны",
    curatorName: participant.order.curator.name,
    customerName: participant.order.customerName,
    date: formatDate(participant.order.createdAt),
    fullName: participant.fullName,
    orderNumber: participant.order.orderNumber,
    paymentStatus: participant.order.payment?.status
      ? formatStatus(participant.order.payment.status)
      : formatStatus(participant.order.status),
    serviceTitle: participant.order.service.title
  }));
}

export function ParticipantsTable({
  emptyText,
  participants
}: {
  emptyText: string;
  participants: ParticipantRow[];
}) {
  const exportRows = toExportRows(participants);

  if (participants.length === 0) {
    return <p className="admin-muted">{emptyText}</p>;
  }

  return (
    <>
      <ParticipantExportTools rows={exportRows} />
      <div className="table-wrap">
        <table className="admin-table participants-table">
          <thead>
            <tr>
              <th>Участник</th>
              <th>Церемония</th>
              <th>Заказ</th>
              <th>Клиент</th>
              <th>Куратор</th>
              <th>Статус оплаты</th>
              <th>Дата</th>
              <th>История</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant) => (
              <tr key={participant.id}>
                <td>
                  <form
                    action={updateParticipantAction}
                    className="inline-form"
                  >
                    <input
                      name="participantId"
                      type="hidden"
                      value={participant.id}
                    />
                    <input
                      className="table-input"
                      defaultValue={participant.fullName}
                      name="fullName"
                      required
                      type="text"
                    />
                    <button className="button button--small" type="submit">
                      Сохранить
                    </button>
                  </form>
                </td>
                <td>{participant.order.service.title}</td>
                <td>#{participant.order.orderNumber}</td>
                <td>
                  <strong>{participant.order.customerName}</strong>
                  <br />
                  {formatContacts(participant.order) || "Контакты не указаны"}
                </td>
                <td>{participant.order.curator.name}</td>
                <td>
                  {formatStatus(participant.order.status)}
                  {participant.order.payment?.status
                    ? ` / ${formatStatus(participant.order.payment.status)}`
                    : ""}
                </td>
                <td>{formatDate(participant.order.createdAt)}</td>
                <td>
                  {participant.history.length > 0 ? (
                    <details className="participant-history">
                      <summary>{participant.history.length} изм.</summary>
                      <ul>
                        {participant.history.map((item) => (
                          <li key={item.id}>
                            <strong>{formatDate(item.createdAt)}</strong>
                            <br />
                            {item.fromFullName ?? "пусто"} →{" "}
                            {item.toFullName ?? "пусто"}
                            <br />
                            <span>
                              {item.changedBy?.name ?? "Система"}
                              {item.note ? `, ${item.note}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : (
                    "Нет изменений"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
