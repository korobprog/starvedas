import type { PriceUnit } from "@prisma/client";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { RiteOptionsFields } from "@/components/rite-options-fields";
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

function getPriceUnitLabel(value: PriceUnit) {
  return (
    priceUnitOptions.find((option) => option.value === value)?.label ?? value
  );
}

function ServiceFields({
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

      <div className="field-grid">
        <label className="field">
          <span>Цена RUB</span>
          <input
            defaultValue={service?.priceRub ?? 0}
            min={0}
            name="priceRub"
            required
            type="number"
          />
        </label>
        <label className="field">
          <span>Цена USD</span>
          <input
            defaultValue={service?.priceUsd ?? ""}
            min={0}
            name="priceUsd"
            placeholder="если пусто — пересчёт из RUB"
            type="number"
          />
        </label>
        <label className="field">
          <span>Цена INR</span>
          <input
            defaultValue={service?.priceInr ?? ""}
            min={0}
            name="priceInr"
            placeholder="если пусто — пересчёт из RUB"
            type="number"
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

      <label className="checkbox-field">
        <input
          defaultChecked={service?.active ?? true}
          name="active"
          type="checkbox"
        />
        <span>Активен и показывается клиентам</span>
      </label>

      <RiteOptionsFields
        options={service?.options ?? []}
        serviceSlug={service?.slug}
      />
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
    <div className="admin-list">
      {services.map((service) => (
        <article className="admin-list-item" key={service.id}>
          <div className="admin-list-item__header">
            <div>
              <h3>{service.title}</h3>
              <p className="admin-muted">
                /{service.slug} · RUB {service.priceRub.toLocaleString("ru-RU")}
                {service.priceUsd
                  ? ` · USD ${service.priceUsd.toLocaleString("en-US")}`
                  : ""}
                {service.priceInr
                  ? ` · INR ${service.priceInr.toLocaleString("hi-IN")}`
                  : ""}{" "}
                · {getPriceUnitLabel(service.priceUnit)} · чек:{" "}
                {service.receiptName ?? service.title}
              </p>
            </div>
            <span className="badge">
              {service.active ? "Активен" : "Скрыт"}
            </span>
          </div>

          <dl className="details-list">
            <div>
              <dt>Заказы</dt>
              <dd>{service._count.orders}</dd>
            </div>
            <div>
              <dt>Список участников</dt>
              <dd>
                {service.requiresExactParticipantList
                  ? "обязателен"
                  : "не обязателен"}
              </dd>
            </div>
          </dl>

          <form action={updateService} className="admin-form">
            <input name="id" type="hidden" value={service.id} />
            <ServiceFields service={service} />
            <AdminSubmitButton className="button button--primary">
              Сохранить
            </AdminSubmitButton>
          </form>

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
        </article>
      ))}
    </div>
  );
}
