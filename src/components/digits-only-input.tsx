"use client";

import type { ComponentProps } from "react";

type DigitsOnlyInputProps = Omit<ComponentProps<"input">, "onInput" | "type">;

export function DigitsOnlyInput(props: DigitsOnlyInputProps) {
  return (
    <input
      {...props}
      inputMode="numeric"
      onInput={(event) => {
        event.currentTarget.value = event.currentTarget.value.replace(/\D+/g, "");
      }}
      pattern="[0-9]*"
      type="text"
    />
  );
}
