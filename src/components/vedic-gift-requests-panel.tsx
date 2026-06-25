import type { VedicGiftRequest } from "@/server/vedic-gifts";

const ruDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const ruDateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  year: "numeric"
});

function formatDate(date: Date) {
  return ruDateFormatter.format(date);
}

function formatDateTime(date: Date) {
  return ruDateTimeFormatter.format(date);
}

function formatBirthTime(request: VedicGiftRequest) {
  if (request.birthTimeUnknown) {
    return "?????? ????? ??????????";
  }

  return request.birthTime || "?? ???????";
}

function formatContacts(request: VedicGiftRequest) {
  const contacts = [
    request.email,
    request.phone ? `???.: ${request.phone}` : null,
    request.telegram ? `Telegram: ${request.telegram}` : null
  ].filter(Boolean);

  return contacts.join(" ? ");
}

export function VedicGiftRequestsPanel({
  requests
}: {
  requests: VedicGiftRequest[];
}) {
  const newCount = requests.filter((request) => !request.processed).length;

  return (
    <section className="admin-card admin-card--wide">
      <div className="admin-card__header">
        <div>
          <h2>?????????? ?????????? ???????</h2>
          <p className="admin-muted">
            ??????, ??????? ???????????? ????????? ????? ?????? ?????????
            ??????????. ????? ??????: {newCount}.
          </p>
        </div>
      </div>

      {requests.length === 0 ? (
        <p className="admin-muted">?????? ?? ?????????? ?????? ???? ???.</p>
      ) : (
        <table className="admin-table vedic-gift-table">
          <thead>
            <tr>
              <th>????</th>
              <th>????????????</th>
              <th>????????</th>
              <th>????????</th>
              <th>?????</th>
              <th>??????</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{formatDateTime(request.createdAt)}</td>
                <td>
                  <strong>
                    {request.lastName} {request.firstName}
                  </strong>
                </td>
                <td>
                  {formatDate(request.birthDate)}
                  <br />
                  <span className="admin-muted">
                    ?????: {formatBirthTime(request)}
                  </span>
                </td>
                <td>{formatContacts(request)}</td>
                <td>
                  {request.order ? (
                    <>
                      #{request.order.orderNumber} ?{" "}
                      {request.order.service.title}
                      <br />
                      <span className="admin-muted">
                        ???????: {request.order.curator.name}
                      </span>
                    </>
                  ) : (
                    <span className="admin-muted">????? ?? ????????</span>
                  )}
                </td>
                <td>
                  <span
                    className={
                      request.processed ? "badge badge--success" : "badge"
                    }
                  >
                    {request.processed ? "??????????" : "?????"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
