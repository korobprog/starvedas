import { normalizeLocale, type Locale } from "@/i18n/config";

type PaymentCopy = {
  actions: {
    refund: string;
    security: string;
    signup: string;
  };
  lead: string;
  methodsTitle: string;
  pageTitle: string;
  sectionTitle: string;
  step1: string;
  step2: string;
  step3: string;
  step4: string;
  step5: string;
  warning: string;
};

const copies: Record<Locale, PaymentCopy> = {
  ru: {
    actions: {
      refund: "Возврат",
      security: "Безопасность",
      signup: "Перейти к записи"
    },
    lead: "Оплата проходит на защищенной странице платежной системы. Сайт не хранит данные банковских карт, а итоговая сумма показывается клиенту до перехода к оплате.",
    methodsTitle: "Доступные способы",
    pageTitle: "Безопасная оплата заказа",
    sectionTitle: "Как проходит оплата",
    step1:
      "Клиент переходит по реферальной ссылке или попадает к администратору, затем выбирает церемонию и участников.",
    step2: "Backend рассчитывает итоговую сумму по данным из базы.",
    step3: "Сайт создает заказ в статусе «Ожидает оплаты».",
    step4:
      "Клиент переходит на защищенную страницу выбранной платежной системы.",
    step5: "После подтверждения платежа статус заказа обновляется.",
    warning:
      "Если платежная страница была закрыта или оплата не завершилась, заказ остается в статусе «Ожидает оплаты». При ошибке оплаты можно связаться с куратором или поддержкой."
  },
  en: {
    actions: {
      refund: "Refund",
      security: "Security",
      signup: "Go to signup"
    },
    lead: "Payment takes place on the secure page of the payment system. The site does not store bank card data, and the final amount is shown before payment.",
    methodsTitle: "Available methods",
    pageTitle: "Secure order payment",
    sectionTitle: "How payment works",
    step1:
      "The client follows a referral link or is assigned to the administrator, then chooses a ceremony and participants.",
    step2: "The backend calculates the total amount from database data.",
    step3: 'The site creates an order in "Pending payment" status.',
    step4: "The client goes to the secure page of the selected payment system.",
    step5: "After payment confirmation, the order status is updated.",
    warning:
      'If the payment page was closed or payment was not completed, the order remains in "Pending payment" status. If payment fails, contact the curator or support.'
  },
  hi: {
    actions: {
      refund: "वापसी",
      security: "सुरक्षा",
      signup: "बुकिंग पर जाएँ"
    },
    lead: "भुगतान भुगतान प्रणाली के सुरक्षित पृष्ठ पर होता है. साइट बैंक कार्ड डेटा संग्रहीत नहीं करती, और अंतिम राशि भुगतान से पहले दिखाई जाती है.",
    methodsTitle: "उपलब्ध तरीके",
    pageTitle: "सुरक्षित ऑर्डर भुगतान",
    sectionTitle: "भुगतान कैसे होता है",
    step1:
      "ग्राहक referral link से आता है या administrator को assigned होता है, फिर समारोह और प्रतिभागी चुनता है.",
    step2: "Backend डेटाबेस डेटा के आधार पर कुल राशि निकालता है.",
    step3: 'साइट ऑर्डर को "भुगतान की प्रतीक्षा" स्थिति में बनाती है.',
    step4: "ग्राहक चुनी गई भुगतान प्रणाली के सुरक्षित पृष्ठ पर जाता है.",
    step5: "भुगतान की पुष्टि के बाद ऑर्डर की स्थिति अपडेट होती है.",
    warning:
      'यदि भुगतान पृष्ठ बंद कर दिया गया हो या भुगतान पूरा न हुआ हो, तो ऑर्डर "भुगतान की प्रतीक्षा" स्थिति में रहता है. भुगतान विफल होने पर क्यूरेटर या सहायता से संपर्क करें.'
  }
};

export function getPaymentCopy(locale: string | null | undefined) {
  return copies[normalizeLocale(locale)];
}
