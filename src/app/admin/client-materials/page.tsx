import {
  createClientVideoMaterialAction,
  deleteClientVideoMaterialAction,
  updateClientVideoMaterialAction
} from "@/server/client-video-material-actions";
import { getManagedClientVideoMaterials } from "@/server/client-video-materials";
import { requireAdminUser } from "@/server/auth";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(value);
}

export default async function AdminClientMaterialsPage({
  searchParams
}: Readonly<{
  searchParams?: Promise<SearchParams>;
}>) {
  await requireAdminUser("/admin/client-materials");

  const [materials, params] = await Promise.all([
    getManagedClientVideoMaterials(),
    searchParams
  ]);
  const saved = firstParam(params?.saved);
  const deleted = firstParam(params?.deleted);

  return (
    <div className="admin-grid">
      {saved && (
        <section className="admin-card admin-card--wide admin-success">
          <strong>Сохранено</strong>
          <span>Видео материал для клиентов обновлен.</span>
        </section>
      )}
      {deleted && (
        <section className="admin-card admin-card--wide admin-success">
          <strong>Удалено</strong>
          <span>Видео материал удален из списка.</span>
        </section>
      )}

      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <p className="eyebrow">Материалы для клиентов</p>
            <h2>Видео инструкции</h2>
            <p className="admin-muted">
              Добавляйте видео, которые клиент увидит в личном кабинете в
              разделе “Видео материалы”. Можно загрузить файл или вставить
              ссылку на уже размещенное видео.
            </p>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <h2>Добавить видео</h2>
        <form
          action={createClientVideoMaterialAction}
          className="admin-form"
          encType="multipart/form-data"
        >
          <label className="field">
            <span>Название</span>
            <input
              name="title"
              placeholder="Например: Как подготовиться к церемонии"
              required
              type="text"
            />
          </label>

          <label className="field">
            <span>Описание / инструкция</span>
            <textarea
              name="description"
              placeholder="Коротко объясните, кому и зачем смотреть это видео."
              rows={4}
            />
          </label>

          <div className="admin-form__row">
            <label className="field">
              <span>Загрузить видео</span>
              <input
                accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/*"
                name="videoFile"
                type="file"
              />
              <small>MP4, WEBM, MOV или M4V. До 240 МБ.</small>
            </label>

            <label className="field">
              <span>Или ссылка на видео</span>
              <input
                name="videoUrl"
                placeholder="https://... или /uploads/client-videos/..."
                type="text"
              />
            </label>
          </div>

          <div className="admin-form__row">
            <label className="field">
              <span>Сортировка</span>
              <input defaultValue={0} name="sortOrder" type="number" />
            </label>
            <label className="checkbox-field">
              <input defaultChecked name="active" type="checkbox" />
              <span>Показывать клиентам</span>
            </label>
          </div>

          <div className="form-actions">
            <button className="button button--primary" type="submit">
              Сохранить видео
            </button>
          </div>
        </form>
      </section>

      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <h2>Список видео</h2>
            <p className="admin-muted">
              Неактивные материалы остаются в админке, но не показываются
              клиентам.
            </p>
          </div>
        </div>

        {materials.length === 0 ? (
          <p className="admin-muted">Видео материалы пока не добавлены.</p>
        ) : (
          <div className="admin-video-materials">
            {materials.map((material) => (
              <article className="admin-video-material-card" key={material.id}>
                <div className="admin-video-material-card__preview">
                  <video controls preload="metadata" src={material.videoUrl}>
                    Ваш браузер не поддерживает видео.
                  </video>
                </div>

                <form
                  action={updateClientVideoMaterialAction}
                  className="admin-form"
                  encType="multipart/form-data"
                >
                  <input name="id" type="hidden" value={material.id} />
                  <label className="field">
                    <span>Название</span>
                    <input
                      defaultValue={material.title}
                      name="title"
                      required
                      type="text"
                    />
                  </label>

                  <label className="field">
                    <span>Описание / инструкция</span>
                    <textarea
                      defaultValue={material.description ?? ""}
                      name="description"
                      rows={3}
                    />
                  </label>

                  <label className="field">
                    <span>Ссылка</span>
                    <input
                      defaultValue={material.videoUrl}
                      name="videoUrl"
                      required
                      type="text"
                    />
                  </label>

                  <label className="field">
                    <span>Заменить видео файлом</span>
                    <input
                      accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/*"
                      name="videoFile"
                      type="file"
                    />
                  </label>

                  <div className="admin-form__row">
                    <label className="field">
                      <span>Сортировка</span>
                      <input
                        defaultValue={material.sortOrder}
                        name="sortOrder"
                        type="number"
                      />
                    </label>
                    <label className="checkbox-field">
                      <input
                        defaultChecked={material.active}
                        name="active"
                        type="checkbox"
                      />
                      <span>Показывать клиентам</span>
                    </label>
                  </div>

                  <p className="admin-muted">
                    Добавлено: {formatDate(material.createdAt)}
                    {material.active ? " · опубликовано" : " · черновик"}
                  </p>

                  <div className="form-actions">
                    <button className="button button--primary" type="submit">
                      Обновить
                    </button>
                  </div>
                </form>

                <form
                  action={deleteClientVideoMaterialAction}
                  className="admin-video-material-card__delete"
                >
                  <input name="id" type="hidden" value={material.id} />
                  <button className="button button--danger" type="submit">
                    Удалить видео
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
