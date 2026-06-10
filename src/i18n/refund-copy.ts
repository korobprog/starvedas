import { normalizeLocale, type Locale } from "@/i18n/config";

type RefundCopy = {
  actions: {
    contact: string;
    payment: string;
  };
  lead: string;
  pageTitle: string;
  requestText: string;
  requestTitle: string;
  section1Text: string;
  section1Title: string;
  section2Text: string;
  section2Title: string;
  section3Text: string;
  section3Title: string;
  section4Text: string;
  section4Title: string;
};

const copies: Record<Locale, RefundCopy> = {
  ru: {
    actions: {
      contact: "Связаться",
      payment: "Об оплате"
    },
    lead: "Если клиент хочет отменить заказ или вернуть оплату, обращение рассматривается индивидуально с учетом статуса заявки и сроков проведения церемонии.",
    pageTitle: "Условия возврата",
    requestText:
      "Напишите на {{email}} или свяжитесь с куратором. Укажите номер заказа, имя заказчика, контакт для связи и причину обращения.",
    requestTitle: "Как запросить возврат",
    section1Text:
      "Если участие еще не подтверждено и услуга не начала оказываться, возврат может быть выполнен тем же способом, которым была произведена оплата.",
    section1Title: "До подтверждения участия",
    section2Text:
      "Если подготовка или оказание услуги уже начались, возврат рассматривается с учетом фактически понесенных расходов исполнителя и требований законодательства РФ.",
    section2Title: "После подтверждения участия",
    section3Text:
      "Срок зачисления средств зависит от банка клиента и платежной системы. После обработки возврата платежной системой деньги обычно возвращаются на исходный способ оплаты.",
    section3Title: "Сроки",
    section4Text:
      "Возврат рассматривается индивидуально, если церемония уже была проведена или клиент получил консультацию и сопровождение в рамках заказа.",
    section4Title: "Дополнительные условия"
  },
  en: {
    actions: {
      contact: "Contact us",
      payment: "About payment"
    },
    lead: "If the client wants to cancel an order or return payment, the request is reviewed individually, considering request status and ceremony timing.",
    pageTitle: "Refund terms",
    requestText:
      "Write to {{email}} or contact the curator. Include the order number, customer name, contact details, and the reason for the request.",
    requestTitle: "How to request a refund",
    section1Text:
      "If participation has not been confirmed yet and the service has not started, the refund may be made by the same method that was used for payment.",
    section1Title: "Before participation confirmation",
    section2Text:
      "If preparation or service delivery has already started, the refund is reviewed considering the provider's actual expenses and the requirements of Russian law.",
    section2Title: "After participation confirmation",
    section3Text:
      "The crediting period depends on the client's bank and the payment system. After the refund is processed by the payment system, money usually returns to the original payment method.",
    section3Title: "Timing",
    section4Text:
      "The refund is reviewed individually if the ceremony has already taken place or the client has received consultation and support as part of the order.",
    section4Title: "Additional terms"
  },
  hi: {
    actions: {
      contact: "संपर्क करें",
      payment: "भुगतान के बारे में"
    },
    lead: "यदि ग्राहक ऑर्डर रद्द करना या भुगतान वापस लेना चाहता है, तो अनुरोध की स्थिति और समारोह के समय को ध्यान में रखते हुए व्यक्तिगत रूप से समीक्षा की जाती है.",
    pageTitle: "वापसी शर्तें",
    requestText:
      "{{email}} पर लिखें या क्यूरेटर से संपर्क करें. ऑर्डर नंबर, ग्राहक का नाम, संपर्क विवरण और अनुरोध का कारण शामिल करें.",
    requestTitle: "वापसी कैसे अनुरोध करें",
    section1Text:
      "यदि भागीदारी अभी तक पुष्टि नहीं हुई है और सेवा शुरू नहीं हुई है, तो वापसी उसी तरीके से की जा सकती है जिससे भुगतान किया गया था.",
    section1Title: "भागीदारी की पुष्टि से पहले",
    section2Text:
      "यदि तैयारी या सेवा वितरण पहले ही शुरू हो चुका है, तो वापसी प्रदाता के वास्तविक खर्च और रूसी कानून की आवश्यकताओं को ध्यान में रखकर समीक्षा की जाती है.",
    section2Title: "भागीदारी की पुष्टि के बाद",
    section3Text:
      "धनराशि जमा होने का समय ग्राहक के बैंक और भुगतान प्रणाली पर निर्भर करता है. भुगतान प्रणाली द्वारा वापसी संसाधित होने के बाद पैसा आमतौर पर मूल भुगतान विधि पर लौटता है.",
    section3Title: "समय",
    section4Text:
      "यदि समारोह पहले ही हो चुका है या ग्राहक को ऑर्डर के हिस्से के रूप में सलाह और सहायता मिल चुकी है, तो वापसी की व्यक्तिगत रूप से समीक्षा की जाती है.",
    section4Title: "अतिरिक्त शर्तें"
  }
};

export function getRefundCopy(locale: string | null | undefined) {
  return copies[normalizeLocale(locale)];
}
