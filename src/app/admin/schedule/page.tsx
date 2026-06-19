import { cookies } from "next/headers";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { getAdminCopy } from "@/i18n/admin-copy";
import { localeCookieName } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { saveSchedule } from "@/server/schedule-actions";

export const dynamic = "force-dynamic";

async function getSchedules() {
  try {
    return await prisma.schedule.findMany({
      orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
      select: {
        active: true,
        body: true,
        id: true,
        month: true,
        title: true,
        updatedAt: true
      }
    });
  } catch {
    return [];
  }
}

export default async function AdminSchedulePage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const cookieStore = await cookies();
  const params = await searchParams;
  const copy = getAdminCopy(cookieStore.get(localeCookieName)?.value);
  const schedules = await getSchedules();
  const activeSchedule = schedules.find((schedule) => schedule.active);

  return (
    <div className="admin-grid">
      {params.saved && (
        <section className="admin-card admin-card--wide admin-success">
          <strong>Сохранено</strong>
          <span>Расписание успешно сохранено.</span>
        </section>
      )}

      <section className="admin-card">
        <h2>{copy.schedule.activeSchedule}</h2>
        {activeSchedule ? (
          <article className="schedule-preview">
            <span>{activeSchedule.month}</span>
            <h3>{activeSchedule.title}</h3>
            <p>{activeSchedule.body}</p>
          </article>
        ) : (
          <p className="admin-muted">{copy.schedule.activeEmpty}</p>
        )}
      </section>

      <section className="admin-card">
        <h2>{copy.schedule.add}</h2>
        <form action={saveSchedule} className="admin-form">
          <label className="field">
            <span>{copy.schedule.month}</span>
            <input
              name="month"
              placeholder={copy.schedule.monthPlaceholder}
              required
              type="text"
            />
          </label>
          <label className="field">
            <span>{copy.schedule.title}</span>
            <input
              name="title"
              placeholder={copy.schedule.titlePlaceholder}
              required
              type="text"
            />
          </label>
          <label className="field">
            <span>{copy.schedule.body}</span>
            <textarea
              name="body"
              placeholder={copy.schedule.bodyPlaceholder}
              required
              rows={8}
            />
          </label>
          <label className="checkbox-field">
            <input name="active" type="checkbox" />
            <span>{copy.schedule.publish}</span>
          </label>
          <AdminSubmitButton className="button button--primary">
            {copy.schedule.save}
          </AdminSubmitButton>
        </form>
      </section>

      {schedules.length > 0 && (
        <section className="admin-card admin-card--wide">
          <h2>{copy.schedule.all}</h2>
          <div className="admin-list">
            {schedules.map((schedule) => (
              <form
                action={saveSchedule}
                className="admin-list-item"
                key={schedule.id}
              >
                <input name="id" type="hidden" value={schedule.id} />
                <label className="field">
                  <span>{copy.schedule.month}</span>
                  <input
                    defaultValue={schedule.month}
                    name="month"
                    required
                    type="text"
                  />
                </label>
                <label className="field">
                  <span>{copy.schedule.title}</span>
                  <input
                    defaultValue={schedule.title}
                    name="title"
                    required
                    type="text"
                  />
                </label>
                <label className="field">
                  <span>{copy.schedule.text}</span>
                  <textarea
                    defaultValue={schedule.body}
                    name="body"
                    required
                    rows={5}
                  />
                </label>
                <label className="checkbox-field">
                  <input
                    defaultChecked={schedule.active}
                    name="active"
                    type="checkbox"
                  />
                  <span>{copy.schedule.publish}</span>
                </label>
                <AdminSubmitButton>{copy.schedule.update}</AdminSubmitButton>
              </form>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
