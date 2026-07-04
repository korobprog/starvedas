"use client";

import { useEffect, useRef, useState } from "react";
import { stripHtmlToText, toScheduleHtml } from "@/lib/schedule-format";

type ScheduleContentProps = {
  body: string;
  month: string;
  title: string;
};

const previewCharLimit = 360;
const previewBlockLimit = 4;

function getHtmlBlocks(value: string) {
  return [
    ...value.matchAll(
      /<(p|h3|h4|ul|ol|blockquote)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi
    )
  ].map((match) => match[0]);
}

function getScheduleParts(value: string) {
  const body = toScheduleHtml(value);
  const blocks = getHtmlBlocks(body);

  if (blocks.length > previewBlockLimit) {
    return {
      preview: blocks.slice(0, previewBlockLimit).join(""),
      rest: blocks.slice(previewBlockLimit).join("")
    };
  }

  if (stripHtmlToText(body).length <= previewCharLimit || blocks.length <= 1) {
    return { preview: body, rest: "" };
  }

  return {
    preview: blocks
      .slice(0, Math.max(1, Math.ceil(blocks.length / 2)))
      .join(""),
    rest: blocks.slice(Math.max(1, Math.ceil(blocks.length / 2))).join("")
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
  html
}: {
  className?: string;
  html: string;
}) {
  return (
    <div
      className={`schedule-content__text${className ? ` ${className}` : ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
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
      <ScheduleText html={rest ? preview : body} />
      {rest && (
        <details className="schedule-content__details">
          <summary className="schedule-content__toggle">
            <span className="schedule-content__toggle-label">
              Расписание целиком
            </span>
          </summary>
          <ScheduleText className="schedule-content__text--rest" html={rest} />
        </details>
      )}
    </div>
  );
}
