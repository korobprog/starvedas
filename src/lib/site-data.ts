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

export const services = [
  {
    title: "Абонемент на месяц",
    slug: "monthly-pass",
    description: "Регулярное участие в церемониях в течение месяца.",
    priceRub: 6000,
    priceLabel: "6000 руб.",
    priceUnit: "PER_PARTICIPANT" satisfies PriceUnit
  },
  {
    title: "Марафон, тариф 2500",
    slug: "marathon-2500",
    description:
      "Формат участия в серии практик. Названия тарифов будут уточнены.",
    priceRub: 2500,
    priceLabel: "2500 руб.",
    priceUnit: "PER_PARTICIPANT" satisfies PriceUnit
  },
  {
    title: "Марафон, тариф 3500",
    slug: "marathon-3500",
    description:
      "Формат участия в серии практик. Названия тарифов будут уточнены.",
    priceRub: 3500,
    priceLabel: "3500 руб.",
    priceUnit: "PER_PARTICIPANT" satisfies PriceUnit
  },
  {
    title: "Марафон, тариф 4500",
    slug: "marathon-4500",
    description:
      "Формат участия в серии практик. Названия тарифов будут уточнены.",
    priceRub: 4500,
    priceLabel: "4500 руб.",
    priceUnit: "PER_PARTICIPANT" satisfies PriceUnit
  },
  {
    title: "Один обряд",
    slug: "single-rite",
    description: "Разовое участие в выбранной церемонии.",
    priceRub: 1200,
    priceLabel: "1200 руб.",
    priceUnit: "PER_PARTICIPANT" satisfies PriceUnit
  },
  {
    title: "Абхишека",
    slug: "abhisheka",
    description: "Участие в абхишеке с указанием списка участников.",
    priceRub: 1000,
    priceLabel: "1000 руб.",
    priceUnit: "PER_PARTICIPANT" satisfies PriceUnit
  },
  {
    title: "Шраддха ягья (за каждого участника)",
    slug: "shraddha-name",
    description: "Стоимость рассчитывается за каждого участника.",
    priceRub: 250,
    priceLabel: "250 руб. за участника",
    priceUnit: "PER_NAME" satisfies PriceUnit
  }
];

export const steps = [
  "Выберите церемонию",
  "Укажите участников",
  "Оставьте контакты",
  "Проверьте заказ",
  "Перейдите к оплате"
];
