"use client";

import { useState } from "react";
import { DigitsOnlyInput } from "@/components/digits-only-input";

export type RiteOptionInput = {
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

const priceUnitOptions: Array<{
  label: string;
  value: RiteOptionInput["priceUnit"];
}> = [
  { label: "За заказ", value: "PER_ORDER" },
  { label: "За участника", value: "PER_PARTICIPANT" },
  { label: "За имя", value: "PER_NAME" }
];

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

function normalizeTemplateTitle(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function isPastEvent(value: Date | string | null | undefined) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
}

function parseBulkDateTime(line: string) {
  const match = line.match(
    /(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?(?:[,\s]+(\d{1,2}):(\d{2}))?/
  );

  if (!match) {
    return {
      eventStartsAt: null,
      lineWithoutDate: line
    };
  }

  const [, day, month, yearValue, hour = "7", minute = "00"] = match;
  const currentYear = new Date().getFullYear();
  const fullYear = yearValue
    ? Number(yearValue.length === 2 ? `20${yearValue}` : yearValue)
    : currentYear;
  const eventStartsAt = `${fullYear}-${month.padStart(2, "0")}-${day.padStart(
    2,
    "0"
  )}T${hour.padStart(2, "0")}:${minute}`;

  return {
    eventStartsAt,
    lineWithoutDate: `${line.slice(0, match.index)} ${line.slice(
      (match.index ?? 0) + match[0].length
    )}`.trim()
  };
}

function parseBulkPrice(line: string) {
  const match = line.match(/(?:^|[\s—–-])(\d[\d\s]*)\s*(?:руб\.?|₽|rub)?\s*$/i);

  if (!match) {
    return {
      lineWithoutPrice: line,
      priceRub: null
    };
  }

  return {
    lineWithoutPrice: line.slice(0, match.index).trim(),
    priceRub: Number(match[1].replace(/\s+/g, ""))
  };
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
  const [bulkText, setBulkText] = useState("");

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

  function findTemplate(title: string, sourceItems: EditableRiteOption[]) {
    const normalizedTitle = normalizeTemplateTitle(title);

    return sourceItems.find(
      (item) => normalizeTemplateTitle(item.title) === normalizedTitle
    );
  }

  function createOptionFromBulkLine(
    line: string,
    index: number,
    sourceItems: EditableRiteOption[]
  ): EditableRiteOption | null {
    const { eventStartsAt, lineWithoutDate } = parseBulkDateTime(line);
    const { lineWithoutPrice, priceRub } = parseBulkPrice(lineWithoutDate);
    const parts = lineWithoutPrice
      .replace(/^[—–-]\s*/, "")
      .split(/\s+[—–-]\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
    const title = parts[0] ?? "";

    if (!title) {
      return null;
    }

    const template = findTemplate(title, sourceItems);
    const description =
      parts.slice(1).join(" — ") || template?.description || "";

    return {
      active: true,
      description,
      descriptionEn: template?.descriptionEn ?? null,
      descriptionHi: template?.descriptionHi ?? null,
      eventStartsAt,
      key: `bulk-${Date.now()}-${index}`,
      priceInr: template?.priceInr ?? null,
      priceRub: priceRub ?? template?.priceRub ?? 0,
      priceUnit: template?.priceUnit ?? "PER_PARTICIPANT",
      priceUsd: template?.priceUsd ?? null,
      sortOrder: sourceItems.length + index + 1,
      title,
      titleEn: template?.titleEn ?? null,
      titleHi: template?.titleHi ?? null
    };
  }

  function addBulkOptions() {
    const lines = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return;
    }

    setItems((current) => {
      const createdOptions = lines
        .map((line, index) => createOptionFromBulkLine(line, index, current))
        .filter((option): option is EditableRiteOption => Boolean(option));

      return [...current, ...createdOptions];
    });
    setBulkText("");
  }

  const visibleItems = items.filter((item) => !item.markedForDelete);

  return (
    <section className="rite-options-editor">
      <div className="admin-list-item__header">
        <div>
          <h4>Обряды внутри раздела</h4>
          <p className="admin-muted">
            Эти карточки показываются клиенту внутри выбранного продукта с
            чекбоксами. Если карточки добавлены, клиент выбирает минимум одну.
          </p>
        </div>
        {serviceSlug === "single-rite" && (
          <span className="badge">single-rite</span>
        )}
      </div>

      <div className="bulk-schedule-box">
        <label className="field">
          <span>Массовая загрузка расписания</span>
          <textarea
            name="optionBulkText"
            onChange={(event) => setBulkText(event.target.value)}
            placeholder={
              "24.06.2026 07:00 Ганга Пуджа — очищение, освобождение от негативной кармы — 1200\n25.06.2026 07:00 Гаятри Пуджа — мудрость, духовное раскрытие — 1200"
            }
            rows={5}
            value={bulkText}
          />
          <small>
            Каждая новая строка станет отдельным обрядом. Если название уже
            встречалось, описание и цена подтянутся автоматически. Можно нажать
            “Разобрать строки” для проверки или сразу сохранить продукт.
          </small>
        </label>
        <button
          className="button"
          disabled={!bulkText.trim()}
          onClick={addBulkOptions}
          type="button"
        >
          Разобрать строки и добавить карточки
        </button>
      </div>

      {items.map((option, index) => {
        const isHiddenByInactiveFlag = option.active === false;
        const isHiddenByPastDate = isPastEvent(option.eventStartsAt);

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
                pattern="[0-9]*"
                type="hidden"
                value={option.priceRub ?? 0}
              />
              <input
                name="optionPriceUsd"
                pattern="[0-9]*"
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
                pattern="[0-9]*"
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
                <DigitsOnlyInput
                  defaultValue={option.priceRub ?? 0}
                  name="optionPriceRub"
                  required
                />
              </label>
              <label className="field">
                <span>Цена USD</span>
                <DigitsOnlyInput
                  defaultValue={option.priceUsd ?? ""}
                  name="optionPriceUsd"
                />
              </label>
              <label className="field">
                <span>Цена INR</span>
                <DigitsOnlyInput
                  defaultValue={option.priceInr ?? ""}
                  name="optionPriceInr"
                />
              </label>
              <label className="field">
                <span>Единица цены</span>
                <select
                  defaultValue={option.priceUnit ?? "PER_PARTICIPANT"}
                  name="optionPriceUnit"
                  required
                >
                  {priceUnitOptions.map((priceUnitOption) => (
                    <option
                      key={priceUnitOption.value}
                      value={priceUnitOption.value}
                    >
                      {priceUnitOption.label}
                    </option>
                  ))}
                </select>
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

            {(isHiddenByInactiveFlag || isHiddenByPastDate) && (
              <p className="form-warning">
                Скрыт на сайте
                {isHiddenByInactiveFlag ? ": выключен флаг активности" : ""}
                {isHiddenByInactiveFlag && isHiddenByPastDate ? " и " : ""}
                {isHiddenByPastDate
                  ? `${isHiddenByInactiveFlag ? "дата" : ": дата"} мероприятия уже прошла`
                  : ""}
                .
              </p>
            )}

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
