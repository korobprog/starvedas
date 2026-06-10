import { normalizeLocale, type Locale } from "@/i18n/config";

type PaymentResultCopy = {
  fail: {
    backHome: string;
    backToSignup: string;
    eyebrow: string;
    text: string;
    title: string;
  };
  success: {
    backHome: string;
    eyebrow: string;
    text: string;
    title: string;
  };
};

const copies: Record<Locale, PaymentResultCopy> = {
  ru: {
    fail: {
      backHome: "Вернуться на главную",
      backToSignup: "Вернуться к записи",
      eyebrow: "Оплата не завершена",
      text: "Заказ останется в статусе «Ожидает оплаты». Можно вернуться к записи или связаться с куратором для уточнения.",
      title: "Платеж не был подтвержден"
    },
    success: {
      backHome: "Вернуться на главную",
      eyebrow: "Оплата прошла успешно",
      text: "Мы сохранили статус заказа и отправим подтверждение после обработки платежного уведомления.",
      title: "Спасибо, оплата получена"
    }
  },
  en: {
    fail: {
      backHome: "Back to home",
      backToSignup: "Back to signup",
      eyebrow: "Payment not completed",
      text: 'The order will remain in "Pending payment" status. You can return to signup or contact the curator for details.',
      title: "Payment was not confirmed"
    },
    success: {
      backHome: "Back to home",
      eyebrow: "Payment successful",
      text: "We saved the order status and will send confirmation after processing the payment notification.",
      title: "Thank you, payment received"
    }
  },
  hi: {
    fail: {
      backHome: "मुख्य पृष्ठ पर लौटें",
      backToSignup: "बुकिंग पर वापस",
      eyebrow: "भुगतान पूरा नहीं हुआ",
      text: 'ऑर्डर "भुगतान की प्रतीक्षा" स्थिति में रहेगा. आप बुकिंग पर वापस जा सकते हैं या विवरण के लिए क्यूरेटर से संपर्क कर सकते हैं.',
      title: "भुगतान की पुष्टि नहीं हुई"
    },
    success: {
      backHome: "मुख्य पृष्ठ पर लौटें",
      eyebrow: "भुगतान सफल",
      text: "हमने ऑर्डर स्थिति सहेज ली है और भुगतान सूचना संसाधित होने के बाद पुष्टि भेजेंगे.",
      title: "धन्यवाद, भुगतान प्राप्त हुआ"
    }
  }
};

export function getPaymentResultCopy(locale: string | null | undefined) {
  return copies[normalizeLocale(locale)];
}
