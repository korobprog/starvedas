"use client";

import { useEffect, useRef, useState, Fragment } from "react";

type ScheduleContentProps = {
  body: string;
  month: string;
  title: string;
};

const previewCharLimit = 700;
const previewLineLimit = 8;

function normalizeScheduleBody(value: string) {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
}

function getScheduleParts(value: string) {
  const body = normalizeScheduleBody(value);
  const lines = body.split("\n");

  if (lines.length > previewLineLimit) {
    return {
      preview: lines.slice(0, previewLineLimit).join("\n").trimEnd(),
      rest: lines.slice(previewLineLimit).join("\n").trimStart()
    };
  }

  if (body.length <= previewCharLimit) {
    return { preview: body, rest: "" };
  }

  const minCut = Math.floor(previewCharLimit * 0.55);
  const cutCandidates = [
    body.lastIndexOf("\n\n", previewCharLimit),
    body.lastIndexOf("\n", previewLineLimit),
    body.lastIndexOf(". ", previewCharLimit),
    body.lastIndexOf(" ", previewCharLimit)
  ];
  const cut =
    cutCandidates.find((candidate) => candidate > minCut) ?? previewCharLimit;

  return {
    preview: body.slice(0, cut).trimEnd(),
    rest: body.slice(cut).trimStart()
  };
}

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}

function ScheduleText({
  className = "",
  text,
  baseDelay
}: {
  className?: string;
  text: string;
  baseDelay?: number;
}) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div
      className={`schedule-content__text${className ? ` ${className}` : ""}`}
    >
      {paragraphs.map((paragraph, paragraphIndex) => {
        const lines = paragraph.split("\n");

        return (
          <p
            key={`${paragraphIndex}-${paragraph.slice(0, 16)}`}
            style={{ animationDelay: `${(baseDelay ?? 0.25) + paragraphIndex * 0.08}s` }}
          >
            {lines.map((line, lineIndex) => (
              <Fragment key={`${lineIndex}-${line.slice(0, 16)}`}>
                {line}
                {lineIndex < lines.length - 1 && <br />}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function ScheduleContent({ body, month, title }: ScheduleContentProps) {
  const { preview, rest } = getScheduleParts(body);
  const { ref, inView } = useInView();

  return (
    <div
      ref={ref}
      className={`schedule-content${inView ? " schedule-content--in-view" : ""}`}
    >
      <span>{month}</span>
      <h3>{title}</h3>
      <ScheduleText text={rest ? preview : body} />
      {rest && (
        <details className="schedule-content__details">
          <summary className="schedule-content__toggle">
            <span className="schedule-content__toggle-label">Расписание целиком</span>
          </summary>
          <ScheduleText className="schedule-content__text--rest" text={rest} baseDelay={0.05} />
        </details>
      )}
    </div>
  );
}
