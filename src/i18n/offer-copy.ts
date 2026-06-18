import { normalizeLocale, type Locale } from "@/i18n/config";

type OfferCopy = {
  actions: {
    refund: string;
    signup: string;
  };
  lead: string;
  pageTitle: string;
  sections: {
    general: {
      body: string[];
      title: string;
    };
    liability: {
      body: string[];
      title: string;
    };
    order: {
      body: string[];
      title: string;
    };
    payment: {
      body: string[];
      title: string;
    };
    provider: {
      body: string;
      recipient: string;
      title: string;
    };
    refund: {
      body: string[];
      title: string;
    };
    services: {
      body: string;
      title: string;
    };
    specialConditions: {
      body: string[];
      title: string;
    };
    subject: {
      body: string[];
      title: string;
    };
    term: {
      body: string[];
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
    lead: "Настоящий документ является публичной офертой {{seller}} и содержит существенные условия оказания информационно-консультационных услуг по организации участия в церемониях, размещенных на сайте starvedas.ru и chintamanidhama.ru.",
    pageTitle: "Публичная оферта",
    sections: {
      general: {
        title: "1. Общие положения и термины",
        body: [
          "Настоящий документ является публичной офертой {{seller}} (далее — «Исполнитель») и содержит все существенные условия оказания информационно-консультационных услуг по организации участия в духовных церемониях, ритуалах, лекциях и видеоконсультациях (далее — «Церемонии»), информация о которых размещена на сайте https://starvedas.ru и https://chintamanidhama.ru (далее — «Сайт»).",
          "В соответствии с пунктом 2 статьи 437 Гражданского кодекса Российской Федерации (далее — «ГК РФ») настоящий документ, адресованный неопределенному кругу лиц, является официальным публичным предложением Исполнителя заключить договор оказания услуг на изложенных ниже условиях.",
          "Полным и безоговорочным акцептом настоящей оферты в соответствии со статьей 438 ГК РФ является осуществление физическим лицом (далее — «Заказчик») оплаты заявки на участие в выбранной Церемонии в порядке, предусмотренном разделом 5 настоящей оферты. С момента акцепта Заказчик считается ознакомленным и согласившимся со всеми условиями настоящей оферты.",
          "Термины: «Куратор» — специалист, привлекаемый Исполнителем для проведения Церемонии и сопровождения участников; «Заявка» — электронная форма на Сайте, содержащая данные Заказчика, выбранную Церемонию, куратора и список участников; «Личный кабинет» (при наличии) — раздел Сайта, через который Заказчик получает информацию о статусе заявки."
        ]
      },
      provider: {
        title: "2. Исполнитель",
        body: "Исполнитель: {{seller}}, ИНН {{inn}}, ОГРН/ОГРНИП {{ogrnip}}. Контакт для обращений: {{email}}.",
        recipient: "Получатель платежа: {{name}}."
      },
      subject: {
        title: "3. Предмет оферты",
        body: [
          "Исполнитель обязуется оказать Заказчику возмездные информационно-консультационные услуги по организации участия в выбранной Церемонии, включая прием и обработку заявки, расчет стоимости, передачу данных Куратору, направление ссылки или иных реквизитов доступа и подтверждение участия после оплаты, а Заказчик обязуется принять и оплатить эти услуги на условиях настоящей оферты.",
          "Дата, время, формат проведения (очно или дистанционно), программа, продолжительность, состав Кураторов, стоимость и иные существенные условия конкретной Церемонии указываются на Сайте на момент оформления заявки.",
          "Сайт не гарантирует наступление какого-либо духовного, материального, медицинского или иного результата от участия в Церемонии. Услуга заключается в организации участия и предоставлении информационно-консультационного сопровождения, а не в достижении конкретного результата.",
          "Услуги не являются медицинскими, психотерапевтическими или иными услугами, требующими специального лицензирования, и не заменяют консультацию врача или иного специалиста."
        ]
      },
      services: {
        title: "4. Услуги и цены",
        body: "Перечень Церемоний, формат их проведения и актуальная стоимость опубликованы на Сайте. Сумма, отображаемая в форме заявки, носит информационный характер и пересчитывается на сервере в момент создания заказа исходя из выбранной Церемонии, количества участников и действующих тарифов."
      },
      order: {
        title: "5. Оформление заказа",
        body: [
          "Для оформления заявки Заказчик выбирает Церемонию и Куратора, указывает количество и список участников, контактные данные (Telegram, телефон и (или) email) и подтверждает согласие на обработку персональных данных, а также с условиями настоящей оферты, Политики конфиденциальности и Согласия на обработку персональных данных.",
          "После оформления заявка получает статус «Ожидает оплаты» до момента подтверждения платежа платежной системой. Не оплаченная в течение разумного срока заявка может быть аннулирована Исполнителем.",
          "Не позднее 24 (двадцати четырех) часов после оплаты Исполнитель подтверждает участие Заказчика по выбранной теме по электронной почте или через мессенджер, указанный Заказчиком.",
          "При регистрации на Церемонию, проводимую в дистанционном формате, Исполнитель направляет ссылку на трансляцию (вебинарную комнату), которая открывается не позднее чем за 30 минут до начала, а индивидуальный пароль или ссылка для участия направляются не позднее чем за 3 (три) часа до начала Церемонии.",
          "После оказания услуги Исполнитель в течение 5 (пяти) рабочих дней предоставляет Заказчику запись Церемонии (если запись предусмотрена) либо подтверждение (скриншот) участия в мероприятии."
        ]
      },
      payment: {
        title: "6. Оплата и подтверждение участия",
        body: [
          "Услуги предоставляются Исполнителем при условии их 100% (стопроцентной) предварительной оплаты Заказчиком, если иной порядок оплаты прямо не указан на Сайте для конкретной Церемонии.",
          "Оплата производится на защищенной странице платежной системы, подключенной к Сайту. Сайт не хранит и не обрабатывает данные банковских карт Заказчика.",
          "Обязательство Заказчика по оплате считается исполненным с момента зачисления денежных средств на расчетный счет Исполнителя или поступления подтверждения от платежной системы об успешной оплате.",
          "После успешной оплаты Заказчик получает подтверждение участия через указанный им контактный канал связи или от выбранного Куратора."
        ]
      },
      specialConditions: {
        title: "7. Особые условия",
        body: [
          "Вся информация, передаваемая в рамках Церемоний (включая лекции, видео, аудио, методические и иные материалы), является интеллектуальной собственностью Исполнителя и (или) привлеченных Кураторов и охраняется законодательством Российской Федерации об интеллектуальной собственности.",
          "Заказчику запрещается передавать реквизиты доступа к Церемонии (ссылки, пароли) третьим лицам для совместного использования без отдельного письменного разрешения Исполнителя. Исполнитель вправе отключить от участия лицо, использующее неверные реквизиты доступа либо реквизиты, уже используемые другим участником.",
          "Заказчику и иным участникам запрещается распространять (публиковать, размещать на интернет-ресурсах, копировать, передавать или перепродавать третьим лицам) в коммерческих или некоммерческих целях полученные в рамках настоящей оферты материалы, создавать на их основе производные информационные продукты, а также использовать такие материалы каким-либо способом, кроме как для личного некоммерческого использования.",
          "Запись Церемонии (аудио, видео, скриншоты экрана) участниками без отдельного письменного разрешения Исполнителя запрещена."
        ]
      },
      liability: {
        title: "8. Ответственность сторон",
        body: [
          "Исполнитель не несет ответственности за невозможность оказания услуг по причинам, связанным с нарушением работы сети Интернет, оборудования или программного обеспечения на стороне Заказчика.",
          "За неисполнение или ненадлежащее исполнение обязательств по настоящей оферте Стороны несут ответственность в соответствии с действующим законодательством Российской Федерации.",
          "Если заявка содержит недостоверные или неполные данные, Исполнитель не несет ответственности за предоставление информационных материалов и доступа лицу, указанному в заявке, а не фактическому Заказчику, а также за иные негативные последствия, вызванные предоставлением Заказчиком неверных данных.",
          "Если по какой-либо причине, не зависящей от Исполнителя или связанной с обстоятельствами непреодолимой силы, Церемония не может быть проведена в изначально заявленный срок, ответственность Исполнителя ограничивается организацией проведения соответствующей Церемонии в новые сроки либо предоставлением Заказчику равноценной замены.",
          "Исполнитель не несет ответственности за то, каким образом Заказчик и иные участники используют полученную в ходе информационно-консультационного обслуживания информацию, а также за результаты такого использования.",
          "Совокупная ответственность Исполнителя по настоящему договору, по любому иску или претензии, связанным с настоящей офертой или ее исполнением, ограничивается суммой денежных средств, фактически уплаченных Заказчиком Исполнителю по соответствующей заявке."
        ]
      },
      refund: {
        title: "9. Возврат денежных средств",
        body: [
          "В случае отказа Заказчика от участия в Церемонии до начала ее проведения возврат денежных средств осуществляется с учетом фактически понесенных Исполнителем расходов на организацию Церемонии (включая оплату работы Куратора, бронирование места проведения и иные подготовительные расходы).",
          "Подробный порядок и условия возврата денежных средств опубликованы на странице условий возврата по адресу https://starvedas.ru/refund и https://chintamanidhama.ru/refund и являются неотъемлемой частью настоящей оферты.",
          "Если Церемония уже была проведена либо Заказчик и (или) иные участники получили консультационное сопровождение в рамках заявки, денежные средства возврату не подлежат, за исключением случаев, прямо предусмотренных законодательством Российской Федерации о защите прав потребителей."
        ]
      },
      term: {
        title: "10. Срок действия и изменение договора",
        body: [
          "Настоящий договор вступает в силу с момента акцепта оферты Заказчиком (оплаты заявки) и действует до полного исполнения Сторонами своих обязательств либо до его расторжения по основаниям, предусмотренным настоящей офертой и законодательством Российской Федерации.",
          "Настоящая оферта не требует скрепления печатями и (или) подписания Заказчиком и Исполнителем, сохраняя при этом полную юридическую силу в соответствии со статьями 434 и 438 ГК РФ.",
          "Исполнитель вправе в любой момент в одностороннем порядке изменять условия настоящей оферты без предварительного согласования с Заказчиком, обеспечивая при этом публикацию измененных условий на Сайте по адресу https://starvedas.ru/legal/offer и https://chintamanidhama.ru/legal/offer не менее чем за 1 (один) день до их вступления в силу. Оформление новой заявки после публикации изменений означает согласие Заказчика с новой редакцией оферты.",
          "Все споры и разногласия Стороны решают путем переговоров. При недостижении согласия спор подлежит рассмотрению в порядке, предусмотренном действующим законодательством Российской Федерации, по месту нахождения Исполнителя. Все вопросы, не урегулированные настоящей офертой, решаются в соответствии с законодательством Российской Федерации."
        ]
      }
    }
  },
  en: {
    actions: {
      refund: "Refund terms",
      signup: "Submit a request"
    },
    lead: "This document is a public offer of {{seller}} and sets out the material terms for the provision of information and consulting services for organizing participation in the ceremonies published on starvedas.ru and chintamanidhama.ru.",
    pageTitle: "Public offer",
    sections: {
      general: {
        title: "1. General provisions and definitions",
        body: [
          'This document is a public offer of {{seller}} (the "Provider") and contains all material terms for the provision of information and consulting services for organizing participation in spiritual ceremonies, rituals, lectures and video consultations (the "Ceremonies"), information about which is published on the websites https://starvedas.ru and https://chintamanidhama.ru (the "Site").',
          'In accordance with clause 2 of Article 437 of the Civil Code of the Russian Federation (the "Civil Code"), this document, addressed to an indefinite number of persons, is an official public proposal of the Provider to enter into a service agreement on the terms set out below.',
          'Full and unconditional acceptance of this offer in accordance with Article 438 of the Civil Code is the payment by an individual (the "Customer") for a request to participate in the selected Ceremony in the manner provided for in Section 5 of this offer. From the moment of acceptance, the Customer is deemed to have read and agreed to all the terms of this offer.',
          'Definitions: a "Curator" is a specialist engaged by the Provider to conduct the Ceremony and support participants; a "Request" is the electronic form on the Site containing the Customer\'s details, the selected Ceremony, the curator and the list of participants; a "Personal account" (if available) is the section of the Site through which the Customer receives information about the status of the request.'
        ]
      },
      provider: {
        title: "2. Provider",
        body: "Provider: {{seller}}, Tax ID {{inn}}, registration number {{ogrnip}}. Contact: {{email}}.",
        recipient: "Payment recipient: {{name}}."
      },
      subject: {
        title: "3. Subject of the offer",
        body: [
          "The Provider undertakes to render the Customer paid information and consulting services for organizing participation in the selected Ceremony, including receiving and processing the request, calculating the cost, transferring data to the Curator, sending a link or other access details, and confirming participation after payment, and the Customer undertakes to accept and pay for these services on the terms of this offer.",
          "The date, time, format (in-person or remote), program, duration, curators, cost and other material terms of a specific Ceremony are indicated on the Site at the time the request is submitted.",
          "The Site does not guarantee any spiritual, material, medical or other outcome from participation in a Ceremony. The service consists of organizing participation and providing information and consulting support, not of achieving a specific result.",
          "The services are not medical, psychotherapeutic or other services requiring special licensing and do not replace consultation with a doctor or other specialist."
        ]
      },
      services: {
        title: "4. Services and prices",
        body: "The list of Ceremonies, their format and current cost are published on the Site. The amount shown in the request form is for information purposes only and is recalculated on the server when the order is created, based on the selected Ceremony, the number of participants and the current rates."
      },
      order: {
        title: "5. Placing a request",
        body: [
          "To place a request, the Customer selects a Ceremony and a Curator, indicates the number and list of participants, contact details (Telegram, phone and/or email) and confirms consent to the processing of personal data, as well as to the terms of this offer, the Privacy Policy and the Personal Data Consent.",
          'Once submitted, the request is given the status "Pending payment" until the payment is confirmed by the payment system. A request that is not paid within a reasonable time may be cancelled by the Provider.',
          "Within 24 (twenty-four) hours after payment, the Provider confirms the Customer's participation on the chosen topic by email or via the messenger specified by the Customer.",
          "For Ceremonies held remotely, the Provider sends a link to the broadcast (webinar room), which opens no later than 30 minutes before the start, and an individual password or access link is sent no later than 3 (three) hours before the Ceremony begins.",
          "After the service has been provided, the Provider, within 5 (five) business days, provides the Customer with a recording of the Ceremony (if a recording is provided) or confirmation (a screenshot) of participation in the event."
        ]
      },
      payment: {
        title: "6. Payment and confirmation of participation",
        body: [
          "Services are provided by the Provider subject to 100% (one hundred percent) advance payment by the Customer, unless a different payment procedure is expressly stated on the Site for a specific Ceremony.",
          "Payment is made on the secure page of the payment system connected to the Site. The Site does not store or process the Customer's bank card data.",
          "The Customer's payment obligation is deemed fulfilled from the moment the funds are credited to the Provider's settlement account or confirmation of successful payment is received from the payment system.",
          "After successful payment, the Customer receives confirmation of participation through the contact channel they specified or from the selected Curator."
        ]
      },
      specialConditions: {
        title: "7. Special conditions",
        body: [
          "All information provided as part of the Ceremonies (including lectures, video, audio, methodological and other materials) is the intellectual property of the Provider and/or the Curators involved and is protected by Russian intellectual property law.",
          "The Customer is prohibited from sharing access details to a Ceremony (links, passwords) with third parties for joint use without separate written permission from the Provider. The Provider has the right to disconnect from participation any person using incorrect access details or access details already in use by another participant.",
          "The Customer and other participants are prohibited from distributing (publishing, posting on websites, copying, transferring or reselling to third parties), for commercial or non-commercial purposes, materials received under this offer, from creating derivative information products based on them, or from using such materials in any way other than for personal, non-commercial use.",
          "Recording a Ceremony (audio, video, screenshots) by participants without separate written permission from the Provider is prohibited."
        ]
      },
      liability: {
        title: "8. Liability of the parties",
        body: [
          "The Provider is not liable for the inability to provide services due to reasons related to the malfunction of the Internet connection, equipment or software on the Customer's side.",
          "For non-performance or improper performance of obligations under this offer, the parties are liable in accordance with applicable Russian law.",
          "If the request contains inaccurate or incomplete data, the Provider is not liable for providing information materials and access to the person specified in the request rather than the actual Customer, or for other negative consequences caused by the Customer providing incorrect data.",
          "If, for any reason beyond the Provider's control or due to force majeure, a Ceremony cannot be held on the originally announced date, the Provider's liability is limited to organizing the Ceremony on a new date or providing the Customer with an equivalent replacement.",
          "The Provider is not liable for how the Customer and other participants use the information obtained during the information and consulting services, or for the results of such use.",
          "The Provider's aggregate liability under this agreement, for any claim related to this offer or its performance, is limited to the amount actually paid by the Customer to the Provider for the relevant request."
        ]
      },
      refund: {
        title: "9. Refunds",
        body: [
          "If the Customer cancels participation in a Ceremony before it begins, the refund is made taking into account the expenses actually incurred by the Provider in organizing the Ceremony (including payment for the Curator's work, booking of the venue and other preparatory expenses).",
          "Detailed refund procedures and conditions are published on the refund terms page at https://starvedas.ru/refund and https://chintamanidhama.ru/refund and form an integral part of this offer.",
          "If the Ceremony has already taken place, or the Customer and/or other participants have received consulting support as part of the request, the funds are non-refundable, except in cases expressly provided for by Russian consumer protection law."
        ]
      },
      term: {
        title: "10. Term and amendment of the agreement",
        body: [
          "This agreement comes into force from the moment the Customer accepts the offer (pays for the request) and remains in effect until the parties have fully performed their obligations or until it is terminated on the grounds provided for in this offer and Russian law.",
          "This offer does not require seals and/or signatures of the Customer and the Provider, while retaining full legal force in accordance with Articles 434 and 438 of the Civil Code.",
          "The Provider has the right to unilaterally amend the terms of this offer at any time without prior agreement with the Customer, while publishing the amended terms on the Site at https://starvedas.ru/legal/offer and https://chintamanidhama.ru/legal/offer at least 1 (one) day before they take effect. Submitting a new request after the amendments are published means the Customer agrees to the new version of the offer.",
          "The parties shall resolve any disputes and disagreements through negotiations. If no agreement is reached, the dispute shall be resolved in the manner provided for by applicable Russian law, at the Provider's location. Any matters not regulated by this offer shall be resolved in accordance with Russian law."
        ]
      }
    }
  },
  hi: {
    actions: {
      refund: "वापसी शर्तें",
      signup: "अनुरोध भेजें"
    },
    lead: "यह दस्तावेज़ {{seller}} का सार्वजनिक प्रस्ताव (ऑफर) है और starvedas.ru और chintamanidhama.ru पर प्रकाशित समारोहों में भागीदारी के आयोजन हेतु सूचना-परामर्श सेवाओं की मुख्य शर्तें निर्धारित करता है.",
    pageTitle: "सार्वजनिक ऑफ़र",
    sections: {
      general: {
        title: "1. सामान्य प्रावधान और परिभाषाएँ",
        body: [
          'यह दस्तावेज़ {{seller}} ("प्रदाता") का सार्वजनिक प्रस्ताव है और वेबसाइट https://starvedas.ru और https://chintamanidhama.ru ("साइट") पर प्रकाशित आध्यात्मिक समारोहों, अनुष्ठानों, व्याख्यानों और वीडियो परामर्शों ("समारोह") में भागीदारी के आयोजन हेतु सूचना-परामर्श सेवाओं के प्रावधान की सभी आवश्यक शर्तें शामिल करता है.',
          'रूसी संघ के नागरिक संहिता ("नागरिक संहिता") के अनुच्छेद 437 के खंड 2 के अनुसार, अनिश्चित संख्या में व्यक्तियों को संबोधित यह दस्तावेज़ नीचे दी गई शर्तों पर सेवा समझौता करने के लिए प्रदाता का आधिकारिक सार्वजनिक प्रस्ताव है.',
          'नागरिक संहिता के अनुच्छेद 438 के अनुसार इस ऑफर की पूर्ण और बिना शर्त स्वीकृति किसी व्यक्ति ("ग्राहक") द्वारा इस ऑफर के खंड 5 में दी गई प्रक्रिया के अनुसार चुने गए समारोह में भागीदारी हेतु अनुरोध का भुगतान करना है. स्वीकृति के क्षण से ग्राहक को इस ऑफर की सभी शर्तों से परिचित और सहमत माना जाता है.',
          '​परिभाषाएँ: "क्यूरेटर" वह विशेषज्ञ है जिसे प्रदाता समारोह संचालित करने और प्रतिभागियों का सहयोग करने के लिए नियुक्त करता है; "अनुरोध" साइट पर इलेक्ट्रॉनिक फ़ॉर्म है जिसमें ग्राहक का विवरण, चुना गया समारोह, क्यूरेटर और प्रतिभागियों की सूची शामिल है; "व्यक्तिगत खाता" (यदि उपलब्ध हो) साइट का वह भाग है जिसके माध्यम से ग्राहक अनुरोध की स्थिति के बारे में जानकारी प्राप्त करता है.'
        ]
      },
      provider: {
        title: "2. प्रदाता",
        body: "प्रदाता: {{seller}}, कर पहचान संख्या {{inn}}, पंजीकरण संख्या {{ogrnip}}. संपर्क: {{email}}.",
        recipient: "भुगतान प्राप्तकर्ता: {{name}}."
      },
      subject: {
        title: "3. ऑफ़र का विषय",
        body: [
          "प्रदाता ग्राहक को चुने गए समारोह में भागीदारी के आयोजन हेतु सशुल्क सूचना-परामर्श सेवाएँ प्रदान करने का वचन देता है, जिसमें अनुरोध प्राप्त करना और प्रोसेस करना, लागत की गणना करना, क्यूरेटर को डेटा भेजना, लिंक या अन्य पहुँच विवरण भेजना और भुगतान के बाद भागीदारी की पुष्टि करना शामिल है, और ग्राहक इस ऑफर की शर्तों पर इन सेवाओं को स्वीकार करने और भुगतान करने का वचन देता है.",
          "किसी विशिष्ट समारोह की तारीख, समय, प्रारूप (व्यक्तिगत या दूरस्थ), कार्यक्रम, अवधि, क्यूरेटर, लागत और अन्य आवश्यक शर्तें अनुरोध जमा करते समय साइट पर दर्शाई जाती हैं.",
          "साइट समारोह में भागीदारी से किसी आध्यात्मिक, भौतिक, चिकित्सीय या अन्य परिणाम की गारंटी नहीं देती. सेवा में भागीदारी का आयोजन और सूचना-परामर्श सहायता प्रदान करना शामिल है, न कि किसी विशिष्ट परिणाम की प्राप्ति.",
          "सेवाएँ चिकित्सा, मनोचिकित्सा या विशेष लाइसेंस की आवश्यकता वाली अन्य सेवाएँ नहीं हैं और किसी डॉक्टर या अन्य विशेषज्ञ के परामर्श का स्थान नहीं लेतीं."
        ]
      },
      services: {
        title: "4. सेवाएँ और कीमतें",
        body: "समारोहों की सूची, उनका प्रारूप और वर्तमान लागत साइट पर प्रकाशित हैं. अनुरोध फ़ॉर्म में दिखाई गई राशि केवल सूचना के लिए है और चयनित समारोह, प्रतिभागियों की संख्या और मौजूदा दरों के आधार पर ऑर्डर बनाते समय सर्वर पर पुनर्गणना की जाती है."
      },
      order: {
        title: "5. अनुरोध जमा करना",
        body: [
          "अनुरोध जमा करने के लिए, ग्राहक एक समारोह और क्यूरेटर चुनता है, प्रतिभागियों की संख्या और सूची, संपर्क विवरण (Telegram, फोन और/या ईमेल) बताता है, और व्यक्तिगत डेटा प्रोसेसिंग के साथ-साथ इस ऑफर, गोपनीयता नीति और व्यक्तिगत डेटा सहमति की शर्तों के लिए सहमति की पुष्टि करता है.",
          'जमा करने के बाद, भुगतान प्रणाली द्वारा भुगतान की पुष्टि होने तक अनुरोध को "भुगतान की प्रतीक्षा" स्थिति दी जाती है. उचित समय के भीतर भुगतान न की गई अनुरोध को प्रदाता द्वारा रद्द किया जा सकता है.',
          "भुगतान के 24 (चौबीस) घंटों के भीतर, प्रदाता ईमेल या ग्राहक द्वारा निर्दिष्ट मैसेंजर के माध्यम से चुने गए विषय पर ग्राहक की भागीदारी की पुष्टि करता है.",
          "दूरस्थ रूप से आयोजित समारोहों के लिए, प्रदाता प्रसारण (वेबिनार रूम) का लिंक भेजता है, जो शुरू होने से 30 मिनट पहले खुलता है, और व्यक्तिगत पासवर्ड या एक्सेस लिंक समारोह शुरू होने से 3 (तीन) घंटे पहले भेजा जाता है.",
          "सेवा प्रदान करने के बाद, प्रदाता 5 (पाँच) कार्य दिवसों के भीतर ग्राहक को समारोह की रिकॉर्डिंग (यदि उपलब्ध हो) या कार्यक्रम में भागीदारी की पुष्टि (स्क्रीनशॉट) प्रदान करता है."
        ]
      },
      payment: {
        title: "6. भुगतान और भागीदारी की पुष्टि",
        body: [
          "जब तक साइट पर किसी विशिष्ट समारोह के लिए अलग भुगतान प्रक्रिया स्पष्ट रूप से न बताई गई हो, प्रदाता ग्राहक से 100% (पूर्ण) अग्रिम भुगतान की शर्त पर सेवाएँ प्रदान करता है.",
          "भुगतान साइट से जुड़ी भुगतान प्रणाली के सुरक्षित पृष्ठ पर किया जाता है. साइट ग्राहक के बैंक कार्ड डेटा को न तो संग्रहीत करती है और न ही प्रोसेस करती है.",
          "ग्राहक का भुगतान दायित्व उस क्षण से पूरा माना जाता है जब धनराशि प्रदाता के बैंक खाते में जमा हो जाती है या भुगतान प्रणाली से सफल भुगतान की पुष्टि प्राप्त होती है.",
          "सफल भुगतान के बाद, ग्राहक को निर्दिष्ट संपर्क चैनल के माध्यम से या चुने गए क्यूरेटर से भागीदारी की पुष्टि प्राप्त होती है."
        ]
      },
      specialConditions: {
        title: "7. विशेष शर्तें",
        body: [
          "समारोहों के दौरान प्रदान की जाने वाली सभी जानकारी (व्याख्यान, वीडियो, ऑडियो, पद्धतिगत और अन्य सामग्री सहित) प्रदाता और/या शामिल क्यूरेटरों की बौद्धिक संपदा है और रूसी बौद्धिक संपदा कानून द्वारा संरक्षित है.",
          "ग्राहक को प्रदाता की अलग लिखित अनुमति के बिना समारोह तक पहुँच विवरण (लिंक, पासवर्ड) तीसरे पक्षों के साथ साझा करने की मनाही है. प्रदाता को गलत पहुँच विवरण का उपयोग करने वाले या किसी अन्य प्रतिभागी द्वारा पहले से उपयोग किए जा रहे विवरण का उपयोग करने वाले व्यक्ति को भागीदारी से अलग करने का अधिकार है.",
          "ग्राहक और अन्य प्रतिभागियों को इस ऑफर के तहत प्राप्त सामग्री को व्यावसायिक या गैर-व्यावसायिक उद्देश्यों के लिए वितरित (प्रकाशित, वेबसाइटों पर पोस्ट, प्रतिलिपि, स्थानांतरित या तीसरे पक्षों को पुनर्विक्रय) करने, उनके आधार पर व्युत्पन्न सूचना उत्पाद बनाने, या व्यक्तिगत, गैर-व्यावसायिक उपयोग के अलावा किसी अन्य तरीके से उनका उपयोग करने की मनाही है.",
          "प्रदाता की अलग लिखित अनुमति के बिना प्रतिभागियों द्वारा समारोह की रिकॉर्डिंग (ऑडियो, वीडियो, स्क्रीनशॉट) करना प्रतिबंधित है."
        ]
      },
      liability: {
        title: "8. पक्षों का दायित्व",
        body: [
          "प्रदाता ग्राहक की ओर से इंटरनेट कनेक्शन, उपकरण या सॉफ़्टवेयर की खराबी से संबंधित कारणों से सेवाएँ प्रदान करने में असमर्थता के लिए उत्तरदायी नहीं है.",
          "इस ऑफर के तहत दायित्वों के गैर-निष्पादन या अनुचित निष्पादन के लिए, पक्ष लागू रूसी कानून के अनुसार उत्तरदायी हैं.",
          "यदि अनुरोध में गलत या अधूरा डेटा है, तो प्रदाता वास्तविक ग्राहक के बजाय अनुरोध में निर्दिष्ट व्यक्ति को सूचना सामग्री और पहुँच प्रदान करने, या ग्राहक द्वारा गलत डेटा प्रदान किए जाने के कारण होने वाले अन्य नकारात्मक परिणामों के लिए उत्तरदायी नहीं है.",
          "यदि किसी कारण से, जो प्रदाता के नियंत्रण से बाहर है या फोर्स माजॉर से संबंधित है, कोई समारोह मूल रूप से घोषित तिथि पर आयोजित नहीं किया जा सकता, तो प्रदाता का दायित्व समारोह को नई तारीख पर आयोजित करने या ग्राहक को समकक्ष विकल्प प्रदान करने तक सीमित है.",
          "प्रदाता इस बात के लिए उत्तरदायी नहीं है कि ग्राहक और अन्य प्रतिभागी सूचना-परामर्श सेवाओं के दौरान प्राप्त जानकारी का उपयोग कैसे करते हैं, और न ही ऐसे उपयोग के परिणामों के लिए.",
          "इस समझौते के तहत प्रदाता का कुल दायित्व, इस ऑफर या उसके निष्पादन से संबंधित किसी भी दावे के लिए, संबंधित अनुरोध के लिए ग्राहक द्वारा प्रदाता को वास्तव में भुगतान की गई राशि तक सीमित है."
        ]
      },
      refund: {
        title: "9. वापसी",
        body: [
          "यदि ग्राहक समारोह शुरू होने से पहले भागीदारी रद्द करता है, तो वापसी प्रदाता द्वारा समारोह के आयोजन में वास्तव में किए गए खर्चों (क्यूरेटर के काम के भुगतान, स्थल की बुकिंग और अन्य प्रारंभिक खर्चों सहित) को ध्यान में रखते हुए की जाती है.",
          "वापसी की विस्तृत प्रक्रिया और शर्तें https://starvedas.ru/refund और https://chintamanidhama.ru/refund पर वापसी शर्तों के पृष्ठ पर प्रकाशित हैं और इस ऑफर का अभिन्न अंग हैं.",
          "यदि समारोह पहले ही हो चुका है, या ग्राहक और/या अन्य प्रतिभागियों को अनुरोध के हिस्से के रूप में परामर्श सहायता मिल चुकी है, तो रूसी उपभोक्ता संरक्षण कानून द्वारा स्पष्ट रूप से प्रदान किए गए मामलों को छोड़कर, राशि वापस नहीं की जाती."
        ]
      },
      term: {
        title: "10. समझौते की अवधि और संशोधन",
        body: [
          "यह समझौता ग्राहक द्वारा ऑफर की स्वीकृति (अनुरोध का भुगतान) के क्षण से लागू होता है और तब तक प्रभावी रहता है जब तक पक्ष अपने दायित्वों को पूरी तरह से पूरा नहीं कर लेते या इस ऑफर और रूसी कानून द्वारा प्रदान किए गए आधारों पर इसे समाप्त नहीं किया जाता.",
          "इस ऑफर को ग्राहक और प्रदाता की मुहर और/या हस्ताक्षर की आवश्यकता नहीं है, फिर भी यह नागरिक संहिता के अनुच्छेद 434 और 438 के अनुसार पूर्ण कानूनी बल बनाए रखता है.",
          "प्रदाता को बिना किसी पूर्व सहमति के किसी भी समय इस ऑफर की शर्तों को एकतरफा रूप से बदलने का अधिकार है, बशर्ते बदली हुई शर्तें https://starvedas.ru/legal/offer और https://chintamanidhama.ru/legal/offer पर लागू होने से कम से कम 1 (एक) दिन पहले प्रकाशित की जाएँ. परिवर्तन प्रकाशित होने के बाद नया अनुरोध जमा करने का अर्थ है कि ग्राहक ऑफर के नए संस्करण से सहमत है.",
          "पक्ष किसी भी विवाद और असहमति को बातचीत के माध्यम से हल करेंगे. यदि सहमति नहीं बनती है, तो विवाद को प्रदाता के स्थान पर लागू रूसी कानून द्वारा प्रदान की गई प्रक्रिया के अनुसार हल किया जाएगा. इस ऑफर द्वारा विनियमित न किए गए सभी मामलों को रूसी कानून के अनुसार हल किया जाएगा."
        ]
      }
    }
  }
};

export function getOfferCopy(locale: string | null | undefined) {
  return copies[normalizeLocale(locale)];
}
