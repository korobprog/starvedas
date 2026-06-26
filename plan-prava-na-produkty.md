# План: права на создание и редактирование продуктов/абонементов

## Цель

По умолчанию создавать и редактировать **продукты/абонементы** (модель `Service`) может
**только администратор** (`ADMIN` / `SUPER_ADMIN`). В админке добавляется **переключатель**,
который глобально разрешает **всем агентам** (`Curator`) управлять продуктами из их кабинетов
(`/cabinet`). Переключатель выключен по умолчанию.

## Текущее состояние (что уже есть)

- Продукты — это модель `Service` в [prisma/schema.prisma](prisma/schema.prisma) (`title`, `slug`,
  `priceRub`, `priceUnit`, `requiresExactParticipantList`, `active`, `sortOrder`).
- Сейчас **нет** ни UI, ни server-actions для создания/редактирования `Service` — записи только
  сидируются/догружаются по умолчанию в [src/server/services.ts](src/server/services.ts).
- Роли в [prisma/schema.prisma](prisma/schema.prisma): `SUPER_ADMIN`, `ADMIN`, `MANAGER`,
  `CURATOR`, `CLIENT`. Хелперы авторизации — в [src/server/auth.ts](src/server/auth.ts)
  (`requireAdminUser`, `requireSuperAdminUser`, `isAdminRole`).
- Глобальные настройки — `OrganizationSettings`, редактируются в
  [src/app/admin/organization/page.tsx](src/app/admin/organization/page.tsx) через
  `saveOrganizationSettings` ([src/server/organization-actions.ts](src/server/organization-actions.ts),
  требует `requireSuperAdminUser`).
- Кабинет агента — [src/app/cabinet/page.tsx](src/app/cabinet/page.tsx); агент = `Curator`,
  привязанный к `User` с ролью `CURATOR`.
- Навигация админки — [src/components/admin-nav.tsx](src/components/admin-nav.tsx), пункты задаются
  в [src/app/admin/layout.tsx](src/app/admin/layout.tsx).

## Архитектурное решение

Добавить **один булев флаг** в `OrganizationSettings` —
`allowCuratorManageServices` (по умолчанию `false`). Единый хелвер авторизации
`requireServiceManager()` решает доступ: админ — всегда; куратор — только если флаг включён.
Одна и та же server-action логика переиспользуется и в админке, и в кабинете.

---

## Шаги реализации

### 1. Схема БД и миграция

В `model OrganizationSettings` ([prisma/schema.prisma](prisma/schema.prisma)) добавить:

```prisma
allowCuratorManageServices Boolean @default(false)
```

- Сгенерировать миграцию: `npx prisma migrate dev --name add_allow_curator_manage_services`.
- `npx prisma generate`.
- Дефолт `false` → существующее поведение (только админ) сохраняется без ручных правок данных.

### 2. Хелпер авторизации

Файл [src/server/auth.ts](src/server/auth.ts) — добавить:

```ts
export async function canManageServices(): Promise<{
  user: SessionUser;
  reason: "admin" | "curator-allowed";
} | null>;
```

Логика:

1. `getCurrentUser()`; если нет — `null`.
2. Если `isAdminRole(user.role)` → доступ (`reason: "admin"`).
3. Если `user.role === CURATOR`:
   - прочитать `OrganizationSettings.allowCuratorManageServices`;
   - если `true` → доступ (`reason: "curator-allowed"`), иначе `null`.
4. Иначе `null`.

И server-вариант с редиректом/ошибкой:

```ts
export async function requireServiceManager(nextPath = "/cabinet");
```

— для страниц редиректит неавторизованного на `/login`, агента без прав — обратно на `/cabinet`;
в server-actions бросает `Error("Недостаточно прав")`.

> Флаг кэшировать не нужно — читаем настройки разово на запрос (как уже делает
> `getPublicOrganizationSettings`).

### 3. Server-actions для продуктов

Новый файл `src/server/service-actions.ts` (`"use server"`), по образцу
[src/server/organization-actions.ts](src/server/organization-actions.ts) и
[src/server/curator-actions.ts](src/server/curator-actions.ts):

