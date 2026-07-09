import { ParticipantListStatus } from "@prisma/client";
import Link from "next/link";
import { ParticipantListsPanel } from "@/components/participant-lists-panel";
import { prisma } from "@/lib/prisma";
import { formatStatus } from "@/lib/status-labels";
import {
  getCeremonyParticipantLists,
  type CeremonyParticipantListFilters,
  type ParticipantListRow
} from "@/server/participant-lists";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseStatus(value: string | undefined) {
  return Object.values(ParticipantListStatus).find((status) => status === value);
}

function parseFilters(searchParams: SearchParams | undefined): CeremonyParticipantListFilters {
  return {
    dateFrom: firstParam(searchParams?.dateFrom) || undefined,
    dateTo: firstParam(searchParams?.dateTo) || undefined,
    optionId: firstParam(searchParams?.optionId) || undefined,
    serviceId: firstParam(searchParams?.serviceId) || undefined,
    showArchived: firstParam(searchParams?.showArchived) === "on",
    shraddhaOnly: firstParam(searchParams?.shraddhaOnly) === "on",
    status: parseStatus(firstParam(searchParams?.status))
  };
}

function formatEventDate(date: Date | null) {
  return date ? date.toLocaleDateString("ru-RU") : "Дата не указана";
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

function getCeremonyTitle(list: ParticipantListRow) {
  const serviceTitle = list.serviceTitleOverride?.trim() || list.order.service.title;
  const options = list.order.serviceOptions
    .map((option) => option.titleSnapshot)
    .filter(Boolean);

  return options.length ? `${serviceTitle} — ${options.join(", ")}` : serviceTitle;
}

function groupLists(lists: ParticipantListRow[]) {
  const groups = new Map<string, { date: Date | null; title: string; lists: ParticipantListRow[] }>();

  for (const list of lists) {
    const date = getEventDate(list);
    const title = getCeremonyTitle(list);
    const key = `${date?.toISOString().slice(0, 10) ?? "no-date"}::${title}`;
    const group = groups.get(key);

    if (group) {
      group.lists.push(list);
    } else {
      groups.set(key, { date, title, lists: [list] });
    }
  }

  return [...groups.values()].sort((left, right) => {
    const leftTime = left.date?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightTime = right.date?.getTime() ?? Number.MAX_SAFE_INTEGER;

    return leftTime - rightTime || left.title.localeCompare(right.title, "ru");
  });
}

export default async function AdminCeremonyListsPage({
  searchParams
}: Readonly<{
  searchParams?: Promise<SearchParams>;
}>) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const [lists, services, options] = await Promise.all([
    getCeremonyParticipantLists(filters),
    prisma.service.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true }
    }),
    prisma.serviceOption.findMany({
      orderBy: [
        { eventStartsAt: "asc" },
        { sortOrder: "asc" },
        { createdAt: "asc" }
      ],
      select: {
        id: true,
        service: { select: { title: true } },
        title: true
      }
    })
  ]);
  const groups = groupLists(lists);
  const activeCount = lists.filter((list) => list.status !== ParticipantListStatus.ARCHIVED).length;
  const sentCount = lists.filter((list) => list.status === ParticipantListStatus.SENT).length;
  const readyCount = lists.filter((list) => list.status === ParticipantListStatus.READY_TO_SEND).length;

  return (
    <div className="admin-grid">
      <section className="admin-card admin-card--wide">
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">Рабочий раздел</p>
          <h2>Списки для церемоний</h2>
          <p>
            Группировка оплаченных списков по дате проведения и обряду. В карточках ниже можно
            копировать чистые имена, скачать PDF для Брахмана, добавить или удалить имя и отметить
            список как переданный.
          </p>
        </div>
        <div className="stats-grid">
          <div>
            <strong>{lists.length}</strong>
            <span>в выборке</span>
          </div>
          <div>
            <strong>{activeCount}</strong>
            <span>активных</span>
          </div>
          <div>
            <strong>{readyCount}</strong>
            <span>готовы к передаче</span>
          </div>
          <div>
            <strong>{sentCount}</strong>
            <span>переданы</span>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <h2>Фильтры</h2>
        <form className="admin-form filter-form">
          <label className="field">
            <span>Дата проведения с</span>
            <input defaultValue={filters.dateFrom ?? ""} name="dateFrom" type="date" />
          </label>
          <label className="field">
            <span>Дата проведения по</span>
            <input defaultValue={filters.dateTo ?? ""} name="dateTo" type="date" />
          </label>
          <label className="field">
            <span>Услуга</span>
            <select defaultValue={filters.serviceId ?? ""} name="serviceId">
              <option value="">Все услуги</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Обряд / выбранная опция</span>
            <select defaultValue={filters.optionId ?? ""} name="optionId">
              <option value="">Все обряды</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.service.title} — {option.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Статус списка</span>
            <select defaultValue={filters.status ?? ""} name="status">
              <option value="">Все активные статусы</option>
              {Object.values(ParticipantListStatus).map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="field field--checkbox">
            <input defaultChecked={filters.shraddhaOnly} name="shraddhaOnly" type="checkbox" />
            <span>Только Шраддха</span>
          </label>
          <label className="field field--checkbox">
            <input defaultChecked={filters.showArchived} name="showArchived" type="checkbox" />
            <span>Показывать архив</span>
          </label>
          <div className="filter-form__actions">
            <button className="button button--primary" type="submit">
              Применить фильтры
            </button>
            <Link className="button" href="/admin/ceremony-lists">
              Сбросить
            </Link>
          </div>
        </form>
      </section>

      {groups.length ? (
        groups.map((group) => (
          <section className="admin-card admin-card--wide" key={`${formatEventDate(group.date)}-${group.title}`}>
            <div className="section-heading section-heading--compact">
              <p className="eyebrow">{formatEventDate(group.date)}</p>
              <h2>{group.title}</h2>
              <p className="admin-muted">Списков в группе: {group.lists.length}</p>
            </div>
            <ParticipantListsPanel lists={group.lists} mode="statistician" />
          </section>
        ))
      ) : (
        <section className="admin-card admin-card--wide">
          <p className="admin-muted">Списки по выбранным фильтрам не найдены.</p>
        </section>
      )}
    </div>
  );
}
