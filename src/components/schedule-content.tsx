import { Fragment } from "react";

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
    body.lastIndexOf("\n", previewCharLimit),
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

function ScheduleText({
  className = "",
  text
}: {
  className?: string;
  text: string;
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
          <p key={`${paragraphIndex}-${paragraph.slice(0, 16)}`}>
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

  return (
    <div className="schedule-content">
      <span>{month}</span>
      <h3>{title}</h3>
      <ScheduleText text={rest ? preview : body} />
      {rest && (
        <details className="schedule-content__details">
          <summary className="schedule-content__toggle">
            <span className="schedule-content__toggle-label schedule-content__toggle-label--more">
              Показать всё расписание
            </span>
            <span className="schedule-content__toggle-label schedule-content__toggle-label--less">
              Свернуть расписание
            </span>
            <svg
              aria-hidden="true"
              className="schedule-content__toggle-icon"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <ScheduleText className="schedule-content__text--rest" text={rest} />
        </details>
      )}
    </div>
  );
}
