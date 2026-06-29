"use client";

import { ChangeEvent, FormEvent, useCallback, useMemo, useState } from "react";

type VedicGiftFormData = {
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  telegram?: string;
};

type VedicGiftFormProps = {
  alreadySubmitted?: boolean;
  initialEmail?: string;
  initialName?: string;
  initialPhone?: string;
  initialTelegram?: string;
  orderId: string;
  title?: string;
  description?: string;
};

const initialFormData: VedicGiftFormData = {
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  email: "",
  firstName: "",
  lastName: "",
  phone: undefined,
  telegram: undefined
};

export function VedicGiftForm({
  alreadySubmitted = false,
  initialEmail,
  initialName,
  initialPhone,
  initialTelegram,
  orderId,
  title = "🎁 Подарок: ведический астрологический разбор",
  description = "Пожалуйста, укажите данные для составления разбора по ведической астрологии (Джйотиш)."
}: VedicGiftFormProps) {
  const [initialLastName, initialFirstName] = useMemo(() => {
    const parts = (initialName ?? "").trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return [parts[0], parts.slice(1).join(" ")];
    }

    return ["", parts[0] ?? ""];
  }, [initialName]);

  const [formData, setFormData] = useState<VedicGiftFormData>({
    ...initialFormData,
    email: initialEmail || "",
    firstName: initialFirstName,
    lastName: initialLastName,
    phone: initialPhone,
    telegram: initialTelegram
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, type, value } = e.target;
      const checked =
        e.target instanceof HTMLInputElement ? e.target.checked : false;

      if (name === "birthTimeUnknown") {
        setFormData((prev) => ({
          ...prev,
          birthTimeUnknown: checked,
          birthTime: checked ? "" : prev.birthTime
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value
      }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch("/api/vedic-gift", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            orderId
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Ошибка при отправке формы");
        }

        setSubmitted(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка при отправке");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, orderId]
  );

  if (alreadySubmitted || submitted) {
    return (
      <div className="vedic-gift-form-success">
        <h3>🎁 Спасибо!</h3>
        <p>
          Ваши данные для ведического астрологического разбора получены. Мы
          подготовим разбор и отправим вам результат.
        </p>
      </div>
    );
  }

  return (
    <form className="vedic-gift-form" onSubmit={handleSubmit}>
      <h3>{title}</h3>
      <p className="vedic-gift-form__lead">{description}</p>

      {error && <div className="form-error">{error}</div>}

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="lastName">Фамилия</label>
          <input
            id="lastName"
            name="lastName"
            required
            type="text"
            value={formData.lastName}
            onChange={handleChange}
          />
        </div>

        <div className="form-field">
          <label htmlFor="firstName">Имя</label>
          <input
            id="firstName"
            name="firstName"
            required
            type="text"
            value={formData.firstName}
            onChange={handleChange}
          />
        </div>

        <div className="form-field form-field--full">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            required
            type="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className="form-field">
          <label htmlFor="birthDate">Дата рождения</label>
          <input
            id="birthDate"
            name="birthDate"
            required
            type="date"
            value={formData.birthDate}
            onChange={handleChange}
          />
        </div>

        <div className="form-field">
          <label htmlFor="birthTime">Время рождения</label>
          <input
            id="birthTime"
            name="birthTime"
            disabled={formData.birthTimeUnknown}
            type="time"
            value={formData.birthTime}
            onChange={handleChange}
          />
          <label className="checkbox-label">
            <input
              checked={formData.birthTimeUnknown}
              name="birthTimeUnknown"
              type="checkbox"
              onChange={handleChange}
            />
            Не знаю точное время
          </label>
        </div>

        {formData.phone && (
          <div className="form-field form-field--full">
            <label htmlFor="phone">Телефон</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              disabled
            />
          </div>
        )}

        {formData.telegram && (
          <div className="form-field form-field--full">
            <label htmlFor="telegram">Telegram</label>
            <input
              id="telegram"
              name="telegram"
              type="text"
              value={formData.telegram}
              onChange={handleChange}
              disabled
            />
          </div>
        )}
      </div>

      <button
        className="button button--primary"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Отправка..." : "Отправить данные для разбора"}
      </button>
    </form>
  );
}
