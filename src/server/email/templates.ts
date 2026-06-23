import { formatMoney } from "@/i18n/pricing";

export type EmailTemplate = {
  html: string;
  subject: string;
  text: string;
};

export type OrderEmailData = {
  amountRub: number;
  createdAt?: Date;
  currency: string;
  customerName: string;
  orderNumber: number;
  orderUrl: string;
  paidAt?: Date | null;
  participantCount: number;
  participantNames: string[];
  paymentProviderName?: string | null;
  paymentUrl?: string | null;
  receiptLabel?: string | null;
  receiptUrl?: string | null;
  selectedOptions: Array<{
    priceRub: number;
    quantity?: number;
    title: string;
  }>;
  serviceTitle: string;
};

const brandName = process.env.SMTP_FROM_NAME?.trim() || "Чинтамани Дхама";
const supportEmail =
  process.env.SMTP_FROM_EMAIL?.trim() ||
  process.env.EMAIL_FROM?.trim() ||
  "service@chintamanidhama.ru";

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value?: Date | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Moscow"
  }).format(value);
}

function money(amountRub: number, currency: string) {
  return formatMoney(amountRub, currency);
}

function layout({
  children,
  preheader,
  title
}: {
  children: string;
  preheader: string;
  title: string;
}) {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#f6f0e8;color:#2f2418;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f0e8;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fffaf3;border:1px solid #eadcc7;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 16px;border-bottom:1px solid #eadcc7;">
                <p style="margin:0 0 8px;color:#9f6b2d;font-size:13px;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(brandName)}</p>
                <h1 style="margin:0;color:#2f2418;font-size:26px;line-height:1.25;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:16px;line-height:1.6;">
                ${children}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#382719;color:#f9efe2;font-size:13px;line-height:1.5;">
                <p style="margin:0 0 8px;">Вы получили это письмо, потому что оставили заявку или зарегистрировались на сайте ${escapeHtml(brandName)}.</p>
                <p style="margin:0;">Поддержка: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#ffd899;">${escapeHtml(supportEmail)}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#9f6b2d;color:#fffaf3;text-decoration:none;border-radius:999px;padding:12px 22px;font-weight:700;">${escapeHtml(label)}</a></p>`;
}

function details(rows: Array<[string, string | number | null | undefined]>) {
  const items = rows
    .filter(
      ([, value]) => value !== null && value !== undefined && value !== ""
    )
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 12px;color:#745d43;border-bottom:1px solid #eadcc7;">${escapeHtml(label)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eadcc7;"><strong>${escapeHtml(value ?? "")}</strong></td>
        </tr>`
    )
    .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:18px 0;border-top:1px solid #eadcc7;">${items}</table>`;
}

function optionsList(order: OrderEmailData) {
  if (!order.selectedOptions.length) {
    return "";
  }

  return `<h2 style="font-size:18px;margin:24px 0 8px;">Выбранные услуги</h2>
  <ul style="margin:0 0 18px;padding-left:20px;">
    ${order.selectedOptions
      .map(
        (option) =>
          `<li>${escapeHtml(option.title)}${
            option.quantity ? ` × ${escapeHtml(option.quantity)}` : ""
          } — ${escapeHtml(money(option.priceRub, order.currency))}</li>`
      )
      .join("")}
  </ul>`;
}

function participantsList(order: OrderEmailData) {
  if (!order.participantNames.length) {
    return "";
  }

  return `<h2 style="font-size:18px;margin:24px 0 8px;">Участники</h2>
  <ol style="margin:0 0 18px;padding-left:20px;">
    ${order.participantNames
      .map((name) => `<li>${escapeHtml(name)}</li>`)
      .join("")}
  </ol>`;
}

