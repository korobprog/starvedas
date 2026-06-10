import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser, getDefaultUserPath } from "@/server/auth";

export const metadata = {
  robots: {
    follow: false,
    index: false
  },
  title: "Вход, StarVedas"
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (user) {
    redirect(getDefaultUserPath(user.role));
  }

  return (
    <main className="simple-page">
      <section className="simple-card">
        <p className="eyebrow">StarVedas</p>
        <h1>Вход в кабинет</h1>
        <p>Введите email и пароль, выданные администратором.</p>
        <LoginForm next={params.next} />
      </section>
    </main>
  );
}
