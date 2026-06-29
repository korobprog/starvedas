import { submitPartnerApplicationAction } from "@/server/partner-applications";

type PartnerApplication = {
  adminComment: string | null;
  bankDetails: string | null;
  comment: string | null;
  createdAt: Date;
  email: string | null;
  fullName: string;
  inn: string;
  ogrnip: string | null;
  phone: string;
  registrationAddress: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  type: "IP" | "SELF_EMPLOYED";
};

function getStatusLabel(status: PartnerApplication["status"]) {
  if (status === "APPROVED") {
    return "Заявка одобрена";
  }

  if (status === "REJECTED") {
    return "Заявка отклонена";
  }

  return "Заявка на модерации";
}

export function PartnerApplicationGate({
  agreementText,
  application
}: {
  agreementText: string;
  application: PartnerApplication | null;
}) {
  const canResubmit = !application || application.status === "REJECTED";

  return (
    <section className="admin-card admin-card--wide">
      <div className="admin-card__header">
        <div>
          <h2>Партнёрская программа</h2>
          <p className="admin-muted">
            Чтобы создавать отдельные ссылки для партнёров, заполните данные ИП
            или самозанятого. После проверки администратор откроет доступ к
            созданию ссылок.
          </p>
        </div>
        {application && (
          <span
            className={
              application.status === "APPROVED"
                ? "badge badge--success"
                : application.status === "REJECTED"
                  ? "badge badge--danger"
                  : "badge badge--muted"
            }
          >
            {getStatusLabel(application.status)}
          </span>
        )}
      </div>

      {application?.status === "PENDING" && (
        <p className="admin-muted">
          Заявка отправлена {application.createdAt.toLocaleDateString("ru-RU")}.
          После модерации этот блок автоматически заменится инструментами
          создания партнёрских ссылок.
        </p>
      )}

      {application?.status === "REJECTED" && application.adminComment && (
        <p className="admin-muted">
          Комментарий администратора: {application.adminComment}
        </p>
      )}

      {canResubmit && (
        <form action={submitPartnerApplicationAction} className="admin-form">
          <label className="field">
            <span>Статус партнёра</span>
            <select defaultValue={application?.type ?? "IP"} name="type">
              <option value="IP">ИП</option>
              <option value="SELF_EMPLOYED">Самозанятый</option>
            </select>
          </label>

          <label className="field">
            <span>ФИО</span>
            <input
              defaultValue={application?.fullName ?? ""}
              maxLength={200}
              name="fullName"
              required
              type="text"
            />
          </label>

          <label className="field">
            <span>ИНН</span>
            <input
              defaultValue={application?.inn ?? ""}
              inputMode="numeric"
              maxLength={12}
              name="inn"
              required
              type="text"
            />
          </label>

          <label className="field">
            <span>ОГРНИП (для ИП)</span>
            <input
              defaultValue={application?.ogrnip ?? ""}
              maxLength={32}
              name="ogrnip"
              type="text"
            />
          </label>

          <label className="field">
            <span>Телефон</span>
            <input
              defaultValue={application?.phone ?? ""}
              maxLength={80}
              name="phone"
              required
              type="text"
            />
          </label>

          <label className="field">
            <span>Email</span>
            <input
              defaultValue={application?.email ?? ""}
              maxLength={320}
              name="email"
              type="email"
            />
          </label>

          <label className="field">
            <span>Адрес регистрации</span>
            <textarea
              defaultValue={application?.registrationAddress ?? ""}
              name="registrationAddress"
              rows={3}
            />
          </label>

          <label className="field">
            <span>Реквизиты для выплат</span>
            <textarea
              defaultValue={application?.bankDetails ?? ""}
              name="bankDetails"
              rows={4}
            />
          </label>

          <label className="field">
            <span>Комментарий</span>
            <textarea
              defaultValue={application?.comment ?? ""}
              name="comment"
              rows={3}
            />
          </label>

          {agreementText && (
            <div className="partner-agreement">
              <strong className="partner-agreement__title">
                Правила партнёрской программы
              </strong>
              <div className="partner-agreement__scroll">
                <p style={{ whiteSpace: "pre-wrap" }}>{agreementText}</p>
              </div>
            </div>
          )}

          <label className="checkbox-field">
            <input name="rulesAccepted" required type="checkbox" />
            <span>Принимаю правила партнёрской программы</span>
          </label>

          <button className="button button--primary" type="submit">
            Отправить на модерацию
          </button>
        </form>
      )}
    </section>
  );
}
