export const curators = [
  "Джая Мангал",
  "Артем Мещеряков",
  "Альфия Полесская",
  "Кхандита дд",
  "Елена Иневатова",
  "Анжелика Иневатова",
  "Кристина Сахута",
  "Радхика Кешави",
  "Гауранга Дас",
  "Фарида Лансарова",
  "Оджасви Гопи дд"
];

export type PriceUnit = "PER_ORDER" | "PER_PARTICIPANT" | "PER_NAME";

export type SiteService = {
  currency: "RUB" | "USD" | "INR";
  description: string;
  priceAmount: number;
  priceLabel: string;
  priceRub: number;
  priceUnit: PriceUnit;
  slug: string;
  title: string;
};

export type SiteServiceList = [SiteService, ...SiteService[]];

export const services = [
  {
    title: "Абонемент на месяц",
    slug: "monthly-pass",
    description: "Регулярное участие в онлайн-церемониях в течение месяца.",
    priceRub: 6000,
    currency: "RUB",
    priceAmount: 6000,
    priceLabel: "6000 руб.",
    priceUnit: "PER_PARTICIPANT" satisfies PriceUnit
  },
  {
    title: "Марафон, тариф 2500",
    slug: "marathon-2500",
    description: "Участие в марафоне практик по базовому тарифу.",
    priceRub: 2500,
    currency: "RUB",
    priceAmount: 2500,
    priceLabel: "2500 руб.",
    priceUnit: "PER_PARTICIPANT" satisfies PriceUnit
  },
  {
    title: "Марафон, тариф 3500",
    slug: "marathon-3500",
    description: "Участие в марафоне практик по стандартному тарифу.",
    priceRub: 3500,
    currency: "RUB",
    priceAmount: 3500,
    priceLabel: "3500 руб.",
    priceUnit: "PER_PARTICIPANT" satisfies PriceUnit
  },
  {
    title: "Марафон, тариф 4500",
    slug: "marathon-4500",
    description: "Участие в марафоне практик по расширенному тарифу.",
    priceRub: 4500,
    currency: "RUB",
    priceAmount: 4500,
    priceLabel: "4500 руб.",
    priceUnit: "PER_PARTICIPANT" satisfies PriceUnit
  },
  {
    title: "Один обряд",
    slug: "single-rite",
    description: "Разовое участие в выбранной онлайн-церемонии.",
    priceRub: 1200,
    currency: "RUB",
    priceAmount: 1200,
    priceLabel: "1200 руб.",
    priceUnit: "PER_PARTICIPANT" satisfies PriceUnit
  },
  {
    title: "Абхишека",
    slug: "abhisheka",
    description: "Участие в абхишеке с указанием списка участников.",
    priceRub: 1000,
    currency: "RUB",
    priceAmount: 1000,
    priceLabel: "1000 руб.",
    priceUnit: "PER_PARTICIPANT" satisfies PriceUnit
  },
  {
    title: "Шраддха ягья (за каждого участника)",
    slug: "shraddha-name",
    description:
      "Участие в шраддха ягьи, стоимость рассчитывается за каждого участника.",
    priceRub: 250,
    currency: "RUB",
    priceAmount: 250,
    priceLabel: "250 руб. за участника",
    priceUnit: "PER_NAME" satisfies PriceUnit
  }
] satisfies SiteServiceList;

export const steps = [
  "Выберите церемонию",
  "Укажите участников",
  "Оставьте контакты",
  "Проверьте заказ",
  "Перейдите к оплате"
];
