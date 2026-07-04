import sanitizeHtml from "sanitize-html";
import { toScheduleHtml } from "@/lib/schedule-format";

const allowedTags = [
  "p",
  "br",
  "strong",
  "em",
  "b",
  "i",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h3",
  "h4",
  "a"
];

export function sanitizeScheduleHtml(value: string) {
  return sanitizeHtml(toScheduleHtml(value), {
    allowedAttributes: {
      a: ["href", "name", "target", "rel"]
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedTags,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank"
      })
    }
  }).trim();
}
