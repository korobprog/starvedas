import { normalizeLocale, type Locale } from "@/i18n/config";

type ContactsCopy = {
  actions: {
    privacy: string;
    signup: string;
  };
  lead: string;
  pageTitle: string;
  labels: {
    address: string;
    email: string;
    inn: string;
    ogrn: string;
    operator: string;
    phone: string;
    support: string;
    telegram: string;
  };
};

const copies: Record<Locale, ContactsCopy> = {
  ru: {
    actions: {
      privacy: "Политика",
      signup: "Записаться"
    },
    lead: "По вопросам заявки, оплаты, возврата и обработки персональных данных используйте официальные контакты ниже.",
    pageTitle: "Контакты исполнителя",
    labels: {
      address: "Адрес",
      email: "Email",
      inn: "ИНН",
      ogrn: "ОГРН/ОГРНИП",
      operator: "Исполнитель",
      phone: "Телефон",
      support: "Поддержка",
      telegram: "Telegram"
    }
  },
  en: {
    actions: {
      privacy: "Privacy policy",
      signup: "Book now"
    },
    lead: "For questions about a request, payment, refund or personal data processing, use the official contacts below.",
    pageTitle: "Provider contacts",
    labels: {
      address: "Address",
      email: "Email",
      inn: "Tax ID",
      ogrn: "Registration number",
      operator: "Provider",
      phone: "Phone",
      support: "Support",
      telegram: "Telegram"
    }
  },
  hi: {
    actions: {
      privacy: "गोपनीयता नीति",
      signup: "बुक करें"
    },
    lead: "अनुरोध, भुगतान, वापसी या व्यक्तिगत डेटा प्रोसेसिंग से संबंधित प्रश्नों के लिए नीचे दिए गए आधिकारिक संपर्कों का उपयोग करें.",
    pageTitle: "प्रदाता के संपर्क",
    labels: {
      address: "पता",
      email: "Email",
      inn: "कर पहचान संख्या",
      ogrn: "पंजीकरण संख्या",
      operator: "प्रदाता",
      phone: "फोन",
      support: "सहायता",
      telegram: "Telegram"
    }
  }
};

export function getContactsCopy(locale: string | null | undefined) {
  return copies[normalizeLocale(locale)];
}
