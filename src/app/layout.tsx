import type { Metadata } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import { LanguageSwitcher } from "@/components/language-switcher";
import { localeCookieName, normalizeLocale } from "@/i18n/config";
import { applySiteBrandToText } from "@/lib/site-branding";
import { getRequestSiteBrand } from "@/server/site-branding";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getRequestSiteBrand();

  return {
    title: applySiteBrandToText("StarVedas, запись на церемонии", brand.name),
    description: applySiteBrandToText(
      "Клиентский сайт StarVedas для записи на ягью, пуджу, абхишеку и связанные церемонии.",
      brand.name
    )
  };
}

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function RootLayout({ children }: RootLayoutProps) {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(localeCookieName)?.value);

  return (
    <html lang={locale}>
      <body>
        <Script
          src="https://telegram.org/js/telegram-web-app.js?62"
          strategy="beforeInteractive"
        />
        <LanguageSwitcher currentLocale={locale} />
        {children}
      </body>
    </html>
  );
}
