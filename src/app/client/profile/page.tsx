import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClientProfileForm } from "@/components/client-profile-form";
import { applySiteBrandToText } from "@/lib/site-branding";
import { getCurrentClientProfile } from "@/server/client-auth";
import { getRequestSiteBrand } from "@/server/site-branding";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getRequestSiteBrand();

  return {
    robots: {
      follow: false,
      index: false
    },
    title: applySiteBrandToText("Профиль клиента, StarVedas", brand.name)
  };
}

export default async function ClientProfilePage() {
  const client = await getCurrentClientProfile();

  if (!client) {
    redirect("/client");
  }

  return (
    <main className="page-shell">
      <section className="content-section content-section--narrow">
        <div className="section-heading">
          <p className="eyebrow">Личный кабинет</p>
          <h1>Профиль клиента</h1>
          <p>
            Обновите контакты, по которым куратор сможет связаться с вами по
            текущим и будущим заказам.
          </p>
        </div>

        <div className="form-actions">
          <Link className="button" href="/client">
            Назад в кабинет
          </Link>
        </div>

        <ClientProfileForm client={client} />
      </section>
    </main>
  );
}
