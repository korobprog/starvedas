"use client";

import { useMemo, useState } from "react";
import { slugifyReferralValue } from "@/lib/slugs";

export function ServiceTitleSlugFields({
  defaultSlug = "",
  defaultTitle = "",
  previewCode,
  slugLocked = false
}: Readonly<{
  defaultSlug?: string;
  defaultTitle?: string;
  previewCode?: string;
  slugLocked?: boolean;
}>) {
  const [title, setTitle] = useState(defaultTitle);
  const generatedSlug = useMemo(() => {
    const baseSlug = slugifyReferralValue(title);

    if (!baseSlug) {
      return "";
    }

    return slugLocked || !previewCode ? baseSlug : `${baseSlug}-${previewCode}`;
  }, [previewCode, slugLocked, title]);
  const slugValue = slugLocked ? defaultSlug : generatedSlug;

  return (
    <>
      <label className="field">
        <span>Название</span>
        <input
          name="title"
          onChange={(event) => setTitle(event.currentTarget.value)}
          required
          type="text"
          value={title}
        />
      </label>
      <label className="field">
        <span>Slug</span>
        <input
          className="field-input--readonly"
          disabled
          placeholder="Создаётся автоматически"
          type="text"
          value={slugValue}
        />
        {!slugLocked && previewCode ? (
          <input name="slugCode" type="hidden" value={previewCode} />
        ) : null}
        <span className="field-hint">
          {slugLocked
            ? "Slug зафиксирован и недоступен для ручного редактирования."
            : "Slug создаётся автоматически из названия с уникальным кодом и недоступен для ручного редактирования."}
        </span>
      </label>
    </>
  );
}
