import { normalizeLocale, type Locale } from "@/i18n/config";

type PaymentSecurityCopy = {
  actions: {
    methods: string;
    payment: string;
  };
  cardText: string;
  cardTitle: string;
  failText: string;
  failTitle: string;
  lead: string;
  pageTitle: string;
  statusText: string;
  statusTitle: string;
};

const copies: Record<Locale, PaymentSecurityCopy> = {
  ru: {
    actions: {
      methods: "Способы оплаты",
      payment: "Об оплате"
    },
    cardText:
      "Платежные реквизиты вводятся не на сайте StarVedas, а на стороне платежной системы. Сайт хранит номер заказа, сумму, статус платежа и технические идентификаторы платежа.",
    cardTitle: "Где вводятся данные карты",
    failText:
      "Если пользователь закрыл платежную страницу или оплата завершилась ошибкой, заказ не считается оплаченным. Клиент может повторить оплату после связи с куратором или поддержкой.",
    failTitle: "Если платеж не завершен",
    lead: "Оплата проходит на защищенной странице платежной системы. StarVedas не хранит данные банковских карт и получает только статус оплаты, необходимый для обработки заказа.",
    pageTitle: "Безопасность платежей",
    statusText:
      "Заказ меняет статус на «Оплачен» только после подтверждения платежной системой через защищенный callback/webhook. До этого заказ остается в статусе «Ожидает оплаты».",
    statusTitle: "Статус заказа"
  },
  en: {
    actions: {
      methods: "Payment methods",
      payment: "About payment"
    },
    cardText:
      "Payment details are entered on the payment system side, not on StarVedas. The site stores the order number, amount, payment status and technical payment identifiers.",
    cardTitle: "Where card data is entered",
    failText:
      "If the user closes the payment page or payment fails, the order is not considered paid. The client can repeat payment after contacting the curator or support.",
    failTitle: "If payment is not completed",
    lead: "Payment takes place on the secure page of the payment system. StarVedas does not store bank card data and receives only the payment status needed to process the order.",
    pageTitle: "Payment security",
    statusText:
      'The order changes to "Paid" only after confirmation from the payment system through a protected callback/webhook. Until then, the order remains in "Pending payment" status.',
    statusTitle: "Order status"
  },
  hi: {
    actions: {
      methods: "भुगतान तरीके",
      payment: "भुगतान के बारे में"
    },
    cardText:
      "भुगतान विवरण StarVedas पर नहीं बल्कि भुगतान प्रणाली की तरफ दर्ज किए जाते हैं. साइट ऑर्डर नंबर, राशि, भुगतान स्थिति और तकनीकी पहचान संग्रहीत करती है.",
    cardTitle: "कार्ड डेटा कहाँ दर्ज होता है",
    failText:
      "यदि उपयोगकर्ता भुगतान पृष्ठ बंद कर देता है या भुगतान विफल हो जाता है, तो ऑर्डर को भुगतान किया हुआ नहीं माना जाता. ग्राहक क्यूरेटर या सहायता से संपर्क करने के बाद फिर से भुगतान कर सकता है.",
    failTitle: "यदि भुगतान पूरा नहीं हुआ",
    lead: "भुगतान भुगतान प्रणाली के सुरक्षित पृष्ठ पर होता है. StarVedas बैंक कार्ड डेटा संग्रहीत नहीं करती और केवल ऑर्डर संसाधित करने के लिए आवश्यक भुगतान स्थिति प्राप्त करती है.",
    pageTitle: "भुगतान सुरक्षा",
    statusText:
      'ऑर्डर को केवल भुगतान प्रणाली की पुष्टि के बाद, सुरक्षित callback/webhook के माध्यम से "भुगतान हो गया" स्थिति मिलती है. उससे पहले ऑर्डर "भुगतान की प्रतीक्षा" स्थिति में रहता है.',
    statusTitle: "ऑर्डर स्थिति"
  }
};

export function getPaymentSecurityCopy(locale: string | null | undefined) {
  return copies[normalizeLocale(locale)];
}
