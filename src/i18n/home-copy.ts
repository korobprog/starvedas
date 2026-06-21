import { normalizeLocale, type Locale } from "@/i18n/config";

export type HomeCopy = {
  brandTagline: string;
  nav: {
    articles: string;
    cabinet: string;
    faq: string;
    close: string;
    open: string;
    aria: string;
    schedule: string;
    services: string;
    signup: string;
  };
  hero: {
    eyebrow: string;
    lead: string;
    primaryCta: string;
    secondaryCta: string;
    title: string;
  };
  trust: {
    title: string;
    items: Array<{ text: string; title: string }>;
  };
  sections: {
    services: { title: string; lead: string };
    participation: { title: string; lead: string };
    brahman: { eyebrow: string; title: string; text: string };
    schedule: { title: string; empty: string; cta: string };
    signup: { title: string; lead: string };
    faq: {
      title: string;
      paymentQuestion: string;
      paymentAnswer: string;
      participantsQuestion: string;
      participantsAnswer: string;
    };
  };
  footer: {
    contacts: string;
    detailsPrefix: string;
    methods: string;
    offer: string;
    payment: string;
    personalData: string;
    privacy: string;
    refund: string;
    security: string;
  };
};

const copies: Record<Locale, HomeCopy> = {
  ru: {
    brandTagline: "Запись на церемонии",
    nav: {
      services: "Услуги",
      schedule: "Расписание",
      signup: "Записаться",
      cabinet: "Кабинет",
      articles: "Статьи",
      faq: "Вопросы",
      open: "Открыть меню",
      close: "Свернуть меню",
      aria: "Основная навигация"
    },
    hero: {
      eyebrow: "Осознанное участие в традиции",
      title: "Запишитесь на ягью, пуджу или абхишеку с понятным сопровождением",
      lead: "StarVedas помогает выбрать церемонию, указать участников, получить подтверждение и безопасно перейти к оплате.",
      primaryCta: "Записаться",
      secondaryCta: "Расписание"
    },
    trust: {
      title: "Почему удобно участвовать",
      items: [
        {
          title: "Понятная запись",
          text: "Пошаговый путь от выбора церемонии до оплаты."
        },
        {
          title: "Куратор по ссылке",
          text: "Реферальная ссылка закрепляет заявку за нужным куратором."
        },
        {
          title: "Безопасная оплата",
          text: "Платеж проходит на стороне платежной системы."
        }
      ]
    },
    sections: {
      services: {
        title: "Что можно заказать",
        lead: "Здесь собраны доступные форматы участия: абонемент на месяц, марафон, отдельный обряд, абхишека и ягья. Выберите подходящий вариант и укажите участников в форме записи."
      },
      participation: {
        title: "Как проходит участие",
        lead: "Клиент видит только один простой путь, без внутренней сложности проекта."
      },
      brahman: {
        eyebrow: "Наш Брахман",
        title: "Проводник традиции и знания Бхагавад-Гиты",
        text: "Последние 10 лет он полностью посвятил себя распространению знаний Бхагавад-Гиты и проведению Ягий. Ему помогают брахманы из его семьи и Джай Мангал дас, русскоязычный брахман, проповедник, преданный, вайшнав."
      },
      schedule: {
        title: "Расписание",
        empty:
          "Актуальное расписание скоро появится. Если вы хотите участвовать в ближайшей церемонии, оставьте заявку через форму.",
        cta: "Записаться на ближайшую церемонию"
      },
      signup: {
        title: "Записаться",
        lead: "Пошаговая форма: церемония, участники, контакты, проверка заказа и оплата. Куратор определяется по реферальной ссылке."
      },
      faq: {
        title: "Вопросы и ответы",
        paymentQuestion: "Где проходит оплата?",
        paymentAnswer:
          "Оплата будет проходить на защищенной странице платежной системы. Сайт не хранит данные банковских карт.",
        participantsQuestion: "Можно ли записать несколько участников?",
        participantsAnswer:
          "Да. Для услуг с несколькими участниками форма попросит указать количество и список участников, каждый на новой строке."
      }
    },
    footer: {
      contacts: "Контакты",
      detailsPrefix: "Контакты:",
      methods: "Способы оплаты",
      offer: "Оферта",
      payment: "Оплата",
      personalData: "Согласие на обработку данных",
      privacy: "Политика конфиденциальности",
      refund: "Возврат",
      security: "Безопасность платежей"
    }
  },
  en: {
    brandTagline: "Ceremony booking",
    nav: {
      services: "Services",
      schedule: "Schedule",
      signup: "Book now",
      cabinet: "Account",
      articles: "Articles",
      faq: "Questions",
      open: "Open menu",
      close: "Close menu",
      aria: "Primary navigation"
    },
    hero: {
      eyebrow: "Mindful participation in tradition",
      title: "Book a yajna, puja, or abhisheka with clear guidance",
      lead: "StarVedas helps you choose a ceremony, add participants, get confirmation, and safely proceed to payment.",
      primaryCta: "Book now",
      secondaryCta: "Schedule"
    },
    trust: {
      title: "Why participation is convenient",
      items: [
        {
          title: "Clear booking",
          text: "A step-by-step path from ceremony choice to payment."
        },
        {
          title: "Referral curator",
          text: "A referral link assigns the request to the right curator."
        },
        {
          title: "Secure payment",
          text: "Payment happens on the payment system side."
        }
      ]
    },
    sections: {
      services: {
        title: "What you can order",
        lead: "Choose from the available participation formats: monthly pass, marathon, single rite, abhisheka, or yagya. Pick the option that suits you and add participants in the signup form."
      },
      participation: {
        title: "How participation works",
        lead: "The client sees one simple path, without the internal complexity of the project."
      },
      brahman: {
        eyebrow: "Our Brahman",
        title: "Guide of tradition and Bhagavad Gita knowledge",
        text: "For the last 10 years he has fully dedicated himself to sharing the knowledge of the Bhagavad Gita and conducting yagyas. He is assisted by brahmans from his family and Jaya Mangal das, a Russian-speaking brahman, preacher, devotee and Vaishnava."
      },
      schedule: {
        title: "Schedule",
        empty:
          "The current schedule will appear soon. If you want to join an upcoming ceremony, send a request through the form.",
        cta: "Sign up for the nearest ceremony"
      },
      signup: {
        title: "Book now",
        lead: "Step-by-step form: ceremony, participants, contacts, order review, and payment. The curator is assigned by referral link."
      },
      faq: {
        title: "Questions and answers",
        paymentQuestion: "Where does payment happen?",
        paymentAnswer:
          "Payment will happen on the secure payment system page. The site does not store bank card data.",
        participantsQuestion: "Can I register several participants?",
        participantsAnswer:
          "Yes. For services with several participants, the form will ask for the count and the participant list, one person per line."
      }
    },
    footer: {
      contacts: "Contacts",
      detailsPrefix: "Contacts:",
      methods: "Payment methods",
      offer: "Offer",
      payment: "Payment",
      personalData: "Personal data consent",
      privacy: "Privacy policy",
      refund: "Refund",
      security: "Payment security"
    }
  },
  hi: {
    brandTagline: "समारोह बुकिंग",
    nav: {
      services: "सेवाएँ",
      schedule: "कार्यक्रम",
      signup: "बुक करें",
      cabinet: "कैबिनेट",
      articles: "लेख",
      faq: "प्रश्न",
      open: "मेनू खोलें",
      close: "मेनू बंद करें",
      aria: "मुख्य नेविगेशन"
    },
    hero: {
      eyebrow: "परंपरा में जागरूक भागीदारी",
      title: "स्पष्ट मार्गदर्शन के साथ यज्ञ, पूजा या अभिषेक बुक करें",
      lead: "StarVedas आपको समारोह चुनने, प्रतिभागी जोड़ने, पुष्टि पाने और सुरक्षित रूप से भुगतान तक ले जाने में मदद करता है.",
      primaryCta: "बुक करें",
      secondaryCta: "कार्यक्रम"
    },
    trust: {
      title: "भागीदारी सुविधाजनक क्यों है",
      items: [
        {
          title: "स्पष्ट बुकिंग",
          text: "क्यूरेटर चयन से भुगतान तक चरणबद्ध मार्ग."
        },
        {
          title: "क्यूरेटर पास हैं",
          text: "आप उस व्यक्ति को चुनते हैं जो अनुरोध का मार्गदर्शन करता है."
        },
        {
          title: "सुरक्षित भुगतान",
          text: "भुगतान भुगतान प्रणाली की तरफ होता है."
        }
      ]
    },
    sections: {
      services: {
        title: "आप क्या ऑर्डर कर सकते हैं",
        lead: "उपलब्ध सहभागिता प्रारूप चुनें: मासिक पास, मैराथन, एकल अनुष्ठान, अभिषेक या यज्ञ। उपयुक्त विकल्प चुनें और पंजीकरण फ़ॉर्म में प्रतिभागियों को जोड़ें."
      },
      participation: {
        title: "भागीदारी कैसे होती है",
        lead: "ग्राहक केवल एक सरल रास्ता देखता है, बिना परियोजना की आंतरिक जटिलता के."
      },
      brahman: {
        eyebrow: "हमारे ब्राह्मण",
        title: "परंपरा और भगवद गीता ज्ञान के मार्गदर्शक",
        text: "पिछले 10 वर्षों से उन्होंने भगवद गीता के ज्ञान को साझा करने और यज्ञ करने के लिए स्वयं को समर्पित किया है. उनके परिवार के ब्राह्मण और जय मंगल दास, एक रूसी भाषी ब्राह्मण, उपदेशक, भक्त और वैष्णव, उनकी सहायता करते हैं."
      },
      schedule: {
        title: "कार्यक्रम",
        empty:
          "वर्तमान कार्यक्रम जल्द दिखाई देगा. यदि आप आने वाले समारोह में भाग लेना चाहते हैं, तो फॉर्म के माध्यम से अनुरोध भेजें.",
        cta: "निकटतम समारोह के लिए बुक करें"
      },
      signup: {
        title: "बुक करें",
        lead: "एक चरण-दर-चरण फ़ॉर्म अलग चरण के रूप में जोड़ा जाएगा: क्यूरेटर, समारोह, प्रतिभागी, संपर्क, ऑर्डर समीक्षा और भुगतान."
      },
      faq: {
        title: "प्रश्न और उत्तर",
        paymentQuestion: "भुगतान कहाँ होता है?",
        paymentAnswer:
          "भुगतान सुरक्षित भुगतान प्रणाली पृष्ठ पर होगा. साइट बैंक कार्ड डेटा संग्रहीत नहीं करती.",
        participantsQuestion:
          "क्या मैं कई प्रतिभागियों को पंजीकृत कर सकता हूँ?",
        participantsAnswer:
          "हाँ. कई प्रतिभागियों वाली सेवाओं के लिए फ़ॉर्म संख्या और प्रतिभागियों की सूची मांगेगा, प्रति पंक्ति एक नाम."
      }
    },
    footer: {
      contacts: "संपर्क",
      detailsPrefix: "संपर्क:",
      methods: "भुगतान तरीके",
      offer: "ऑफ़र",
      payment: "भुगतान",
      personalData: "व्यक्तिगत डेटा सहमति",
      privacy: "गोपनीयता नीति",
      refund: "वापसी",
      security: "भुगतान सुरक्षा"
    }
  }
};

export function getHomeCopy(locale: string | null | undefined) {
  return copies[normalizeLocale(locale)];
}
