import { normalizeLocale, type Locale } from "@/i18n/config";
import { applySiteBrandToCopy } from "@/lib/site-branding";

type SignupCopy = {
  actions: {
    addParticipant: string;
    back: string;
    continue: string;
    creating: string;
    pay: string;
    contacts: string;
    removeParticipant: string;
  };
  contactWarning: string;
  documentsAria: string;
  error: string;
  fields: {
    customerName: string;
    email: string;
    participantCount: string;
    participantFirstName: string;
    participantLastName: string;
    participantList: string;
    participantNumber: string;
    primaryParticipant: string;
    phone: string;
    phoneCountry: string;
    telegram: string;
  };
  legend: {
    ceremony: string;
    contacts: string;
    curator: string;
    participants: string;
  };
  payment: {
    providerLabel: string;
    providerUnavailable: string;
    text: string;
    title: string;
  };
  progressAria: string;
  review: {
    amount: string;
    ceremony: string;
    curator: string;
    participants: string;
    title: string;
  };
  consent: {
    phrase: string;
    personalData: string;
    privacy: string;
    payment: string;
    offer: string;
    refund: string;
    mailing: string;
  };
  success: {
    title: string;
    text: string;
  };
  warnings: {
    countMismatch: string;
    incompleteParticipants: string;
    invalidPhone: string;
  };
  placeholders: {
    participants: string;
    telegram: string;
    phone: string;
    email: string;
  };
};

