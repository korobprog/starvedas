"use client";

import {
  type CSSProperties,
  FormEvent,
  type SVGProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { MarkdownContent } from "@/components/markdown-content";
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
import type { SiteService } from "@/lib/site-data";
import { waitForTelegramWebApp } from "@/lib/telegram-web-app-client";
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

type SavedParticipantOption = {
  fullName: string;
  id: string;
};

type SavedParticipantsResponse = {
  authenticated?: boolean;
  participants?: SavedParticipantOption[];
};

const signupAuthButtonInlineStyle: CSSProperties = {
  alignItems: "center",
  borderRadius: "999px",
  display: "inline-flex",
  fontSize: "0.86rem",
  fontWeight: 800,
  justifyContent: "center",
  minHeight: "38px",
  padding: "0 16px",
  textDecoration: "none",
  transition: "transform 0.15s ease, box-shadow 0.15s ease",
  whiteSpace: "nowrap"
};

const signupAuthLoginButtonInlineStyle: CSSProperties = {
  ...signupAuthButtonInlineStyle,
  background: "rgba(255, 255, 255, 0.96)",
  border: "1px solid rgba(216, 154, 43, 0.38)",
  boxShadow: "0 8px 18px rgba(86, 48, 13, 0.08)",
  color: "var(--primary-dark)"
};

const signupAuthRegisterButtonInlineStyle: CSSProperties = {
  ...signupAuthButtonInlineStyle,
  background:
    "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
  border: "1px solid rgba(129, 64, 15, 0.18)",
  boxShadow: "0 12px 24px rgba(178, 91, 24, 0.22)",
  color: "#fff"
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
      clientOrderPath?: string;
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

type AssignedCurator = {
  name: string;
  postPurchaseText?: string | null;
  postPurchaseTitle?: string | null;
  postPurchaseUrl?: string | null;
  showMailingConsentCheckbox?: boolean;
  supportButtonLabel?: string | null;
  supportEnabled?: boolean;
  supportUrl?: string | null;
};

type TelegramMiniAppClient = {
  consentMailings?: boolean;
  consentPersonalData?: boolean;
  email?: string | null;
  name: string;
  phone?: string | null;
  referralSlug?: string | null;
  telegram?: string | null;
  telegramPhotoUrl?: string | null;
};

type TelegramAuthState =
  | { status: "idle" | "not_available" }
  | { status: "loading" }
  | { status: "authenticated"; client: TelegramMiniAppClient }
  | { status: "error"; message: string };

type TelegramWebApp = {
  expand?: () => void;
  initData?: string;
  ready?: () => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

const participantNamePattern =
  /^[\p{L}\p{M}][\p{L}\p{M}'’`.-]*\s+[\p{L}\p{M}][\p{L}\p{M}'’`.-]*$/u;

function normalizeParticipantName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function getParticipantNamesFromText(value: string) {
  return value.split(/\r?\n/).map(normalizeParticipantName).filter(Boolean);
}

function isParticipantNameValid(value: string) {
  return value.length <= 120 && participantNamePattern.test(value);
}

function getInvalidParticipantLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line, index) => ({
      lineNumber: index + 1,
      name: normalizeParticipantName(line)
    }))
    .filter(({ name }) => Boolean(name) && !isParticipantNameValid(name));
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

function getEstimateUnitLabel(
  priceUnit: "PER_ORDER" | "PER_PARTICIPANT" | "PER_NAME",
  isShraddhaService: boolean
) {
  if (priceUnit === "PER_ORDER") {
    return "фиксированная стоимость";
  }

  if (isShraddhaService || priceUnit === "PER_NAME") {
    return "записей";
  }

  return "участников";
}

function multiServiceNeedsParticipants(
  service: SiteService,
  optionIds: string[]
) {
  if (service.isSubscription) {
    return service.priceUnit !== "PER_ORDER";
  }

  if (service.priceUnit !== "PER_ORDER") {
    return true;
  }

  return service.options.some(
    (option) =>
      optionIds.includes(option.id) && option.priceUnit !== "PER_ORDER"
  );
}

type ChildRecordKind = "unborn" | "deceased";
type ChildRow = { parentName: string };
type ChildRowsState = { unborn: ChildRow[]; deceased: ChildRow[] };
type ChildRecordPayload = {
  type: "UNBORN" | "DECEASED";
  parentName: string;
  childCount: number;
};

const CHILD_ROWS_MAX = 100;

function emptyChildRows(): ChildRowsState {
  return { unborn: [], deceased: [] };
}

function createChildRow(parentName = ""): ChildRow {
  return { parentName };
}

const childKindToType: Record<ChildRecordKind, "UNBORN" | "DECEASED"> = {
  unborn: "UNBORN",
  deceased: "DECEASED"
};

// Номер строки — счётчик детей этой матери среди строк 0..index.
function getChildRowNumber(list: ChildRow[], index: number) {
  const name = normalizeParticipantName(list[index].parentName);
  let number = 0;

  for (let rowIndex = 0; rowIndex <= index; rowIndex += 1) {
    if (normalizeParticipantName(list[rowIndex].parentName) === name) {
      number += 1;
    }
  }

  return number;
}

// Каждая строка — один ребёнок; строки одной матери схлопываются
// в одну запись с childCount = числу её строк.
function childRowsToPayload(rows: ChildRowsState): ChildRecordPayload[] {
  const build = (list: ChildRow[], kind: ChildRecordKind) => {
    const records: ChildRecordPayload[] = [];
    const byName = new Map<string, ChildRecordPayload>();

    for (const row of list) {
      const parentName = normalizeParticipantName(row.parentName);

      if (!parentName) {
        continue;
      }

      const existing = byName.get(parentName);

      if (existing) {
        existing.childCount += 1;
      } else {
        const record = {
          type: childKindToType[kind],
          parentName,
          childCount: 1
        };
        byName.set(parentName, record);
        records.push(record);
      }
    }

    return records;
  };

  return [...build(rows.unborn, "unborn"), ...build(rows.deceased, "deceased")];
}

function getChildUnitsFromRows(rows: ChildRowsState) {
  return childRowsToPayload(rows).reduce((sum, row) => sum + row.childCount, 0);
}

function isChildRowInvalid(row: ChildRow) {
  const name = normalizeParticipantName(row.parentName);

  if (!name) {
    return false;
  }

  return !isParticipantNameValid(name);
}

function childRowsHaveIssues(rows: ChildRowsState) {
  return (
    rows.unborn.some(isChildRowInvalid) || rows.deceased.some(isChildRowInvalid)
  );
}

function ChildRecordsBlock({
  deceasedChildLabel,
  helpText,
  onChange,
  rows,
  unbornLabel,
  warningText
}: Readonly<{
  deceasedChildLabel: string;
  helpText: string;
  onChange: (rows: ChildRowsState) => void;
  rows: ChildRowsState;
  unbornLabel: string;
  warningText: string;
}>) {
  const sections: Array<{ key: ChildRecordKind; label: string }> = [
    { key: "unborn", label: unbornLabel },
    { key: "deceased", label: deceasedChildLabel }
  ];
  const totalRows = rows.unborn.length + rows.deceased.length;

  function updateRow(
    key: ChildRecordKind,
    index: number,
    patch: Partial<ChildRow>
  ) {
    onChange({
      ...rows,
      [key]: rows[key].map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    });
  }

  function addRow(key: ChildRecordKind) {
    if (totalRows >= CHILD_ROWS_MAX) {
      return;
    }

    const list = rows[key];
    const lastName = list.length > 0 ? list[list.length - 1].parentName : "";

    onChange({ ...rows, [key]: [...list, createChildRow(lastName)] });
  }

  function removeRow(key: ChildRecordKind, index: number) {
    onChange({
      ...rows,
      [key]: rows[key].filter((_, rowIndex) => rowIndex !== index)
    });
  }

  return (
    <div className="shraddha-children">
      {warningText && (
        <p className="form-warning form-warning--danger shraddha-children__warning">
          {warningText}
        </p>
      )}
      {helpText && <p className="form-note">{helpText}</p>}
      {sections.map((section) => (
        <div className="shraddha-children__section" key={section.key}>
          <strong>{section.label}</strong>
          {rows[section.key].map((row, index) => (
            <div className="shraddha-children__row" key={index}>
              <span className="shraddha-children__row-label">
                {section.label}
              </span>
              <input
                aria-invalid={isChildRowInvalid(row)}
                aria-label={`${section.label}: ФИО родителя`}
                onChange={(event) =>
                  updateRow(section.key, index, {
                    parentName: event.target.value
                  })
                }
                placeholder="Имя и фамилия родителя"
                type="text"
                value={row.parentName}
              />
              <span
                aria-label={`${section.label}: номер ребёнка`}
                className="shraddha-children__number"
              >
                {getChildRowNumber(rows[section.key], index)}
              </span>
              <button
                aria-label="Удалить строку"
                className="icon-button"
                onClick={() => removeRow(section.key, index)}
                type="button"
              >
                −
              </button>
              {isChildRowInvalid(row) && (
                <small className="field-error">
                  Укажите имя и фамилию родителя
                </small>
              )}
            </div>
          ))}
          <div className="shraddha-children__add">
            <button
              aria-label={`${section.label}: добавить`}
              className="icon-button"
              disabled={totalRows >= CHILD_ROWS_MAX}
              onClick={() => addRow(section.key)}
              type="button"
            >
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function getFormScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function scrollAndFocusForm(target: HTMLElement | null | undefined) {
  if (target && typeof target.scrollIntoView === "function") {
    target.scrollIntoView({
      behavior: getFormScrollBehavior(),
      block: "start"
    });
    target.focus({ preventScroll: true });
  }
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

const SUBSCRIPTION_DAY_MS = 24 * 60 * 60 * 1000;

function getSubscriptionPeriodText(service: SiteService) {
  return service.subscriptionStartsAtLabel && service.subscriptionEndsAtLabel
    ? `с ${service.subscriptionStartsAtLabel} до ${service.subscriptionEndsAtLabel} МСК`
    : "Период действия уточняется.";
}

function formatDayCount(days: number) {
  const normalizedDays = Math.max(0, days);
  const lastTwoDigits = normalizedDays % 100;
  const lastDigit = normalizedDays % 10;
  const label =
    lastTwoDigits >= 11 && lastTwoDigits <= 14
      ? "дней"
      : lastDigit === 1
        ? "день"
        : lastDigit >= 2 && lastDigit <= 4
          ? "дня"
          : "дней";

  return `${normalizedDays} ${label}`;
}

function getSubscriptionDurationText(service: SiteService) {
  if (!service.subscriptionStartsAt || !service.subscriptionEndsAt) {
    return null;
  }

  const startsAt = Date.parse(service.subscriptionStartsAt);
  const endsAt = Date.parse(service.subscriptionEndsAt);

  if (
    !Number.isFinite(startsAt) ||
    !Number.isFinite(endsAt) ||
    endsAt <= startsAt
  ) {
    return null;
  }

  return formatDayCount(Math.ceil((endsAt - startsAt) / SUBSCRIPTION_DAY_MS));
}

function ServiceDetailsDialog({
  onClose,
  onSelect,
  service
}: {
  onClose: () => void;
  onSelect: () => void;
  service: SiteService;
}) {
  const titleId = `service-details-${service.slug}`;

  return (
    <div
      className="service-details-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="service-details-modal__panel"
        role="dialog"
      >
        <button
          aria-label="Закрыть пояснение"
          className="service-details-modal__close"
          data-service-details-close
          onClick={onClose}
          type="button"
        >
          ×
        </button>

        <div className="service-details-modal__header">
          <span className="service-details-modal__eyebrow">
            Подробно о церемонии
          </span>
          <h3 id={titleId}>{service.title}</h3>
          <p>{service.priceLabel}</p>
          {service.isSubscription && (
            <p className="service-details-modal__period">
              {getSubscriptionPeriodText(service)}
            </p>
          )}
        </div>

        <MarkdownContent content={service.detailsContent} />

        <div className="service-details-modal__actions">
          <button
            className="button button--primary"
            onClick={onSelect}
            type="button"
          >
            Выбрать этот вариант
          </button>
          <button className="button" onClick={onClose} type="button">
            Вернуться к списку
          </button>
        </div>
      </section>
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
  services: SiteService[];
}) {
  const copy = getSignupCopy(locale, brandName);
  const showMailingConsentCheckbox = Boolean(
    assignedCurator.showMailingConsentCheckbox
  );
  const initialAvailableServiceSlug =
    services.find((service) => service.slug === initialServiceSlug)?.slug ?? "";
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"wizard" | "multi">("wizard");
  const [multiSelections, setMultiSelections] = useState<
    Record<
      string,
      {
        optionIds: string[];
        participantsInput: string;
        childRows: ChildRowsState;
      }
    >
  >({});
  const [serviceSlug, setServiceSlug] = useState(initialAvailableServiceSlug);
  const [selectedServiceOptionIds, setSelectedServiceOptionIds] = useState<
    string[]
  >([]);
  const [paymentProvider, setPaymentProvider] = useState(
    paymentProviders[0]?.code ?? "prodamus"
  );
  const [participantsInput, setParticipantsInput] = useState("");
  const [childRows, setChildRows] = useState<ChildRowsState>(emptyChildRows());
  const [savedParticipants, setSavedParticipants] = useState<
    SavedParticipantOption[]
  >([]);
  const [isClientSessionActive, setIsClientSessionActive] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerNameTouched, setCustomerNameTouched] = useState(false);
  const [customerTelegram, setCustomerTelegram] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerPhoneCountry, setCustomerPhoneCountry] =
    useState<PhoneCountryCode>(() => getDefaultPhoneCountry(locale));
  const [customerEmail, setCustomerEmail] = useState("");
  const [consentPersonalData, setConsentPersonalData] = useState(true);
  const [consentMailings, setConsentMailings] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle"
  });
  const [telegramAuthState, setTelegramAuthState] = useState<TelegramAuthState>(
    { status: "idle" }
  );
  const [repeatMessage, setRepeatMessage] = useState<string | null>(null);
  const [detailsServiceSlug, setDetailsServiceSlug] = useState<string | null>(
    null
  );
  const [isFormInView, setIsFormInView] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const lastDetailsButtonRef = useRef<HTMLButtonElement | null>(null);
  const stepHasRendered = useRef(false);
  const checkoutStartedRecorded = useRef(false);
  const repeatLoadedKey = useRef<string | null>(null);
  const selectedPaymentProvider = useMemo(
    () =>
      paymentProviders.find((provider) => provider.code === paymentProvider),
    [paymentProvider, paymentProviders]
  );

  const selectedService = useMemo(
    () => services.find((service) => service.slug === serviceSlug) ?? null,
    [serviceSlug, services]
  );
  const detailsService = useMemo(
    () =>
      services.find((service) => service.slug === detailsServiceSlug) ?? null,
    [detailsServiceSlug, services]
  );

  const selectedServiceOptions = useMemo(() => {
    if (!selectedService || selectedService.isSubscription) {
      return [];
    }

    return selectedService.options.filter((option) =>
      selectedServiceOptionIds.includes(option.id)
    );
  }, [selectedService, selectedServiceOptionIds]);
  const mustSelectServiceOptions = selectedService
    ? !selectedService.isSubscription &&
      (selectedService.slug === "single-rite" ||
        Boolean(selectedService.options.length))
    : false;
  const activeServiceSlug = selectedService?.slug ?? "";

  const participantFullNames = useMemo(
    () => getParticipantNamesFromText(participantsInput),
    [participantsInput]
  );
  const participantsText = useMemo(
    () => participantFullNames.join("\n"),
    [participantFullNames]
  );
  const participantCount = participantFullNames.length;
  const invalidParticipantLines = useMemo(
    () => getInvalidParticipantLines(participantsInput),
    [participantsInput]
  );
  const hasInvalidParticipants =
    invalidParticipantLines.length > 0 || participantCount > 200;
  const isShraddhaService = Boolean(selectedService?.shraddhaModeEnabled);
  const wizardChildPayload = isShraddhaService
    ? childRowsToPayload(childRows)
    : [];
  const wizardUnbornUnits = wizardChildPayload
    .filter((record) => record.type === "UNBORN")
    .reduce((sum, record) => sum + record.childCount, 0);
  const wizardDeceasedUnits = wizardChildPayload
    .filter((record) => record.type === "DECEASED")
    .reduce((sum, record) => sum + record.childCount, 0);
  const wizardChildUnits = wizardUnbornUnits + wizardDeceasedUnits;
  const wizardChildHasIssues =
    isShraddhaService && childRowsHaveIssues(childRows);
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
    if (!selectedService) {
      return 0;
    }

    const billableCount = participantCount + wizardChildUnits;

    if (selectedServiceOptions.length > 0) {
      return selectedServiceOptions.reduce(
        (sum, option) =>
          sum +
          option.priceAmount *
            getOptionQuantity(option.priceUnit, billableCount),
        0
      );
    }

    if (selectedService.priceUnit === "PER_ORDER") {
      return selectedService.priceAmount;
    }

    return selectedService.priceAmount * billableCount;
  }, [
    participantCount,
    selectedService,
    selectedServiceOptions,
    wizardChildUnits
  ]);
  const liveEstimateUnitLabel = selectedService
    ? getEstimateUnitLabel(selectedService.priceUnit, isShraddhaService)
    : "";
  const liveEstimateHint = selectedService
    ? selectedService.priceUnit === "PER_ORDER"
      ? selectedService.priceLabel
      : `В расчёте: ${participantCount + wizardChildUnits} ${liveEstimateUnitLabel} · ${selectedService.priceLabel}`
    : "";

  const multiLines = useMemo(() => {
    return services
      .filter((service) => multiSelections[service.slug])
      .map((service) => {
        const selection = multiSelections[service.slug];
        const optionIds = service.isSubscription ? [] : selection.optionIds;
        const options = service.isSubscription
          ? []
          : service.options.filter((option) => optionIds.includes(option.id));
        const names = getParticipantNamesFromText(selection.participantsInput);
        const invalidLines = getInvalidParticipantLines(
          selection.participantsInput
        );
        const isShraddha = service.shraddhaModeEnabled;
        const childUnits = isShraddha
          ? getChildUnitsFromRows(selection.childRows)
          : 0;
        const childHasIssues =
          isShraddha && childRowsHaveIssues(selection.childRows);
        const billableCount = names.length + childUnits;
        const needsParticipants = multiServiceNeedsParticipants(
          service,
          optionIds
        );
        const mustSelectOptions =
          !service.isSubscription &&
          (service.slug === "single-rite" || service.options.length > 0);
        const amount = options.length
          ? options.reduce(
              (sum, option) =>
                sum +
                option.priceAmount *
                  getOptionQuantity(option.priceUnit, billableCount),
              0
            )
          : service.priceUnit === "PER_ORDER"
            ? service.priceAmount
            : service.priceAmount * billableCount;
        const optionsOk = !mustSelectOptions || options.length > 0;
        const participantsOk =
          !needsParticipants ||
          ((names.length > 0 || childUnits > 0) &&
            invalidLines.length === 0 &&
            names.length <= 200);

        return {
          amount,
          childHasIssues,
          childUnits,
          invalidLines,
          mustSelectOptions,
          names,
          needsParticipants,
          optionIds,
          options,
          selection,
          service,
          valid: optionsOk && participantsOk && !childHasIssues
        };
      });
  }, [multiSelections, services]);
  const multiCurrency = services[0]?.currency ?? "RUB";
  const multiTotal = multiLines.reduce((sum, line) => sum + line.amount, 0);
  const multiTotalNames = multiLines.reduce(
    (sum, line) => sum + line.names.length,
    0
  );
  const isMultiSelectionValid =
    multiLines.length > 0 &&
    multiTotalNames <= 200 &&
    multiLines.every((line) => line.valid);

  function toggleMultiService(slug: string) {
    setMultiSelections((current) => {
      if (current[slug]) {
        const next = { ...current };

        delete next[slug];

        return next;
      }

      return {
        ...current,
        [slug]: {
          optionIds: [],
          participantsInput: "",
          childRows: emptyChildRows()
        }
      };
    });
  }

  function toggleMultiOption(slug: string, optionId: string) {
    setMultiSelections((current) => {
      const selection = current[slug] ?? {
        optionIds: [],
        participantsInput: "",
        childRows: emptyChildRows()
      };
      const optionIds = selection.optionIds.includes(optionId)
        ? selection.optionIds.filter((id) => id !== optionId)
        : [...selection.optionIds, optionId];

      return { ...current, [slug]: { ...selection, optionIds } };
    });
  }

  function setMultiParticipants(slug: string, value: string) {
    setMultiSelections((current) => {
      const selection = current[slug] ?? {
        optionIds: [],
        participantsInput: "",
        childRows: emptyChildRows()
      };

      return {
        ...current,
        [slug]: { ...selection, participantsInput: value }
      };
    });
  }

  function setMultiChildRows(slug: string, value: ChildRowsState) {
    setMultiSelections((current) => {
      const selection = current[slug] ?? {
        optionIds: [],
        participantsInput: "",
        childRows: emptyChildRows()
      };

      return {
        ...current,
        [slug]: { ...selection, childRows: value }
      };
    });
  }

  const hasContact = Boolean(
    customerTelegram.trim() || customerPhone.trim() || customerEmail.trim()
  );
  const isSubmitDisabled =
    mode === "multi"
      ? submitState.status === "loading" ||
        !isMultiSelectionValid ||
        !hasContact ||
        !isCustomerPhoneValid ||
        paymentProviders.length === 0
      : submitState.status === "loading" ||
        !selectedService ||
        (step === 0 &&
          mustSelectServiceOptions &&
          selectedServiceOptions.length < 1) ||
        (step === 1 &&
          (hasInvalidParticipants ||
            wizardChildHasIssues ||
            (participantCount < 1 && wizardChildUnits < 1))) ||
        (step === 2 && (!hasContact || !isCustomerPhoneValid)) ||
        (step === 4 && paymentProviders.length === 0);
  const submitButtonLabel =
    mode === "multi" || step === formSteps.length - 1
      ? submitState.status === "loading"
        ? copy.actions.creating
        : copy.actions.pay
      : copy.actions.continue;
  const clientRegisterHref = referralSlug
    ? `/client/register?ref=${encodeURIComponent(referralSlug)}`
    : "/client/register";
  const clientLoginHref = "/client/login?next=%2Fclient";
  const isClientCabinetActive =
    isClientSessionActive ||
    telegramAuthState.status === "authenticated" ||
    savedParticipants.length > 0;

  const fetchSavedParticipants = useCallback(async () => {
    const response = await fetch("/api/client/saved-participants");
    const result = (await response.json().catch(() => ({}))) as
      | SavedParticipantsResponse
      | { message?: string };

    if (!response.ok || !("participants" in result)) {
      return null;
    }

    return result;
  }, []);

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
    let cancelled = false;

    void fetchSavedParticipants()
      .then((result) => {
        if (cancelled || !result) {
          return;
        }

        setIsClientSessionActive(Boolean(result.authenticated));
        setSavedParticipants(result.participants ?? []);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [fetchSavedParticipants]);

  useEffect(() => {
    let cancelled = false;

    void waitForTelegramWebApp()
      .then(async (webApp) => {
        if (!webApp || cancelled) {
          return null;
        }

        webApp.ready?.();
        webApp.expand?.();

        return fetch("/api/client/telegram-mini-app", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            initData: webApp.initData,
            referralSlug
          })
        });
      })
      .then(async (response) => {
        if (!response) {
          return null;
        }
        const result = (await response.json().catch(() => ({}))) as
          | {
              client: TelegramMiniAppClient;
              referralSlug?: string | null;
            }
          | { message?: string };

        if (!response.ok || !("client" in result)) {
          throw new Error(
            "message" in result && result.message
              ? result.message
              : "Не удалось войти через Telegram"
          );
        }

        return result;
      })
      .then((result) => {
        if (!result || cancelled) {
          return;
        }

        setTelegramAuthState({
          status: "authenticated",
          client: result.client
        });
        setIsClientSessionActive(true);
        setCustomerName((current) => current || result.client.name || "");
        setCustomerNameTouched(
          (current) => current || Boolean(result.client.name)
        );
        setCustomerTelegram(
          (current) => current || result.client.telegram || ""
        );
        setCustomerPhone((current) => current || result.client.phone || "");
        setCustomerEmail((current) => current || result.client.email || "");
        setConsentPersonalData(
          (current) => current || Boolean(result.client.consentPersonalData)
        );
        setConsentMailings(
          (current) => current || Boolean(result.client.consentMailings)
        );

        if (result.referralSlug && result.referralSlug !== referralSlug) {
          const url = new URL(window.location.href);

          url.searchParams.set("ref", result.referralSlug);
          url.hash = "signup";
          window.location.replace(url.toString());
          return;
        }

        void fetchSavedParticipants()
          .then((savedResult) => {
            if (!savedResult) {
              return;
            }

            setIsClientSessionActive(Boolean(savedResult.authenticated));
            setSavedParticipants(savedResult.participants ?? []);
          })
          .catch(() => undefined);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setTelegramAuthState({
            status: "error",
            message: error.message
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchSavedParticipants, referralSlug]);

  useEffect(() => {
    const repeatToken = new URLSearchParams(window.location.search).get(
      "repeat"
    );

    if (!repeatToken || repeatLoadedKey.current === repeatToken) {
      return;
    }

    let cancelled = false;

    void fetch(`/api/client/repeat?order=${encodeURIComponent(repeatToken)}`)
      .then(async (response) => {
        const result = (await response.json().catch(() => ({}))) as
          | {
              customerEmail?: string | null;
              customerName?: string | null;
              customerPhone?: string | null;
              customerTelegram?: string | null;
              participantsText: string;
              referralSlug?: string | null;
              selectedServiceOptionIds: string[];
              serviceSlug: string;
            }
          | { message?: string };

        if (!response.ok || !("serviceSlug" in result)) {
          throw new Error(
            "message" in result && result.message
              ? result.message
              : "Не удалось загрузить прошлый абонемент"
          );
        }

        return result;
      })
      .then((result) => {
        if (cancelled) {
          return;
        }

        repeatLoadedKey.current = repeatToken;

        if (result.referralSlug && result.referralSlug !== referralSlug) {
          const url = new URL(window.location.href);

          url.searchParams.set("ref", result.referralSlug);
          url.hash = "signup";
          window.location.replace(url.toString());
          return;
        }

        if (services.some((service) => service.slug === result.serviceSlug)) {
          setServiceSlug(result.serviceSlug);
          setSelectedServiceOptionIds(result.selectedServiceOptionIds);
        }

        setParticipantsInput(result.participantsText);
        setCustomerName(result.customerName ?? "");
        setCustomerNameTouched(Boolean(result.customerName));
        setCustomerTelegram(result.customerTelegram ?? "");
        setCustomerPhone(result.customerPhone ?? "");
        setCustomerEmail(result.customerEmail ?? "");
        setConsentPersonalData(true);
        setRepeatMessage(
          "Мы заполнили форму по прошлому абонементу. Проверьте данные и отправьте заявку заново."
        );
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setRepeatMessage(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [referralSlug, services, telegramAuthState.status]);

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
    if (!detailsService) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const closeButton = document.querySelector<HTMLButtonElement>(
      "[data-service-details-close]"
    );

    document.body.style.overflow = "hidden";
    closeButton?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDetailsServiceSlug(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      lastDetailsButtonRef.current?.focus({ preventScroll: true });
    };
  }, [detailsService]);

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
        consentMailings: showMailingConsentCheckbox ? consentMailings : false,
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

  function addSavedParticipant(fullName: string) {
    setParticipantsInput((current) => {
      const names = getParticipantNamesFromText(current);
      const exists = names.some(
        (name) =>
          name.toLocaleLowerCase("ru") === fullName.toLocaleLowerCase("ru")
      );

      if (exists) {
        return current;
      }

      return [...names, fullName].join("\n");
    });
  }

  function selectService(slug: string) {
    setServiceSlug(slug);
    setSelectedServiceOptionIds([]);
    setChildRows(emptyChildRows());
  }

  function openServiceDetails(service: SiteService, button: HTMLButtonElement) {
    lastDetailsButtonRef.current = button;
    setDetailsServiceSlug(service.slug);
  }

  function selectServiceFromDetails(service: SiteService) {
    selectService(service.slug);
    setDetailsServiceSlug(null);
  }

  function toggleServiceOption(optionId: string) {
    setSelectedServiceOptionIds((current) =>
      current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId]
    );
  }

  async function submitOrder() {
    if (mode === "wizard" && !selectedService) {
      setSubmitState({
        status: "error",
        message: "Запись временно недоступна: продукты пока не добавлены."
      });
      return;
    }

    if (mode === "multi" && !isMultiSelectionValid) {
      setSubmitState({
        status: "error",
        message: "Выберите услуги и заполните участников."
      });
      return;
    }

    setSubmitState({ status: "loading" });

    const sharedPayload = {
      consentMailings: showMailingConsentCheckbox ? consentMailings : false,
      consentPersonalData: true as const,
      customerEmail,
      customerName,
      customerPhone,
      customerPhoneCountry,
      customerTelegram,
      paymentProvider,
      referralSlug
    };
    const payload =
      mode === "multi"
        ? {
            ...sharedPayload,
            items: multiLines.map((line) => ({
              participantCount: line.names.length,
              participantsText: line.names.join("\n"),
              childRecords: line.service.shraddhaModeEnabled
                ? childRowsToPayload(line.selection.childRows)
                : [],
              selectedServiceOptionIds: line.service.isSubscription
                ? []
                : line.optionIds,
              serviceSlug: line.service.slug
            }))
          }
        : {
            ...sharedPayload,
            participantCount,
            participantsText,
            childRecords: isShraddhaService
              ? childRowsToPayload(childRows)
              : [],
            selectedServiceOptionIds: selectedService!.isSubscription
              ? []
              : selectedServiceOptionIds,
            serviceSlug: selectedService!.slug
          };

    let response: Response;

    try {
      response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
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
          clientOrderPath?: string;
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
      clientOrderPath: result.clientOrderPath,
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

    if (mode === "multi") {
      await submitOrder();
      return;
    }

    if (step < formSteps.length - 1) {
      if (
        step === 0 &&
        mustSelectServiceOptions &&
        selectedServiceOptions.length < 1
      ) {
        return;
      }

      if (step === 1 && (!customerNameTouched || !customerName.trim())) {
        const firstParticipantName = participantFullNames[0];

        if (firstParticipantName) {
          setCustomerName(firstParticipantName);
        }
      }

      if (step === 2 && (!hasContact || !isCustomerPhoneValid)) {
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
          <a
            className="button button--primary form-result__payment-button"
            href={submitState.paymentUrl}
          >
            Перейти к оплате
          </a>
        )}
        {telegramAuthState.status === "authenticated" && (
          <a className="button" href="/client">
            Открыть личный кабинет
          </a>
        )}
        {telegramAuthState.status !== "authenticated" && (
          <div className="registration-nudge registration-nudge--success">
            <strong>Активируйте личный кабинет</strong>
            <p>
              Зарегистрируйтесь с тем же email, телефоном или Telegram — заявка
              привяжется к профилю, а участники сохранятся для следующих
              записей.
            </p>
            <div className="registration-nudge__actions">
              <a className="button button--small" href={clientRegisterHref}>
                Активировать личный кабинет
              </a>
              <a className="button button--small" href={clientLoginHref}>
                Уже есть кабинет
              </a>
            </div>
          </div>
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

  if (services.length === 0) {
    return (
      <div className="form-result" role="status">
        <h3>Запись временно недоступна</h3>
        <p>
          Продукты пока не добавлены администратором. Пожалуйста, уточните
          доступные варианты у куратора.
        </p>
        <SupportCta
          curatorName={assignedCurator.name}
          note="Куратор подскажет, какие церемонии сейчас доступны."
          supportButtonLabel={assignedCurator.supportButtonLabel}
          supportEnabled={assignedCurator.supportEnabled}
          supportUrl={assignedCurator.supportUrl}
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
      <div
        className="signup-mode-toggle"
        role="group"
        aria-label="Режим выбора услуг"
      >
        <button
          aria-pressed={mode === "wizard"}
          className={
            mode === "wizard"
              ? "button button--small button--primary"
              : "button button--small"
          }
          onClick={() => setMode("wizard")}
          type="button"
        >
          Пошагово (одна услуга)
        </button>
        <button
          aria-pressed={mode === "multi"}
          className={
            mode === "multi"
              ? "button button--small button--primary"
              : "button button--small"
          }
          onClick={() => setMode("multi")}
          type="button"
        >
          Выбрать несколько услуг
        </button>
      </div>

      {mode === "wizard" && (
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
      )}

      <div
        className="signup-auth-links"
        aria-label="Личный кабинет клиента"
      >
        {isClientCabinetActive ? (
          <>
            <span className="signup-auth-links__label">
              Личный кабинет подключён
            </span>
            <a
              className="button button--small button--primary signup-auth-links__button"
              href="/client"
              style={signupAuthRegisterButtonInlineStyle}
            >
              Открыть кабинет
            </a>
          </>
        ) : (
          <>
            <span className="signup-auth-links__label">
              Уже записывались?
            </span>
            <span className="signup-auth-links__actions">
              <a
                className="button button--small signup-auth-links__button"
                href={clientLoginHref}
                style={signupAuthLoginButtonInlineStyle}
              >
                Войти
              </a>
              <a
                className="button button--small button--primary signup-auth-links__button"
                href={clientRegisterHref}
                style={signupAuthRegisterButtonInlineStyle}
              >
                Создать кабинет
              </a>
            </span>
          </>
        )}
      </div>

      {mode === "multi" && (
        <fieldset className="form-step">
          <legend>{copy.legend.ceremony}</legend>
          <p className="form-note">
            Отметьте все услуги, которые хотите оформить одним заказом. Для
            услуг с участниками укажите список, для услуг с обрядами выберите
            нужные.
          </p>
          <div className="option-grid">
            {services.map((service) => {
              const selection = multiSelections[service.slug];
              const isSelected = Boolean(selection);
              const optionIds = selection?.optionIds ?? [];
              const needsParticipants =
                isSelected && multiServiceNeedsParticipants(service, optionIds);
              const mustSelectOptions =
                !service.isSubscription &&
                (service.slug === "single-rite" || service.options.length > 0);
              const invalidLines = selection
                ? getInvalidParticipantLines(selection.participantsInput)
                : [];
              const selectedOptions = service.isSubscription
                ? []
                : service.options.filter((option) =>
                    optionIds.includes(option.id)
                  );
              const subscriptionDurationText =
                getSubscriptionDurationText(service);

              return (
                <div
                  className={
                    isSelected
                      ? "choice-card choice-card--stacked is-selected"
                      : "choice-card choice-card--stacked"
                  }
                  key={service.slug}
                >
                  <label className="choice-card__select">
                    <input
                      checked={isSelected}
                      onChange={() => toggleMultiService(service.slug)}
                      type="checkbox"
                    />
                    <span className="choice-card__label-content">
                      <span className="choice-card__title">
                        {service.title}
                      </span>
                      <small className="choice-card__price">
                        {service.priceLabel}
                      </small>
                      {service.isSubscription && (
                        <span className="choice-card__subscription-meta">
                          <span>
                            Старт:{" "}
                            {service.subscriptionStartsAtLabel || "уточняется"}
                            {service.subscriptionStartsAtLabel ? " МСК" : ""}
                          </span>
                          <span>
                            Продлится:{" "}
                            {subscriptionDurationText ?? "уточняется"}
                          </span>
                        </span>
                      )}
                    </span>
                  </label>
                  {service.description && (
                    <p className="choice-card__note">{service.description}</p>
                  )}
                  {isSelected && mustSelectOptions && (
                    <div className="rite-choice-list">
                      <strong>Выберите один или несколько обрядов</strong>
                      {service.options.length > 0 ? (
                        service.options.map((option) => (
                          <label
                            className="choice-card rite-choice-card"
                            key={option.id}
                          >
                            <input
                              checked={optionIds.includes(option.id)}
                              onChange={() =>
                                toggleMultiOption(service.slug, option.id)
                              }
                              type="checkbox"
                            />
                            {option.eventStartsAtLabel && (
                              <span className="rite-choice-card__date">
                                {option.eventStartsAtLabel} МСК
                              </span>
                            )}
                            <span className="rite-choice-card__title">
                              {option.title}
                            </span>
                            {option.description && (
                              <small>{option.description}</small>
                            )}
                            <small className="rite-choice-card__price">
                              {option.priceLabel}
                            </small>
                          </label>
                        ))
                      ) : (
                        <p className="form-warning">
                          Обряды пока не добавлены администратором.
                        </p>
                      )}
                      {selectedOptions.length < 1 && (
                        <p className="form-warning">
                          Выберите хотя бы один обряд.
                        </p>
                      )}
                    </div>
                  )}
                  {isSelected && needsParticipants && (
                    <label className="field">
                      <span>{copy.fields.participantList}</span>
                      <textarea
                        onChange={(event) =>
                          setMultiParticipants(service.slug, event.target.value)
                        }
                        placeholder={"Иван Иванов\nМария Петрова"}
                        rows={4}
                        value={selection.participantsInput}
                      />
                      {invalidLines.length > 0 && (
                        <small className="field-error">
                          Проверьте строки:{" "}
                          {invalidLines
                            .map((line) => line.lineNumber)
                            .join(", ")}
                        </small>
                      )}
                    </label>
                  )}
                  {isSelected && service.shraddhaModeEnabled && (
                    <ChildRecordsBlock
                      deceasedChildLabel={service.shraddhaDeceasedChildLabel}
                      helpText={service.shraddhaChildHelpText}
                      onChange={(rows) => setMultiChildRows(service.slug, rows)}
                      rows={selection?.childRows ?? emptyChildRows()}
                      unbornLabel={service.shraddhaUnbornLabel}
                      warningText={service.shraddhaWarningText}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="multi-summary">
            {multiLines.length > 0 ? (
              <>
                <ul className="rite-summary-list">
                  {multiLines.map((line) => (
                    <li key={line.service.slug}>
                      {line.service.title}
                      {line.options.length > 0
                        ? ` — ${line.options
                            .map((option) => option.title)
                            .join(", ")}`
                        : ""}
                      {line.names.length > 0
                        ? ` — ${line.names.length} уч.`
                        : ""}
                      {line.childUnits > 0 ? ` + ${line.childUnits} дет.` : ""}
                      {" — "}
                      {formatMoney(line.amount, line.service.currency)}
                    </li>
                  ))}
                </ul>
                <p className="multi-summary__total">
                  <strong>
                    Итого: {formatMoney(multiTotal, multiCurrency)}
                  </strong>
                </p>
              </>
            ) : (
              <p className="form-note">Отметьте хотя бы одну услугу.</p>
            )}
          </div>
        </fieldset>
      )}

      {mode === "wizard" && step === 0 && (
        <fieldset className="form-step">
          <legend>{copy.legend.ceremony}</legend>
          <div className="option-grid">
            {services.map((service) => {
              const showVedicGift = service.vedicGiftEnabled;
              const inputId = `service-${service.slug}`;
              const subscriptionDurationText =
                getSubscriptionDurationText(service);

              return (
                <div
                  className={
                    showVedicGift
                      ? "choice-card choice-card--stacked choice-card--bonus"
                      : "choice-card choice-card--stacked"
                  }
                  key={service.slug}
                  onClick={(event) => {
                    if (
                      event.target instanceof HTMLElement &&
                      event.target.closest("button")
                    ) {
                      return;
                    }

                    if (activeServiceSlug !== service.slug) {
                      selectService(service.slug);
                    }
                  }}
                >
                  <label
                    className={
                      showVedicGift
                        ? "choice-card__select choice-card__select--gift"
                        : "choice-card__select"
                    }
                    htmlFor={inputId}
                  >
                    <input
                      checked={activeServiceSlug === service.slug}
                      className={
                        showVedicGift ? "choice-card__radio--hidden" : undefined
                      }
                      id={inputId}
                      name="service"
                      onChange={() => selectService(service.slug)}
                      type="radio"
                      value={service.slug}
                    />
                    {showVedicGift && (
                      <span
                        className="choice-card__gift-badge"
                        title={
                          service.vedicGiftDescription
                            ? `${service.vedicGiftTitle}\n${service.vedicGiftDescription}`
                            : service.vedicGiftTitle
                        }
                      >
                        🎁 Подарок
                      </span>
                    )}
                    <span className="choice-card__label-content">
                      <span className="choice-card__title">
                        {service.title}
                      </span>
                      <small className="choice-card__price">
                        {service.priceLabel}
                      </small>
                      {service.isSubscription && (
                        <span className="choice-card__subscription-meta">
                          <span>
                            Старт:{" "}
                            {service.subscriptionStartsAtLabel || "уточняется"}
                            {service.subscriptionStartsAtLabel ? " МСК" : ""}
                          </span>
                          <span>
                            Продлится:{" "}
                            {subscriptionDurationText ?? "уточняется"}
                          </span>
                        </span>
                      )}
                    </span>
                  </label>
                  {service.description && (
                    <p className="choice-card__note">{service.description}</p>
                  )}
                  {!service.isSubscription && service.detailsContent.trim() && (
                    <button
                      aria-label={`Показать подробное пояснение: ${service.title}`}
                      className="service-details-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openServiceDetails(service, event.currentTarget);
                      }}
                      title="Подробное пояснение"
                      type="button"
                    >
                      <span aria-hidden="true">?</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {detailsService && (
            <ServiceDetailsDialog
              onClose={() => setDetailsServiceSlug(null)}
              onSelect={() => selectServiceFromDetails(detailsService)}
              service={detailsService}
            />
          )}

          {mustSelectServiceOptions && selectedService && (
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
                    {option.eventStartsAtLabel && (
                      <span className="rite-choice-card__date">
                        {option.eventStartsAtLabel} МСК
                      </span>
                    )}
                    <span className="rite-choice-card__title">
                      {option.title}
                    </span>
                    {option.description && <small>{option.description}</small>}
                    <small className="rite-choice-card__price">
                      {option.priceLabel}
                    </small>
                  </label>
                ))
              ) : (
                <p className="form-warning">
                  Обряды пока не добавлены администратором.
                </p>
              )}
              {selectedServiceOptions.length < 1 && (
                <p className="form-warning">Выберите хотя бы один обряд.</p>
              )}
            </div>
          )}
        </fieldset>
      )}

      {mode === "wizard" && step === 1 && (
        <fieldset className="form-step">
          <legend>{copy.legend.participants}</legend>
          {isShraddhaService && selectedService?.shraddhaWarningText && (
            <p className="form-warning form-warning--danger shraddha-children__warning">
              {selectedService.shraddhaWarningText}
            </p>
          )}
          <p className="form-note">{copy.placeholders.participants}</p>
          {!isClientCabinetActive && (
            <div className="registration-nudge registration-nudge--soft">
              <strong>Сохраните участников для следующих записей</strong>
              <p>
                В личном кабинете можно быстро подставлять имена из прошлых
                заказов и не вводить список заново.
              </p>
              <div className="registration-nudge__actions">
                <a className="button button--small" href={clientLoginHref}>
                  Войти
                </a>
                <a className="button button--small" href={clientRegisterHref}>
                  Создать кабинет
                </a>
              </div>
            </div>
          )}
          {savedParticipants.length > 0 && (
            <div className="saved-participants-panel">
              <strong>Сохранённые участники</strong>
              <p className="form-note">
                Нажмите на имя, чтобы быстро добавить участника из прошлых
                заказов.
              </p>
              <div className="saved-participants-list">
                {savedParticipants.map((participant) => {
                  const alreadyAdded = participantFullNames.some(
                    (name) =>
                      name.toLocaleLowerCase("ru") ===
                      participant.fullName.toLocaleLowerCase("ru")
                  );

                  return (
                    <button
                      className="button button--small"
                      disabled={alreadyAdded}
                      key={participant.id}
                      onClick={() => addSavedParticipant(participant.fullName)}
                      type="button"
                    >
                      {alreadyAdded ? "Добавлен: " : "+ "}
                      {participant.fullName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <label className="field">
            <span>{copy.fields.participantList}</span>
            <textarea
              aria-invalid={hasInvalidParticipants}
              className="participant-textarea"
              onChange={(event) => setParticipantsInput(event.target.value)}
              placeholder={"Иван Иванов\nМария Петрова\nАлексей Смирнов"}
              required
              rows={6}
              value={participantsInput}
            />
          </label>
          <p className="form-note">
            {copy.fields.participantCount}: {participantCount}
          </p>
          {invalidParticipantLines.length > 0 && (
            <p className="form-warning">
              {copy.warnings.invalidParticipantLines.replace(
                "{{lines}}",
                invalidParticipantLines
                  .map(({ lineNumber }) => String(lineNumber))
                  .join(", ")
              )}
            </p>
          )}
          {participantCount > 200 && (
            <p className="form-warning">{copy.warnings.tooManyParticipants}</p>
          )}
          {participantCount < 1 &&
            !(isShraddhaService && wizardChildUnits > 0) && (
              <p className="form-warning">
                {copy.warnings.incompleteParticipants.replace("{{count}}", "0")}
              </p>
            )}
          {isShraddhaService && selectedService && (
            <ChildRecordsBlock
              deceasedChildLabel={selectedService.shraddhaDeceasedChildLabel}
              helpText={selectedService.shraddhaChildHelpText}
              onChange={setChildRows}
              rows={childRows}
              unbornLabel={selectedService.shraddhaUnbornLabel}
              warningText=""
            />
          )}
          {selectedService && (
            <div aria-live="polite" className="live-estimate">
              <span className="live-estimate__label">Предварительная сумма</span>
              <strong className="live-estimate__amount">
                {formatMoney(estimatedAmount, selectedService.currency)}
              </strong>
              <small className="live-estimate__hint">{liveEstimateHint}</small>
            </div>
          )}
        </fieldset>
      )}

      {(mode === "multi" || step === 2) && (
        <fieldset className="form-step">
          <legend>{copy.legend.contacts}</legend>
          <div className="telegram-auth-card">
            {telegramAuthState.status === "authenticated" ? (
              <>
                <strong>
                  Вы вошли через Telegram
                  {telegramAuthState.client.telegram
                    ? ` как ${telegramAuthState.client.telegram}`
                    : ""}
                </strong>
                <p>
                  Регистрация не нужна — личный кабинет уже подключён через
                  Telegram. Контакты и участники сохранятся, а прошлые записи
                  можно будет повторить без повторного ввода данных.
                </p>
                <a className="button button--small" href="/client">
                  Открыть личный кабинет
                </a>
              </>
            ) : telegramAuthState.status === "loading" ? (
              <p>Проверяем вход через Telegram...</p>
            ) : telegramAuthState.status === "error" ? (
              <p>{telegramAuthState.message}</p>
            ) : (
              <p>
                Если открыть форму из Telegram Mini App, мы автоматически
                сохраним данные в личном кабинете.
              </p>
            )}
          </div>
          {!isClientCabinetActive && (
            <div className="registration-nudge">
              <strong>Можно сохранить заявку в личном кабинете</strong>
              <p>
                Создайте кабинет сейчас или после оформления: там будут статус
                записи, оплата, участники и связь с куратором.
              </p>
              <div className="registration-nudge__actions">
                <a className="button button--small" href={clientRegisterHref}>
                  Создать кабинет
                </a>
                <a className="button button--small" href={clientLoginHref}>
                  Войти, если уже записывались
                </a>
              </div>
            </div>
          )}
          {repeatMessage && <p className="form-note">{repeatMessage}</p>}
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
              <a href="/legal/offer" rel="noreferrer" target="_blank">
                {copy.consent.offer}
              </a>{" "}
              и{" "}
              <a href="/refund" rel="noreferrer" target="_blank">
                {copy.consent.refund}
              </a>
              .
            </span>
          </label>
          {showMailingConsentCheckbox && (
            <label className="checkbox-field">
              <input
                checked={consentMailings}
                onChange={(event) => setConsentMailings(event.target.checked)}
                type="checkbox"
              />
              <span>{copy.consent.mailing}</span>
            </label>
          )}
        </fieldset>
      )}

      {mode === "wizard" && step === 3 && (
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
                {selectedService!.title}
                {selectedService!.isSubscription && (
                  <span className="subscription-summary-line">
                    {selectedService!.subscriptionStartsAtLabel &&
                    selectedService!.subscriptionEndsAtLabel
                      ? `Действует с ${selectedService!.subscriptionStartsAtLabel} до ${selectedService!.subscriptionEndsAtLabel} МСК`
                      : "Период действия уточняется."}
                  </span>
                )}
                {selectedServiceOptions.length > 0 && (
                  <ul className="rite-summary-list">
                    {selectedServiceOptions.map((option) => (
                      <li key={option.id}>
                        {option.eventStartsAtLabel
                          ? `${option.eventStartsAtLabel} МСК — `
                          : ""}
                        {option.title} — {option.priceLabel}
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
            {isShraddhaService && wizardUnbornUnits > 0 && (
              <div>
                <dt>Нерожденных детей</dt>
                <dd>{wizardUnbornUnits}</dd>
              </div>
            )}
            {isShraddhaService && wizardDeceasedUnits > 0 && (
              <div>
                <dt>Умерших детей</dt>
                <dd>{wizardDeceasedUnits}</dd>
              </div>
            )}
            <div>
              <dt>{copy.review.amount}</dt>
              <dd>{formatMoney(estimatedAmount, selectedService!.currency)}</dd>
            </div>
          </dl>
          {!isClientCabinetActive && (
            <div className="registration-nudge registration-nudge--review">
              <strong>Хотите сохранить эту запись?</strong>
              <p>
                После оформления можно активировать личный кабинет с теми же
                контактами и видеть статус, оплату и список участников в одном
                месте.
              </p>
            </div>
          )}
        </div>
      )}

      {(mode === "multi" || step === 4) && (
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
            <a href="/legal/offer" rel="noreferrer" target="_blank">
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
        {mode === "wizard" && step > 0 && (
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
