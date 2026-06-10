import { normalizeLocale, type Locale } from "@/i18n/config";

type OfferCopy = {
  actions: {
    refund: string;
    signup: string;
  };
  lead: string;
  pageTitle: string;
  sections: {
    order: {
      body1: string;
      body2: string;
      title: string;
    };
    payment: {
      body: string;
      title: string;
    };
    provider: {
      body: string;
      recipient: string;
      title: string;
    };
    refund: {
      body: string;
      title: string;
    };
    services: {
      body: string;
      title: string;
    };
    subject: {
      body1: string;
      body2: string;
      title: string;
    };
  };
};

const copies: Record<Locale, OfferCopy> = {
  ru: {
    actions: {
      refund: "Условия возврата",
      signup: "Оформить заявку"
    },
    lead: "Настоящая страница фиксирует базовые условия заказа на сайте starvedas.ru. Перед запуском приема боевых оплат текст должен быть дополнительно проверен ответственным лицом или юристом.",
    pageTitle: "Публичная оферта",
    sections: {
      order: {
        title: "4. Оформление заказа",
        body1:
          "Клиент выбирает куратора, церемонию, указывает количество и список участников, контактные данные и подтверждает согласие на обработку персональных данных.",
        body2:
          "Заказ получает статус «Ожидает оплаты» до подтверждения платежа платежной системой."
      },
      payment: {
        title: "5. Оплата и подтверждение участия",
        body: "Оплата производится на защищенной странице платежной системы. После успешной оплаты клиент получает подтверждение через указанный контактный канал или от выбранного куратора."
      },
      provider: {
        title: "1. Исполнитель",
        body: "Исполнитель: {{seller}}, ИНН {{inn}}, ОГРН/ОГРНИП {{ogrnip}}. Контакт для обращений: {{email}}.",
        recipient: "Получатель платежа: {{name}}."
      },
      refund: {
        title: "6. Возврат",
        body: "Возвраты рассматриваются по правилам, опубликованным на странице условий возврата, с учетом статуса заявки и фактически понесенных расходов исполнителя."
      },
      services: {
        title: "3. Услуги и цены",
        body: "Актуальная сумма показывается клиенту в форме перед оплатой и повторно рассчитывается backend на основании выбранной услуги и количества участников."
      },
      subject: {
        title: "2. Предмет оферты",
        body1:
          "Исполнитель оказывает услуги по организации участия клиента в выбранной церемонии, включая прием заявки, расчет стоимости, передачу данных куратору и подтверждение участия после оплаты.",
        body2:
          "Сайт не обещает гарантированный духовный, материальный или иной результат. Услуга описывает организацию участия в церемонии."
      }
    }
  },
  en: {
    actions: {
      refund: "Refund terms",
      signup: "Submit a request"
    },
    lead: "This page sets the basic order terms on starvedas.ru. Before live payments start, the text must be additionally checked by the responsible person or a lawyer.",
    pageTitle: "Public offer",
    sections: {
      order: {
        title: "4. Order placement",
        body1:
          "The client chooses a curator and ceremony, provides the participant count and list, contact details and confirms consent to personal data processing.",
        body2:
          'The order receives the status "Pending payment" until the payment is confirmed by the payment system.'
      },
      payment: {
        title: "5. Payment and participation confirmation",
        body: "Payment is made on the secure page of the payment system. After successful payment, the client receives confirmation through the chosen contact channel or from the selected curator."
      },
      provider: {
        title: "1. Provider",
        body: "Provider: {{seller}}, Tax ID {{inn}}, registration number {{ogrnip}}. Contact: {{email}}.",
        recipient: "Payment recipient: {{name}}."
      },
      refund: {
        title: "6. Refund",
        body: "Refunds are reviewed according to the rules published on the refund terms page, considering request status and actual provider expenses."
      },
      services: {
        title: "3. Services and prices",
        body: "The current amount is shown to the client in the form before payment and is recalculated by the backend based on the selected service and participant count."
      },
      subject: {
        title: "2. Subject of the offer",
        body1:
          "The provider organizes the client's participation in the selected ceremony, including request intake, price calculation, transfer of data to the curator and participation confirmation after payment.",
        body2:
          "The site does not promise a guaranteed spiritual, material or other result. The service describes the organization of participation in a ceremony."
      }
    }
  },
  hi: {
    actions: {
      refund: "वापसी शर्तें",
      signup: "अनुरोध भेजें"
    },
    lead: "यह पृष्ठ starvedas.ru पर ऑर्डर की मूल शर्तें निर्धारित करता है. लाइव भुगतान शुरू होने से पहले इस पाठ की जिम्मेदार व्यक्ति या वकील द्वारा अतिरिक्त जाँच की जानी चाहिए.",
    pageTitle: "सार्वजनिक ऑफ़र",
    sections: {
      order: {
        title: "4. ऑर्डर देना",
        body1:
          "ग्राहक क्यूरेटर और समारोह चुनता है, प्रतिभागियों की संख्या और सूची, संपर्क विवरण प्रदान करता है और व्यक्तिगत डेटा प्रोसेसिंग की सहमति देता है.",
        body2:
          'भुगतान प्रणाली द्वारा भुगतान की पुष्टि होने तक ऑर्डर "भुगतान की प्रतीक्षा" स्थिति में रहता है.'
      },
      payment: {
        title: "5. भुगतान और भागीदारी पुष्टि",
        body: "भुगतान भुगतान प्रणाली के सुरक्षित पृष्ठ पर किया जाता है. सफल भुगतान के बाद ग्राहक को चुने गए संपर्क चैनल या क्यूरेटर से पुष्टि मिलती है."
      },
      provider: {
        title: "1. प्रदाता",
        body: "प्रदाता: {{seller}}, कर पहचान संख्या {{inn}}, पंजीकरण संख्या {{ogrnip}}. संपर्क: {{email}}.",
        recipient: "भुगतान प्राप्तकर्ता: {{name}}."
      },
      refund: {
        title: "6. वापसी",
        body: "वापसी की समीक्षा वापसी शर्तों पृष्ठ पर प्रकाशित नियमों के अनुसार, अनुरोध की स्थिति और प्रदाता के वास्तविक खर्चों को ध्यान में रखते हुए की जाती है."
      },
      services: {
        title: "3. सेवाएँ और कीमतें",
        body: "वर्तमान राशि भुगतान से पहले फ़ॉर्म में दिखाई जाती है और चयनित सेवा तथा प्रतिभागी संख्या के आधार पर backend द्वारा पुनर्गणना की जाती है."
      },
      subject: {
        title: "2. ऑफ़र का विषय",
        body1:
          "प्रदाता चयनित समारोह में ग्राहक की भागीदारी को व्यवस्थित करता है, जिसमें अनुरोध लेना, कीमत की गणना, डेटा क्यूरेटर को भेजना और भुगतान के बाद भागीदारी की पुष्टि शामिल है.",
        body2:
          "साइट किसी गारंटीकृत आध्यात्मिक, भौतिक या अन्य परिणाम का वादा नहीं करती. सेवा समारोह में भागीदारी के संगठन का वर्णन करती है."
      }
    }
  }
};

export function getOfferCopy(locale: string | null | undefined) {
  return copies[normalizeLocale(locale)];
}
