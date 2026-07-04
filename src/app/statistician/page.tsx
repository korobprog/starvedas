import Link from "next/link";
import { ParticipantRowStatus, UserRole } from "@prisma/client";
import { ParticipantListsPanel } from "@/components/participant-lists-panel";
import {
  StatisticianBulkCopyPanel,
  type StatisticianBulkCopyItem
} from "@/components/statistician-bulk-copy-panel";
import { VedicGiftRequestsPanel } from "@/components/vedic-gift-requests-panel";
import { isAdminRole, requireUser } from "@/server/auth";
import { logoutAction } from "@/server/auth-actions";
import { getStatisticianParticipantListsByFilter } from "@/server/participant-lists";
import { hasAcceptedStatisticianRole } from "@/server/statistician-role";
import { getVedicGiftRequests } from "@/server/vedic-gifts";
import {
  acceptStatisticianRoleAction,
  leaveStatisticianRoleAction
} from "@/server/statistician-role-actions";

export const dynamic = "force-dynamic";

type SearchParams = {
  participantFilter?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseParticipantFilter(value: string | string[] | undefined) {
  const filter = firstParam(value);

  return filter === "all" || filter === "processed" ? filter : "unprocessed";
}

function formatParticipantBulkDate(date: Date | null) {
  return date ? date.toLocaleDateString("ru-RU") : "Дата не указана";
}

function getParticipantBulkEventDate(
  list: Awaited<
    ReturnType<typeof getStatisticianParticipantListsByFilter>
  >[number]
) {
  return (
    list.eventStartsAt ??
    list.order.serviceOptions
      .map((option) => option.option?.eventStartsAt ?? null)
      .find((date): date is Date => Boolean(date)) ??
    null
  );
}

function getParticipantBulkTitle(
  list: Awaited<
    ReturnType<typeof getStatisticianParticipantListsByFilter>
  >[number]
) {
  const title = list.serviceTitleOverride?.trim() || list.order.service.title;
  const options = list.order.serviceOptions
    .map((option) => option.titleSnapshot)
    .filter(Boolean);

  return options.length ? `${title} — ${options.join(", ")}` : title;
}

function createParticipantBulkCopyItems(
  lists: Awaited<ReturnType<typeof getStatisticianParticipantListsByFilter>>
): StatisticianBulkCopyItem[] {
  return lists
    .map((list) => ({
      dateLabel: formatParticipantBulkDate(getParticipantBulkEventDate(list)),
      listId: list.id,
      names: list.order.participants
        .filter(
          (participant) =>
            participant.rowStatus !== ParticipantRowStatus.CHECKED
        )
        .map((participant) => participant.fullName),
      title: getParticipantBulkTitle(list)
    }))
    .filter((item) => item.names.length > 0);
}

export default async function StatisticianPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const user = await requireUser(
    [UserRole.STATISTICIAN, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    "/statistician"
  );
  const params = await searchParams;
  const participantFilter = parseParticipantFilter(params?.participantFilter);
  const adminUser = isAdminRole(user.role);
  const acceptedStatisticianRole = await hasAcceptedStatisticianRole(user);
  const [lists, vedicGiftRequests] = await Promise.all([
    getStatisticianParticipantListsByFilter(participantFilter),
    getVedicGiftRequests()
  ]);
  const newCount = lists.filter((list) => list.status === "NEW").length;
  const clarificationCount = lists.filter(
    (list) => list.status === "NEEDS_CLARIFICATION"
  ).length;
  const readyCount = lists.filter(
    (list) => list.status === "READY_TO_SEND"
  ).length;
  const bookmarkedCount = lists.filter((list) => list.bookmarked).length;
  const bulkCopyItems =
    participantFilter === "unprocessed"
      ? createParticipantBulkCopyItems(lists)
      : [];

  return (
    <main className="admin-page">
      <div className="container admin-shell">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Кабинет статиста</p>
            <h1>Списки участников</h1>
            <p>
              {user.name}, здесь собираются списки участников со всех кураторов.
              Проверьте ФИО, сервис и дату начала мероприятия перед отправкой.
            </p>
          </div>
          <nav className="admin-nav" aria-label="Кабинет статиста">
            {adminUser && !acceptedStatisticianRole ? (
              <form action={acceptStatisticianRoleAction}>
                <button className="button button--primary" type="submit">
                  Принять роль статиста
                </button>
              </form>
            ) : null}
            {adminUser && acceptedStatisticianRole ? (
              <form action={leaveStatisticianRoleAction}>
                <button className="button" type="submit">
                  Вернуться в роль администратора
                </button>
              </form>
            ) : null}
            {adminUser ? (
              <Link className="button" href="/admin/statisticians">
                Админка статистов
              </Link>
            ) : null}
            <Link className="button" href="/statistician-mini-app">
              Вход через Telegram
            </Link>
            <Link className="button" href="/">
              На сайт
            </Link>
            <form action={logoutAction}>
              <button className="button" type="submit">
                Выйти
              </button>
            </form>
          </nav>
        </header>

        <section className="admin-card admin-card--wide">
          <h2>Подсказка</h2>
          {adminUser ? (
            <p className="admin-muted">
              {acceptedStatisticianRole
                ? "Вы приняли роль статиста: сообщения по спискам будут уходить от роли «статист»."
                : "Вы вошли как администратор. Нажмите «Принять роль статиста», чтобы работать в этом кабинете от роли статиста."}
            </p>
          ) : null}
          <p className="admin-muted">
            Списки приходят через Telegram. Если дата начала мероприятия
            указана, отправьте список заранее. Если дата не указана — запросите
            уточнение у куратора через переписку по списку.
          </p>
          <div className="stats-grid">
            <div>
              <strong>{lists.length}</strong>
              <span>всего списков</span>
            </div>
            <div>
              <strong>{newCount}</strong>
              <span>новых</span>
            </div>
            <div>
              <strong>{clarificationCount}</strong>
              <span>требуют уточнения</span>
            </div>
            <div>
              <strong>{readyCount}</strong>
              <span>готовы к отправке</span>
            </div>
            <div>
              <strong>{bookmarkedCount}</strong>
              <span>в закладках</span>
            </div>
          </div>
        </section>

        <section className="admin-card admin-card--wide">
          <h2>Участники для статиста</h2>
          <p className="admin-muted">
            По умолчанию показаны только списки, где есть необработанные имена.
          </p>
          <div className="participant-tools__actions">
            <Link
              className={
                participantFilter === "unprocessed"
                  ? "button button--primary"
                  : "button"
              }
              href="/statistician"
            >
              Необработанные
            </Link>
            <Link
              className={
                participantFilter === "processed"
                  ? "button button--primary"
                  : "button"
              }
              href="/statistician?participantFilter=processed"
            >
              Обработанные / архив
            </Link>
            <Link
              className={
                participantFilter === "all"
                  ? "button button--primary"
                  : "button"
              }
              href="/statistician?participantFilter=all"
            >
              Все
            </Link>
          </div>
        </section>

        {bulkCopyItems.length > 0 ? (
          <StatisticianBulkCopyPanel items={bulkCopyItems} />
        ) : null}

        <VedicGiftRequestsPanel requests={vedicGiftRequests} />

        <ParticipantListsPanel
          emptyText="Оплаченных списков участников пока нет."
          lists={lists}
          mode="statistician"
        />
      </div>
    </main>
  );
}
