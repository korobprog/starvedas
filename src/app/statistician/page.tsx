import Link from "next/link";
import { UserRole } from "@prisma/client";
import { ParticipantListsPanel } from "@/components/participant-lists-panel";
import { isAdminRole, requireUser } from "@/server/auth";
import { logoutAction } from "@/server/auth-actions";
import { getStatisticianParticipantLists } from "@/server/participant-lists";
import { hasAcceptedStatisticianRole } from "@/server/statistician-role";
import {
  acceptStatisticianRoleAction,
  leaveStatisticianRoleAction
} from "@/server/statistician-role-actions";

export const dynamic = "force-dynamic";

export default async function StatisticianPage() {
  const user = await requireUser(
    [UserRole.STATISTICIAN, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    "/statistician"
  );
  const adminUser = isAdminRole(user.role);
  const acceptedStatisticianRole = await hasAcceptedStatisticianRole(user);
  const lists = await getStatisticianParticipantLists();
  const newCount = lists.filter((list) => list.status === "NEW").length;
  const clarificationCount = lists.filter(
    (list) => list.status === "NEEDS_CLARIFICATION"
  ).length;
  const readyCount = lists.filter(
    (list) => list.status === "READY_TO_SEND"
  ).length;
  const bookmarkedCount = lists.filter((list) => list.bookmarked).length;

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

        <ParticipantListsPanel
          emptyText="Оплаченных списков участников пока нет."
          lists={lists}
          mode="statistician"
        />
      </div>
    </main>
  );
}
