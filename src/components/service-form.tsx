import type { PriceUnit } from "@prisma/client";
import Link from "next/link";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { DigitsOnlyInput } from "@/components/digits-only-input";
import { ProductSubscriptionAndRitesFields } from "@/components/product-subscription-and-rites-fields";
import {
  createService,
  toggleServiceActive,
  updateService
} from "@/server/service-actions";
import type { ManagedService } from "@/server/services";

const priceUnitOptions: Array<{ label: string; value: PriceUnit }> = [
  { label: "За заказ", value: "PER_ORDER" },
  { label: "За участника", value: "PER_PARTICIPANT" },
  { label: "За имя", value: "PER_NAME" }
];

const vatTaxTypeOptions = [
  { label: "Без НДС", value: 0 },
  { label: "НДС 0%", value: 1 },
  { label: "НДС 10%", value: 2 },
  { label: "НДС 20%", value: 6 },
  { label: "НДС 10/110", value: 4 },
  { label: "НДС 20/120", value: 7 },
  { label: "НДС 5%", value: 10 },
  { label: "НДС 7%", value: 11 },
  { label: "НДС 5/105", value: 12 },
  { label: "НДС 7/107", value: 13 },
  { label: "НДС 22%", value: 14 },
  { label: "НДС 22/122", value: 15 }
];

export function getPriceUnitLabel(value: PriceUnit) {
  return (
    priceUnitOptions.find((option) => option.value === value)?.label ?? value
  );
}

function formatServicePrices(service: ManagedService) {
  return [
    `RUB ${service.priceRub.toLocaleString("ru-RU")}`,
    service.priceUsd ? `USD ${service.priceUsd.toLocaleString("en-US")}` : "",
    service.priceInr ? `INR ${service.priceInr.toLocaleString("hi-IN")}` : ""
  ]
    .filter(Boolean)
    .join(" / ");
}

function formatMoscowDateTimeInput(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
  ) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const moscowTime = new Date(date.getTime() + 3 * 60 * 60 * 1000);

  return moscowTime.toISOString().slice(0, 16);
}

function formatMoscowDateTimeLabel(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Moscow",
    year: "numeric"
  }).format(date);
}

function formatSubscriptionPeriod(service: ManagedService) {
  if (
    !service.isSubscription ||
    !service.subscriptionStartsAt ||
    !service.subscriptionEndsAt
  ) {
    return null;
  }

  return `Действует с ${formatMoscowDateTimeLabel(
    service.subscriptionStartsAt
  )} до ${formatMoscowDateTimeLabel(service.subscriptionEndsAt)}`;
}

