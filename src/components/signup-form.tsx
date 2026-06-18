"use client";

import {
  FormEvent,
  type SVGProps,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { SupportCta } from "@/components/support-cta";
import { formatMoney } from "@/i18n/pricing";
import { getSignupCopy } from "@/i18n/signup-copy";
import {
  formatPhoneNumberInput,
  getDefaultPhoneCountry,
  getPhoneCountryCallingCode,
  getPhoneCountryOptions,
  isPhoneCountryCode,
  isValidPhoneNumberForCountry,
  type PhoneCountryCode
} from "@/lib/phone-validation";
import type { SiteServiceList } from "@/lib/site-data";
import type {
  PaymentInstructions,
  PaymentProviderCode
} from "@/server/payment-providers";

const formSteps = [
  {
    label: "Церемония",
    Icon: CeremonyIcon
  },
  {
    label: "Участники",
    Icon: ParticipantsIcon
  },
  {
    label: "Контакты",
    Icon: ContactsIcon
  },
  {
    label: "Проверка",
    Icon: ReviewIcon
  },
  {
    label: "Оплата",
    Icon: PaymentIcon
  }
];

type PaymentProviderOption = {
  code: PaymentProviderCode;
  description?: string | null;
  instructions?: PaymentInstructions | null;
  isCustom: boolean;
  name: string;
};

function CeremonyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M12 4.5l1.2 3.1 3.1 1.2-3.1 1.2L12 13.1l-1.2-3.1-3.1-1.2 3.1-1.2L12 4.5z"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M7 19h10M8.5 19c0-2 1.6-3.5 3.5-3.5s3.5 1.5 3.5 3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ParticipantsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <circle cx="9" cy="8.5" r="2.5" strokeWidth="1.8" />
      <circle cx="16.5" cy="9.5" r="2" strokeWidth="1.8" />
      <path
        d="M4.5 19c0-2.8 2.4-4.8 5.5-4.8s5.5 2 5.5 4.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M13.5 18.5c.3-2 1.8-3.5 4-3.5 1.7 0 3.1.9 3.8 2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ContactsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M5 6.8h14v8.1H12l-4.2 3v-3H5V6.8z"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M8 10h8M8 12.8h5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ReviewIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M6.5 5.5h11v13h-11z" strokeLinejoin="round" strokeWidth="1.8" />
      <path
        d="M8.5 9h7M8.5 12h4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M8.8 16l1.5 1.5 3.2-3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PaymentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="4.5" y="6" width="15" height="11" rx="2" strokeWidth="1.8" />
      <path
        d="M4.5 9.2h15M7 13h3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

type SubmitState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      amountRub: number;
      currency: string;
      curatorName: string;
      isCustomPayment?: boolean;
      orderNumber: number;
      paymentInstructions?: PaymentInstructions | null;
      paymentProviderName?: string;
      paymentStatus?: string;
      paymentUrl?: string;
      postPurchaseText?: string | null;
      postPurchaseTitle?: string | null;
      postPurchaseUrl?: string | null;
      supportButtonLabel?: string | null;
      supportEnabled?: boolean;
      supportUrl?: string | null;
    }
  | { status: "error"; message: string };

type ParticipantInput = {
  firstName: string;
  lastName: string;
};

type AssignedCurator = {
  name: string;
  postPurchaseText?: string | null;
  postPurchaseTitle?: string | null;
  postPurchaseUrl?: string | null;
  supportButtonLabel?: string | null;
  supportEnabled?: boolean;
  supportUrl?: string | null;
};

function createParticipant(): ParticipantInput {
  return {
    firstName: "",
    lastName: ""
  };
}

function getParticipantFullName(participant: ParticipantInput) {
  return [participant.firstName.trim(), participant.lastName.trim()]
    .filter(Boolean)
    .join(" ");
}

function isParticipantComplete(participant: ParticipantInput) {
  return Boolean(participant.firstName.trim() && participant.lastName.trim());
}

function isWebUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function getInstructionRows(instructions?: PaymentInstructions | null) {
  return [
    ["Банк", instructions?.bankName],
    ["Получатель", instructions?.recipientName],
    ["Карта или счет", instructions?.accountNumber],
    ["Телефон", instructions?.phone],
    ["Комментарий к платежу", instructions?.paymentComment],
    ["Срок проверки", instructions?.verificationPeriod]
  ].filter((row): row is [string, string] => Boolean(row[1]?.trim()));
}

function getOptionQuantity(
  priceUnit: "PER_ORDER" | "PER_PARTICIPANT" | "PER_NAME",
  participantCount: number
) {
  if (priceUnit === "PER_ORDER") {
    return 1;
  }

  return participantCount;
}

function getFormScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function scrollAndFocusForm(target: HTMLElement | null) {
  target?.scrollIntoView({
    behavior: getFormScrollBehavior(),
    block: "start"
  });
  target?.focus({ preventScroll: true });
}

function PaymentInstructionsBox({
  instructions,
  providerName,
  showReportButton = false,
  showStatus = true,
  supportEnabled,
  supportUrl
}: {
  instructions?: PaymentInstructions | null;
  providerName: string;
  showReportButton?: boolean;
  showStatus?: boolean;
  supportEnabled?: boolean;
  supportUrl?: string | null;
}) {
  const rows = getInstructionRows(instructions);
  const reportHref = supportEnabled ? supportUrl?.trim() : "";

  return (
    <div className="custom-payment-details">
      <h4>{providerName}</h4>
      {showStatus && (
        <p>
          Статус заказа: <strong>ожидает проверки оплаты</strong>.
        </p>
      )}
      {instructions?.instructions ? (
        <p>{instructions.instructions}</p>
      ) : (
        <p>
          Если реквизиты не заполнены, запросите их у куратора через кнопку
          связи.
        </p>
      )}
      {rows.length > 0 && (
        <dl>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {showReportButton && reportHref && (
        <a
          className="button button--primary"
          href={reportHref}
          rel={isWebUrl(reportHref) ? "noreferrer" : undefined}
          target={isWebUrl(reportHref) ? "_blank" : undefined}
        >
          Сообщить об оплате
        </a>
      )}
    </div>
  );
}

export function SignupForm({
  assignedCurator,
  brandName,
  initialServiceSlug,
  locale,
  paymentProviders,
  referralSlug,
  services
}: {
  assignedCurator: AssignedCurator;
  brandName: string;
  initialServiceSlug?: string;
  locale?: string | null;
  paymentProviders: PaymentProviderOption[];
  referralSlug?: string | null;
  services: SiteServiceList;
}) {
  const copy = getSignupCopy(locale, brandName);
  const [step, setStep] = useState(0);
  const [serviceSlug, setServiceSlug] = useState(
    initialServiceSlug ?? services[0].slug
  );
  const [selectedServiceOptionIds, setSelectedServiceOptionIds] = useState<
    string[]
  >([]);
  const [paymentProvider, setPaymentProvider] = useState(
    paymentProviders[0]?.code ?? "prodamus"
  );
  const [participants, setParticipants] = useState<ParticipantInput[]>([
    createParticipant()
  ]);
  const [customerName, setCustomerName] = useState("");
  const [customerNameTouched, setCustomerNameTouched] = useState(false);
  const [customerTelegram, setCustomerTelegram] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerPhoneCountry, setCustomerPhoneCountry] =
    useState<PhoneCountryCode>(() => getDefaultPhoneCountry(locale));
  const [customerEmail, setCustomerEmail] = useState("");
  const [consentPersonalData, setConsentPersonalData] = useState(false);
  const [consentMailings, setConsentMailings] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle"
  });
  const [isFormInView, setIsFormInView] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const stepHasRendered = useRef(false);
  const checkoutStartedRecorded = useRef(false);
  const selectedPaymentProvider = useMemo(
    () =>
      paymentProviders.find((provider) => provider.code === paymentProvider),
    [paymentProvider, paymentProviders]
  );

  const selectedService = useMemo(
    () =>
      services.find((service) => service.slug === serviceSlug) ?? services[0],
    [serviceSlug, services]
  );

  const selectedServiceOptions = useMemo(
    () =>
      selectedService.options.filter((option) =>
        selectedServiceOptionIds.includes(option.id)
      ),
    [selectedService.options, selectedServiceOptionIds]
  );
  const isSingleRiteSelected = selectedService.slug === "single-rite";

  const participantFullNames = useMemo(
    () =>
      participants.filter(isParticipantComplete).map(getParticipantFullName),
    [participants]
  );
  const participantsText = useMemo(
    () => participantFullNames.join("\n"),
    [participantFullNames]
  );
  const participantCount = participantFullNames.length;
  const phoneCountryOptions = useMemo(
    () => getPhoneCountryOptions(locale),
    [locale]
  );
  const phonePlaceholder = copy.placeholders.phone.replace(
    "{{code}}",
    getPhoneCountryCallingCode(customerPhoneCountry)
  );
  const customerPhoneErrorId = "customer-phone-error";
  const isCustomerPhoneValid = isValidPhoneNumberForCountry(
    customerPhone,
    customerPhoneCountry
  );

  const estimatedAmount = useMemo(() => {
    if (isSingleRiteSelected && selectedServiceOptions.length > 0) {
      return selectedServiceOptions.reduce(
        (sum, option) =>
          sum +
          option.priceAmount *
            getOptionQuantity(option.priceUnit, participantCount),
        0
      );
    }

    if (selectedService.priceUnit === "PER_ORDER") {
      return selectedService.priceAmount;
    }

    if (selectedService.priceUnit === "PER_NAME") {
      return selectedService.priceAmount * participantCount;
    }

    return selectedService.priceAmount * participantCount;
  }, [
    isSingleRiteSelected,
    participantCount,
    selectedService,
    selectedServiceOptions
  ]);

  const hasContact = Boolean(
    customerTelegram.trim() || customerPhone.trim() || customerEmail.trim()
  );
  const hasIncompleteParticipants = participants.some(
    (participant) => !isParticipantComplete(participant)
  );
  const isSubmitDisabled =
    submitState.status === "loading" ||
    (step === 0 &&
      isSingleRiteSelected &&
      selectedServiceOptionIds.length < 1) ||
    (step === 1 && (hasIncompleteParticipants || participantCount < 1)) ||
    (step === 2 &&
      (!hasContact || !consentPersonalData || !isCustomerPhoneValid)) ||
    (step === 4 && paymentProviders.length === 0);
  const submitButtonLabel =
    step === formSteps.length - 1
      ? submitState.status === "loading"
        ? copy.actions.creating
        : copy.actions.pay
      : copy.actions.continue;

  useEffect(() => {
    const requestedServiceSlug = new URLSearchParams(
      window.location.search
    ).get("service");

    if (!requestedServiceSlug) {
      return;
    }

    if (!services.some((service) => service.slug === requestedServiceSlug)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setServiceSlug(requestedServiceSlug);
      setSelectedServiceOptionIds([]);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [services]);

  useEffect(() => {
    void fetch("/api/client-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        referralSlug,
        status: "VISITED"
      })
    }).catch(() => undefined);
  }, [referralSlug]);

  useEffect(() => {
    if (!stepHasRendered.current) {
      stepHasRendered.current = true;
      return;
    }

    scrollAndFocusForm(formRef.current);
  }, [step]);

  useEffect(() => {
    if (submitState.status === "success") {
      scrollAndFocusForm(resultRef.current);
    }
  }, [submitState.status]);

  useEffect(() => {
    const formElement = formRef.current;

    if (!formElement) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFormInView(entry.isIntersecting);
      },
      {
        rootMargin: "0px 0px -72px 0px",
        threshold: 0.01
      }
    );

    observer.observe(formElement);

    return () => observer.disconnect();
  }, []);

  async function recordCheckoutStarted() {
    await fetch("/api/client-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        consentMailings,
        consentPersonalData,
        customerEmail,
        customerName,
        customerPhone,
        customerPhoneCountry,
        customerTelegram,
        referralSlug,
        status: "STARTED_CHECKOUT"
      })
    });
  }

  function selectService(slug: string) {
    setServiceSlug(slug);
    setSelectedServiceOptionIds([]);
  }

  function toggleServiceOption(optionId: string) {
    setSelectedServiceOptionIds((current) =>
      current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId]
    );
  }

  function updateParticipant(
    index: number,
    field: keyof ParticipantInput,
    value: string
  ) {
    setParticipants((current) =>
      current.map((participant, participantIndex) =>
        participantIndex === index
          ? {
              ...participant,
              [field]: value
            }
          : participant
      )
    );
  }

  function addParticipant() {
    setParticipants((current) => [...current, createParticipant()]);
  }

  function removeParticipant(index: number) {
    setParticipants((current) =>
      current.length === 1
        ? current
        : current.filter((_, participantIndex) => participantIndex !== index)
    );
  }

  async function submitOrder() {
    setSubmitState({ status: "loading" });

    let response: Response;

    try {
      response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          serviceSlug,
          selectedServiceOptionIds,
          participantCount,
          participantsText,
          customerName,
          customerTelegram,
          customerPhone,
          customerPhoneCountry,
          customerEmail,
          consentPersonalData,
          consentMailings,
          paymentProvider,
          referralSlug
        })
      });
    } catch {
      setSubmitState({
        status: "error",
        message: copy.error
      });
      return;
    }

    const result = (await response.json().catch(() => ({}))) as
      | {
          amountRub: number;
          currency: string;
          curatorName: string;
          isCustomPayment?: boolean;
          orderNumber: number;
          paymentInstructions?: PaymentInstructions | null;
          paymentProviderName?: string;
          paymentStatus?: string;
          paymentUrl?: string;
          postPurchaseText?: string | null;
          postPurchaseTitle?: string | null;
          postPurchaseUrl?: string | null;
          supportButtonLabel?: string | null;
          supportEnabled?: boolean;
          supportUrl?: string | null;
        }
      | { message?: string };

    if (!response.ok || !("orderNumber" in result)) {
      setSubmitState({
        status: "error",
        message:
          "message" in result && result.message ? result.message : copy.error
      });
      return;
    }

    setSubmitState({
      status: "success",
      curatorName: result.curatorName,
      orderNumber: result.orderNumber,
      amountRub: result.amountRub,
      currency: result.currency,
      isCustomPayment: result.isCustomPayment,
      paymentInstructions: result.paymentInstructions,
      paymentProviderName: result.paymentProviderName,
      paymentStatus: result.paymentStatus,
      paymentUrl: result.paymentUrl,
      postPurchaseText: result.postPurchaseText,
      postPurchaseTitle: result.postPurchaseTitle,
      postPurchaseUrl: result.postPurchaseUrl,
      supportButtonLabel: result.supportButtonLabel,
      supportEnabled: result.supportEnabled,
      supportUrl: result.supportUrl
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step < formSteps.length - 1) {
      if (
        step === 0 &&
        isSingleRiteSelected &&
        selectedServiceOptionIds.length < 1
      ) {
        return;
      }

      if (step === 1 && (!customerNameTouched || !customerName.trim())) {
        const firstParticipantName = getParticipantFullName(participants[0]);

        if (firstParticipantName) {
          setCustomerName(firstParticipantName);
        }
      }

      if (
        step === 2 &&
        (!hasContact || !consentPersonalData || !isCustomerPhoneValid)
      ) {
        return;
      }

      if (step === 2 && !checkoutStartedRecorded.current) {
        checkoutStartedRecorded.current = true;
        void recordCheckoutStarted().catch(() => undefined);
      }

      setStep((current) => current + 1);
      return;
    }

    await submitOrder();
  }

  if (submitState.status === "success") {
    const amount = formatMoney(submitState.amountRub, submitState.currency);

    return (
      <div
        className="form-result form-result--success"
        ref={resultRef}
        role="status"
        tabIndex={-1}
      >
        <h3>{copy.success.title}</h3>
        <p>
          {copy.success.text
            .replace("{{orderNumber}}", String(submitState.orderNumber))
            .replace("{{amount}}", amount)}
        </p>
        <p>
          Куратор: <strong>{submitState.curatorName}</strong>
        </p>
        {(submitState.postPurchaseTitle ||
          submitState.postPurchaseText ||
          submitState.postPurchaseUrl) && (
          <p className="form-note">
            Ссылка и информация после покупки будут доступны после подтверждения
            оплаты.
          </p>
        )}
        {submitState.isCustomPayment && (
          <PaymentInstructionsBox
            instructions={submitState.paymentInstructions}
            providerName={submitState.paymentProviderName ?? "Резервная оплата"}
            showReportButton
            supportEnabled={submitState.supportEnabled}
            supportUrl={submitState.supportUrl}
          />
        )}
        {submitState.paymentUrl && (
          <a className="button button--primary" href={submitState.paymentUrl}>
            Перейти к оплате
          </a>
        )}
        <SupportCta
          curatorName={submitState.curatorName}
          note="Если нужна помощь с оплатой или участниками, напишите куратору."
          supportButtonLabel={submitState.supportButtonLabel}
          supportEnabled={submitState.supportEnabled}
          supportUrl={submitState.supportUrl}
        />
      </div>
    );
  }

  return (
    <form
      className={
        isFormInView
          ? "signup-form signup-form--actions-visible"
          : "signup-form"
      }
      onSubmit={handleSubmit}
      ref={formRef}
      tabIndex={-1}
    >
      <ol className="form-progress" aria-label={copy.progressAria}>
        {formSteps.map(({ Icon, label }, index) => (
          <li
            className={
              index === step
                ? "form-progress__item is-active"
                : index < step
                  ? "form-progress__item is-done"
                  : "form-progress__item"
            }
            aria-current={index === step ? "step" : undefined}
            aria-label={label}
            key={label}
          >
            <span className="form-progress__icon" aria-hidden="true">
              <Icon />
            </span>
            <span className="form-progress__label">{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <fieldset className="form-step">
          <legend>{copy.legend.ceremony}</legend>
          <div className="option-grid">
            {services.map((service) => (
              <label
                className="choice-card choice-card--stacked"
                key={service.slug}
              >
                <input
                  checked={serviceSlug === service.slug}
                  name="service"
                  onChange={() => selectService(service.slug)}
                  type="radio"
                  value={service.slug}
                />
                <span>{service.title}</span>
                <small>{service.priceLabel}</small>
              </label>
            ))}
          </div>

          {isSingleRiteSelected && (
            <div
              className="rite-choice-list"
              aria-label="Обряды внутри раздела"
            >
              <strong>Выберите один или несколько обрядов</strong>
              {selectedService.options.length > 0 ? (
                selectedService.options.map((option) => (
                  <label
                    className="choice-card rite-choice-card"
                    key={option.id}
                  >
                    <input
                      checked={selectedServiceOptionIds.includes(option.id)}
                      onChange={() => toggleServiceOption(option.id)}
                      type="checkbox"
                    />
                    <span>{option.title}</span>
                    {option.description && <small>{option.description}</small>}
                    <small>{option.priceLabel}</small>
                  </label>
                ))
              ) : (
                <p className="form-warning">
                  Обряды пока не добавлены администратором.
                </p>
              )}
              {selectedServiceOptionIds.length < 1 && (
                <p className="form-warning">Выберите хотя бы один обряд.</p>
              )}
            </div>
          )}
        </fieldset>
      )}

      {step === 1 && (
        <fieldset className="form-step">
          <legend>{copy.legend.participants}</legend>
          <p className="form-note">{copy.placeholders.participants}</p>
          <div
            className="participant-list"
            aria-label={copy.fields.participantList}
          >
            {participants.map((participant, index) => (
              <div className="participant-row" key={index}>
                <strong className="participant-row__label">
                  {index === 0
                    ? copy.fields.primaryParticipant
                    : copy.fields.participantNumber.replace(
                        "{{number}}",
                        String(index + 1)
                      )}
                </strong>
                <label className="field">
                  <span>{copy.fields.participantFirstName}</span>
                  <input
                    onChange={(event) =>
                      updateParticipant(index, "firstName", event.target.value)
                    }
                    required
                    type="text"
                    value={participant.firstName}
                  />
                </label>
                <label className="field">
                  <span>{copy.fields.participantLastName}</span>
                  <input
                    onChange={(event) =>
                      updateParticipant(index, "lastName", event.target.value)
                    }
                    required
                    type="text"
                    value={participant.lastName}
                  />
                </label>
                {index > 0 && (
                  <button
                    className="button participant-row__remove"
                    onClick={() => removeParticipant(index)}
                    type="button"
                  >
                    {copy.actions.removeParticipant}
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            className="button participant-add"
            onClick={addParticipant}
            type="button"
          >
            + {copy.actions.addParticipant}
          </button>
          {hasIncompleteParticipants && (
            <p className="form-warning">
              {copy.warnings.incompleteParticipants.replace(
                "{{count}}",
                String(participantCount)
              )}
            </p>
          )}
        </fieldset>
      )}

      {step === 2 && (
        <fieldset className="form-step">
          <legend>{copy.legend.contacts}</legend>
          <label className="field">
            <span>{copy.fields.customerName}</span>
            <input
              onChange={(event) => {
                setCustomerName(event.target.value);
                setCustomerNameTouched(true);
              }}
              required
              type="text"
              value={customerName}
            />
          </label>
          <div className="field-grid">
            <label className="field">
              <span>{copy.fields.telegram}</span>
              <input
                onChange={(event) => setCustomerTelegram(event.target.value)}
                placeholder={copy.placeholders.telegram}
                type="text"
                value={customerTelegram}
              />
            </label>
            <div className="field">
              <span>{copy.fields.phone}</span>
              <div className="phone-input-row">
                <select
                  aria-label={copy.fields.phoneCountry}
                  onChange={(event) => {
                    if (isPhoneCountryCode(event.target.value)) {
                      setCustomerPhoneCountry(event.target.value);
                      setCustomerPhone((currentPhone) =>
                        formatPhoneNumberInput(currentPhone, event.target.value)
                      );
                    }
                  }}
                  value={customerPhoneCountry}
                >
                  {phoneCountryOptions.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.label}
                    </option>
                  ))}
                </select>
                <input
                  aria-describedby={
                    isCustomerPhoneValid ? undefined : customerPhoneErrorId
                  }
                  aria-invalid={!isCustomerPhoneValid}
                  onChange={(event) =>
                    setCustomerPhone(
                      formatPhoneNumberInput(
                        event.target.value,
                        customerPhoneCountry
                      )
                    )
                  }
                  placeholder={phonePlaceholder}
                  type="tel"
                  value={customerPhone}
                />
              </div>
              <small
                aria-hidden={isCustomerPhoneValid}
                className={
                  isCustomerPhoneValid
                    ? "field-error field-error--hidden"
                    : "field-error"
                }
                id={customerPhoneErrorId}
              >
                {copy.warnings.invalidPhone}
              </small>
            </div>
            <label className="field">
              <span>{copy.fields.email}</span>
              <input
                onChange={(event) => setCustomerEmail(event.target.value)}
                placeholder={copy.placeholders.email}
                type="email"
                value={customerEmail}
              />
            </label>
          </div>
          {!hasContact && <p className="form-warning">{copy.contactWarning}</p>}
          <label className="checkbox-field">
            <input
              checked={consentPersonalData}
              onChange={(event) => setConsentPersonalData(event.target.checked)}
              required
              type="checkbox"
            />
            <span>
              {copy.consent.phrase}{" "}
              <a
                href="/legal/personal-data-consent"
                rel="noreferrer"
                target="_blank"
              >
                {copy.consent.personalData}
              </a>
              ,{" "}
              <a href="/legal/privacy" rel="noreferrer" target="_blank">
                {copy.consent.privacy}
              </a>{" "}
              и{" "}
              <a href="/payment" rel="noreferrer" target="_blank">
                {copy.consent.payment}
              </a>
              ,{" "}
              <a href="/docks/oferta.pdf" rel="noreferrer" target="_blank">
                {copy.consent.offer}
              </a>{" "}
              и{" "}
              <a href="/refund" rel="noreferrer" target="_blank">
                {copy.consent.refund}
              </a>
              .
            </span>
          </label>
          <label className="checkbox-field">
            <input
              checked={consentMailings}
              onChange={(event) => setConsentMailings(event.target.checked)}
              type="checkbox"
            />
            <span>{copy.consent.mailing}</span>
          </label>
        </fieldset>
      )}

      {step === 3 && (
        <div className="form-step">
          <h3>{copy.review.title}</h3>
          <dl className="summary-list">
            <div>
              <dt>{copy.review.curator}</dt>
              <dd>{assignedCurator.name}</dd>
            </div>
            <div>
              <dt>{copy.review.ceremony}</dt>
              <dd>
                {selectedService.title}
                {selectedServiceOptions.length > 0 && (
                  <ul className="rite-summary-list">
                    {selectedServiceOptions.map((option) => (
                      <li key={option.id}>
                        {option.title} ? {option.priceLabel}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
            <div>
              <dt>{copy.review.participants}</dt>
              <dd>{participantCount}</dd>
            </div>
            <div>
              <dt>{copy.review.amount}</dt>
              <dd>{formatMoney(estimatedAmount, selectedService.currency)}</dd>
            </div>
          </dl>
        </div>
      )}

      {step === 4 && (
        <div className="form-step">
          <h3>{copy.payment.title}</h3>
          <p>{copy.payment.text}</p>
          {paymentProviders.length > 0 ? (
            <fieldset className="form-step">
              <legend>{copy.payment.providerLabel}</legend>
              <div className="option-grid">
                {paymentProviders.map((provider) => (
                  <label
                    className="choice-card choice-card--stacked"
                    key={provider.code}
                  >
                    <input
                      checked={paymentProvider === provider.code}
                      name="paymentProvider"
                      onChange={() => setPaymentProvider(provider.code)}
                      type="radio"
                      value={provider.code}
                    />
                    <span>{provider.name}</span>
                    {provider.description && (
                      <small>{provider.description}</small>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <p className="form-warning">{copy.payment.providerUnavailable}</p>
          )}
          {selectedPaymentProvider?.isCustom && (
            <PaymentInstructionsBox
              instructions={selectedPaymentProvider.instructions}
              providerName={selectedPaymentProvider.name}
              showStatus={false}
            />
          )}
          <div className="legal-inline-links" aria-label={copy.documentsAria}>
            <a href="/docks/oferta.pdf" rel="noreferrer" target="_blank">
              {copy.consent.offer}
            </a>
            <a href="/payment" rel="noreferrer" target="_blank">
              {copy.consent.payment}
            </a>
            <a href="/refund" rel="noreferrer" target="_blank">
              {copy.consent.refund}
            </a>
            <a href="/legal/privacy" rel="noreferrer" target="_blank">
              {copy.consent.privacy}
            </a>
            <a href="/contacts" rel="noreferrer" target="_blank">
              {copy.actions.contacts}
            </a>
          </div>
          {submitState.status === "error" && (
            <p className="form-warning">{submitState.message}</p>
          )}
        </div>
      )}

      <SupportCta
        curatorName={assignedCurator.name}
        note="Если что-то непонятно при записи или оплате, можно задать вопрос."
        supportButtonLabel={assignedCurator.supportButtonLabel}
        supportEnabled={assignedCurator.supportEnabled}
        supportUrl={assignedCurator.supportUrl}
      />

      <div className="form-actions">
        {step > 0 && (
          <button
            className="button"
            onClick={() => setStep((current) => current - 1)}
            type="button"
          >
            {copy.actions.back}
          </button>
        )}
        <button
          className="button button--primary"
          disabled={isSubmitDisabled}
          type="submit"
        >
          {submitButtonLabel}
        </button>
      </div>
    </form>
  );
}
