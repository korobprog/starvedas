import { normalizeLocale, type Locale } from "@/i18n/config";

type ConsentCopy = {
  actions: {
    form: string;
    privacy: string;
  };
  lead: string;
  pageTitle: string;
  sections: Array<{
    body: string;
    title: string;
  }>;
};

const copies: Record<Locale, ConsentCopy> = {
  ru: {
    actions: {
      form: "Перейти к форме",
      privacy: "Политика"
    },
    lead: "Отправляя заявку на сайте starvedas.ru или chintamanidhama.ru, клиент подтверждает согласие на обработку данных, необходимых для связи, оформления заказа и организации участия в выбранной церемонии.",
    pageTitle: "Согласие на обработку персональных данных",
    sections: [
      {
        title: "Оператор",
        body: "Оператор персональных данных: {{seller}}, ИНН {{inn}}, ОГРН/ОГРНИП {{ogrnip}}."
      },
      {
        title: "Состав данных",
        body: "Обрабатываются имя заказчика, контакты, выбранные услуга и куратор, количество участников, список участников и технические данные заявки."
      },
      {
        title: "Цели обработки",
        body: "Данные нужны для приема заявки, расчета суммы, связи с клиентом, подтверждения оплаты, передачи заявки куратору и исполнения обязательств по заказу."
      },
      {
        title: "Срок и отзыв согласия",
        body: "Согласие действует до достижения целей обработки или до отзыва согласия, если дальнейшая обработка не требуется по закону. Отозвать согласие можно по адресу {{email}}."
      }
    ]
  },
  en: {
    actions: {
      form: "Go to form",
      privacy: "Privacy policy"
    },
    lead: "By submitting a request on starvedas.ru or chintamanidhama.ru, the client confirms consent to process data required for communication, order processing and organizing participation in the selected ceremony.",
    pageTitle: "Personal data consent",
    sections: [
      {
        title: "Operator",
        body: "Personal data operator: {{seller}}, Tax ID {{inn}}, registration number {{ogrnip}}."
      },
      {
        title: "Data scope",
        body: "Processed data includes customer name, contacts, selected service and curator, participant count, participant list and technical request data."
      },
      {
        title: "Processing purposes",
        body: "The data is needed to receive the request, calculate the amount, contact the client, confirm payment, transfer the request to the curator and fulfill order obligations."
      },
      {
        title: "Term and withdrawal",
        body: "Consent is valid until processing purposes are achieved or until consent is withdrawn, unless further processing is required by law. Consent can be withdrawn by email: {{email}}."
      }
    ]
  },
  hi: {
    actions: {
      form: "फ़ॉर्म पर जाएँ",
      privacy: "गोपनीयता नीति"
    },
    lead: "साइट starvedas.ru या chintamanidhama.ru पर अनुरोध भेजकर, ग्राहक संचार, ऑर्डर प्रसंस्करण और चुने गए समारोह में भागीदारी के संगठन के लिए आवश्यक डेटा प्रोसेस करने की सहमति देता है.",
    pageTitle: "व्यक्तिगत डेटा सहमति",
    sections: [
      {
        title: "ऑपरेटर",
        body: "व्यक्तिगत डेटा ऑपरेटर: {{seller}}, कर पहचान संख्या {{inn}}, पंजीकरण संख्या {{ogrnip}}."
      },
      {
        title: "डेटा का दायरा",
        body: "प्रोसेस किया जाने वाला डेटा ग्राहक का नाम, संपर्क, चुनी गई सेवा और क्यूरेटर, प्रतिभागियों की संख्या, सूची और तकनीकी अनुरोध डेटा शामिल करता है."
      },
      {
        title: "प्रोसेसिंग के उद्देश्य",
        body: "डेटा अनुरोध प्राप्त करने, राशि की गणना करने, ग्राहक से संपर्क करने, भुगतान की पुष्टि करने, अनुरोध को क्यूरेटर तक भेजने और ऑर्डर दायित्वों को पूरा करने के लिए आवश्यक है."
      },
      {
        title: "अवधि और वापसी",
        body: "सहमति तब तक मान्य है जब तक प्रोसेसिंग के उद्देश्य पूरे न हो जाएँ या सहमति वापस न ले ली जाए, बशर्ते कानून द्वारा आगे की प्रोसेसिंग आवश्यक न हो. सहमति को {{email}} पर ईमेल करके वापस लिया जा सकता है."
      }
    ]
  }
};

export function getConsentCopy(locale: string | null | undefined) {
  return copies[normalizeLocale(locale)];
}