const copies: Record<Locale, SignupCopy> = {
  ru: {
    actions: {
      addParticipant: "Добавить участника",
      back: "Назад",
      continue: "Продолжить",
      creating: "Создаем заказ...",
      pay: "Оплатить заказ",
      contacts: "Контакты",
      removeParticipant: "Удалить"
    },
    contactWarning:
      "Укажите хотя бы один контакт: Telegram, телефон или email.",
    documentsAria: "Документы перед оплатой",
    error: "Не удалось создать заказ. Проверьте данные или попробуйте позже.",
    fields: {
      customerName: "Имя и фамилия заказчика",
      email: "Email",
      participantCount: "Количество участников",
      participantFirstName: "Имя",
      participantLastName: "Фамилия",
      participantList: "Список участников",
      participantNumber: "Участник {{number}}",
      primaryParticipant: "Участник 1 (заказчик)",
      phone: "Телефон",
      phoneCountry: "Страна телефона",
      telegram: "Telegram"
    },
    legend: {
      ceremony: "Выберите церемонию",
      contacts: "Контактные данные",
      curator: "Выберите куратора",
      participants: "Участники"
    },
    payment: {
      providerLabel: "Способ оплаты",
      providerUnavailable:
        "Сейчас способы оплаты выключены. Администратор должен включить оплату в админке.",
      text: "После создания заказа сайт подготовит переход к платежной системе или покажет реквизиты для резервной оплаты. Ручной перевод будет ожидать проверки оплаты.",
      title: "Оплата заказа"
    },
    progressAria: "Шаги записи",
    review: {
      amount: "Итоговая сумма",
      ceremony: "Церемония",
      curator: "Куратор",
      participants: "Участников",
      title: "Проверьте заказ"
    },
    consent: {
      phrase: "Я согласен с",
      personalData: "обработкой персональных данных",
      privacy: "политикой конфиденциальности",
      payment: "условиями оплаты",
      offer: "публичной офертой",
      refund: "условиями возврата",
      mailing:
        "Я согласен получать информационные и организационные рассылки StarVedas."
    },
    success: {
      title: "Спасибо! Заказ оформлен.",
      text: "Заказ #{{orderNumber}} создан на сумму {{amount}}. Проверьте информацию куратора и перейдите к оплате."
    },
    warnings: {
      countMismatch:
        "Количество строк в списке сейчас: {{count}}. Укажите столько строк, сколько участников выбрано.",
      incompleteParticipants:
        "Заполните имя и фамилию для каждого участника. Сейчас заполнено: {{count}}.",
      invalidPhone: "Введите корректный телефон для выбранной страны."
    },
    placeholders: {
      participants:
        "Первая запись: тот, кто оформляет заказ. Нажмите плюс, чтобы добавить еще участника. Тариф считается за каждого заполненного участника.",
      telegram: "@username",
      phone: "(777) ...",
      email: "mail@example.com"
    }
  },
  en: {
    actions: {
      addParticipant: "Add participant",
      back: "Back",
      continue: "Continue",
      creating: "Creating order...",
      pay: "Pay order",
      contacts: "Contacts",
      removeParticipant: "Remove"
    },
    contactWarning: "Provide at least one contact: Telegram, phone or email.",
    documentsAria: "Documents before payment",
    error: "Could not create the order. Check the details or try again later.",
    fields: {
      customerName: "Customer full name",
      email: "Email",
      participantCount: "Participant count",
      participantFirstName: "First name",
      participantLastName: "Last name",
      participantList: "Participant list",
      participantNumber: "Participant {{number}}",
      primaryParticipant: "Participant 1 (customer)",
      phone: "Phone",
      phoneCountry: "Phone country",
      telegram: "Telegram"
    },
    legend: {
      ceremony: "Choose a ceremony",
      contacts: "Contact details",
      curator: "Choose a curator",
      participants: "Participants"
    },
    payment: {
      providerLabel: "Payment method",
      providerUnavailable:
        "Payment methods are disabled now. An administrator must enable checkout in the admin panel.",
      text: "After creating the order, the site will prepare the selected payment system transition or show manual payment details. A manual transfer will wait for payment verification.",
      title: "Order payment"
    },
    progressAria: "Signup steps",
    review: {
      amount: "Total amount",
      ceremony: "Ceremony",
      curator: "Curator",
      participants: "Participants",
      title: "Review the order"
    },
    consent: {
      phrase: "I agree with",
      personalData: "personal data processing",
      privacy: "the privacy policy",
      payment: "the payment terms",
      offer: "the public offer",
      refund: "the refund terms",
      mailing:
        "I agree to receive informational and organizational StarVedas mailings."
    },
    success: {
      title: "Thank you! The order is created.",
      text: "Order #{{orderNumber}} was created for {{amount}}. Check the curator information and proceed to payment."
    },
    warnings: {
      countMismatch:
        "Current number of lines in the list: {{count}}. Add the same number of lines as selected participants.",
      incompleteParticipants:
        "Fill in first and last name for each participant. Completed: {{count}}.",
      invalidPhone: "Enter a valid phone for the selected country."
    },
    placeholders: {
      participants:
        "First participant: the person placing the order. Click plus to add another participant. The price is counted for each completed participant.",
      telegram: "@username",
      phone: "+{{code}}...",
      email: "mail@example.com"
    }
  },
  hi: {
    actions: {
      addParticipant: "प्रतिभागी जोड़ें",
      back: "वापस",
      continue: "जारी रखें",
      creating: "ऑर्डर बनाया जा रहा है...",
      pay: "ऑर्डर का भुगतान करें",
      contacts: "संपर्क",
      removeParticipant: "हटाएँ"
    },
    contactWarning: "कम से कम एक संपर्क दें: Telegram, फोन या email.",
    documentsAria: "भुगतान से पहले दस्तावेज़",
    error: "ऑर्डर नहीं बन सका. डेटा जाँचें या बाद में फिर कोशिश करें.",
    fields: {
      customerName: "ग्राहक का पूरा नाम",
      email: "Email",
      participantCount: "प्रतिभागियों की संख्या",
      participantFirstName: "नाम",
      participantLastName: "उपनाम",
      participantList: "प्रतिभागी सूची",
      participantNumber: "प्रतिभागी {{number}}",
      primaryParticipant: "प्रतिभागी 1 (ग्राहक)",
      phone: "फोन",
      phoneCountry: "फोन का देश",
      telegram: "Telegram"
    },
    legend: {
      ceremony: "समारोह चुनें",
      contacts: "संपर्क विवरण",
      curator: "क्यूरेटर चुनें",
      participants: "प्रतिभागी"
    },
    payment: {
      providerLabel: "भुगतान विधि",
      providerUnavailable:
        "भुगतान विधियाँ अभी बंद हैं. Admin panel में checkout चालू करना होगा.",
      text: "ऑर्डर बनाने के बाद साइट चुनी गई भुगतान प्रणाली का transition तैयार करेगी या manual payment details दिखाएगी. Manual transfer payment verification की प्रतीक्षा करेगा.",
      title: "ऑर्डर भुगतान"
    },
    progressAria: "बुकिंग चरण",
    review: {
      amount: "कुल राशि",
      ceremony: "समारोह",
      curator: "क्यूरेटर",
      participants: "प्रतिभागी",
      title: "ऑर्डर जाँचें"
    },
    consent: {
      phrase: "मैं सहमत हूँ",
      personalData: "व्यक्तिगत डेटा प्रोसेसिंग",
      privacy: "गोपनीयता नीति",
      payment: "भुगतान शर्तें",
      offer: "सार्वजनिक ऑफ़र",
      refund: "वापसी शर्तें",
      mailing:
        "मैं StarVedas की सूचना और संगठनात्मक mailings प्राप्त करने के लिए सहमत हूँ."
    },
    success: {
      title: "धन्यवाद! ऑर्डर बन गया है.",
      text: "ऑर्डर #{{orderNumber}} {{amount}} के लिए बनाया गया है. क्यूरेटर जानकारी जाँचें और भुगतान पर जाएँ."
    },
    warnings: {
      countMismatch:
        "सूची में वर्तमान पंक्तियों की संख्या: {{count}}. चयनित प्रतिभागियों के बराबर पंक्तियाँ जोड़ें.",
      incompleteParticipants:
        "हर प्रतिभागी का नाम और उपनाम भरें. पूरे भरे गए: {{count}}.",
      invalidPhone: "चुने गए देश के लिए सही फोन नंबर डालें."
    },
    placeholders: {
      participants:
        "पहला प्रतिभागी: ऑर्डर करने वाला व्यक्ति. दूसरा प्रतिभागी जोड़ने के लिए प्लस दबाएँ. हर भरे गए प्रतिभागी के लिए कीमत गिनी जाएगी.",
      telegram: "@username",
      phone: "+{{code}}...",
      email: "mail@example.com"
    }
  }
};

export function getSignupCopy(
  locale: string | null | undefined,
  brandName?: string
) {
  return applySiteBrandToCopy(copies[normalizeLocale(locale)], brandName);
}
