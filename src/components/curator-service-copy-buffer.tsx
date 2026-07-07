"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { claimCuratorServiceParticipantListsAction } from "@/server/participant-list-actions";
import type { CuratorServiceParticipantListBuffer } from "@/server/participant-lists";

const initialState: { error?: string; message?: string } = {};

async function copyText(text: string) {
  if (!text) {
    return;
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");

  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function ConfirmCopiedButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button button--primary" disabled={pending} type="submit">
      {pending
        ? "\u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u043c\u2026"
        : "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043b"}
    </button>
  );
}

export function CuratorServiceCopyBuffer({
  buffer
}: Readonly<{ buffer: CuratorServiceParticipantListBuffer }>) {
  const router = useRouter();
  const [clientMessage, setClientMessage] = useState("");
  const [state, formAction] = useActionState(
    claimCuratorServiceParticipantListsAction,
    initialState
  );
  const lines = buffer.namesText.split("\n").filter(Boolean);

  useEffect(() => {
    if (state.message) {
      router.refresh();
    }
  }, [router, state.message]);

  async function copyNames() {
    await copyText(buffer.namesText);
    setClientMessage(
      `\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u043e \u0438\u043c\u0451\u043d: ${buffer.nameCount}`
    );
  }

  return (
    <div className="curator-service-copy-buffer">
      <div className="participant-tools__actions">
        <Link className="button" href="/cabinet?section=lists">
          {"\u2190 \u041a \u0441\u043f\u0438\u0441\u043a\u0430\u043c"}
        </Link>
      </div>

      <h3>{buffer.serviceTitle}</h3>

      <div className="participant-tools__actions">
        <button className="button" onClick={copyNames} type="button">
          {
            "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0438\u043c\u0435\u043d\u0430"
          }
        </button>
      </div>

      <div
        className="curator-service-copy-buffer__names"
        aria-label={
          "\u0418\u043c\u0435\u043d\u0430 \u0434\u043b\u044f \u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f"
        }
      >
        {lines.map((line, index) => (
          <div key={`${line}-${index}`}>{line}</div>
        ))}
      </div>

      <form
        action={formAction}
        className="curator-service-copy-buffer__confirm"
      >
        <input name="serviceId" type="hidden" value={buffer.serviceId} />
        <ConfirmCopiedButton />
      </form>

      {(clientMessage || state.error || state.message) && (
        <p
          aria-live="polite"
          className={state.error ? "form-warning" : "admin-muted"}
        >
          {clientMessage || state.error || state.message}
        </p>
      )}
    </div>
  );
}
