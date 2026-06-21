"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { slugifyReferralValue } from "@/lib/slugs";

type CuratorSlugInputProps = {
  defaultName?: string;
  defaultSlug?: string;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  required?: boolean;
};

export function CuratorSlugInput({
  defaultName = "",
  defaultSlug = "",
  disabled = false,
  label = "Slug для ссылки",
  placeholder = "jaya-mangal",
  required = false
}: CuratorSlugInputProps) {
  const initialGeneratedSlug = useMemo(
    () => slugifyReferralValue(defaultName),
    [defaultName]
  );
  const [slug, setSlug] = useState(defaultSlug || initialGeneratedSlug);
  const inputRef = useRef<HTMLInputElement>(null);
  const manualSlugRef = useRef(
    Boolean(defaultSlug && defaultSlug !== initialGeneratedSlug)
  );

  const generateFromName = useCallback(
    (name: string) => {
      const generatedSlug = slugifyReferralValue(name);

      if (!manualSlugRef.current || !slug) {
        setSlug(generatedSlug);
      }
    },
    [slug]
  );

  useEffect(() => {
    if (disabled) {
      return;
    }

    const form = inputRef.current?.closest("form");
    const nameInput =
      form?.querySelector<HTMLInputElement>('input[name="name"]');

    if (!nameInput) {
      return;
    }

    const nameInputElement = nameInput;

    generateFromName(nameInputElement.value);

    function handleNameInput() {
      generateFromName(nameInputElement.value);
    }

    nameInputElement.addEventListener("input", handleNameInput);

    return () => {
      nameInputElement.removeEventListener("input", handleNameInput);
    };
  }, [disabled, generateFromName]);

  function handleSlugChange(value: string) {
    const normalizedSlug = slugifyReferralValue(value);
    manualSlugRef.current = normalizedSlug.length > 0;
    setSlug(normalizedSlug);
  }

  function handleGenerateClick() {
    const form = inputRef.current?.closest("form");
    const nameInput =
      form?.querySelector<HTMLInputElement>('input[name="name"]');
    const generatedSlug = slugifyReferralValue(nameInput?.value ?? defaultName);

    manualSlugRef.current = false;
    setSlug(generatedSlug);
    inputRef.current?.focus();
  }

  return (
    <label className="field curator-slug-field">
      <span>{label}</span>
      <div className="slug-input-row">
        <input
          disabled={disabled}
          name="slug"
          onChange={(event) => handleSlugChange(event.target.value)}
          placeholder={placeholder}
          ref={inputRef}
          required={required}
          type="text"
          value={slug}
        />
        {!disabled && (
          <button
            className="button button--small"
            onClick={handleGenerateClick}
            title="Заполнить slug из имени и фамилии"
            type="button"
          >
            Из имени
          </button>
        )}
      </div>
      {!disabled && (
        <small className="field-hint">
          Заполняется автоматически из имени и фамилии, но можно изменить
          вручную.
        </small>
      )}
    </label>
  );
}
