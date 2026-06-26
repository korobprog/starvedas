import Link from "next/link";
import { notFound } from "next/navigation";
import { CuratorCreatedAccessNotice } from "@/components/curator-created-access-notice";
import { CuratorProfileForm } from "@/components/curator-profile-form";
import {
  getAdminCurator,
  getAdminOrigin,
  getClientCount,
  getCuratorStatusLabel
} from "@/server/admin-curators";

export const dynamic = "force-dynamic";

export default async function AdminCuratorDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, origin] = await Promise.all([params, getAdminOrigin()]);
  const curator = await getAdminCurator(id);

  if (!curator) {
    notFound();
  }

  return (
    <div className="admin-grid">
      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <p className="eyebrow">Карточка куратора</p>
            <h2>{curator.name}</h2>
            <p className="admin-muted">
              {getCuratorStatusLabel(curator)} ·{" "}
              {getClientCount(curator.orders)} клиентов ·{" "}
              {curator.orders.length} заказов
            </p>
          </div>
          <div className="admin-card__actions">
            <Link className="button" href="/admin/curators">
              ← К списку
            </Link>
            <Link className="button button--primary" href="/admin/curators/new">
              Создать еще
            </Link>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <CuratorCreatedAccessNotice
          curatorId={curator.id}
          curatorName={curator.name}
          origin={origin}
        />
        <CuratorProfileForm curator={curator} origin={origin} />
      </section>
    </div>
  );
}
