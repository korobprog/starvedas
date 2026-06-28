import { PrismaClient, PriceUnit, SellerType, UserRole } from "@prisma/client";
import { hashPassword } from "../src/server/password";

const prisma = new PrismaClient();

const services = [
  {
    title: "Абонемент на месяц",
    slug: "monthly-pass",
    description: "Регулярное участие в онлайн-церемониях в течение месяца.",
    detailsContent:
      "## Что входит в абонемент\n\n- Неограниченное участие в онлайн-церемониях в течение месяца\n- Персональная консультация по ведической астрологии\n- Доступ к записям всех прошедших церемоний\n- Поддержка куратора в чате\n\n## Формат участия\n\nЦеремонии проходят онлайн в удобное для вас время. Вы получаете список участников, которых указали при записи, и подтверждение участия.",
    receiptName: "Абонемент на участие в онлайн-церемониях",
    vatTaxType: 0,
    priceRub: 6000,
    priceUnit: PriceUnit.PER_PARTICIPANT
  },
  {
    title: "Марафон, тариф 2500",
    slug: "marathon-2500",
    description: "Участие в марафоне практик по базовому тарифу.",
    detailsContent:
      "## Базовый тариф марафона\n\n- Участие во всех практиках марафона\n- Групповые сессии с брахманами\n- Доступ к общим материалам\n\n## Что получаете\n\nВы участвуете в марафоне вместе с другими участниками, следуете общему расписанию и получаете поддержку ведущего брахмана.",
    receiptName: "Участие в марафоне практик",
    vatTaxType: 0,
    priceRub: 2500,
    priceUnit: PriceUnit.PER_PARTICIPANT
  },
  {
    title: "Марафон, тариф 3500",
    slug: "marathon-3500",
    description: "Участие в марафоне практик по стандартному тарифу.",
    detailsContent:
      "## Стандартный тариф марафона\n\n- Всё из базового тарифа\n- Индивидуальная обратная связь\n- Дополнительные материалы и рекомендации\n- Записи всех практик\n\n## Преимущества\n\nБолее глубокое погружение в практику с персональным сопровождением.",
    receiptName: "Участие в марафоне практик",
    vatTaxType: 0,
    priceRub: 3500,
    priceUnit: PriceUnit.PER_PARTICIPANT
  },
  {
    title: "Марафон, тариф 4500",
    slug: "marathon-4500",
    description: "Участие в марафоне практик по расширенному тарифу.",
    detailsContent:
      "## Расширенный тариф марафона\n\n- Всё из стандартного тарифа\n- Персональные консультации\n- Индивидуальный план практики\n- Приоритетная поддержка куратора\n- Подарочные материалы\n\n## Для кого\n\nДля тех, кто хочет максимально глубоко погрузиться в практику и получить персональное сопровождение на каждом этапе.",
    receiptName: "Участие в марафоне практик",
    vatTaxType: 0,
    priceRub: 4500,
    priceUnit: PriceUnit.PER_PARTICIPANT
  },
  {
    title: "Один обряд",
    slug: "single-rite",
    description: "Разовое участие в выбранной онлайн-церемонии.",
    detailsContent:
      "## Разовое участие\n\nВыберите один конкретный обряд из списка доступных:\n\n- Ганапати пуджа\n- Лакшми пуджа\n- Шани пуджа\n- Другие обряды по расписанию\n\n## Как это работает\n\nВы выбираете обряд, указываете участников и оплачиваете. После подтверждения куратор свяжется с вами и передаст детали проведения церемонии.",
    receiptName: "Разовое участие в онлайн-церемонии",
    vatTaxType: 0,
    priceRub: 1200,
    priceUnit: PriceUnit.PER_PARTICIPANT
  },
  {
    title: "Абхишека",
    slug: "abhisheka",
    description: "Участие в абхишеке с указанием списка участников.",
    detailsContent:
      "## Абхишека\n\nСвященная ведическая церемония омовения божества с мантрами и молитвами. Участники получают благословение и духовную поддержку.\n\n## Формат проведения\n\n- Онлайн-трансляция церемонии\n- Имена участников читаются брахманами во время обряда\n- После церемонии вы получаете подтверждение участия",
    receiptName: "Участие в онлайн-церемонии абхишека",
    vatTaxType: 0,
    priceRub: 1000,
    priceUnit: PriceUnit.PER_PARTICIPANT
  },
  {
    title: "Шраддха ягья (за каждого участника)",
    slug: "shraddha-name",
    description:
      "Участие в шраддха ягьи, стоимость рассчитывается за каждого участника.",
    detailsContent:
      "## Шраддха ягья\n\nЦеремония памяти предков, проводимая для благополучия ушедших душ. Каждый участник указывается отдельно.\n\n## Особенности\n\n- Цена рассчитывается за каждого поимённо указанного участника\n- Имена читаются брахманами во время ягьи\n- Подходит для поминовения родственников",
    receiptName: "Участие в онлайн-церемонии шраддха ягья",
    vatTaxType: 0,
    priceRub: 250,
    priceUnit: PriceUnit.PER_NAME
  }
];

