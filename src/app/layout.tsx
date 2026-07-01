import type { Metadata } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import { LanguageSwitcher } from "@/components/language-switcher";
import { localeCookieName, normalizeLocale } from "@/i18n/config";
import { applySiteBrandToText } from "@/lib/site-branding";
import { getRequestSiteBrand } from "@/server/site-branding";
import "./globals.css";
import "./ui-fixes.css";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getRequestSiteBrand();

  return {
    title: applySiteBrandToText("StarVedas, запись на церемонии", brand.name),
    description: applySiteBrandToText(
      "Клиентский сайт StarVedas для записи на ягью, пуджу, абхишеку и связанные церемонии.",
      brand.name
    ),
    icons: {
      icon: "/images/logo.ico",
      shortcut: "/images/logo.ico",
      apple: "/images/logo.ico"
    }
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
          id="yandex-metrika"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(m,e,t,r,i,k,a){
                m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=1*new Date();
                for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
              })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=110322484', 'ym');

              ym(110322484, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
            `
          }}
        />
        <noscript>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://mc.yandex.ru/watch/110322484"
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>
        <LanguageSwitcher currentLocale={locale} />
        {children}
      </body>
    </html>
  );
}
