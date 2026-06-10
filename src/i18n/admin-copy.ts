import { normalizeLocale, type Locale } from "@/i18n/config";

type AdminCopy = {
  layout: {
    eyebrow: string;
    organization: string;
    payments: string;
    schedule: string;
    site: string;
    title: string;
  };
  organization: {
    bankDetails: string;
    cashboxDetails: string;
    clientEmail: string;
    clientPhone: string;
    directorName: string;
    legalAddress: string;
    legalName: string;
    officialTelegram: string;
    postalAddress: string;
    publicData: string;
    publicLead: string;
    recipientName: string;
    save: string;
    sellerType: string;
    settings: string;
    sellerTypes: Record<"IP" | "OOO" | "SELF_EMPLOYED" | "OTHER", string>;
    supportHours: string;
    labels: {
      email: string;
      inn: string;
      operator: string;
      ogrn: string;
      phone: string;
      telegram: string;
    };
  };
  payments: {
    envTitle: string;
    lead: string;
    providers: string;
    save: string;
    secretWarning: string;
    title: string;
  };
  schedule: {
    activeSchedule: string;
    activeEmpty: string;
    add: string;
    all: string;
    body: string;
    bodyPlaceholder: string;
    month: string;
    monthPlaceholder: string;
    publish: string;
    save: string;
    text: string;
    title: string;
    titlePlaceholder: string;
    update: string;
  };
};