- `createService(formData)` — валидация Zod (`title`, `slug` уникальный, `priceRub >= 0`,
  `priceUnit ∈ PriceUnit`, `requiresExactParticipantList`, `active`, `sortOrder`).
- `updateService(formData)` — то же + `id`.
- `toggleServiceActive(formData)` — мягкое скрытие через `active` (не удаляем: на `Service`
  ссылаются `Order` с `onDelete: Restrict`).
- (опц.) `deleteService` — разрешать только если у продукта нет заказов, иначе предлагать
  деактивацию.

Каждая action:

1. `await requireServiceManager()` в начале.
2. Парсинг + валидация; при ошибке `throw new Error(...)`.
3. `prisma.service.create/update`.
4. `revalidatePath("/")`, `revalidatePath("/admin/products")`, `revalidatePath("/cabinet")`
   и публичных страниц, где показываются услуги.

> Slug: нормализовать (trim, нижний регистр, латиница/дефис); при конфликте — понятная ошибка.

### 4. Чтение списка продуктов для управления

В [src/server/services.ts](src/server/services.ts) добавить `getManagedServices()` — возвращает
**все** услуги (вкл. неактивные) с полями для редактирования, сортировка по `sortOrder`, `title`.
(`getPublicServices` оставить как есть — только активные.)

### 5. Переключатель в админке (главное требование)

#### 5a. Действие сохранения флага

В [src/server/organization-actions.ts](src/server/organization-actions.ts):

- Вариант A (просто): добавить поле `allowCuratorManageServices` в `organizationSettingsSchema`
  и в форму орг-настроек.
- Вариант B (рекомендуется, изолированно): отдельная action `setCuratorServicePermission(formData)`
  с `requireSuperAdminUser`, читает чекбокс и делает `prisma.organizationSettings.upsert`.
  Чище для отдельной карточки-тумблера.

#### 5b. UI переключателя

В [src/app/admin/organization/page.tsx](src/app/admin/organization/page.tsx) добавить карточку
«Права агентов»:

```tsx
<section className="admin-card">
  <h2>Права агентов</h2>
  <form action={setCuratorServicePermission} className="admin-form">
    <label className="checkbox-field">
      <input
        defaultChecked={settings?.allowCuratorManageServices ?? false}
        name="allowCuratorManageServices"
        type="checkbox"
      />
      <span>
        Разрешить агентам создавать и редактировать продукты/абонементы в их
        кабинетах
      </span>
    </label>
    <p className="admin-muted">
      По умолчанию продуктами управляет только администратор.
    </p>
    <button className="button button--primary" type="submit">
      Сохранить
    </button>
  </form>
</section>
```

> Доступ к самим орг-настройкам уже под `requireSuperAdminUser` — значит тумблер видит и
> переключает только супер-админ. Если нужно, чтобы и обычный `ADMIN` мог переключать —
> вынести этот блок на отдельную страницу/секцию под `requireAdminUser`.

### 6. Страница управления продуктами в админке

Новая страница `src/app/admin/products/page.tsx`:

- В начале `await requireAdminUser("/admin/products")`.
- `getManagedServices()` → таблица + форма создания + формы редактирования (паттерн как в
  [src/app/admin/curators/page.tsx](src/app/admin/curators/page.tsx)).
- Кнопки вызывают `createService` / `updateService` / `toggleServiceActive`.

Добавить пункт навигации «Продукты» в [src/app/admin/layout.tsx](src/app/admin/layout.tsx)
(массив items для [AdminNav](src/components/admin-nav.tsx)).

### 7. Блок управления продуктами в кабинете агента

В [src/app/cabinet/page.tsx](src/app/cabinet/page.tsx):

1. Прочитать флаг `allowCuratorManageServices` (через `canManageServices()` или прямой запрос
   настроек).
2. Вычислить `const canManageServices = isAdminRole(user.role) || flagEnabled;`
3. Если `canManageServices` — отрендерить секцию «Продукты и абонементы» с теми же формами
   (`createService` / `updateService` / `toggleServiceActive`) и списком `getManagedServices()`.
