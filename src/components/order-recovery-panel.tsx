import Link from "next/link";
import { formatMoney } from "@/i18n/pricing";
import { formatStatus } from "@/lib/status-labels";
import {
  getCurrentOrderSnapshot,
  getOrderRecoveryDetail,
  getOrderRevisionEventLabel,
  orderRecoveryFilterValues,
  parseOrderRevisionSnapshot,
  searchOrdersForRecovery,
  type OrderRecoveryFilter,
  type OrderRevisionListItem,
  type OrderRevisionSnapshot
} from "@/server/order-revisions";
import {
  createOrderBackupAction,
  restoreOrderRevisionAction
} from "@/server/order-revision-actions";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getRecoveryFilter(
  value: string | string[] | undefined
): OrderRecoveryFilter {
  const normalized = firstParam(value);

  return orderRecoveryFilterValues.includes(normalized as OrderRecoveryFilter)
    ? (normalized as OrderRecoveryFilter)
    : "all";
}

function getRecoveryFilterLabel(filter: OrderRecoveryFilter) {
  if (filter === "active") {
    return "Активные";
  }

  if (filter === "deleted") {
    return "Удалённые";
  }

  return "Все";
}

function buildRecoveryUrl(
  basePath: string,
  searchParams: SearchParams | undefined,
  updates: Record<string, string | null | undefined>
) {
  const [pathname, baseQuery = ""] = basePath.split("?");
  const params = new URLSearchParams(baseQuery);

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (key === "section" || key.startsWith("backup")) {
      const normalized = firstParam(value);

      if (normalized) {
        params.set(key, normalized);
      }
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value === null) {
      params.delete(key);
      continue;
    }

    if (typeof value === "string" && value.length > 0) {
      params.set(key, value);
      continue;
    }

    params.delete(key);
  }

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function buildReturnTo(
  basePath: string,
  searchParams: SearchParams | undefined
) {
  return buildRecoveryUrl(basePath, searchParams, {});
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function isDeletedSnapshot(snapshot: OrderRevisionSnapshot) {
  return Boolean(snapshot.order.deletedAt);
}

function formatParticipantNames(snapshot: OrderRevisionSnapshot) {
  if (snapshot.participants.length === 0) {
    return "—";
  }

  return snapshot.participants
    .map((participant) => participant.fullName)
    .join(", ");
}

function formatServiceOptions(snapshot: OrderRevisionSnapshot) {
  if (snapshot.serviceOptions.length === 0) {
    return "Без дополнительных опций";
  }

  return snapshot.serviceOptions
    .map(
      (option) =>
        `${option.titleSnapshot} (${formatMoney(option.totalRubSnapshot, "RUB")})`
    )
    .join(", ");
}

function formatPaymentSnapshot(snapshot: OrderRevisionSnapshot) {
  if (!snapshot.payment) {
    return "—";
  }

  return `${snapshot.payment.provider} / ${formatStatus(snapshot.payment.status)}`;
}

function formatParticipantListSnapshot(snapshot: OrderRevisionSnapshot) {
  if (!snapshot.participantList) {
    return "—";
  }

  return `${formatStatus(snapshot.participantList.status)} / ${snapshot.participantList.note || "без заметки"}`;
}

function formatDeletionState(snapshot: OrderRevisionSnapshot) {
  if (!snapshot.order.deletedAt) {
    return "Нет";
  }

  return `Да, ${formatDateTime(snapshot.order.deletedAt)}`;
}

function SnapshotComparison({
  currentSnapshot,
  revisionSnapshot
}: {
  currentSnapshot: OrderRevisionSnapshot;
  revisionSnapshot: OrderRevisionSnapshot;
}) {
  const rows = [
    {
      label: "Статус заказа",
      current: formatStatus(currentSnapshot.order.status),
      revision: formatStatus(revisionSnapshot.order.status)
    },
    {
      label: "Статус лида",
      current: formatStatus(currentSnapshot.order.leadStatus),
      revision: formatStatus(revisionSnapshot.order.leadStatus)
    },
    {
      label: "Удалён",
      current: formatDeletionState(currentSnapshot),
      revision: formatDeletionState(revisionSnapshot)
    },
    {
      label: "Причина удаления",
      current: currentSnapshot.order.deleteReason || "—",
      revision: revisionSnapshot.order.deleteReason || "—"
    },
    {
      label: "Сумма",
      current: formatMoney(
        currentSnapshot.order.amountRub,
        currentSnapshot.order.currency
      ),
      revision: formatMoney(
        revisionSnapshot.order.amountRub,
        revisionSnapshot.order.currency
      )
    },
    {
      label: "Заказчик",
      current: currentSnapshot.order.customerName,
      revision: revisionSnapshot.order.customerName
    },
    {
      label: "Email",
      current: currentSnapshot.order.customerEmail || "—",
      revision: revisionSnapshot.order.customerEmail || "—"
    },
    {
      label: "Телефон",
      current: currentSnapshot.order.customerPhone || "—",
      revision: revisionSnapshot.order.customerPhone || "—"
    },
    {
      label: "Telegram",
      current: currentSnapshot.order.customerTelegram || "—",
      revision: revisionSnapshot.order.customerTelegram || "—"
    },
    {
      label: "Участники",
      current: formatParticipantNames(currentSnapshot),
      revision: formatParticipantNames(revisionSnapshot)
    },
    {
      label: "Опции",
      current: formatServiceOptions(currentSnapshot),
      revision: formatServiceOptions(revisionSnapshot)
    },
    {
      label: "Платёж",
      current: formatPaymentSnapshot(currentSnapshot),
      revision: formatPaymentSnapshot(revisionSnapshot)
    },
    {
      label: "Чек",
      current: currentSnapshot.payment?.receiptUrl || "—",
      revision: revisionSnapshot.payment?.receiptUrl || "—"
    },
    {
      label: "Список участников",
      current: formatParticipantListSnapshot(currentSnapshot),
      revision: formatParticipantListSnapshot(revisionSnapshot)
    }
  ];

  return (
    <div className="recovery-comparison">
      {rows.map((row) => {
        const changed = row.current !== row.revision;

        return (
          <div
            className={
              changed
                ? "recovery-comparison__row recovery-comparison__row--changed"
                : "recovery-comparison__row"
            }
            key={row.label}
          >
            <strong>{row.label}</strong>
            <div>
              <span className="admin-muted">Сейчас</span>
              <p>{row.current}</p>
            </div>
            <div>
              <span className="admin-muted">В копии</span>
              <p>{row.revision}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export async function OrderRecoveryPanel({
  basePath,
  searchParams
}: {
  basePath: string;
  searchParams?: SearchParams;
}) {
  const query = firstParam(searchParams?.backupQ) || "";
  const selectedOrderId = firstParam(searchParams?.backupOrder) || "";
  const selectedRevisionId = firstParam(searchParams?.backupRevision) || "";
  const recoveryFilter = getRecoveryFilter(searchParams?.backupState);
  const returnTo = buildReturnTo(basePath, searchParams);
  const searchAction = basePath.split("?")[0];

  const orders = await searchOrdersForRecovery(query, recoveryFilter);
  const selectedOrder = selectedOrderId
    ? await getOrderRecoveryDetail(selectedOrderId)
    : null;

  const revisions: OrderRevisionListItem[] = selectedOrder?.revisions ?? [];
  const quickRestoreRevision = selectedOrder?.deletedAt
    ? (revisions.find((revision) => {
        try {
          return !isDeletedSnapshot(
            parseOrderRevisionSnapshot(revision.snapshot)
          );
        } catch {
          return false;
        }
      }) ?? null)
    : null;
  const fallbackRevision =
    revisions.find((revision) => revision.id === selectedRevisionId) ??
    (selectedOrder?.deletedAt ? quickRestoreRevision : null) ??
    revisions[0] ??
    null;
  const activeRevision = fallbackRevision;
  const currentSnapshot = selectedOrder?.id
    ? await getCurrentOrderSnapshot(selectedOrder.id)
    : null;
  const revisionSnapshot = activeRevision
    ? parseOrderRevisionSnapshot(activeRevision.snapshot)
    : null;

  return (
    <div className="admin-grid">
      <section className="admin-card admin-card--wide">
        <h2>Резервные копии и восстановление заказов</h2>
        <p className="admin-muted">
          Здесь можно создать ручной бэкап заказа и восстановить его из
          сохранённой копии. Перед восстановлением система автоматически делает
          ещё один снимок текущего состояния.
        </p>
        {firstParam(searchParams?.backupSaved) && (
          <p className="admin-success">Резервная копия создана.</p>
        )}
        {firstParam(searchParams?.backupRestored) && (
          <p className="admin-success">
            Заказ №{firstParam(searchParams?.backupRestored)} восстановлен.
          </p>
        )}
        {firstParam(searchParams?.backupError) && (
          <p className="form-warning">
            {firstParam(searchParams?.backupError)}
          </p>
        )}

        <form action={searchAction} className="admin-form filter-form">
          {basePath.includes("section=recovery") && (
            <input name="section" type="hidden" value="recovery" />
          )}
          <input name="backupState" type="hidden" value={recoveryFilter} />
          <label>
            <span>Поиск заказа</span>
            <input
              className="table-input"
              defaultValue={query}
              name="backupQ"
              placeholder="№ заказа, email, имя или token"
              type="search"
            />
          </label>
          <div className="filter-form__actions">
            <button className="button button--primary" type="submit">
              Найти
            </button>
            <Link
              className="button"
              href={buildRecoveryUrl(basePath, searchParams, {
                backupError: null,
                backupOrder: null,
                backupQ: null,
                backupRestored: null,
                backupRevision: null,
                backupSaved: null
              })}
            >
              Сбросить
            </Link>
          </div>
        </form>

        <div className="participant-tools">
          {orderRecoveryFilterValues.map((filter) => {
            const href = buildRecoveryUrl(basePath, searchParams, {
              backupOrder: null,
              backupRevision: null,
              backupState: filter
            });
            const className =
              filter === recoveryFilter ? "button button--primary" : "button";

            return (
              <Link className={className} href={href} key={filter}>
                {getRecoveryFilterLabel(filter)}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="admin-card">
        <h3>Заказы</h3>
        <p className="admin-muted">
          Фильтр: {getRecoveryFilterLabel(recoveryFilter)}
        </p>
        <div className="admin-list">
          {orders.length > 0 ? (
            orders.map((order) => {
              const href = buildRecoveryUrl(basePath, searchParams, {
                backupError: null,
                backupOrder: order.id,
                backupRevision: null,
                backupSaved: null
              });

              return (
                <Link className="admin-list-item" href={href} key={order.id}>
                  <div className="admin-list-item__header">
                    <div>
                      <h3>Заказ №{order.orderNumber}</h3>
                      <p className="admin-muted">{order.service?.title}</p>
                    </div>
                    <div className="participant-tools">
                      <span className="badge badge--muted">
                        {order._count.revisions} копий
                      </span>
                      {order.deletedAt ? (
                        <span className="badge badge--warning">Удалён</span>
                      ) : (
                        <span className="badge">Активен</span>
                      )}
                    </div>
                  </div>
                  <p>
                    <strong>{order.customerName}</strong>
                    <br />
                    {order.customerEmail || "Контакт не указан"}
                  </p>
                  <p className="admin-muted">
                    {formatStatus(order.status)} /{" "}
                    {formatStatus(order.leadStatus)}
                  </p>
                  <p className="admin-muted">
                    Платёж:{" "}
                    {order.payment?.status
                      ? formatStatus(order.payment.status)
                      : "—"}
                  </p>
                  {order.deletedAt ? (
                    <p className="admin-muted">
                      Удалён {formatDateTime(order.deletedAt)}
                      {order.deletedBy?.name
                        ? ` · ${order.deletedBy.name}`
                        : ""}
                      {order.deleteReason ? ` · ${order.deleteReason}` : ""}
                    </p>
                  ) : (
                    <p className="admin-muted">
                      Обновлён: {formatDateTime(order.updatedAt)}
                    </p>
                  )}
                </Link>
              );
            })
          ) : (
            <p className="admin-muted">
              По текущему запросу заказы не найдены.
            </p>
          )}
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        {selectedOrder ? (
          <>
            <div className="admin-list-item__header">
              <div>
                <h3>
                  Заказ №{selectedOrder.orderNumber} —{" "}
                  {selectedOrder.service.title}
                </h3>
                <p className="admin-muted">
                  {selectedOrder.customerName}
                  {selectedOrder.customerEmail
                    ? ` · ${selectedOrder.customerEmail}`
                    : ""}
                </p>
              </div>
              <div className="participant-tools">
                <span className="badge">
                  {formatStatus(selectedOrder.status)} /{" "}
                  {formatStatus(selectedOrder.leadStatus)}
                </span>
                {selectedOrder.deletedAt ? (
                  <span className="badge badge--warning">Удалён</span>
                ) : (
                  <span className="badge">Активен</span>
                )}
                <span className="badge badge--muted">
                  {selectedOrder.revisions.length} копий
                </span>
              </div>
            </div>

            {selectedOrder.deletedAt ? (
              <div className="admin-list-item">
                <h4>Аудит удаления</h4>
                <p>
                  <strong>Когда:</strong>{" "}
                  {formatDateTime(selectedOrder.deletedAt)}
                </p>
                <p>
                  <strong>Кто удалил:</strong>{" "}
                  {selectedOrder.deletedBy?.name || "Система"}
                </p>
                <p>
                  <strong>Причина:</strong>{" "}
                  {selectedOrder.deleteReason || "не указана"}
                </p>
                {quickRestoreRevision ? (
                  <form
                    action={restoreOrderRevisionAction}
                    className="admin-form"
                  >
                    <input name="returnTo" type="hidden" value={returnTo} />
                    <input
                      name="revisionId"
                      type="hidden"
                      value={quickRestoreRevision.id}
                    />
                    <button className="button button--primary" type="submit">
                      Восстановить удалённый заказ без выбора ревизии
                    </button>
                    <p className="admin-muted">
                      Будет использована последняя найденная копия, где заказ
                      ещё не был удалён.
                    </p>
                  </form>
                ) : (
                  <p className="form-warning">
                    Не удалось найти сохранённую копию до удаления. Выберите
                    ревизию вручную.
                  </p>
                )}
              </div>
            ) : null}

            <form action={createOrderBackupAction} className="admin-form">
              <input name="orderId" type="hidden" value={selectedOrder.id} />
              <input name="returnTo" type="hidden" value={returnTo} />
              <label>
                <span>Комментарий к ручному бэкапу</span>
                <input
                  className="table-input"
                  defaultValue=""
                  name="note"
                  placeholder="Например: перед ручной правкой статуса"
                  type="text"
                />
              </label>
              <button className="button button--primary" type="submit">
                Создать ручную копию
              </button>
            </form>

            <div className="recovery-layout">
              <div>
                <h4>История копий</h4>
                <div className="admin-list">
                  {selectedOrder.revisions.map((revision) => (
                    <Link
                      className={
                        activeRevision?.id === revision.id
                          ? "admin-list-item recovery-revision recovery-revision--active"
                          : "admin-list-item recovery-revision"
                      }
                      href={buildRecoveryUrl(basePath, searchParams, {
                        backupOrder: selectedOrder.id,
                        backupRevision: revision.id
                      })}
                      key={revision.id}
                    >
                      <div className="admin-list-item__header">
                        <div>
                          <h3>
                            {getOrderRevisionEventLabel(revision.eventType)}
                          </h3>
                          <p className="admin-muted">
                            {formatDateTime(revision.createdAt)}
                          </p>
                        </div>
                        <span className="badge badge--muted">
                          {revision.actorUser?.name || "Система"}
                        </span>
                      </div>
                      {revision.note ? <p>{revision.note}</p> : null}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                {activeRevision && currentSnapshot && revisionSnapshot ? (
                  <>
                    <div className="admin-list-item__header">
                      <div>
                        <h4>
                          {getOrderRevisionEventLabel(activeRevision.eventType)}
                        </h4>
                        <p className="admin-muted">
                          {formatDateTime(activeRevision.createdAt)}
                        </p>
                      </div>
                      <form action={restoreOrderRevisionAction}>
                        <input name="returnTo" type="hidden" value={returnTo} />
                        <input
                          name="revisionId"
                          type="hidden"
                          value={activeRevision.id}
                        />
                        <button
                          className="button button--primary"
                          type="submit"
                        >
                          {selectedOrder.deletedAt
                            ? "Восстановить заказ из этой копии"
                            : "Восстановить эту копию"}
                        </button>
                      </form>
                    </div>

                    {activeRevision.note ? <p>{activeRevision.note}</p> : null}

                    <SnapshotComparison
                      currentSnapshot={currentSnapshot}
                      revisionSnapshot={revisionSnapshot}
                    />
                  </>
                ) : (
                  <p className="admin-muted">
                    Выберите резервную копию, чтобы сравнить её с текущим
                    состоянием заказа и при необходимости восстановить.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div>
            <h3>Выберите заказ</h3>
            <p className="admin-muted">
              Найдите заказ слева, чтобы открыть историю резервных копий и
              восстановление.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
