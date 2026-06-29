import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientAuthRequired } from "@/components/client-auth-required";
import { ClientOrderEditForm } from "@/components/client-order-edit-form";
import { applySiteBrandToText } from "@/lib/site-branding";
import { formatStatus } from "@/lib/status-labels";
import { getCurrentClientProfile } from "@/server/client-auth";
import { canClientEditOrderStatus } from "@/server/client-order-permissions";
import { prisma } from "@/lib/prisma";
import { getRequestSiteBrand } from "@/server/site-branding";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getRequestSiteBrand();

  return {
    robots: {
      follow: false,
      index: false
    },
    title: applySiteBrandToText("Редактирование покупки, StarVedas", brand.name)
  };
}

export default async function ClientOrderEditPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const [client, { token }] = await Promise.all([
    getCurrentClientProfile(),
    params
  ]);

  if (!client) {
    return (
      <ClientAuthRequired
        nextPath={`/client/orders/${encodeURIComponent(token)}/edit`}
        title="Войдите, чтобы редактировать покупку"
      />
    );
  }

  const order = await prisma.order.findFirst({
    where: {
      clientId: client.id,
      deletedAt: null,
      publicToken: token
    },
    select: {
      customerEmail: true,
      customerName: true,
      customerPhone: true,
      customerTelegram: true,
      leadStatus: true,
      orderNumber: true,
      participantCount: true,
      participantsText: true,
      publicToken: true,
      service: {
        select: {
          title: true
        }
      },
      status: true
    }
  });

  if (!order) {
    notFound();
  }

  const canEdit = canClientEditOrderStatus(order);

  return (
    <main className="page-shell">
      <section className="content-section content-section--narrow">
        <div className="section-heading">
          <p className="eyebrow">Заказ №{order.orderNumber}</p>
          <h1>Редактирование покупки</h1>
          <p>{order.service.title}</p>
        </div>

        <div className="form-actions">
          <Link className="button" href={`/client/orders/${order.publicToken}`}>
            Назад к покупке
          </Link>
        </div>

        {canEdit ? (
          <ClientOrderEditForm order={order} />
        ) : (
          <div className="telegram-auth-card">
            <strong>Заказ уже нельзя изменить в кабинете</strong>
            <p>
              Текущий статус: {formatStatus(order.status)} /{" "}
              {formatStatus(order.leadStatus)}. Для изменения данных напишите
              вашему куратору.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