const copies: Record<Locale, AdminCopy> = {
  ru: {
    layout: {
      eyebrow: "Админка",
      organization: "Организация",
      payments: "Оплата",
      schedule: "Расписание",
      site: "На сайт",
      title: "Управление StarVedas"
    },
    organization: {
      bankDetails: "Банковские реквизиты для оферты",
      cashboxDetails: "Реквизиты онлайн-кассы",
      clientEmail: "Email для клиентов",
      clientPhone: "Телефон для клиентов",
      directorName: "ФИО ИП или руководителя",
      legalAddress: "Юридический адрес",
      legalName: "Полное наименование",
      officialTelegram: "Telegram или официальный канал",
      postalAddress: "Почтовый адрес",
      publicData: "Публичные данные",
      publicLead:
        "Эти данные автоматически используются в подвале сайта, контактах, оферте, политике и согласии на обработку персональных данных.",
      recipientName: "Название платежного получателя",
      save: "Сохранить данные",
      sellerType: "Тип продавца",
      settings: "Настройки организации",
      sellerTypes: {
        IP: "ИП",
        OOO: "ООО",
        OTHER: "Другое",
        SELF_EMPLOYED: "Самозанятый"
      },
      supportHours: "Режим работы поддержки",
      labels: {
        email: "Email",
        inn: "ИНН",
        operator: "Исполнитель",
        ogrn: "ОГРН/ОГРНИП",
        phone: "Телефон",
        telegram: "Telegram"
      }
    },
    payments: {
      envTitle: "Переменные окружения для ключей",
      lead: "Здесь можно включать и выключать способы оплаты, доступные клиенту на шаге оплаты.",
      providers: "Способы оплаты",
      save: "Сохранить",
      secretWarning:
        "Секретные ключи не хранятся в админке и репозитории. Их нужно добавить только в .env локально или в secrets/env Dokploy.",
      title: "Настройки оплаты"
    },
    schedule: {
      activeSchedule: "Активное расписание",
      activeEmpty:
        "Активное расписание не найдено. Создайте новую публикацию и отметьте ее активной.",
      add: "Добавить расписание",
      all: "Все расписания",
      body: "Текст расписания",
      bodyPlaceholder:
        "Добавьте даты, названия церемоний и важные условия участия.",
      month: "Месяц",
      monthPlaceholder: "Июнь 2026",
      publish: "Опубликовать как активное расписание",
      save: "Сохранить",
      text: "Текст",
      title: "Заголовок",
      titlePlaceholder: "Расписание церемоний на июнь",
      update: "Обновить"
    }
  },
  en: {
    layout: {
      eyebrow: "Admin",
      organization: "Organization",
      payments: "Payments",
      schedule: "Schedule",
      site: "Open site",
      title: "StarVedas management"
    },
    organization: {
      bankDetails: "Bank details for the offer",
      cashboxDetails: "Online cash register details",
      clientEmail: "Client email",
      clientPhone: "Client phone",
      directorName: "Individual entrepreneur or director full name",
      legalAddress: "Legal address",
      legalName: "Full legal name",
      officialTelegram: "Telegram or official channel",
      postalAddress: "Postal address",
      publicData: "Public data",
      publicLead:
        "These details are used in the footer, contacts, offer, privacy policy and personal data consent.",
      recipientName: "Payment recipient name",
      save: "Save details",
      sellerType: "Seller type",
      settings: "Organization settings",
      sellerTypes: {
        IP: "Individual entrepreneur",
        OOO: "LLC",
        OTHER: "Other",
        SELF_EMPLOYED: "Self-employed"
      },
      supportHours: "Support hours",
      labels: {
        email: "Email",
        inn: "Tax ID",
        operator: "Provider",
        ogrn: "Registration number",
        phone: "Phone",
        telegram: "Telegram"
      }
    },
    payments: {
      envTitle: "Environment variables for keys",
      lead: "Enable or disable the payment methods available to the client at checkout.",
      providers: "Payment methods",
      save: "Save",
      secretWarning:
        "Secret keys are not stored in the admin panel or repository. Add them only to local .env or Dokploy secrets/env.",
      title: "Payment settings"
    },
    schedule: {
      activeSchedule: "Active schedule",
      activeEmpty:
        "No active schedule was found. Create a new publication and mark it active.",
      add: "Add schedule",
      all: "All schedules",
      body: "Schedule text",
      bodyPlaceholder:
        "Add dates, ceremony names and important participation terms.",
      month: "Month",
      monthPlaceholder: "June 2026",
      publish: "Publish as the active schedule",
      save: "Save",
      text: "Text",
      title: "Title",
      titlePlaceholder: "Ceremony schedule for June",
      update: "Update"
    }
  },
  hi: {
    layout: {
      eyebrow: "एडमिन",
      organization: "संगठन",
      payments: "भुगतान",
      schedule: "कार्यक्रम",
      site: "साइट खोलें",
      title: "StarVedas प्रबंधन"
    },
    organization: {
      bankDetails: "ऑफर के लिए बैंक विवरण",
      cashboxDetails: "ऑनलाइन कैश रजिस्टर विवरण",
      clientEmail: "ग्राहक email",
      clientPhone: "ग्राहक फोन",
      directorName: "उद्यमी या निदेशक का पूरा नाम",
      legalAddress: "कानूनी पता",
      legalName: "पूरा कानूनी नाम",
      officialTelegram: "Telegram या आधिकारिक चैनल",
      postalAddress: "डाक पता",
      publicData: "सार्वजनिक डेटा",
      publicLead:
        "ये डेटा साइट के footer, संपर्क, ऑफर, गोपनीयता नीति और व्यक्तिगत डेटा सहमति में उपयोग होते हैं.",
      recipientName: "भुगतान प्राप्तकर्ता का नाम",
      save: "डेटा सहेजें",
      sellerType: "विक्रेता प्रकार",
      settings: "संगठन सेटिंग",
      sellerTypes: {
        IP: "व्यक्तिगत उद्यमी",
        OOO: "LLC",
        OTHER: "अन्य",
        SELF_EMPLOYED: "स्वरोजगार"
      },
      supportHours: "सहायता समय",
      labels: {
        email: "Email",
        inn: "कर पहचान संख्या",
        operator: "प्रदाता",
        ogrn: "पंजीकरण संख्या",
        phone: "फोन",
        telegram: "Telegram"
      }
    },
    payments: {
      envTitle: "कुंजियों के लिए environment variables",
      lead: "checkout पर ग्राहक को दिखने वाली भुगतान विधियों को चालू या बंद करें.",
      providers: "भुगतान विधियाँ",
      save: "सहेजें",
      secretWarning:
        "Secret keys admin panel या repository में नहीं रखे जाते. उन्हें केवल local .env या Dokploy secrets/env में जोड़ें.",
      title: "भुगतान सेटिंग"
    },
    schedule: {
      activeSchedule: "सक्रिय कार्यक्रम",
      activeEmpty:
        "सक्रिय कार्यक्रम नहीं मिला. नया प्रकाशन बनाएं और उसे सक्रिय करें.",
      add: "कार्यक्रम जोड़ें",
      all: "सभी कार्यक्रम",
      body: "कार्यक्रम का पाठ",
      bodyPlaceholder:
        "तारीखें, समारोहों के नाम और भागीदारी की महत्वपूर्ण शर्तें जोड़ें.",
      month: "माह",
      monthPlaceholder: "जून 2026",
      publish: "सक्रिय कार्यक्रम के रूप में प्रकाशित करें",
      save: "सहेजें",
      text: "टेक्स्ट",
      title: "शीर्षक",
      titlePlaceholder: "जून के समारोहों का कार्यक्रम",
      update: "अपडेट करें"
    }
  }
};

export function getAdminCopy(locale: string | null | undefined) {
  return copies[normalizeLocale(locale)];
}
