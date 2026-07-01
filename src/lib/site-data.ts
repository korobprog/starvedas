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

export type SiteServiceOption = {
  currency: "RUB" | "USD" | "INR";
  description: string;
  eventStartsAt: string | null;
  eventStartsAtLabel: string;
  id: string;
  priceAmount: number;
  priceLabel: string;
  priceRub: number;
  priceUnit: PriceUnit;
  title: string;
};

export type SiteService = {
  currency: "RUB" | "USD" | "INR";
  description: string;
  detailsContent: string;
  isSubscription: boolean;
  options: SiteServiceOption[];
  priceAmount: number;
  priceLabel: string;
  priceRub: number;
  priceUnit: PriceUnit;
  slug: string;
  subscriptionEndsAt: string | null;
  subscriptionEndsAtLabel: string;
  subscriptionStartsAt: string | null;
  subscriptionStartsAtLabel: string;
  title: string;
  vedicGiftDescription: string;
  vedicGiftEnabled: boolean;
  vedicGiftTitle: string;
  shraddhaModeEnabled: boolean;
  shraddhaWarningText: string;
  shraddhaUnbornLabel: string;
  shraddhaDeceasedChildLabel: string;
  shraddhaChildHelpText: string;
};

export type SiteServiceList = [SiteService, ...SiteService[]];

const noSubscriptionPeriod = {
  isSubscription: false,
  subscriptionEndsAt: null,
  subscriptionEndsAtLabel: "",
  subscriptionStartsAt: null,
  subscriptionStartsAtLabel: ""
} as const;

const noVedicGift = {
  vedicGiftDescription: "",
  vedicGiftEnabled: false,
  vedicGiftTitle: ""
} as const;

const noShraddhaMode = {
  shraddhaModeEnabled: false,
  shraddhaWarningText: "",
  shraddhaUnbornLabel: "",
  shraddhaDeceasedChildLabel: "",
  shraddhaChildHelpText: ""
} as const;

export const services = [
  {
    title: "Абонемент на месяц",
    slug: "monthly-pass",
    description: "Регулярное участие в онлайн-церемониях в течение месяца.",
    detailsContent: "",
    ...noSubscriptionPeriod,
    ...noShraddhaMode,
    isSubscription: true,
    options: [],
    priceRub: 6000,
    currency: "RUB",
    priceAmount: 6000,
    priceLabel: "6000 руб.",
    priceUnit: "PER_PARTICIPANT" satisfies PriceUnit,
    vedicGiftDescription: "Разбор по ведической астрологии входит в абонемент.",
    vedicGiftEnabled: true,
    vedicGiftTitle: "🎁 Подарок: ведический астрологический разбор"
  },
  {
    title: "Марафон, тариф 2500",
    slug: "marathon-2500",
    description: "Участие в марафоне практик по базовому тарифу.",
    detailsContent: "",
    ...noSubscriptionPeriod,
    ...noShraddhaMode,
    options: [],
    priceRub: 2500,
    currency: "RUB",
    priceAmount: 2500,
    priceLabel: "2500 руб.",
    priceUnit: "PER_PARTICIPANT" satisfies PriceUnit,
    ...noVedicGift
  },
  {
    title: "Марафон, тариф 3500",
    slug: "marathon-3500",
    description: "Участие в марафоне практик по стандартному тарифу.",
    detailsContent: "",
    ...noSubscriptionPeriod,
    ...noShraddhaMode,
    options: [],
    priceRub: 3500,
    currency: "RUB",
    priceAmount: 3500,
    priceLabel: "3500 руб.",
    priceUnit: "PER_PARTICIPANT" satisfies PriceUnit,
    ...noVedicGift
  },
  {
    title: "Марафон, тариф 4500",
    slug: "marathon-4500",
    description: "Участие в марафоне практик по расширенному тарифу.",
    detailsContent: "",
    ...noSubscriptionPeriod,
    ...noShraddhaMode,
    options: [],
    priceRub: 4500,
    currency: "RUB",
    priceAmount: 4500,
    priceLabel: "4500 руб.",
    priceUnit: "PER_PARTICIPANT" satisfies PriceUnit,
    ...noVedicGift
  },
  {
    title: "Один обряд",
    slug: "single-rite",
    description: "Разовое участие в выбранной онлайн-церемонии.",
    detailsContent: "",
    ...noSubscriptionPeriod,
    ...noShraddhaMode,
    options: [],
    priceRub: 1200,
    currency: "RUB",
    priceAmount: 1200,
    priceLabel: "1200 руб.",
    priceUnit: "PER_PARTICIPANT" satisfies PriceUnit,
    ...noVedicGift
  },
  {
    title: "Абхишека",
    slug: "abhisheka",
    description: "Участие в абхишеке с указанием списка участников.",
    detailsContent: "",
    ...noSubscriptionPeriod,
    ...noShraddhaMode,
    options: [],
    priceRub: 1000,
    currency: "RUB",
    priceAmount: 1000,
    priceLabel: "1000 руб.",
    priceUnit: "PER_PARTICIPANT" satisfies PriceUnit,
    ...noVedicGift
  },
  {
    title: "Шраддха ягья (за каждого участника)",
    slug: "shraddha-name",
    description:
      "Участие в шраддха ягьи, стоимость рассчитывается за каждого участника.",
    detailsContent: "",
    ...noSubscriptionPeriod,
    ...noShraddhaMode,
    options: [],
    priceRub: 250,
    currency: "RUB",
    priceAmount: 250,
    priceLabel: "250 руб. за участника",
    priceUnit: "PER_NAME" satisfies PriceUnit,
    ...noVedicGift
  }
] satisfies SiteServiceList;

export const steps = [
  "Выберите церемонию",
  "Укажите участников",
  "Оставьте контакты",
  "Проверьте заказ",
  "Перейдите к оплате"
];
