import type { MetadataRoute } from "next";

/**
 * Манифест нужен, чтобы сайт можно было установить как приложение: тогда
 * счётчик новых продаж показывается прямо на иконке, как в Telegram.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#fffaf2",
    description:
      "Запись на ягью, пуджу и абхишеку, кабинет куратора и админка.",
    display: "standalone",
    icons: [
      {
        sizes: "any",
        src: "/images/logo.ico",
        type: "image/x-icon"
      },
      {
        sizes: "512x512",
        src: "/images/logo.jpg",
        type: "image/jpeg"
      }
    ],
    name: "StarVedas",
    short_name: "StarVedas",
    start_url: "/",
    theme_color: "#a35219"
  };
}
