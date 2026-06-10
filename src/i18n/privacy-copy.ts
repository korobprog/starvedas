import { normalizeLocale, type Locale } from "@/i18n/config";

type PrivacyCopy = {
  actions: {
    contacts: string;
    signup: string;
  };
  lead: string;
  pageTitle: string;
  sections: Array<{
    body: string[];
    title: string;
  }>;
};

const copies: Record<Locale, PrivacyCopy> = {
  ru: {
    actions: {
      contacts: "Контакты",
      signup: "Вернуться к записи"
    },
    lead: "Документ описывает, какие персональные данные обрабатываются при оформлении заявки на сайте, зачем они нужны и как пользователь может обратиться к оператору.",
    pageTitle: "Политика конфиденциальности",
    sections: [
      {
        title: "1. Общие положения",
        body: [
          "Настоящая политика обработки персональных данных составлена в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» и определяет порядок обработки персональных данных на сайте starvedas.ru.",
          "Оператором персональных данных является {{seller}}. Политика применяется ко всей информации, которую оператор может получить о посетителях сайта и клиентах при оформлении заявки."
        ]
      },
      {
        title: "2. Какие данные обрабатываются",
        body: [
          "При оформлении заявки могут обрабатываться имя заказчика, Telegram, телефон, email, выбранный куратор, выбранная церемония, количество участников и список участников.",
          "Сайт не хранит данные банковских карт. Оплата проходит на защищенной странице платежной системы."
        ]
      },
      {
        title: "3. Цели обработки",
        body: [
          "Данные используются для приема заявки, связи с клиентом, организации участия в церемонии, подтверждения оплаты, исполнения договора и обработки обращений клиента.",
          "Контактные данные могут использоваться для отправки уведомлений по заявке через выбранный клиентом канал связи."
        ]
      },
      {
        title: "4. Передача третьим лицам",
        body: [
          "Персональные данные не передаются третьим лицам без законного основания или согласия клиента, кроме случаев, необходимых для исполнения заявки, приема оплаты и выполнения требований законодательства.",
          "Платежные данные обрабатываются платежной системой по ее правилам и политике конфиденциальности."
        ]
      },
      {
        title: "5. Права пользователя",
        body: [
          "Пользователь может запросить информацию об обработке персональных данных, уточнить данные, потребовать блокирования или удаления данных в случаях, предусмотренных законом.",
          "Отозвать согласие на обработку персональных данных можно письмом на email оператора."
        ]
      },
      {
        title: "6. Контакт оператора",
        body: [
          "По вопросам обработки персональных данных можно написать на {{email}}."
        ]
      }
    ]
  },
  en: {
    actions: {
      contacts: "Contacts",
      signup: "Back to signup"
    },
    lead: "This document explains what personal data is processed when a request is submitted on the site, why it is needed, and how the user can contact the operator.",
    pageTitle: "Privacy policy",
    sections: [
      {
        title: "1. General provisions",
        body: [
          'This personal data processing policy is prepared in accordance with Federal Law No. 152-FZ of 27.07.2006 "On Personal Data" and defines the personal data processing procedure on starvedas.ru.',
          "The personal data operator is {{seller}}. The policy applies to all information the operator may receive about site visitors and clients when a request is submitted."
        ]
      },
      {
        title: "2. What data is processed",
        body: [
          "When submitting a request, the customer's name, Telegram, phone, email, selected curator, selected ceremony, participant count and participant list may be processed.",
          "The site does not store bank card data. Payment takes place on the secure page of the payment system."
        ]
      },
      {
        title: "3. Processing purposes",
        body: [
          "Data is used to receive the request, contact the client, organize participation in the ceremony, confirm payment, fulfill the agreement and process client inquiries.",
          "Contact details may be used to send request notifications through the channel selected by the client."
        ]
      },
      {
        title: "4. Transfer to third parties",
        body: [
          "Personal data is not transferred to third parties without a legal basis or client consent, except where necessary to fulfill the request, accept payment and comply with legal requirements.",
          "Payment data is processed by the payment system according to its own rules and privacy policy."
        ]
      },
      {
        title: "5. User rights",
        body: [
          "The user may request information about personal data processing, clarify data and demand blocking or deletion in cases provided by law.",
          "Consent to personal data processing can be withdrawn by sending a message to the operator email."
        ]
      },
      {
        title: "6. Operator contact",
        body: ["For personal data processing questions, email {{email}}."]
      }
    ]
  },
  hi: {
    actions: {
      contacts: "संपर्क",
      signup: "बुकिंग पर वापस"
    },
    lead: "यह दस्तावेज़ बताता है कि साइट पर अनुरोध जमा करते समय कौन-सा व्यक्तिगत डेटा प्रोसेस किया जाता है, इसकी आवश्यकता क्यों है, और उपयोगकर्ता ऑपरेटर से कैसे संपर्क कर सकता है.",
    pageTitle: "गोपनीयता नीति",
    sections: [
      {
        title: "1. सामान्य प्रावधान",
        body: [
          'यह व्यक्तिगत डेटा प्रोसेसिंग नीति 27.07.2006 के संघीय कानून संख्या 152-FZ "व्यक्तिगत डेटा के बारे में" के अनुसार तैयार की गई है और starvedas.ru पर व्यक्तिगत डेटा प्रोसेसिंग प्रक्रिया को परिभाषित करती है.',
          "व्यक्तिगत डेटा ऑपरेटर {{seller}} है. यह नीति साइट विज़िटर और अनुरोध जमा करने वाले ग्राहकों के बारे में ऑपरेटर को मिल सकने वाली सभी जानकारी पर लागू होती है."
        ]
      },
      {
        title: "2. कौन-सा डेटा प्रोसेस होता है",
        body: [
          "अनुरोध जमा करते समय ग्राहक का नाम, Telegram, फोन, email, चुना हुआ क्यूरेटर, चुना हुआ समारोह, प्रतिभागियों की संख्या और सूची प्रोसेस की जा सकती है.",
          "साइट बैंक कार्ड डेटा संग्रहीत नहीं करती. भुगतान भुगतान प्रणाली के सुरक्षित पृष्ठ पर होता है."
        ]
      },
      {
        title: "3. प्रोसेसिंग के उद्देश्य",
        body: [
          "डेटा का उपयोग अनुरोध प्राप्त करने, ग्राहक से संपर्क करने, समारोह में भागीदारी व्यवस्थित करने, भुगतान पुष्टि करने, समझौता पूरा करने और ग्राहक पूछताछ संसाधित करने के लिए किया जाता है.",
          "संपर्क विवरण का उपयोग ग्राहक द्वारा चुने गए चैनल के माध्यम से अनुरोध सूचनाएँ भेजने के लिए किया जा सकता है."
        ]
      },
      {
        title: "4. तीसरे पक्ष को स्थानांतरण",
        body: [
          "कानूनी आधार या ग्राहक की सहमति के बिना व्यक्तिगत डेटा तीसरे पक्ष को स्थानांतरित नहीं किया जाता, सिवाय उन मामलों के जहाँ अनुरोध पूरा करने, भुगतान स्वीकार करने और कानूनी आवश्यकताओं का पालन करने के लिए यह आवश्यक हो.",
          "भुगतान डेटा भुगतान प्रणाली द्वारा उसके नियमों और गोपनीयता नीति के अनुसार संसाधित किया जाता है."
        ]
      },
      {
        title: "5. उपयोगकर्ता अधिकार",
        body: [
          "उपयोगकर्ता व्यक्तिगत डेटा प्रोसेसिंग के बारे में जानकारी मांग सकता है, डेटा स्पष्ट कर सकता है और कानून द्वारा निर्धारित मामलों में अवरोधन या हटाने की मांग कर सकता है.",
          "व्यक्तिगत डेटा प्रोसेसिंग की सहमति ऑपरेटर ईमेल पर संदेश भेजकर वापस ली जा सकती है."
        ]
      },
      {
        title: "6. ऑपरेटर संपर्क",
        body: ["व्यक्तिगत डेटा प्रोसेसिंग प्रश्नों के लिए {{email}} पर लिखें."]
      }
    ]
  }
};

export function getPrivacyCopy(locale: string | null | undefined) {
  return copies[normalizeLocale(locale)];
}
