import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { saveStatisticianAction } from "@/server/statistician-actions";

export const dynamic = "force-dynamic";

export default async function AdminStatisticiansPage() {
  const statisticians = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    select: {
      active: true,
      createdAt: true,
      email: true,
      id: true,
      name: true,
      telegramId: true
    },
    where: { role: UserRole.STATISTICIAN }
  });

  return (
    <div className="admin-grid">
      <section className="admin-card admin-card--wide">
        <h2>Новый статист</h2>
        <p className="admin-muted">
          Статист получает списки участников через кабинет и может входить через
          Telegram Mini Apps после привязки Telegram ID.
        </p>
        <form action={saveStatisticianAction} className="admin-form">
          <label className="field">
            <span>Имя</span>
            <input name="name" required type="text" />
          </label>
          <label className="field">
            <span>Email</span>
            <input name="email" required type="email" />
          </label>
          <label className="field">
            <span>Пароль</span>
            <input name="password" required type="text" />
          </label>
          <label className="field">
            <span>Telegram ID</span>
            <input
              name="telegramId"
              placeholder="например 123456789"
              type="text"
            />
          </label>
          <label className="field field--checkbox">
            <input defaultChecked name="active" type="checkbox" />
            <span>Активен</span>
          </label>
          <button className="button button--primary" type="submit">
            Создать статиста
          </button>
        </form>
      </section>

      <section className="admin-card admin-card--wide">
        <h2>Статисты</h2>
        {statisticians.length ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Telegram ID</th>
                  <th>Статус</th>
                  <th>Правка</th>
                </tr>
              </thead>
              <tbody>
                {statisticians.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <br />
                      {user.email}
                    </td>
                    <td>{user.telegramId || "не привязан"}</td>
                    <td>{user.active ? "активен" : "отключен"}</td>
                    <td>
                      <form
                        action={saveStatisticianAction}
                        className="admin-form admin-form--compact"
                      >
                        <input name="userId" type="hidden" value={user.id} />
                        <input
                          defaultValue={user.name}
                          name="name"
                          required
                          type="text"
                        />
                        <input
                          defaultValue={user.email}
                          name="email"
                          required
                          type="email"
                        />
                        <input
                          name="password"
                          placeholder="новый пароль, если нужен"
                          type="text"
                        />
                        <input
                          defaultValue={user.telegramId ?? ""}
                          name="telegramId"
                          placeholder="Telegram ID"
                          type="text"
                        />
                        <label className="field field--checkbox">
                          <input
                            defaultChecked={user.active}
                            name="active"
                            type="checkbox"
                          />
                          <span>Активен</span>
                        </label>
                        <button className="button button--small" type="submit">
                          Сохранить
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-muted">Статистов пока нет.</p>
        )}
      </section>
    </div>
  );
}
