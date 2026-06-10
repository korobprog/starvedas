import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LanguageSwitcher } from "@/components/language-switcher";
import { localeCookieName, normalizeLocale } from "@/i18n/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "StarVedas, запись на церемонии",
  description:
    "Клиентский сайт StarVedas для записи на ягью, пуджу, абхишеку и связанные церемонии."
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function RootLayout({ children }: RootLayoutProps) {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(localeCookieName)?.value);

  return (
    <html lang={locale}>
      <body>
        <LanguageSwitcher currentLocale={locale} />
        {children}
      </body>
    </html>
  );
}
