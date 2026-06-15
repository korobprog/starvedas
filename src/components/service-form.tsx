import type { PriceUnit } from "@prisma/client";
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
        <span>Описание</span>
        <textarea
          defaultValue={service?.description ?? ""}
          name="description"
          rows={3}
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>Цена, руб.</span>
          <input
            defaultValue={service?.priceRub ?? 0}
            min={0}
            name="priceRub"
            required
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
    </>
  );
}

export function CreateServiceForm() {
  return (
    <form action={createService} className="admin-form">
      <ServiceFields />
      <button className="button button--primary" type="submit">
        Создать продукт
      </button>
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
                /{service.slug} · {service.priceRub.toLocaleString("ru-RU")}{" "}
                руб. · {getPriceUnitLabel(service.priceUnit)}
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
            <button className="button button--primary" type="submit">
              Сохранить
            </button>
          </form>

          <form action={toggleServiceActive}>
            <input name="id" type="hidden" value={service.id} />
            <input
              name="active"
              type="hidden"
              value={service.active ? "false" : "true"}
            />
            <button className="button" type="submit">
              {service.active ? "Деактивировать" : "Активировать"}
            </button>
          </form>
        </article>
      ))}
    </div>
  );
}
