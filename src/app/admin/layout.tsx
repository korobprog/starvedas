import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin-nav";
import { getAdminCopy } from "@/i18n/admin-copy";
import { localeCookieName } from "@/i18n/config";
import { requireUser } from "@/server/auth";
import { logoutAction } from "@/server/auth-actions";

export const metadata = {
  robots: {
    follow: false,
    index: false
  },
  title: "Админка StarVedas"
};

export default async function AdminLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  const user = await requireUser(
    [UserRole.ADMIN, UserRole.SUPER_ADMIN],
    "/admin/curators"
  );
  const cookieStore = await cookies();
  const copy = getAdminCopy(cookieStore.get(localeCookieName)?.value);
  const canManageCriticalSettings = user.role === UserRole.SUPER_ADMIN;

  return (
    <main className="admin-page">
      <div className="container admin-shell">
        <header className="admin-header">
          <div>
            <p className="eyebrow">{copy.layout.eyebrow}</p>
            <h1>{copy.layout.title}</h1>
          </div>
          <nav className="admin-nav" aria-label={copy.layout.title}>
            <AdminNav
              items={[
                { href: "/admin/curators", label: "Кураторы" },
                { href: "/admin/participants", label: "Участники" },
                { href: "/admin/clients", label: "Клиенты" },
                { href: "/admin/schedule", label: copy.layout.schedule },
                ...(canManageCriticalSettings
                  ? [
                      {
                        href: "/admin/organization",
                        label: copy.layout.organization
                      },
                      {
                        href: "/admin/payments",
                        label: copy.layout.payments
                      }
                    ]
                  : []),
                { href: "/", label: copy.layout.site },
                { href: "/cabinet", label: "Кабинет" }
              ]}
            />
            <form action={logoutAction}>
              <button className="button" type="submit">
                Выйти, {user.name}
              </button>
            </form>
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
