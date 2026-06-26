"use client";

import { useId, useState } from "react";

type ScheduleContentProps = {
  body: string;
  month: string;
  title: string;
};

export function ScheduleContent({ body, month, title }: ScheduleContentProps) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const shouldCollapse = body.length > 650 || body.split(/\r?\n/).length > 9;

  return (
    <div
      className={`schedule-content${
        shouldCollapse && !expanded ? " schedule-content--collapsed" : ""
      }`}
    >
      <span>{month}</span>
      <h3>{title}</h3>
      <p id={contentId}>{body}</p>
      {shouldCollapse && (
        <button
          aria-controls={contentId}
          aria-expanded={expanded}
          className="button button--small schedule-content__toggle"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? "Свернуть расписание" : "Развернуть расписание"}
        </button>
      )}
    </div>
  );
}