const paymentMethods = [
  {
    code: "mir",
    name: "МИР",
    description:
      "Оплата картами национальной платежной системы через защищенную страницу платежного провайдера.",
    sortOrder: 10
  },
  {
    code: "card",
    name: "Банковские карты",
    description:
      "Оплата банковской картой, если этот способ включен в платежном кабинете.",
    sortOrder: 20
  },
  {
    code: "sbp",
    name: "СБП",
    description:
      "Быстрая оплата через Систему быстрых платежей по QR-коду или ссылке.",
    sortOrder: 30
  },
  {
    code: "sberpay",
    name: "SberPay",
    description:
      "Оплата через SberPay, если метод доступен в подключенной платежной системе.",
    sortOrder: 40
  },
  {
    code: "tpay",
    name: "T-Pay",
    description:
      "Оплата через T-Pay при наличии этого способа на стороне платежной системы.",
    sortOrder: 50
  },
  {
    code: "alfapay",
    name: "Альфа Pay",
    description:
      "Оплата через Альфа Pay после подтверждения доступности в платежной системе.",
    sortOrder: 60
  },
  {
    code: "custom_card",
    name: "Перевод на карту",
    description:
      "Резервный перевод на карту по реквизитам администратора или куратора.",
    sortOrder: 70
  },
  {
    code: "custom_phone",
    name: "Перевод по номеру телефона",
    description:
      "Резервный перевод по номеру телефона по инструкциям администратора или куратора.",
    sortOrder: 80
  }
];