4. Если флаг выключен и роль `CURATOR` — секцию не показывать (или показать подсказку
   «Управление продуктами отключено администратором», по аналогии с уже существующими
   `canEditPostPurchase` / `canViewClients`).

> Server-actions сами повторно проверяют права через `requireServiceManager()` — UI лишь скрывает
> формы, но защита не зависит от UI.

### 8. Переиспользуемый компонент формы (опционально)

Вынести форму создания/редактирования продукта в `src/components/service-form.tsx`
(`"use client"` при необходимости), чтобы не дублировать разметку между
`/admin/products` и `/cabinet`. По аналогии с
[create-curator-form.tsx](src/components/create-curator-form.tsx).

---

## Безопасность и крайние случаи

- **Защита на сервере, а не в UI.** Все мутации продуктов идут через `requireServiceManager()`.
  Скрытие форм в кабинете — только UX; прямой POST агента без прав будет отклонён.
- **Выключение тумблера** мгновенно убирает доступ агентов (флаг читается на каждый запрос).
  Уже созданные агентом продукты остаются — это нормально (он действовал в рамках прав).
- **Ссылочная целостность:** `Order.serviceId` имеет `onDelete: Restrict` — нельзя удалять услугу
  с заказами. Использовать `active=false` для скрытия.
- **Уникальность slug** — обрабатывать ошибку Prisma `P2002` и показывать понятное сообщение.
- **MANAGER:** в текущем требовании не упомянут; по умолчанию прав не получает (только админ и,
  по флагу, куратор). При необходимости расширить хелпер.
- **Валидация цены/единиц** — Zod, чтобы агент не задал отрицательную цену или некорректный
  `priceUnit`.

## Затрагиваемые файлы

| Файл                                                                       | Изменение                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------- |
| [prisma/schema.prisma](prisma/schema.prisma)                               | + `allowCuratorManageServices` в `OrganizationSettings` |
| prisma/migrations/\*                                                       | новая миграция                                          |
| [src/server/auth.ts](src/server/auth.ts)                                   | `canManageServices` + `requireServiceManager`           |
| src/server/service-actions.ts                                              | **новый** — CRUD-actions продуктов                      |
| [src/server/services.ts](src/server/services.ts)                           | `getManagedServices`                                    |
| [src/server/organization-actions.ts](src/server/organization-actions.ts)   | `setCuratorServicePermission` (или поле в схеме)        |
| [src/app/admin/organization/page.tsx](src/app/admin/organization/page.tsx) | карточка с тумблером                                    |
| src/app/admin/products/page.tsx                                            | **новая** — управление продуктами                       |
| [src/app/admin/layout.tsx](src/app/admin/layout.tsx)                       | пункт навигации «Продукты»                              |
| [src/app/cabinet/page.tsx](src/app/cabinet/page.tsx)                       | секция продуктов под флагом                             |
| src/components/service-form.tsx                                            | **новый** (опц.) общая форма                            |

## Порядок работ

1. Схема + миграция (шаг 1).
2. Хелпер авторизации (шаг 2).
3. Server-actions + чтение (шаги 3–4).
4. Тумблер в админке (шаг 5).
5. Страница `/admin/products` + навигация (шаг 6).
6. Блок в кабинете агента (шаг 7).
7. Рефакторинг общей формы (шаг 8, по желанию).

## Проверка (ручное тестирование)

- **Админ:** видит «Продукты» в админке, создаёт/редактирует/деактивирует — работает.
- **Тумблер выключен + куратор:** в `/cabinet` секции продуктов нет; прямой вызов action →
  ошибка «Недостаточно прав».
- **Тумблер включён + куратор:** в `/cabinet` появляется секция, создание/редактирование работает.
- **Снова выключить тумблер:** у куратора секция исчезает, мутации отклоняются.
- Продукт с заказами нельзя удалить, но можно деактивировать.
- Дубликат slug → понятная ошибка.
