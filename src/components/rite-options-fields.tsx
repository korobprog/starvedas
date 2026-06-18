"use client";

import { useState } from "react";

type RiteOptionInput = {
  _count?: {
    orderItems: number;
  };
  active: boolean;
  description: string | null;
  descriptionEn: string | null;
  descriptionHi: string | null;
  eventStartsAt: Date | string | null;
  id: string;
  priceInr: number | null;
  priceRub: number;
  priceUnit: "PER_ORDER" | "PER_PARTICIPANT" | "PER_NAME";
  priceUsd: number | null;
  sortOrder: number;
  title: string;
  titleEn: string | null;
  titleHi: string | null;
};

type EditableRiteOption = Partial<RiteOptionInput> & {
  key: string;
  markedForDelete?: boolean;
};

function createEmptyOption(index: number): EditableRiteOption {
  return {
    active: true,
    key: `new-${Date.now()}-${index}`,
    eventStartsAt: null,
    priceRub: 0,
    priceUnit: "PER_PARTICIPANT",
    sortOrder: index + 1,
    title: ""
  };
}

function formatMoscowDateTimeInput(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const moscowTime = new Date(date.getTime() + 3 * 60 * 60 * 1000);

  return moscowTime.toISOString().slice(0, 16);
}

export function RiteOptionsFields({
  options = [],
  serviceSlug
}: Readonly<{
  options?: RiteOptionInput[];
  serviceSlug?: string;
}>) {
  const [items, setItems] = useState<EditableRiteOption[]>(
    options.map((option) => ({ ...option, key: option.id }))
  );

  function addOption() {
    setItems((current) => [...current, createEmptyOption(current.length)]);
  }

  function removeOption(key: string) {
    setItems((current) =>
      current
        .map((item) =>
          item.key === key
            ? item.id
              ? { ...item, markedForDelete: true }
              : null
            : item
        )
        .filter((item): item is EditableRiteOption => Boolean(item))
    );
  }

  function restoreOption(key: string) {
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, markedForDelete: false } : item
      )
    );
  }

  function moveOption(sourceKey: string, targetKey: string) {
    if (sourceKey === targetKey) {
      return;
    }

    setItems((current) => {
      const sourceIndex = current.findIndex((item) => item.key === sourceKey);
      const targetIndex = current.findIndex((item) => item.key === targetKey);

      if (sourceIndex < 0 || targetIndex < 0) {
        return current;
      }

      const next = [...current];
      const [source] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, source);

      return next;
    });
  }

  const visibleItems = items.filter((item) => !item.markedForDelete);

  return (
    <section className="rite-options-editor">
      <div className="admin-list-item__header">
        <div>
          <h4>Обряды внутри раздела</h4>
          <p className="admin-muted">
            Для продукта “Один обряд” эти карточки показываются клиенту с
            чекбоксами. Цена считается за участника.
          </p>
        </div>
        {serviceSlug === "single-rite" && (
          <span className="badge">single-rite</span>
        )}
      </div>

      {items.map((option, index) => {
        if (option.markedForDelete) {
          return (
            <div className="rite-option-card is-deleted" key={option.key}>
              <input name="optionId" type="hidden" value={option.id ?? ""} />
              <input
                name="optionTitle"
                type="hidden"
                value={option.title ?? "Удаленная карточка"}
              />
              <input
                name="optionDescription"
                type="hidden"
                value={option.description ?? ""}
              />
              <input
                name="optionDescriptionEn"
                type="hidden"
                value={option.descriptionEn ?? ""}
              />
              <input
                name="optionDescriptionHi"
                type="hidden"
                value={option.descriptionHi ?? ""}
              />
              <input
                name="optionEventStartsAt"
                type="hidden"
                value={formatMoscowDateTimeInput(option.eventStartsAt)}
              />
              <input
                name="optionTitleEn"
                type="hidden"
                value={option.titleEn ?? ""}
              />
              <input
                name="optionTitleHi"
                type="hidden"
                value={option.titleHi ?? ""}
              />
              <input
                name="optionPriceRub"
                type="hidden"
                value={option.priceRub ?? 0}
              />
              <input
                name="optionPriceUsd"
                type="hidden"
                value={option.priceUsd ?? ""}
              />
              <input
                name="optionPriceUnit"
                type="hidden"
                value={option.priceUnit ?? "PER_PARTICIPANT"}
              />
              <input
                name="optionPriceInr"
                type="hidden"
                value={option.priceInr ?? ""}
              />
              <input
                name="optionSortOrder"
                type="hidden"
                value={option.sortOrder ?? index + 1}
              />
              <input name="optionDelete" type="hidden" value={String(index)} />
              <p className="admin-muted">
                Карточка “{option.title}” будет удалена или скрыта после
                сохранения.
              </p>
              <button
                className="button"
                onClick={() => restoreOption(option.key)}
                type="button"
              >
                Вернуть
              </button>
            </div>
          );
        }

        return (
          <article
            className="rite-option-card"
            draggable
            key={option.key}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", option.key);
            }}
            onDrop={(event) => {
              event.preventDefault();
              moveOption(event.dataTransfer.getData("text/plain"), option.key);
            }}
          >
            <input name="optionId" type="hidden" value={option.id ?? ""} />
            <div className="field-grid">
              <label className="field">
                <span>Название обряда</span>
                <input
                  defaultValue={option.title ?? ""}
                  name="optionTitle"
                  required
                  type="text"
                />
              </label>
              <label className="field">
                <span>Сортировка</span>
                <input
                  defaultValue={option.sortOrder ?? index + 1}
                  name="optionSortOrder"
                  type="number"
                />
              </label>
            </div>

            <label className="field">
              <span>Текст / описание</span>
              <textarea
                defaultValue={option.description ?? ""}
                name="optionDescription"
                rows={3}
              />
            </label>

            <label className="field">
              <span>Дата и время мероприятия (МСК)</span>
              <input
                defaultValue={formatMoscowDateTimeInput(option.eventStartsAt)}
                name="optionEventStartsAt"
                type="datetime-local"
              />
              <small>
                Если дата и время уже прошли по Москве, карточка автоматически
                скрывается для клиентов.
              </small>
            </label>

            <div className="field-grid">
              <label className="field">
                <span>Цена RUB</span>
                <input
                  defaultValue={option.priceRub ?? 0}
                  min={0}
                  name="optionPriceRub"
                  required
                  type="number"
                />
              </label>
              <label className="field">
                <span>Цена USD</span>
                <input
                  defaultValue={option.priceUsd ?? ""}
                  min={0}
                  name="optionPriceUsd"
                  type="number"
                />
              </label>
              <label className="field">
                <span>Цена INR</span>
                <input
                  defaultValue={option.priceInr ?? ""}
                  min={0}
                  name="optionPriceInr"
                  type="number"
                />
              </label>
            </div>

            <label className="checkbox-field">
              <input
                defaultChecked={option.active ?? true}
                name="optionActive"
                type="checkbox"
                value={String(index)}
              />
              <span>Активен и показывается клиентам</span>
            </label>

            {option._count?.orderItems ? (
              <p className="admin-muted">
                Использовано в заказах: {option._count.orderItems}. При удалении
                карточка будет скрыта, чтобы не ломать старые заказы.
              </p>
            ) : null}

            <button
              className="button"
              onClick={() => removeOption(option.key)}
              type="button"
            >
              {option.id ? "Удалить / скрыть" : "Убрать карточку"}
            </button>
          </article>
        );
      })}

      {visibleItems.length === 0 && (
        <p className="admin-muted">Карточки обрядов пока не добавлены.</p>
      )}

      <button className="button" onClick={addOption} type="button">
        + Добавить обряд
      </button>
    </section>
  );
}
