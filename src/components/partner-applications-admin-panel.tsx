import {
  approvePartnerApplicationAction,
  rejectPartnerApplicationAction
} from "@/server/partner-applications";

type Application = {
  adminComment: string | null;
  bankDetails: string | null;
  comment: string | null;
  createdAt: Date;
  email: string | null;
  fullName: string;
  id: string;
  inn: string;
  ogrnip: string | null;
  phone: string;
  registrationAddress: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  type: "IP" | "SELF_EMPLOYED";
  curator: {
    name: string;
    user: { email: string } | null;
  };
};

function typeLabel(type: Application["type"]) {
  return type === "IP" ? "ИП" : "Самозанятый";
}

function statusLabel(status: Application["status"]) {
  if (status === "APPROVED") return "Одобрена";
  if (status === "REJECTED") return "Отклонена";
  return "На модерации";
}

export function PartnerApplicationsAdminPanel({
  applications
}: {
  applications: Application[];
}) {
  return (
    <section className="admin-card admin-card--wide">
      <div className="admin-card__header">
        <div>
          <h2>Заявки на партнёрские ссылки</h2>
          <p className="admin-muted">
            Одобрите данные ИП или самозанятого, чтобы куратор смог создавать
            партнёрские ссылки.
          </p>
        </div>
      </div>

      {applications.length === 0 ? (
        <p className="admin-muted">Заявок пока нет.</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Куратор</th>
                <th>Данные</th>
                <th>Контакты и реквизиты</th>
                <th>Статус</th>
                <th>Модерация</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id}>
                  <td>
                    <strong>{application.curator.name}</strong>
                    <br />
                    <span className="admin-muted">
                      {application.curator.user?.email ?? "Email не указан"}
                    </span>
                  </td>
                  <td>
                    {typeLabel(application.type)}
                    <br />
                    ФИО: {application.fullName}
                    <br />
                    ИНН: {application.inn}
                    {application.ogrnip && (
                      <>
                        <br />
                        ОГРНИП: {application.ogrnip}
                      </>
                    )}
                    {application.registrationAddress && (
                      <>
                        <br />
                        Адрес: {application.registrationAddress}
                      </>
                    )}
                  </td>
                  <td>
                    Телефон: {application.phone}
                    {application.email && (
                      <>
                        <br />
                        Email: {application.email}
                      </>
                    )}
                    {application.bankDetails && (
                      <>
                        <br />
                        Реквизиты: {application.bankDetails}
                      </>
                    )}
                    {application.comment && (
                      <>
                        <br />
                        Комментарий: {application.comment}
                      </>
                    )}
                  </td>
                  <td>
                    <span
                      className={
                        application.status === "APPROVED"
                          ? "badge badge--success"
                          : "badge badge--muted"
                      }
                    >
                      {statusLabel(application.status)}
                    </span>
                    <br />
                    <span className="admin-muted">
                      {application.createdAt.toLocaleDateString("ru-RU")}
                    </span>
                    {application.adminComment && (
                      <>
                        <br />
                        Комментарий: {application.adminComment}
                      </>
                    )}
                  </td>
                  <td>
                    <div className="referral-actions">
                      <form action={approvePartnerApplicationAction}>
                        <input
                          name="applicationId"
                          type="hidden"
                          value={application.id}
                        />
                        <textarea
                          aria-label="Комментарий администратора"
                          name="adminComment"
                          placeholder="Комментарий"
                          rows={2}
                        />
                        <button className="button button--small" type="submit">
                          Одобрить
                        </button>
                      </form>
                      <form action={rejectPartnerApplicationAction}>
                        <input
                          name="applicationId"
                          type="hidden"
                          value={application.id}
                        />
                        <textarea
                          aria-label="Причина отклонения"
                          name="adminComment"
                          placeholder="Причина отклонения"
                          rows={2}
                        />
                        <button className="button button--small" type="submit">
                          Отклонить
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
