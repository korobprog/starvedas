"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type FormHintVariant = "service-create";

function getNamedElement(form: HTMLFormElement, name: string) {
  const element = form.elements.namedItem(name);

  if (element instanceof RadioNodeList) {
    return element[0] instanceof Element ? element[0] : null;
  }

  return element instanceof Element ? element : null;
}

function getFieldValue(form: HTMLFormElement, name: string) {
  const element = getNamedElement(form, name);

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return element.value.trim();
  }

  return "";
}

function isChecked(form: HTMLFormElement, name: string) {
  const element = getNamedElement(form, name);

  return element instanceof HTMLInputElement ? element.checked : false;
}

function hasPositiveNumber(form: HTMLFormElement, name: string) {
  const value = Number(getFieldValue(form, name));

  return Number.isFinite(value) && value > 0;
}

function shouldShowServiceCreateHint(form: HTMLFormElement) {
  const hasBaseFields =
    getFieldValue(form, "title").length > 0 &&
    getFieldValue(form, "receiptName").length > 0 &&
    hasPositiveNumber(form, "priceRub");

  if (!hasBaseFields) {
    return true;
  }

  if (!isChecked(form, "isSubscription")) {
    return false;
  }

  return !(
    getFieldValue(form, "subscriptionStartsAt").length > 0 &&
    getFieldValue(form, "subscriptionEndsAt").length > 0
  );
}

function shouldShowHint(form: HTMLFormElement, variant: FormHintVariant) {
  switch (variant) {
    case "service-create":
      return shouldShowServiceCreateHint(form);
    default:
      return true;
  }
}

export function FormPristineHint({
  children,
  formId,
  variant
}: Readonly<{
  children: ReactNode;
  formId: string;
  variant: FormHintVariant;
}>) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const form = document.getElementById(formId);

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const syncState = () => setIsVisible(shouldShowHint(form, variant));

    syncState();
    form.addEventListener("input", syncState);
    form.addEventListener("change", syncState);

    return () => {
      form.removeEventListener("input", syncState);
      form.removeEventListener("change", syncState);
    };
  }, [formId, variant]);

  if (!isVisible) {
    return null;
  }

  return <p className="admin-muted">{children}</p>;
}