function orderText(order: OrderEmailData, lines: string[]) {
  return [
    ...lines,
    "",
    `Заказ №${order.orderNumber}`,
    `Услуга: ${order.serviceTitle}`,
    `Сумма: ${money(order.amountRub, order.currency)}`,
    `Участников: ${order.participantCount}`,
    order.paymentProviderName
      ? `Платежная система: ${order.paymentProviderName}`
      : "",
    order.paidAt ? `Дата оплаты: ${formatDate(order.paidAt)}` : "",
    "",
    `Ссылка на заказ: ${order.orderUrl}`,
    order.paymentUrl ? `Ссылка на оплату: ${order.paymentUrl}` : "",
    order.receiptUrl
      ? `${order.receiptLabel || "Чек / квитанция"}: ${order.receiptUrl}`
      : "",
    "",
    "Если у вас есть вопросы, ответьте на это письмо или напишите в поддержку."
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildRegistrationEmail({
  loginUrl,
  name
}: {
  loginUrl: string;
  name: string;
}): EmailTemplate {
  const title = "Регистрация подтверждена";
  const text = [
    `${name}, добро пожаловать в ${brandName}.`,
    "",
    "Ваш клиентский кабинет создан. В нем можно смотреть заказы, статусы оплат и данные по услугам.",
    `Войти в кабинет: ${loginUrl}`
  ].join("\n");

  return {
    html: layout({
      children: `
        <p>${escapeHtml(name)}, добро пожаловать в ${escapeHtml(brandName)}.</p>
        <p>Ваш клиентский кабинет создан. В нем можно смотреть заказы, статусы оплат и данные по услугам.</p>
        ${button(loginUrl, "Войти в кабинет")}
      `,
      preheader: "Ваш клиентский кабинет создан.",
      title
    }),
    subject: `${brandName}: регистрация подтверждена`,
    text
  };
}

export function buildOrderCreatedEmail(order: OrderEmailData): EmailTemplate {
  const title = `Заказ №${order.orderNumber} создан`;
  const paymentBlock = order.paymentUrl
    ? button(order.paymentUrl, "Перейти к оплате")
    : "<p>Мы получили заказ и ожидаем подтверждения оплаты.</p>";

  return {
    html: layout({
      children: `
        <p>${escapeHtml(order.customerName)}, спасибо за заказ.</p>
        ${details([
          ["Номер заказа", `№${order.orderNumber}`],
          ["Услуга", order.serviceTitle],
          ["Сумма", money(order.amountRub, order.currency)],
          ["Участников", order.participantCount],
          ["Дата создания", formatDate(order.createdAt)]
        ])}
        ${optionsList(order)}
        ${participantsList(order)}
        ${paymentBlock}
        ${button(order.orderUrl, "Открыть заказ")}
      `,
      preheader: `Заказ №${order.orderNumber} создан.`,
      title
    }),
    subject: `${brandName}: заказ №${order.orderNumber} создан`,
    text: orderText(order, [
      `${order.customerName}, спасибо за заказ.`,
      "Мы получили вашу заявку."
    ])
  };
}

export function buildPaymentSucceededEmail(
  order: OrderEmailData
): EmailTemplate {
  const title = `Оплата заказа №${order.orderNumber} получена`;

  return {
    html: layout({
      children: `
        <p>${escapeHtml(order.customerName)}, оплата успешно получена.</p>
        ${details([
          ["Номер заказа", `№${order.orderNumber}`],
          ["Услуга", order.serviceTitle],
          ["Сумма", money(order.amountRub, order.currency)],
          ["Дата оплаты", formatDate(order.paidAt)],
          ["Платежная система", order.paymentProviderName]
        ])}
        ${order.receiptUrl ? button(order.receiptUrl, order.receiptLabel || "Открыть чек") : ""}
        ${button(order.orderUrl, "Открыть заказ")}
      `,
      preheader: `Оплата заказа №${order.orderNumber} получена.`,
      title
    }),
    subject: `${brandName}: оплата заказа №${order.orderNumber} получена`,
    text: orderText(order, [`${order.customerName}, оплата успешно получена.`])
  };
}

export function buildPaymentFailedEmail(order: OrderEmailData): EmailTemplate {
  const title = `Оплата заказа №${order.orderNumber} не прошла`;

  return {
    html: layout({
      children: `
        <p>${escapeHtml(order.customerName)}, платеж по заказу не был завершен.</p>
        ${details([
          ["Номер заказа", `№${order.orderNumber}`],
          ["Услуга", order.serviceTitle],
          ["Сумма", money(order.amountRub, order.currency)]
        ])}
        ${order.paymentUrl ? button(order.paymentUrl, "Повторить оплату") : ""}
        ${button(order.orderUrl, "Открыть заказ")}
      `,
      preheader: `Оплата заказа №${order.orderNumber} не прошла.`,
      title
    }),
    subject: `${brandName}: оплата заказа №${order.orderNumber} не прошла`,
    text: orderText(order, [
      `${order.customerName}, платеж по заказу не был завершен.`
    ])
  };
}

export function buildReceiptEmail(order: OrderEmailData): EmailTemplate {
  const title = `Чек по заказу №${order.orderNumber}`;

  return {
    html: layout({
      children: `
        <p>${escapeHtml(order.customerName)}, по вашему заказу доступен чек или квитанция.</p>
        ${details([
          ["Номер заказа", `№${order.orderNumber}`],
          ["Услуга", order.serviceTitle],
          ["Сумма", money(order.amountRub, order.currency)]
        ])}
        ${order.receiptUrl ? button(order.receiptUrl, order.receiptLabel || "Открыть чек") : ""}
        ${button(order.orderUrl, "Открыть заказ")}
      `,
      preheader: `Чек по заказу №${order.orderNumber} доступен.`,
      title
    }),
    subject: `${brandName}: чек по заказу №${order.orderNumber}`,
    text: orderText(order, [`${order.customerName}, чек по заказу доступен.`])
  };
}

export function buildPasswordResetEmail({
  expiresAt,
  resetUrl
}: {
  expiresAt: Date;
  resetUrl: string;
}): EmailTemplate {
  const title = "Восстановление пароля";

  return {
    html: layout({
      children: `
        <p>Мы получили запрос на восстановление пароля.</p>
        <p>Ссылка действует до ${escapeHtml(formatDate(expiresAt))}. Если вы не запрашивали восстановление, просто не отвечайте на письмо.</p>
        ${button(resetUrl, "Восстановить пароль")}
      `,
      preheader: "Ссылка для восстановления пароля.",
      title
    }),
    subject: `${brandName}: восстановление пароля`,
    text: [
      "Мы получили запрос на восстановление пароля.",
      `Ссылка действует до ${formatDate(expiresAt)}.`,
      `Восстановить пароль: ${resetUrl}`,
      "Если вы не запрашивали восстановление, просто не отвечайте на письмо."
    ].join("\n")
  };
}
