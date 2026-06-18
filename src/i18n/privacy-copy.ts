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
    lead: "Настоящая Политика определяет порядок обработки персональных данных и меры по обеспечению их безопасности при использовании сайта https://starvedas.ru или https://chintamanidhama.ru, в том числе при оформлении заявки на участие в церемониях.",
    pageTitle: "Политика в отношении обработки персональных данных",
    sections: [
      {
        title: "1. Общие положения",
        body: [
          "Настоящая Политика в отношении обработки персональных данных (далее — «Политика») составлена в соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» (далее — «Закон о персональных данных») и определяет порядок обработки персональных данных и меры по обеспечению безопасности персональных данных, предпринимаемые {{seller}} (далее — «Оператор»).",
          "Оператор ставит своей важнейшей целью и условием осуществления своей деятельности соблюдение прав и свобод человека и гражданина при обработке его персональных данных, в том числе защиту прав на неприкосновенность частной жизни, личную и семейную тайну.",
          "Настоящая Политика применяется ко всей информации, которую Оператор может получить о посетителях веб-сайта https://starvedas.ru или https://chintamanidhama.ru (далее — «Сайт»), включая лиц, оформляющих заявки на участие в церемониях, лекциях и видеоконсультациях."
        ]
      },
      {
        title: "2. Основные понятия, используемые в Политике",
        body: [
          "Автоматизированная обработка персональных данных — обработка персональных данных с помощью средств вычислительной техники. Блокирование персональных данных — временное прекращение обработки персональных данных (за исключением случаев, если обработка необходима для уточнения персональных данных). Информационная система персональных данных — совокупность содержащихся в базах данных персональных данных и обеспечивающих их обработку информационных технологий и технических средств. Обезличивание персональных данных — действия, в результате которых становится невозможным без использования дополнительной информации определить принадлежность персональных данных конкретному пользователю или иному субъекту персональных данных.",
          "Обработка персональных данных — любое действие (операция) или совокупность действий (операций), совершаемых с использованием средств автоматизации или без использования таких средств с персональными данными, включая сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передачу (распространение, предоставление, доступ), обезличивание, блокирование, удаление и уничтожение персональных данных. Оператор — лицо, самостоятельно или совместно с другими лицами организующее и (или) осуществляющее обработку персональных данных, а также определяющее цели обработки, состав персональных данных, подлежащих обработке, и совершаемые с ними действия.",
          "Персональные данные — любая информация, относящаяся прямо или косвенно к определенному или определяемому пользователю Сайта. Пользователь — любой посетитель Сайта https://starvedas.ru или https://chintamanidhama.ru, в том числе лицо, оформляющее заявку на участие в церемонии. Предоставление персональных данных — действия, направленные на раскрытие персональных данных определенному лицу или определенному кругу лиц. Распространение персональных данных — любые действия, направленные на раскрытие персональных данных неопределенному кругу лиц.",
          "Трансграничная передача персональных данных — передача персональных данных на территорию иностранного государства органу власти иностранного государства, иностранному физическому или иностранному юридическому лицу. Уничтожение персональных данных — любые действия, в результате которых персональные данные уничтожаются безвозвратно с невозможностью восстановления их содержания в информационной системе персональных данных и (или) уничтожаются материальные носители персональных данных."
        ]
      },
      {
        title: "3. Основные права и обязанности Оператора",
        body: [
          "Оператор имеет право: получать от субъекта персональных данных достоверные информацию и (или) документы, содержащие персональные данные; в случае отзыва субъектом персональных данных согласия на обработку персональных данных, а также при поступлении требования о прекращении обработки персональных данных — продолжить их обработку без согласия субъекта при наличии оснований, предусмотренных Законом о персональных данных; самостоятельно определять состав и перечень мер, необходимых и достаточных для обеспечения исполнения обязанностей, предусмотренных Законом о персональных данных и принятыми в соответствии с ним нормативными актами.",
          "Оператор обязан: предоставлять субъекту персональных данных по его просьбе информацию, касающуюся обработки его персональных данных; организовывать обработку персональных данных в порядке, установленном действующим законодательством РФ; отвечать на обращения и запросы субъектов персональных данных и их законных представителей в соответствии с требованиями Закона о персональных данных; сообщать в уполномоченный орган по защите прав субъектов персональных данных по его запросу необходимую информацию в течение 10 дней с даты получения такого запроса; публиковать или иным образом обеспечивать неограниченный доступ к настоящей Политике; принимать правовые, организационные и технические меры для защиты персональных данных от неправомерного или случайного доступа, уничтожения, изменения, блокирования, копирования, предоставления, распространения персональных данных, а также от иных неправомерных действий в отношении персональных данных; прекратить передачу (распространение, предоставление, доступ), обработку и уничтожить персональные данные в порядке и случаях, предусмотренных Законом о персональных данных."
        ]
      },
      {
        title: "4. Основные права и обязанности субъектов персональных данных",
        body: [
          "Субъекты персональных данных имеют право: получать информацию, касающуюся обработки их персональных данных, за исключением случаев, предусмотренных федеральными законами (сведения предоставляются Оператором в доступной форме и не должны содержать персональные данные, относящиеся к другим субъектам, за исключением случаев, когда имеются законные основания для раскрытия таких данных); требовать от Оператора уточнения своих персональных данных, их блокирования или уничтожения, если они являются неполными, устаревшими, неточными, незаконно полученными или не являются необходимыми для заявленной цели обработки, а также принимать иные предусмотренные законом меры по защите своих прав; выдвигать условие предварительного согласия при обработке персональных данных в целях продвижения товаров, работ и услуг на рынке; отзывать согласие на обработку персональных данных, а также направлять требование о прекращении такой обработки; обжаловать в уполномоченный орган по защите прав субъектов персональных данных или в судебном порядке неправомерные действия или бездействие Оператора; осуществлять иные права, предусмотренные законодательством РФ.",
          "Субъекты персональных данных обязаны предоставлять Оператору достоверные данные о себе и сообщать Оператору об уточнении (обновлении, изменении) своих персональных данных. Лица, передавшие Оператору недостоверные сведения о себе либо сведения о другом субъекте персональных данных без согласия последнего, несут ответственность в соответствии с законодательством РФ."
        ]
      },
      {
        title: "5. Принципы обработки персональных данных",
        body: [
          "Обработка персональных данных осуществляется на законной и справедливой основе и ограничивается достижением конкретных, заранее определенных и законных целей. Не допускается обработка персональных данных, несовместимая с целями их сбора, а также объединение баз данных, содержащих персональные данные, обработка которых осуществляется в целях, несовместимых между собой.",
          "Обработке подлежат только персональные данные, которые отвечают целям их обработки. Содержание и объем обрабатываемых персональных данных соответствуют заявленным целям обработки; их избыточность по отношению к этим целям не допускается. Оператор обеспечивает точность персональных данных, их достаточность, а в необходимых случаях и актуальность по отношению к целям обработки, принимает меры по удалению или уточнению неполных или неточных данных.",
          "Хранение персональных данных осуществляется в форме, позволяющей определить субъекта персональных данных, не дольше, чем этого требуют цели обработки, если иной срок хранения не установлен федеральным законом или договором, стороной которого является субъект персональных данных. Обрабатываемые персональные данные уничтожаются либо обезличиваются по достижении целей обработки или в случае утраты необходимости в их достижении, если иное не предусмотрено федеральным законом."
        ]
      },
      {
        title: "6. Состав и цели обработки персональных данных",
        body: [
          "При оформлении заявки на Сайте могут обрабатываться следующие персональные данные: имя и фамилия заказчика; контакт в Telegram; номер телефона; адрес электронной почты; выбранные куратор и церемония; количество участников и список участников (имя и фамилия каждого из них).",
          "Персональные данные обрабатываются в следующих целях: прием и обработка заявки; связь с заказчиком по выбранному им каналу связи; организация участия в выбранной церемонии и передача необходимых данных куратору; расчет стоимости услуги и подтверждение факта оплаты; заключение, исполнение и прекращение гражданско-правового договора (акцепт публичной оферты); информирование заказчика о статусе заявки, изменениях расписания и предстоящих мероприятиях; рассмотрение обращений и запросов субъектов персональных данных.",
          "Сайт не запрашивает и не хранит данные банковских карт и иные платежные реквизиты пользователей — оплата осуществляется на защищенной странице платежной системы, которая выступает самостоятельным оператором персональных данных в части обработки платежных данных и действует в соответствии с собственными правилами и политикой конфиденциальности.",
          "Правовыми основаниями обработки персональных данных являются: согласие субъекта персональных данных на обработку его персональных данных; договор (акцепт публичной оферты), стороной которого, выгодоприобретателем или поручителем по которому является субъект персональных данных; учредительные документы Оператора и требования действующего законодательства Российской Федерации."
        ]
      },
      {
        title: "7. Условия обработки персональных данных",
        body: [
          "Обработка персональных данных осуществляется с согласия субъекта персональных данных на обработку его персональных данных, а также в иных случаях, прямо предусмотренных законодательством Российской Федерации о персональных данных, в частности когда обработка необходима для исполнения договора, стороной которого либо выгодоприобретателем или поручителем по которому является субъект персональных данных, в том числе для заключения договора по инициативе субъекта персональных данных, для осуществления прав и законных интересов Оператора или третьих лиц либо для достижения общественно значимых целей при условии, что при этом не нарушаются права и свободы субъекта персональных данных.",
          "Также осуществляется обработка персональных данных, доступ неограниченного круга лиц к которым предоставлен субъектом персональных данных либо по его просьбе (общедоступные персональные данные), и персональных данных, подлежащих опубликованию или обязательному раскрытию в соответствии с федеральным законом."
        ]
      },
      {
        title: "8. Порядок сбора, хранения, передачи и других видов обработки персональных данных",
        body: [
          "Безопасность персональных данных, обрабатываемых Оператором, обеспечивается путем реализации правовых, организационных и технических мер, необходимых для выполнения в полном объеме требований действующего законодательства в области защиты персональных данных. Оператор обеспечивает сохранность персональных данных и принимает все возможные меры, исключающие доступ к ним неуполномоченных лиц.",
          "Персональные данные пользователя не передаются третьим лицам, за исключением случаев, связанных с исполнением действующего законодательства, исполнением заявки (договора) с заказчиком, либо при наличии согласия субъекта персональных данных на передачу его данных третьему лицу, в том числе куратору, для организации участия в церемонии.",
          "Вся информация, которая собирается сторонними сервисами, в том числе платежными системами, средствами связи и иными поставщиками услуг, хранится и обрабатывается этими лицами (операторами) в соответствии с их собственными пользовательскими соглашениями и политиками конфиденциальности. Оператор не несет ответственности за действия таких третьих лиц.",
          "В случае выявления неточностей в персональных данных пользователь может актуализировать их самостоятельно, направив Оператору уведомление на адрес электронной почты {{email}} с пометкой «Актуализация персональных данных». Срок обработки персональных данных определяется достижением целей, для которых они были собраны, если иной срок не предусмотрен договором или действующим законодательством.",
          "Условиями прекращения обработки персональных данных являются: достижение целей обработки персональных данных; истечение срока действия согласия субъекта персональных данных или его отзыв; поступление требования о прекращении обработки персональных данных; выявление неправомерной обработки персональных данных."
        ]
      },
      {
        title: "9. Перечень действий, производимых Оператором с полученными персональными данными",
        body: [
          "Оператор осуществляет сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передачу (распространение, предоставление, доступ), обезличивание, блокирование, удаление и уничтожение персональных данных.",
          "Оператор осуществляет автоматизированную обработку персональных данных с получением и (или) передачей полученной информации по информационно-телекоммуникационным сетям или без таковой."
        ]
      },
      {
        title: "10. Трансграничная передача персональных данных",
        body: [
          "Трансграничная передача персональных данных Оператором не осуществляется. В случае возникновения необходимости трансграничной передачи персональных данных Оператор предварительно уведомит уполномоченный орган по защите прав субъектов персональных данных о своем намерении осуществлять такую передачу в порядке, предусмотренном Законом о персональных данных, и получит от принимающей стороны необходимые сведения о порядке обработки и защиты передаваемых персональных данных."
        ]
      },
      {
        title: "11. Конфиденциальность персональных данных",
        body: [
          "Оператор и иные лица, получившие доступ к персональным данным, обязаны не раскрывать третьим лицам и не распространять персональные данные без согласия субъекта персональных данных, если иное не предусмотрено федеральным законом."
        ]
      },
      {
        title: "12. Права пользователя и заключительные положения",
        body: [
          "Пользователь может в любой момент отозвать свое согласие на обработку персональных данных, направив Оператору уведомление по электронной почте на адрес {{email}} с пометкой «Отзыв согласия на обработку персональных данных», а также получить любые разъяснения по интересующим вопросам, касающимся обработки его персональных данных, обратившись к Оператору по тому же адресу.",
          "Любые изменения настоящей Политики будут отражены в данном документе. Политика действует бессрочно до замены ее новой версией. Актуальная версия Политики в свободном доступе расположена в сети Интернет по адресу https://starvedas.ru/legal/privacy и https://chintamanidhama.ru/legal/privacy.",
          "Сведения об Операторе: {{seller}}, ИНН {{inn}}, адрес местонахождения: {{address}}. Контактный адрес электронной почты: {{email}}."
        ]
      }
    ]
  },
  en: {
    actions: {
      contacts: "Contacts",
      signup: "Back to signup"
    },
    lead: "This Policy sets out how personal data is processed and protected when using the websites https://starvedas.ru and https://chintamanidhama.ru, including when submitting a request to take part in a ceremony.",
    pageTitle: "Personal data processing policy",
    sections: [
      {
        title: "1. General provisions",
        body: [
          'This personal data processing policy (the "Policy") is prepared in accordance with Federal Law No. 152-FZ of 27.07.2006 "On Personal Data" (the "Personal Data Law") and sets out the procedure for processing personal data and the measures taken by {{seller}} (the "Operator") to ensure their security.',
          "The Operator's most important goal and condition for carrying out its activities is to respect the rights and freedoms of individuals when processing their personal data, including the protection of the right to privacy and personal and family secrets.",
          "This Policy applies to all information the Operator may obtain about visitors of the website https://starvedas.ru or https://chintamanidhama.ru (the \"Site\"), including individuals submitting requests to participate in ceremonies, lectures and video consultations."
        ]
      },
      {
        title: "2. Key terms used in the Policy",
        body: [
          'Automated processing of personal data means processing of personal data using computer technology. Blocking of personal data means temporary suspension of processing (except where processing is required to clarify the data). A personal data information system is a set of personal data contained in databases together with the information technologies and technical means that ensure its processing. De-identification means actions that make it impossible, without additional information, to determine that personal data belongs to a specific user or other data subject.',
          'Processing of personal data means any action or set of actions performed with personal data, with or without automation, including collection, recording, systematization, accumulation, storage, clarification, extraction, use, transfer (distribution, provision, access), de-identification, blocking, deletion and destruction. The Operator is the person who, alone or jointly with others, organizes and/or carries out the processing of personal data and determines the purposes of processing, the categories of personal data to be processed and the actions performed with them.',
          'Personal data means any information relating directly or indirectly to an identified or identifiable user of the Site. A "User" is any visitor of https://starvedas.ru or https://chintamanidhama.ru, including a person submitting a request to participate in a ceremony. "Provision" of personal data means actions aimed at disclosing personal data to a specific person or a specific group of persons. "Distribution" of personal data means any actions aimed at disclosing personal data to an indefinite group of persons.',
          'Cross-border transfer of personal data means the transfer of personal data to the territory of a foreign state to an authority of a foreign state, a foreign individual or a foreign legal entity. "Destruction" of personal data means any actions as a result of which personal data is irrevocably destroyed with no possibility of restoring its content in the personal data information system and/or the physical media containing personal data are destroyed.'
        ]
      },
      {
        title: "3. Main rights and obligations of the Operator",
        body: [
          "The Operator has the right to: request from the data subject reliable information and/or documents containing personal data; if the data subject withdraws consent or requests that processing be stopped, continue processing the personal data without consent where grounds for doing so are provided by the Personal Data Law; independently determine the scope and list of measures necessary and sufficient to fulfil the obligations established by the Personal Data Law and related regulations.",
          "The Operator is obliged to: provide the data subject, at their request, with information regarding the processing of their personal data; organize the processing of personal data in accordance with applicable Russian law; respond to requests and inquiries from data subjects and their legal representatives in accordance with the Personal Data Law; report to the authorized body for the protection of the rights of personal data subjects, at its request, the necessary information within 10 days of receiving such a request; publish or otherwise ensure unrestricted access to this Policy; take legal, organizational and technical measures to protect personal data from unlawful or accidental access, destruction, modification, blocking, copying, provision, distribution and other unlawful actions; stop the transfer (distribution, provision, access), processing and destroy personal data in the manner and in the cases provided for by the Personal Data Law."
        ]
      },
      {
        title: "4. Main rights and obligations of personal data subjects",
        body: [
          "Personal data subjects have the right to: receive information regarding the processing of their personal data, except as provided by federal laws (such information is provided by the Operator in an accessible form and must not contain personal data of other subjects, unless there are lawful grounds for disclosing such data); require the Operator to clarify their personal data, block or destroy it if it is incomplete, outdated, inaccurate, unlawfully obtained, or not necessary for the stated purpose of processing, and to take other legal measures to protect their rights; require prior consent when personal data is processed for the purposes of promoting goods, works and services on the market; withdraw consent to the processing of personal data and request that such processing be stopped; appeal unlawful actions or omissions of the Operator to the authorized body for the protection of the rights of personal data subjects or in court; exercise other rights provided by Russian law.",
          "Personal data subjects are obliged to provide the Operator with reliable information about themselves and to notify the Operator of any changes to such data. Persons who have provided the Operator with unreliable information about themselves, or information about another data subject without that subject's consent, shall be liable in accordance with Russian law."
        ]
      },
      {
        title: "5. Principles of personal data processing",
        body: [
          "Personal data is processed on a lawful and fair basis and is limited to achieving specific, predetermined and legitimate purposes. Processing of personal data that is incompatible with the purposes of its collection is not permitted, nor is the merging of databases containing personal data processed for incompatible purposes.",
          "Only personal data that meets the purposes of its processing is subject to processing. The content and scope of the personal data processed correspond to the stated purposes of processing; excessive personal data in relation to those purposes is not allowed. The Operator ensures the accuracy, sufficiency and, where necessary, relevance of personal data in relation to the purposes of processing, and takes measures to delete or clarify incomplete or inaccurate data.",
          "Personal data is stored in a form that allows the data subject to be identified for no longer than is required for the purposes of processing, unless a different storage period is established by federal law or by an agreement to which the data subject is a party. Personal data being processed is destroyed or de-identified once the purposes of processing have been achieved or the need to achieve them has been lost, unless otherwise provided by federal law."
        ]
      },
      {
        title: "6. Categories and purposes of personal data processing",
        body: [
          "When submitting a request on the Site, the following personal data may be processed: the customer's name and surname; Telegram contact; phone number; email address; the selected curator and ceremony; the number of participants and the list of participants (name and surname of each).",
          "Personal data is processed for the following purposes: receiving and processing the request; communicating with the customer through the channel they have chosen; organizing participation in the selected ceremony and transferring the necessary data to the curator; calculating the cost of the service and confirming payment; concluding, performing and terminating a civil-law agreement (acceptance of the public offer); informing the customer about the request status, schedule changes and upcoming events; and handling inquiries and requests from personal data subjects.",
          "The Site does not request or store users' bank card data or other payment details — payment is made on the secure page of the payment system, which acts as an independent personal data operator with respect to the processing of payment data and operates under its own rules and privacy policy.",
          "The legal grounds for processing personal data are: the consent of the personal data subject to the processing of their personal data; an agreement (acceptance of the public offer) to which the personal data subject is a party, beneficiary or guarantor; the Operator's constituent documents and the requirements of applicable Russian law."
        ]
      },
      {
        title: "7. Conditions for processing personal data",
        body: [
          "Personal data is processed with the consent of the data subject, as well as in other cases expressly provided for by Russian personal data legislation, in particular where processing is necessary for the performance of an agreement to which the data subject is a party, beneficiary or guarantor, including for concluding an agreement on the initiative of the data subject, for the exercise of the rights and legitimate interests of the Operator or third parties, or for achieving socially significant purposes, provided that the rights and freedoms of the data subject are not violated.",
          "Processing is also carried out in respect of personal data to which an unlimited group of persons has been granted access by the data subject or at their request (publicly available personal data), and personal data subject to publication or mandatory disclosure in accordance with federal law."
        ]
      },
      {
        title: "8. Procedure for collection, storage, transfer and other processing of personal data",
        body: [
          "The security of personal data processed by the Operator is ensured through legal, organizational and technical measures necessary to fully comply with applicable Russian legislation on personal data protection. The Operator ensures the safety of personal data and takes all possible measures to prevent unauthorized access to it.",
          "A user's personal data is not transferred to third parties, except where necessary for compliance with applicable law, the performance of the request (agreement) with the customer, or where the data subject has consented to the transfer of their data to a third party, including a curator, for the purpose of organizing participation in a ceremony.",
          "All information collected by third-party services, including payment systems, communication tools and other service providers, is stored and processed by those persons (operators) in accordance with their own user agreements and privacy policies. The Operator is not responsible for the actions of such third parties.",
          "If inaccuracies in personal data are identified, the user may update it independently by sending the Operator a notice to {{email}} marked \"Personal data update\". The processing period for personal data is determined by the achievement of the purposes for which it was collected, unless a different period is provided by an agreement or applicable law.",
          "Processing of personal data is terminated when: the purposes of processing have been achieved; the consent of the data subject has expired or been withdrawn; a request to stop processing has been received; or unlawful processing of personal data has been identified."
        ]
      },
      {
        title: "9. List of actions performed by the Operator with the personal data received",
        body: [
          "The Operator carries out the collection, recording, systematization, accumulation, storage, clarification (updating, modification), extraction, use, transfer (distribution, provision, access), de-identification, blocking, deletion and destruction of personal data.",
          "The Operator carries out automated processing of personal data, including the receipt and/or transfer of the resulting information via information and telecommunication networks or otherwise."
        ]
      },
      {
        title: "10. Cross-border transfer of personal data",
        body: [
          "The Operator does not carry out cross-border transfers of personal data. Should the need for a cross-border transfer of personal data arise, the Operator will first notify the authorized body for the protection of the rights of personal data subjects of its intention to carry out such a transfer, in the manner provided for by the Personal Data Law, and will obtain from the receiving party the necessary information on how the transferred personal data will be processed and protected."
        ]
      },
      {
        title: "11. Confidentiality of personal data",
        body: [
          "The Operator and other persons who have gained access to personal data are obliged not to disclose it to third parties or distribute it without the consent of the data subject, unless otherwise provided by federal law."
        ]
      },
      {
        title: "12. User rights and final provisions",
        body: [
          "The user may withdraw their consent to the processing of personal data at any time by sending the Operator a notice by email to {{email}} marked \"Withdrawal of consent to personal data processing\", and may also obtain any clarification regarding the processing of their personal data by contacting the Operator at the same address.",
          "Any changes to this Policy will be reflected in this document. The Policy is valid indefinitely until replaced by a new version. The current version of the Policy is freely available on the Internet at https://starvedas.ru/legal/privacy and https://chintamanidhama.ru/legal/privacy.",
          "Operator details: {{seller}}, Tax ID {{inn}}, registered address: {{address}}. Contact email: {{email}}."
        ]
      }
    ]
  },
  hi: {
    actions: {
      contacts: "संपर्क",
      signup: "बुकिंग पर वापस"
    },
    lead: "यह नीति बताती है कि साइट https://starvedas.ru या https://chintamanidhama.ru का उपयोग करते समय, जिसमें किसी समारोह में भागीदारी हेतु अनुरोध जमा करना शामिल है, व्यक्तिगत डेटा को कैसे प्रोसेस और सुरक्षित किया जाता है.",
    pageTitle: "व्यक्तिगत डेटा प्रोसेसिंग नीति",
    sections: [
      {
        title: "1. सामान्य प्रावधान",
        body: [
          'यह व्यक्तिगत डेटा प्रोसेसिंग नीति ("नीति") 27.07.2006 के संघीय कानून संख्या 152-FZ "व्यक्तिगत डेटा के बारे में" ("व्यक्तिगत डेटा कानून") के अनुसार तैयार की गई है और {{seller}} ("ऑपरेटर") द्वारा व्यक्तिगत डेटा प्रोसेसिंग प्रक्रिया और उसकी सुरक्षा सुनिश्चित करने के उपायों को परिभाषित करती है.',
          "ऑपरेटर का सबसे महत्वपूर्ण लक्ष्य व्यक्तिगत डेटा प्रोसेस करते समय व्यक्ति और नागरिक के अधिकारों और स्वतंत्रताओं का सम्मान करना है, जिसमें निजता, व्यक्तिगत और पारिवारिक रहस्य की सुरक्षा का अधिकार शामिल है.",
          "यह नीति वेबसाइट https://starvedas.ru या https://chintamanidhama.ru (\"साइट\") के आगंतुकों के बारे में ऑपरेटर को मिल सकने वाली सभी जानकारी पर लागू होती है, जिसमें समारोहों, व्याख्यानों और वीडियो परामर्शों में भाग लेने के लिए अनुरोध जमा करने वाले व्यक्ति भी शामिल हैं."
        ]
      },
      {
        title: "2. नीति में प्रयुक्त मुख्य शब्द",
        body: [
          "स्वचालित प्रोसेसिंग का अर्थ है कंप्यूटर तकनीक की सहायता से व्यक्तिगत डेटा को प्रोसेस करना. अवरोधन का अर्थ है प्रोसेसिंग का अस्थायी निलंबन (उन मामलों को छोड़कर जहाँ डेटा स्पष्ट करने के लिए प्रोसेसिंग आवश्यक हो). व्यक्तिगत डेटा सूचना प्रणाली डेटाबेस में निहित व्यक्तिगत डेटा और उसकी प्रोसेसिंग सुनिश्चित करने वाली सूचना प्रौद्योगिकियों और तकनीकी साधनों का समूह है. अनाम करण का अर्थ है ऐसी कार्रवाइयाँ जिनके परिणामस्वरूप अतिरिक्त जानकारी के बिना यह निर्धारित करना असंभव हो जाता है कि व्यक्तिगत डेटा किसी विशिष्ट उपयोगकर्ता या अन्य विषय से संबंधित है.",
          "व्यक्तिगत डेटा प्रोसेसिंग का अर्थ है व्यक्तिगत डेटा के साथ की गई कोई भी कार्रवाई या कार्रवाइयों का समूह, चाहे स्वचालन के साथ हो या उसके बिना, जिसमें संग्रह, रिकॉर्डिंग, व्यवस्थितकरण, संचय, भंडारण, स्पष्टीकरण, निष्कर्षण, उपयोग, स्थानांतरण (वितरण, प्रावधान, पहुँच), अनाम करण, अवरोधन, हटाना और नष्ट करना शामिल है. ऑपरेटर वह व्यक्ति है जो अकेले या अन्य व्यक्तियों के साथ मिलकर व्यक्तिगत डेटा की प्रोसेसिंग का आयोजन और/या संचालन करता है और प्रोसेसिंग के उद्देश्यों, प्रोसेस किए जाने वाले व्यक्तिगत डेटा की संरचना और उसके साथ की जाने वाली कार्रवाइयों को निर्धारित करता है.",
          "व्यक्तिगत डेटा कोई भी जानकारी है जो साइट के किसी पहचाने गए या पहचाने जाने योग्य उपयोगकर्ता से प्रत्यक्ष या अप्रत्यक्ष रूप से संबंधित है. \"उपयोगकर्ता\" https://starvedas.ru या https://chintamanidhama.ru का कोई भी आगंतुक है, जिसमें समारोह में भागीदारी के लिए अनुरोध जमा करने वाला व्यक्ति भी शामिल है. व्यक्तिगत डेटा का \"प्रावधान\" किसी विशिष्ट व्यक्ति या व्यक्तियों के विशिष्ट समूह को व्यक्तिगत डेटा प्रकट करने की दिशा में की गई कार्रवाइयाँ हैं. व्यक्तिगत डेटा का \"वितरण\" व्यक्तियों के अनिश्चित समूह को व्यक्तिगत डेटा प्रकट करने की दिशा में की गई कोई भी कार्रवाई है.",
          "व्यक्तिगत डेटा का सीमा-पार स्थानांतरण किसी विदेशी राज्य के क्षेत्र में किसी विदेशी राज्य के प्राधिकरण, किसी विदेशी व्यक्ति या विदेशी कानूनी इकाई को व्यक्तिगत डेटा का स्थानांतरण है. व्यक्तिगत डेटा का \"विनाश\" ऐसी कोई भी कार्रवाई है जिसके परिणामस्वरूप व्यक्तिगत डेटा को अपरिवर्तनीय रूप से नष्ट कर दिया जाता है, जिससे सूचना प्रणाली में इसकी सामग्री को पुनर्स्थापित करना असंभव हो जाता है, और/या जिसमें व्यक्तिगत डेटा वाले भौतिक मीडिया को नष्ट कर दिया जाता है."
        ]
      },
      {
        title: "3. ऑपरेटर के मुख्य अधिकार और दायित्व",
        body: [
          "ऑपरेटर को अधिकार है: डेटा विषय से व्यक्तिगत डेटा वाली विश्वसनीय जानकारी और/या दस्तावेज़ प्राप्त करना; यदि डेटा विषय सहमति वापस लेता है या प्रोसेसिंग रोकने का अनुरोध करता है, तो व्यक्तिगत डेटा कानून द्वारा प्रदत्त आधारों के अस्तित्व में सहमति के बिना प्रोसेसिंग जारी रखना; व्यक्तिगत डेटा कानून और संबंधित विनियमों द्वारा स्थापित दायित्वों को पूरा करने के लिए आवश्यक और पर्याप्त उपायों के दायरे और सूची को स्वतंत्र रूप से निर्धारित करना.",
          "ऑपरेटर बाध्य है: डेटा विषय के अनुरोध पर उसके व्यक्तिगत डेटा की प्रोसेसिंग के बारे में जानकारी प्रदान करना; लागू रूसी कानून के अनुसार व्यक्तिगत डेटा की प्रोसेसिंग का आयोजन करना; व्यक्तिगत डेटा कानून की आवश्यकताओं के अनुसार डेटा विषयों और उनके कानूनी प्रतिनिधियों के अनुरोधों और पूछताछ का जवाब देना; व्यक्तिगत डेटा विषयों के अधिकारों की सुरक्षा के लिए अधिकृत निकाय के अनुरोध पर 10 दिनों के भीतर आवश्यक जानकारी प्रदान करना; इस नीति तक असीमित पहुँच प्रकाशित करना या अन्यथा सुनिश्चित करना; व्यक्तिगत डेटा को अनधिकृत या आकस्मिक पहुँच, विनाश, संशोधन, अवरोधन, प्रतिलिपि, प्रावधान, वितरण और अन्य गैरकानूनी कार्रवाइयों से बचाने के लिए कानूनी, संगठनात्मक और तकनीकी उपाय करना; व्यक्तिगत डेटा कानून द्वारा प्रदान किए गए तरीके और मामलों में व्यक्तिगत डेटा का स्थानांतरण (वितरण, प्रावधान, पहुँच) रोकना, प्रोसेसिंग बंद करना और व्यक्तिगत डेटा नष्ट करना."
        ]
      },
      {
        title: "4. व्यक्तिगत डेटा विषयों के मुख्य अधिकार और दायित्व",
        body: [
          "व्यक्तिगत डेटा विषयों को अधिकार है: संघीय कानूनों द्वारा प्रदान किए गए मामलों को छोड़कर, अपने व्यक्तिगत डेटा की प्रोसेसिंग के बारे में जानकारी प्राप्त करना (ऐसी जानकारी ऑपरेटर द्वारा सुलभ रूप में प्रदान की जाती है और इसमें अन्य विषयों से संबंधित व्यक्तिगत डेटा नहीं होना चाहिए, जब तक कि ऐसे डेटा का खुलासा करने के लिए वैध आधार न हों); यदि व्यक्तिगत डेटा अपूर्ण, पुराना, गलत, गैरकानूनी रूप से प्राप्त किया गया है, या प्रोसेसिंग के घोषित उद्देश्य के लिए आवश्यक नहीं है, तो ऑपरेटर से उसे स्पष्ट करने, अवरुद्ध करने या नष्ट करने की मांग करना, साथ ही अपने अधिकारों की सुरक्षा के लिए कानून द्वारा प्रदान किए गए अन्य उपाय अपनाना; जब व्यक्तिगत डेटा का प्रोसेसिंग बाजार में सामान, कार्य और सेवाओं को बढ़ावा देने के उद्देश्य से किया जाता है, तो पूर्व सहमति की शर्त रखना; व्यक्तिगत डेटा प्रोसेसिंग के लिए सहमति वापस लेना और ऐसी प्रोसेसिंग रोकने की मांग करना; व्यक्तिगत डेटा विषयों के अधिकारों की सुरक्षा के लिए अधिकृत निकाय या अदालत में ऑपरेटर की गैरकानूनी कार्रवाइयों या निष्क्रियता के खिलाफ अपील करना; रूसी कानून द्वारा प्रदान किए गए अन्य अधिकारों का प्रयोग करना.",
          "व्यक्तिगत डेटा विषय ऑपरेटर को अपने बारे में विश्वसनीय डेटा प्रदान करने और ऐसे डेटा में किसी भी बदलाव की सूचना ऑपरेटर को देने के लिए बाध्य हैं. जिन व्यक्तियों ने ऑपरेटर को अपने बारे में अविश्वसनीय जानकारी, या किसी अन्य डेटा विषय के बारे में उसकी सहमति के बिना जानकारी प्रदान की है, वे रूसी कानून के अनुसार उत्तरदायी होंगे."
        ]
      },
      {
        title: "5. व्यक्तिगत डेटा प्रोसेसिंग के सिद्धांत",
        body: [
          "व्यक्तिगत डेटा को कानूनी और निष्पक्ष आधार पर प्रोसेस किया जाता है और यह विशिष्ट, पूर्व-निर्धारित और वैध उद्देश्यों की प्राप्ति तक सीमित है. व्यक्तिगत डेटा का ऐसा प्रोसेसिंग जो उसके संग्रह के उद्देश्यों से असंगत हो, अनुमत नहीं है, और न ही असंगत उद्देश्यों के लिए प्रोसेस किए गए व्यक्तिगत डेटा वाले डेटाबेस को मिलाने की अनुमति है.",
          "केवल वही व्यक्तिगत डेटा प्रोसेस किया जाता है जो उसकी प्रोसेसिंग के उद्देश्यों को पूरा करता है. प्रोसेस किए गए व्यक्तिगत डेटा की सामग्री और दायरा घोषित उद्देश्यों के अनुरूप है; इन उद्देश्यों के संबंध में अत्यधिक डेटा की अनुमति नहीं है. ऑपरेटर व्यक्तिगत डेटा की सटीकता, पर्याप्तता और जहाँ आवश्यक हो वहाँ प्रोसेसिंग के उद्देश्यों के संबंध में प्रासंगिकता सुनिश्चित करता है, और अपूर्ण या गलत डेटा को हटाने या स्पष्ट करने के उपाय करता है.",
          "व्यक्तिगत डेटा को ऐसे रूप में संग्रहीत किया जाता है जो डेटा विषय की पहचान करने की अनुमति देता है, प्रोसेसिंग के उद्देश्यों के लिए आवश्यक से अधिक समय तक नहीं, जब तक कि संघीय कानून या उस समझौते द्वारा जिसका डेटा विषय एक पक्ष है, अलग भंडारण अवधि स्थापित न की गई हो. प्रोसेसिंग के उद्देश्यों की प्राप्ति या उन्हें प्राप्त करने की आवश्यकता समाप्त होने पर प्रोसेस किए जा रहे व्यक्तिगत डेटा को नष्ट या अनाम कर दिया जाता है, जब तक कि संघीय कानून द्वारा अन्यथा प्रदान न किया गया हो."
        ]
      },
      {
        title: "6. व्यक्तिगत डेटा की श्रेणियाँ और प्रोसेसिंग के उद्देश्य",
        body: [
          "साइट पर अनुरोध जमा करते समय निम्नलिखित व्यक्तिगत डेटा प्रोसेस किया जा सकता है: ग्राहक का नाम और उपनाम; Telegram संपर्क; फोन नंबर; ईमेल पता; चुना हुआ क्यूरेटर और समारोह; प्रतिभागियों की संख्या और प्रत्येक का नाम और उपनाम सहित प्रतिभागियों की सूची.",
          "व्यक्तिगत डेटा निम्नलिखित उद्देश्यों के लिए प्रोसेस किया जाता है: अनुरोध प्राप्त करना और प्रोसेस करना; ग्राहक द्वारा चुने गए चैनल के माध्यम से उससे संवाद करना; चुने गए समारोह में भागीदारी का आयोजन करना और आवश्यक डेटा क्यूरेटर को स्थानांतरित करना; सेवा की लागत की गणना करना और भुगतान की पुष्टि करना; नागरिक-कानून समझौते (सार्वजनिक प्रस्ताव की स्वीकृति) का निष्कर्ष, निष्पादन और समाप्ति; ग्राहक को अनुरोध की स्थिति, अनुसूची में परिवर्तन और आगामी कार्यक्रमों के बारे में सूचित करना; और व्यक्तिगत डेटा विषयों की पूछताछ और अनुरोधों को संभालना.",
          "साइट उपयोगकर्ताओं का बैंक कार्ड डेटा या अन्य भुगतान विवरण न तो माँगती है और न ही संग्रहीत करती है — भुगतान भुगतान प्रणाली के सुरक्षित पृष्ठ पर किया जाता है, जो भुगतान डेटा की प्रोसेसिंग के संबंध में एक स्वतंत्र व्यक्तिगत डेटा ऑपरेटर के रूप में कार्य करती है और अपने स्वयं के नियमों और गोपनीयता नीति के तहत संचालित होती है.",
          "व्यक्तिगत डेटा प्रोसेसिंग के कानूनी आधार हैं: व्यक्तिगत डेटा विषय की अपने व्यक्तिगत डेटा की प्रोसेसिंग के लिए सहमति; एक समझौता (सार्वजनिक प्रस्ताव की स्वीकृति) जिसका व्यक्तिगत डेटा विषय एक पक्ष, लाभार्थी या गारंटर है; ऑपरेटर के संस्थापक दस्तावेज़ और लागू रूसी कानून की आवश्यकताएँ."
        ]
      },
      {
        title: "7. व्यक्तिगत डेटा प्रोसेसिंग की शर्तें",
        body: [
          "व्यक्तिगत डेटा को डेटा विषय की सहमति से, साथ ही रूसी व्यक्तिगत डेटा कानून द्वारा स्पष्ट रूप से प्रदान किए गए अन्य मामलों में प्रोसेस किया जाता है, विशेष रूप से जब प्रोसेसिंग किसी ऐसे समझौते के निष्पादन के लिए आवश्यक हो जिसका डेटा विषय एक पक्ष, लाभार्थी या गारंटर है, जिसमें डेटा विषय की पहल पर समझौता करना, ऑपरेटर या तीसरे पक्षों के अधिकारों और वैध हितों का प्रयोग करना, या सामाजिक रूप से महत्वपूर्ण उद्देश्यों को प्राप्त करना शामिल है, बशर्ते कि डेटा विषय के अधिकारों और स्वतंत्रताओं का उल्लंघन न हो.",
          "उन व्यक्तिगत डेटा का भी प्रोसेसिंग किया जाता है जिन तक डेटा विषय द्वारा या उसके अनुरोध पर व्यक्तियों के असीमित समूह को पहुँच प्रदान की गई है (सार्वजनिक रूप से उपलब्ध व्यक्तिगत डेटा), और ऐसे व्यक्तिगत डेटा जो संघीय कानून के अनुसार प्रकाशन या अनिवार्य खुलासे के अधीन हैं."
        ]
      },
      {
        title: "8. व्यक्तिगत डेटा के संग्रह, भंडारण, स्थानांतरण और अन्य प्रोसेसिंग की प्रक्रिया",
        body: [
          "ऑपरेटर द्वारा प्रोसेस किए गए व्यक्तिगत डेटा की सुरक्षा कानूनी, संगठनात्मक और तकनीकी उपायों के माध्यम से सुनिश्चित की जाती है जो व्यक्तिगत डेटा सुरक्षा पर लागू रूसी कानून की आवश्यकताओं का पूर्ण रूप से अनुपालन करने के लिए आवश्यक हैं. ऑपरेटर व्यक्तिगत डेटा की सुरक्षा सुनिश्चित करता है और इसे अनधिकृत व्यक्तियों की पहुँच से बचाने के लिए सभी संभव उपाय करता है.",
          "उपयोगकर्ता का व्यक्तिगत डेटा तीसरे पक्षों को स्थानांतरित नहीं किया जाता, सिवाय उन मामलों के जहाँ यह लागू कानून के अनुपालन, ग्राहक के साथ अनुरोध (समझौते) के निष्पादन के लिए आवश्यक हो, या जहाँ डेटा विषय ने समारोह में भागीदारी के आयोजन के उद्देश्य से क्यूरेटर सहित किसी तीसरे पक्ष को अपना डेटा स्थानांतरित करने के लिए सहमति दी हो.",
          "भुगतान प्रणालियों, संचार उपकरणों और अन्य सेवा प्रदाताओं सहित तृतीय-पक्ष सेवाओं द्वारा एकत्रित सभी जानकारी इन व्यक्तियों (ऑपरेटरों) द्वारा उनके अपने उपयोगकर्ता समझौतों और गोपनीयता नीतियों के अनुसार संग्रहीत और प्रोसेस की जाती है. ऑपरेटर ऐसे तीसरे पक्षों की कार्रवाइयों के लिए जिम्मेदार नहीं है.",
          "यदि व्यक्तिगत डेटा में अशुद्धियाँ पाई जाती हैं, तो उपयोगकर्ता {{email}} पर \"व्यक्तिगत डेटा अद्यतन\" अंकित एक सूचना भेजकर स्वतंत्र रूप से इसे अद्यतन कर सकता है. व्यक्तिगत डेटा की प्रोसेसिंग अवधि उन उद्देश्यों की प्राप्ति से निर्धारित होती है जिनके लिए इसे एकत्र किया गया था, जब तक कि किसी समझौते या लागू कानून द्वारा अलग अवधि प्रदान न की गई हो.",
          "व्यक्तिगत डेटा की प्रोसेसिंग निम्न स्थितियों में समाप्त की जाती है: प्रोसेसिंग के उद्देश्य प्राप्त हो जाने पर; डेटा विषय की सहमति की अवधि समाप्त होने या उसे वापस लेने पर; प्रोसेसिंग रोकने का अनुरोध प्राप्त होने पर; या व्यक्तिगत डेटा की गैरकानूनी प्रोसेसिंग का पता चलने पर."
        ]
      },
      {
        title: "9. प्राप्त व्यक्तिगत डेटा के साथ ऑपरेटर द्वारा की जाने वाली कार्रवाइयों की सूची",
        body: [
          "ऑपरेटर व्यक्तिगत डेटा का संग्रह, रिकॉर्डिंग, व्यवस्थितकरण, संचय, भंडारण, स्पष्टीकरण (अद्यतन, संशोधन), निष्कर्षण, उपयोग, स्थानांतरण (वितरण, प्रावधान, पहुँच), अनाम करण, अवरोधन, हटाना और विनाश करता है.",
          "ऑपरेटर सूचना और दूरसंचार नेटवर्क के माध्यम से प्राप्त जानकारी के स्थानांतरण के साथ या उसके बिना व्यक्तिगत डेटा की स्वचालित प्रोसेसिंग करता है."
        ]
      },
      {
        title: "10. व्यक्तिगत डेटा का सीमा-पार स्थानांतरण",
        body: [
          "ऑपरेटर व्यक्तिगत डेटा का सीमा-पार स्थानांतरण नहीं करता है. यदि व्यक्तिगत डेटा के सीमा-पार स्थानांतरण की आवश्यकता उत्पन्न होती है, तो ऑपरेटर व्यक्तिगत डेटा कानून द्वारा प्रदान की गई प्रक्रिया के अनुसार ऐसा स्थानांतरण करने के अपने इरादे के बारे में व्यक्तिगत डेटा विषयों के अधिकारों की सुरक्षा के लिए अधिकृत निकाय को पहले से सूचित करेगा, और प्राप्तकर्ता पक्ष से स्थानांतरित व्यक्तिगत डेटा की प्रोसेसिंग और सुरक्षा के बारे में आवश्यक जानकारी प्राप्त करेगा."
        ]
      },
      {
        title: "11. व्यक्तिगत डेटा की गोपनीयता",
        body: [
          "ऑपरेटर और व्यक्तिगत डेटा तक पहुँच प्राप्त करने वाले अन्य व्यक्ति डेटा विषय की सहमति के बिना तीसरे पक्षों को व्यक्तिगत डेटा का खुलासा या वितरण न करने के लिए बाध्य हैं, जब तक कि संघीय कानून द्वारा अन्यथा प्रदान न किया गया हो."
        ]
      },
      {
        title: "12. उपयोगकर्ता अधिकार और अंतिम प्रावधान",
        body: [
          "उपयोगकर्ता किसी भी समय {{email}} पर \"व्यक्तिगत डेटा प्रोसेसिंग के लिए सहमति की वापसी\" अंकित ईमेल भेजकर व्यक्तिगत डेटा प्रोसेसिंग के लिए अपनी सहमति वापस ले सकता है, और उसी पते पर ऑपरेटर से संपर्क करके अपने व्यक्तिगत डेटा की प्रोसेसिंग से संबंधित किसी भी प्रश्न पर स्पष्टीकरण प्राप्त कर सकता है.",
          "इस नीति में कोई भी परिवर्तन इस दस्तावेज़ में दर्शाया जाएगा. यह नीति तब तक अनिश्चित काल के लिए मान्य है जब तक इसे नए संस्करण द्वारा प्रतिस्थापित नहीं किया जाता. नीति का वर्तमान संस्करण इंटरनेट पर https://starvedas.ru/legal/privacy और https://chintamanidhama.ru/legal/privacy पर स्वतंत्र रूप से उपलब्ध है.",
          "ऑपरेटर का विवरण: {{seller}}, कर पहचान संख्या {{inn}}, पंजीकृत पता: {{address}}. संपर्क ईमेल: {{email}}."
        ]
      }
    ]
  }
};

export function getPrivacyCopy(locale: string | null | undefined) {
  return copies[normalizeLocale(locale)];
}
