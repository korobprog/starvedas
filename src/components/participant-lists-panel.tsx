import { ParticipantListStatus, ParticipantRowStatus } from "@prisma/client";
import { ParticipantListWorkTools } from "@/components/participant-list-work-tools";
import { formatChildRecordLines } from "@/lib/shraddha";
import { formatStatus } from "@/lib/status-labels";
import {
  sendParticipantListMessageAction,
  updateParticipantListAction,
  updateParticipantListRowAction,
  type ParticipantListRow
} from "@/server/participant-lists";

function formatDate(date: Date | null) {
  return date ? date.toLocaleDateString("ru-RU") : "не указана";
}

function formatDateTime(date: Date) {
  return date.toLocaleString("ru-RU", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function toDateInputValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function getListServiceTitle(list: ParticipantListRow) {
  return list.serviceTitleOverride?.trim() || list.order.service.title;
}

function getSelectedOptions(list: ParticipantListRow) {
  return list.order.serviceOptions.map((option) => option.titleSnapshot);
}

function getEventDate(list: ParticipantListRow) {
  return (
    list.eventStartsAt ??
    list.order.serviceOptions
      .map((option) => option.option?.eventStartsAt ?? null)
      .find((date): date is Date => Boolean(date)) ??
    null
  );
}

function getListProblems(list: ParticipantListRow) {
  const problems: string[] = [];

  if (!getEventDate(list)) {
    problems.push("не указана дата начала");
  }

  if (!list.order.participants.length) {
    problems.push("нет участников");
  }

  const names = new Map<string, number>();

  for (const participant of list.order.participants) {
    const normalized = participant.fullName.trim().toLowerCase();

    if (!normalized) {
      problems.push("есть пустое ФИО");
      continue;
    }

    names.set(normalized, (names.get(normalized) ?? 0) + 1);
  }

  if ([...names.values()].some((count) => count > 1)) {
    problems.push("возможные дубли ФИО");
  }

  if (!getListServiceTitle(list).trim()) {
    problems.push("не указан сервис");
  }

  return [...new Set(problems)];
}

function MessageForm({ listId }: { listId: string }) {
  return (
    <form action={sendParticipantListMessageAction} className="admin-form">
      <input name="listId" type="hidden" value={listId} />
      <label className="field">
        <span>Сообщение по списку</span>
        <textarea
          name="body"
          placeholder="Напишите уточнение по списку или участнику"
          rows={3}
        />
      </label>
      <button className="button button--small" type="submit">
        Отправить сообщение
      </button>
    </form>
  );
}

function ListMessages({ list }: { list: ParticipantListRow }) {
  if (!list.messages.length) {
    return <p className="admin-muted">Сообщений по списку пока нет.</p>;
  }

  return (
    <ul className="rite-summary-list">
      {list.messages.map((message) => (
        <li key={message.id}>
          <strong>
            {formatStatus(message.senderRole)} ·{" "}
            {message.sender?.name ?? "система"}
          </strong>{" "}
          <span className="admin-muted">
            {formatDateTime(message.createdAt)}
          </span>
          <br />
          {message.body}
        </li>
      ))}
    </ul>
  );
}

function ListMeta({ list }: { list: ParticipantListRow }) {
  const selectedOptions = getSelectedOptions(list);
  const eventDate = getEventDate(list);
  const problems = getListProblems(list);

  return (
    <div className="admin-muted">
      <p>
        <strong>Заказчик:</strong> {list.order.customerName} ·{" "}
        {[
          list.order.customerTelegram,
          list.order.customerPhone,
          list.order.customerEmail
        ]
          .filter(Boolean)
          .join(", ") || "контакты не указаны"}
      </p>
      <p>
        <strong>Сервис:</strong> {getListServiceTitle(list)}
        {selectedOptions.length ? ` · ${selectedOptions.join(", ")}` : ""}
      </p>
      <p>
        <strong>Дата начала:</strong> {formatDate(eventDate)} ·{" "}
        <strong>Участников:</strong> {list.order.participants.length}
      </p>
      {list.order.customerComment?.trim() ? (
        <p>
          <strong>Пожелания / просьбы клиента:</strong>{" "}
          {list.order.customerComment}
        </p>
      ) : null}
      {problems.length ? (
        <p>
          <strong>Проверить:</strong> {problems.join(", ")}
        </p>
      ) : (
        <p>
          <strong>Проверка:</strong> грубых ошибок не найдено
        </p>
      )}
    </div>
  );
}

function StatisticianEditForm({ list }: { list: ParticipantListRow }) {
  return (
    <form action={updateParticipantListAction} className="admin-form">
      <input name="listId" type="hidden" value={list.id} />
      <label className="field">
        <span>Статус списка</span>
        <select defaultValue={list.status} name="status">
          {Object.values(ParticipantListStatus).map((status) => (
            <option key={status} value={status}>
              {formatStatus(status)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Дата начала мероприятия</span>
        <input
          defaultValue={toDateInputValue(getEventDate(list))}
          name="eventStartsAt"
          type="date"
        />
      </label>
      <label className="field">
        <span>Сервис / название для отправки</span>
        <input
          defaultValue={list.serviceTitleOverride ?? ""}
          name="serviceTitleOverride"
          placeholder={list.order.service.title}
          type="text"
        />
      </label>
      <label className="field field--checkbox">
        <input
          defaultChecked={list.bookmarked}
          name="bookmarked"
          type="checkbox"
        />
        <span>Сохранить в закладки</span>
      </label>
      <label className="field">
        <span>Комментарий статиста к списку</span>
        <textarea defaultValue={list.note ?? ""} name="note" rows={3} />
      </label>
      <button className="button button--small" type="submit">
        Сохранить список
      </button>
    </form>
  );
}

function ParticipantRows({
  list,
  mode
}: {
  list: ParticipantListRow;
  mode: "curator" | "statistician";
}) {
  const childRecordLines = formatChildRecordLines(list.order.childRecords, {
    unbornLabel: list.order.service.shraddhaUnbornLabel ?? undefined,
    deceasedChildLabel: list.order.service.shraddhaDeceasedChildLabel ?? undefined
  });
  const participantNames = new Set(
    list.order.participants.map((participant) => participant.fullName)
  );
  const visibleChildRecordLines = childRecordLines.filter(
    (line) => !participantNames.has(line)
  );

  if (!list.order.participants.length && visibleChildRecordLines.length === 0) {
    return <p className="admin-muted">Участников в списке нет.</p>;
  }

  return (
    <>
      {list.order.participants.length > 0 && (
        <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Участник</th>
            <th>Статус строки</th>
            <th>Комментарий</th>
            {mode === "statistician" ? <th>Действие</th> : null}
          </tr>
        </thead>
        <tbody>
          {list.order.participants.map((participant) => (
            <tr key={participant.id}>
              {mode === "statistician" ? (
                <>
                  <td>
                    <form
                      action={updateParticipantListRowAction}
                      className="admin-form admin-form--compact"
                    >
                      <input name="listId" type="hidden" value={list.id} />
                      <input
                        name="participantId"
                        type="hidden"
                        value={participant.id}
                      />
                      <input
                        defaultValue={participant.fullName}
                        name="fullName"
                        type="text"
                      />
                      <select
                        defaultValue={participant.rowStatus}
                        name="rowStatus"
                      >
                        {Object.values(ParticipantRowStatus).map((status) => (
                          <option key={status} value={status}>
                            {formatStatus(status)}
                          </option>
                        ))}
                      </select>
                      <textarea
                        defaultValue={participant.statisticianComment ?? ""}
                        name="statisticianComment"
                        placeholder="Комментарий"
                        rows={2}
                      />
                      <button className="button button--small" type="submit">
                        Сохранить
                      </button>
                    </form>
                  </td>
                  <td>{formatStatus(participant.rowStatus)}</td>
                  <td>{participant.statisticianComment || "—"}</td>
                  <td>Правка сохраняется в истории</td>
                </>
              ) : (
                <>
                  <td>{participant.fullName}</td>
                  <td>{formatStatus(participant.rowStatus)}</td>
                  <td>{participant.statisticianComment || "—"}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
        </div>
      )}
      {visibleChildRecordLines.length > 0 && (
        <div className="participant-list-children">
          <strong>Дети:</strong>
          <ul>
            {visibleChildRecordLines.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export function ParticipantListsPanel({
  emptyText = "Списков участников пока нет.",
  lists,
  mode
}: {
  emptyText?: string;
  lists: ParticipantListRow[];
  mode: "curator" | "statistician";
}) {
  if (!lists.length) {
    return <p className="admin-muted">{emptyText}</p>;
  }

  return (
    <div className="admin-grid">
      {lists.map((list) => (
        <section
          className="admin-card admin-card--wide"
          id={`participant-list-${list.order.orderNumber}`}
          key={list.id}
        >
          <div className="section-heading section-heading--compact">
            <p className="eyebrow">
              {list.bookmarked ? "★ " : ""}Список #{list.order.orderNumber} ·{" "}
              {formatStatus(list.status)}
            </p>
            <h2>{list.order.curator.name}</h2>
            <p>
              Списки приходят через Telegram. Проверьте ФИО, сервис и дату
              начала мероприятия перед отправкой.
            </p>
          </div>

          <ListMeta list={list} />

          {mode === "statistician" ? (
            <StatisticianEditForm list={list} />
          ) : null}

          <h3>Участники</h3>
          {mode === "statistician" && list.order.participants.length > 0 ? (
            <ParticipantListWorkTools
              listId={list.id}
              orderNumber={list.order.orderNumber}
              participants={list.order.participants}
            />
          ) : null}
          <ParticipantRows list={list} mode={mode} />

          <h3>Переписка по списку</h3>
          <ListMessages list={list} />
          <MessageForm listId={list.id} />
        </section>
      ))}
    </div>
  );
}