export function ServiceFields({
  service
}: Readonly<{
  service?: ManagedService;
}>) {
  return (
    <>
      <div className="field-grid">
        <label className="field">
          <span>Название</span>
          <input
            defaultValue={service?.title ?? ""}
            name="title"
            required
            type="text"
          />
        </label>
        <label className="field">
          <span>Slug</span>
          <input
            defaultValue={service?.slug ?? ""}
            name="slug"
            placeholder="personal-consultation"
            required
            type="text"
          />
        </label>
        <label className="field">
          <span>Сортировка</span>
          <input
            defaultValue={service?.sortOrder ?? 0}
            name="sortOrder"
            type="number"
          />
        </label>
      </div>

      <label className="field">
        <span>Наименование для чека</span>
        <input
          defaultValue={service?.receiptName ?? service?.title ?? ""}
          name="receiptName"
          placeholder="Например: Участие в онлайн-церемонии"
          required
          type="text"
        />
      </label>

      <label className="field">
        <span>Описание RU</span>
        <textarea
          defaultValue={service?.description ?? ""}
          name="description"
          rows={3}
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>Название EN</span>
          <input
            defaultValue={service?.titleEn ?? ""}
            name="titleEn"
            type="text"
          />
        </label>
        <label className="field">
          <span>Название HI</span>
          <input
            defaultValue={service?.titleHi ?? ""}
            name="titleHi"
            type="text"
          />
        </label>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Описание EN</span>
          <textarea
            defaultValue={service?.descriptionEn ?? ""}
            name="descriptionEn"
            rows={3}
          />
        </label>
        <label className="field">
          <span>Описание HI</span>
          <textarea
            defaultValue={service?.descriptionHi ?? ""}
            name="descriptionHi"
            rows={3}
          />
        </label>
      </div>

      <label className="field">
        <span>Расширенное пояснение RU</span>
        <textarea
          defaultValue={service?.detailsContent ?? ""}
          name="detailsContent"
          placeholder="Подробно объясните, кому подходит формат, что входит и как подготовиться. Можно использовать Markdown."
          rows={8}
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>Расширенное пояснение EN</span>
          <textarea
            defaultValue={service?.detailsContentEn ?? ""}
            name="detailsContentEn"
            rows={8}
          />
        </label>
        <label className="field">
          <span>Расширенное пояснение HI</span>
          <textarea
            defaultValue={service?.detailsContentHi ?? ""}
            name="detailsContentHi"
            rows={8}
          />
        </label>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Цена RUB</span>
          <DigitsOnlyInput
            defaultValue={service?.priceRub ?? 0}
            name="priceRub"
            required
          />
        </label>
        <label className="field">
          <span>Цена USD</span>
          <DigitsOnlyInput
            defaultValue={service?.priceUsd ?? ""}
            name="priceUsd"
            placeholder="если пусто — пересчёт из RUB"
          />
        </label>
        <label className="field">
          <span>Цена INR</span>
          <DigitsOnlyInput
            defaultValue={service?.priceInr ?? ""}
            name="priceInr"
            placeholder="если пусто — пересчёт из RUB"
          />
        </label>
        <label className="field">
          <span>Единица цены</span>
          <select
            defaultValue={service?.priceUnit ?? "PER_PARTICIPANT"}
            name="priceUnit"
            required
          >
            {priceUnitOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>НДС для чека</span>
          <select
            defaultValue={service?.vatTaxType ?? 0}
            name="vatTaxType"
            required
          >
            {vatTaxTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="checkbox-field">
        <input
          defaultChecked={service?.requiresExactParticipantList ?? true}
          name="requiresExactParticipantList"
          type="checkbox"
        />
        <span>Требовать точный список участников</span>
      </label>

      <ProductSubscriptionAndRitesFields
        defaultEndsAt={formatMoscowDateTimeInput(service?.subscriptionEndsAt)}
        defaultIsSubscription={service?.isSubscription ?? false}
        defaultStartsAt={formatMoscowDateTimeInput(
          service?.subscriptionStartsAt
        )}
        options={service?.options ?? []}
        serviceSlug={service?.slug}
      />

      <div className="admin-card admin-card--nested">
        <label className="checkbox-field">
          <input
            defaultChecked={service?.vedicGiftEnabled ?? false}
            name="vedicGiftEnabled"
            type="checkbox"
          />
          <span>Включить подарок на карточке продукта</span>
        </label>
        <label className="field">
          <span>Заголовок подарка</span>
          <input
            defaultValue={
              service?.vedicGiftTitle ??
              "🎁 Подарок: ведический астрологический разбор"
            }
            name="vedicGiftTitle"
            placeholder="Например: 🎁 Подарок: ведический астрологический разбор"
            type="text"
          />
        </label>
        <label className="field">
          <span>Текст подарка</span>
          <textarea
            defaultValue={service?.vedicGiftDescription ?? ""}
            name="vedicGiftDescription"
            placeholder="Например: Разбор по ведической астрологии входит в абонемент."
            rows={3}
          />
        </label>
      </div>

      <label className="checkbox-field">
        <input
          defaultChecked={service?.active ?? true}
          name="active"
          type="checkbox"
        />
        <span>Активен и показывается клиентам</span>
      </label>
    </>
  );
}

export function CreateServiceForm() {
  return (
    <form action={createService} className="admin-form">
      <ServiceFields />
      <AdminSubmitButton className="button button--primary">
        Создать продукт
      </AdminSubmitButton>
    </form>
  );
}

export function UpdateServiceForm({
  service
}: Readonly<{
  service: ManagedService;
}>) {
  return (
    <form action={updateService} className="admin-form">
      <input name="id" type="hidden" value={service.id} />
      <ServiceFields service={service} />
      <AdminSubmitButton className="button button--primary">
        Сохранить
      </AdminSubmitButton>
    </form>
  );
}

export function ToggleServiceActiveForm({
  service
}: Readonly<{
  service: ManagedService;
}>) {
  return (
    <form action={toggleServiceActive}>
      <input name="id" type="hidden" value={service.id} />
      <input
        name="active"
        type="hidden"
        value={service.active ? "false" : "true"}
      />
      <AdminSubmitButton>
        {service.active ? "Деактивировать" : "Активировать"}
      </AdminSubmitButton>
    </form>
  );
}

export function ServiceEditorList({
  emptyText = "Продукты пока не созданы.",
  services
}: Readonly<{
  emptyText?: string;
  services: ManagedService[];
}>) {
  if (services.length === 0) {
    return <p className="admin-muted">{emptyText}</p>;
  }

  return (
    <div className="product-card-grid">
      {services.map((service) => {
        const activeOptionsCount = service.options.filter(
          (option) => option.active
        ).length;
        const detailHref = `/admin/products/${service.id}`;
        const subscriptionPeriod = formatSubscriptionPeriod(service);

        return (
          <article className="product-card" key={service.id}>
            <div className="product-card__header">
              <div>
                <Link className="product-card__title" href={detailHref}>
                  {service.title}
                </Link>
                <p className="product-card__meta">
                  <code>/{service.slug}</code>
                  <span>{getPriceUnitLabel(service.priceUnit)}</span>
                </p>
              </div>
              <span
                className={
                  service.active ? "badge badge--success" : "badge badge--muted"
                }
              >
                {service.active ? "Активен" : "Скрыт"}
              </span>
            </div>

            <p className="product-card__description">
              {service.receiptName ||
                service.description ||
                "Описание продукта не заполнено"}
            </p>
            {subscriptionPeriod && (
              <p className="form-note">{subscriptionPeriod}</p>
            )}

            <dl className="product-card__stats">
              <div>
                <dt>Цена</dt>
                <dd>{formatServicePrices(service)}</dd>
              </div>
              <div>
                <dt>Обряды</dt>
                <dd>
                  {service.isSubscription
                    ? "скрыты"
                    : `${activeOptionsCount} / ${service.options.length}`}
                </dd>
              </div>
              <div>
                <dt>Заказы</dt>
                <dd>{service._count.orders}</dd>
              </div>
              <div>
                <dt>Список</dt>
                <dd>
                  {service.requiresExactParticipantList ? "нужен" : "не нужен"}
                </dd>
              </div>
              <div>
                <dt>Тип</dt>
                <dd>{service.isSubscription ? "абонемент" : "продукт"}</dd>
              </div>
            </dl>

            {!service.isSubscription && service.options.length > 0 && (
              <div className="product-card__options">
                {service.options.slice(0, 3).map((option) => (
                  <span key={option.id}>
                    {option.title}
                    {!option.active ? " · скрыт" : ""}
                  </span>
                ))}
                {service.options.length > 3 && (
                  <span>+{service.options.length - 3} ещё</span>
                )}
              </div>
            )}

            <div className="product-card__actions">
              <Link className="button button--small" href={detailHref}>
                Открыть карточку
              </Link>
              <Link
                aria-label={`Открыть карточку продукта ${service.title}`}
                className="icon-button icon-button--menu"
                href={detailHref}
                title="Открыть карточку"
              >
                &#8230;
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
