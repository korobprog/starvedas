import { normalizeLocale, type Locale } from "@/i18n/config";

type PaymentMethodsCopy = {
  actions: {
    security: string;
    signup: string;
  };
  afterTitle: string;
  afterText: string;
  beforeTitle: string;
  beforeText: string;
  lead: string;
  pageTitle: string;
};

const copies: Record<Locale, PaymentMethodsCopy> = {
  ru: {
    actions: {
      security: "Безопасность",
      signup: "Перейти к записи"
    },
    afterTitle: "После оплаты",
    afterText:
      "После подтверждения платежной системой заказ получает статус «Оплачен», а клиент возвращается на страницу успешной оплаты.",
    beforeTitle: "Перед оплатой",
    beforeText:
      "Форма заказа показывает выбранную услугу, количество участников и итоговую сумму. Backend повторно рассчитывает сумму и не доверяет цене, пришедшей с frontend.",
    lead: "Доступные способы оплаты зависят от настроек Prodamus. Итоговый список будет проверен перед запуском боевых оплат.",
    pageTitle: "Способы оплаты"
  },
  en: {
    actions: {
      security: "Security",
      signup: "Go to signup"
    },
    afterTitle: "After payment",
    afterText:
      'After confirmation by the payment system, the order receives the status "Paid" and the client returns to the successful payment page.',
    beforeTitle: "Before payment",
    beforeText:
      "The order form shows the selected service, participant count and total amount. The backend recalculates the amount and does not trust the price sent from the frontend.",
    lead: "Available payment methods depend on the Prodamus settings. The final list will be checked before live payments start.",
    pageTitle: "Payment methods"
  },
  hi: {
    actions: {
      security: "सुरक्षा",
      signup: "बुकिंग पर जाएँ"
    },
    afterTitle: "भुगतान के बाद",
    afterText:
      'भुगतान प्रणाली द्वारा पुष्टि के बाद ऑर्डर को "भुगतान हो गया" स्थिति मिलती है और ग्राहक सफल भुगतान पृष्ठ पर लौटता है.',
    beforeTitle: "भुगतान से पहले",
    beforeText:
      "ऑर्डर फ़ॉर्म चुनी गई सेवा, प्रतिभागियों की संख्या और कुल राशि दिखाता है. Backend राशि को फिर से गणना करता है और frontend द्वारा भेजी गई कीमत पर भरोसा नहीं करता.",
    lead: "उपलब्ध भुगतान तरीके Prodamus सेटिंग्स पर निर्भर करते हैं. लाइव भुगतान शुरू होने से पहले अंतिम सूची की जाँच की जाएगी.",
    pageTitle: "भुगतान तरीके"
  }
};

export function getPaymentMethodsCopy(locale: string | null | undefined) {
  return copies[normalizeLocale(locale)];
}