const paymentProviders = [
  {
    code: "prodamus",
    name: "Prodamus",
    description:
      "Платежная система Prodamus с базовым адресом https://prodamus.ru.",
    active: true,
    supportedLocales: "ru",
    sortOrder: 10
  },
  {
    code: "custom_card",
    name: "Перевод на карту",
    description:
      "Резервная ручная оплата переводом на карту по реквизитам администратора или куратора.",
    active: true,
    supportedLocales: "ru,en,hi",
    sortOrder: 20
  },
  {
    code: "custom_phone",
    name: "Перевод по номеру телефона",
    description:
      "Резервная ручная оплата переводом по номеру телефона по инструкциям администратора или куратора.",
    active: true,
    supportedLocales: "ru,en,hi",
    sortOrder: 30
  }
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  const adminName = process.env.ADMIN_NAME?.trim() || "Администратор";

  const adminUser =
    adminEmail && adminPassword
      ? await prisma.user.upsert({
          where: { email: adminEmail },
          create: {
            email: adminEmail,
            name: adminName,
            passwordHash: await hashPassword(adminPassword),
            role: UserRole.SUPER_ADMIN
          },
          update: {
            active: true,
            name: adminName,
            passwordHash: await hashPassword(adminPassword),
            role: UserRole.SUPER_ADMIN
          }
        })
      : null;

  const adminCurator = await prisma.curator.upsert({
    where: { slug: "administrator" },
    create: {
      active: true,
      canEditPostPurchase: true,
      canEditSupport: true,
      canViewClients: true,
      hidden: false,
      isSystem: true,
      name: "Администратор",
      postPurchaseText:
        "Спасибо за оплату. Администратор свяжется с вами и передаст дальнейшую информацию.",
      supportButtonLabel: "Написать вопрос администратору",
      supportEnabled: true,
      supportUrl: "https://t.me/art_om108",
      slug: "administrator",
      sortOrder: 0,
      userId: adminUser?.id
    },
    update: {
      active: true,
      canEditPostPurchase: true,
      canEditSupport: true,
      canViewClients: true,
      hidden: false,
      isSystem: true,
      name: "Администратор",
      userId: adminUser?.id
    }
  });

  await prisma.referralLink.upsert({
    where: { slug: adminCurator.slug },
    create: {
      active: true,
      curatorId: adminCurator.id,
      isPrimary: true,
      slug: adminCurator.slug
    },
    update: {
      active: true,
      curatorId: adminCurator.id,
      isPrimary: true
    }
  });

  await Promise.all(
    services.map((service, index) =>
      prisma.service.upsert({
        where: { slug: service.slug },
        create: {
          ...service,
          sortOrder: index + 1,
          requiresExactParticipantList: true
        },
        update: {}
      })
    )
  );

  const singleRite = await prisma.service.findUnique({
    where: { slug: "single-rite" },
    select: { id: true }
  });

  if (singleRite) {
    const riteOptions = [
      {
        title: "Ганапати пуджа",
        description:
          "Обряд для устранения препятствий и благоприятного начала дел.",
        priceRub: 1200,
        sortOrder: 10
      },
      {
        title: "Лакшми пуджа",
        description: "Обряд на процветание, гармонию и благополучие семьи.",
        priceRub: 1500,
        sortOrder: 20
      },
      {
        title: "Шани пуджа",
        description:
          "Обряд для смягчения сложных периодов и укрепления дисциплины.",
        priceRub: 2000,
        sortOrder: 30
      }
    ];

    await Promise.all(
      riteOptions.map((option) =>
        prisma.serviceOption.upsert({
          where: { id: `seed-single-rite-${option.sortOrder}` },
          create: {
            id: `seed-single-rite-${option.sortOrder}`,
            active: true,
            description: option.description,
            priceRub: option.priceRub,
            serviceId: singleRite.id,
            sortOrder: option.sortOrder,
            title: option.title
          },
          update: {
            serviceId: singleRite.id
          }
        })
      )
    );
  }

  const existingSchedule = await prisma.schedule.findFirst({
    select: { id: true }
  });

  if (!existingSchedule) {
    await prisma.schedule.create({
      data: {
        id: "seed-active-schedule",
        month: "Июнь 2026",
        title: "Расписание уточняется",
        body: "Актуальное расписание будет опубликовано администратором.",
        active: true
      }
    });
  }

  await Promise.all(
    paymentMethods.map((method) =>
      prisma.paymentMethod.upsert({
        where: { code: method.code },
        create: method,
        update: {
          description: method.description,
          name: method.name,
          sortOrder: method.sortOrder,
          active: true
        }
      })
    )
  );

  await Promise.all(
    paymentProviders.map((provider) =>
      prisma.paymentProvider.upsert({
        where: { code: provider.code },
        create: provider,
        update: {
          description: provider.description,
          name: provider.name,
          sortOrder: provider.sortOrder,
          supportedLocales: provider.supportedLocales
        }
      })
    )
  );

  const seededCurators = await prisma.curator.findMany({
    select: {
      id: true,
      isSystem: true
    }
  });

  await prisma.curatorPaymentOption.createMany({
    data: seededCurators.flatMap((curator) =>
      paymentProviders.map((provider) => {
        const isCustom =
          provider.code === "custom_card" || provider.code === "custom_phone";
        const enabled = isCustom ? curator.isSystem : true;

        return {
          allowed: enabled,
          curatorId: curator.id,
          enabled,
          instructions:
            isCustom && curator.isSystem
              ? "Используйте резервный перевод только если не получается оплатить через Prodamus. После перевода нажмите «Сообщить об оплате» и отправьте чек."
              : null,
          providerCode: provider.code,
          verificationPeriod:
            isCustom && curator.isSystem
              ? "Обычно проверка занимает до 1 рабочего дня."
              : null
        };
      })
    ),
    skipDuplicates: true
  });

  await prisma.organizationSettings.upsert({
    where: { id: "default-organization-settings" },
    create: {
      id: "default-organization-settings",
      sellerType: SellerType.IP,
      officialTelegram: "https://t.me/art_om108"
    },
    update: {
      officialTelegram: "https://t.me/art_om108"
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
