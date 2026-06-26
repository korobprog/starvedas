import type { ReactNode } from "react";

type MarkdownContentProps = {
  content: string;
};

type ListBlock = {
  items: string[];
  type: "ol" | "ul";
};

function safeHref(href: string) {
  const value = href.trim();

  if (
    value.startsWith("/") ||
    value.startsWith("#") ||
    value.startsWith("https://") ||
    value.startsWith("http://") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:")
  ) {
    return value;
  }

  return "#";
}

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\*([^*]+)\*|_([^_]+)_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const key = `${match.index}-${pattern.lastIndex}`;

    if (match[2] && match[3]) {
      nodes.push(
        <a href={safeHref(match[3])} key={key} rel="noreferrer" target="_blank">
          {match[2]}
        </a>
      );
    } else if (match[4] || match[5]) {
      nodes.push(<strong key={key}>{match[4] ?? match[5]}</strong>);
    } else if (match[6]) {
      nodes.push(<code key={key}>{match[6]}</code>);
    } else if (match[7] || match[8]) {
      nodes.push(<em key={key}>{match[7] ?? match[8]}</em>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function renderList(block: ListBlock, key: string) {
  const Tag = block.type;

  return (
    <Tag key={key}>
      {block.items.map((item, index) => (
        <li key={`${key}-${index}`}>{parseInline(item)}</li>
      ))}
    </Tag>
  );
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const lines = content.replaceAll("\r\n", "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: ListBlock | null = null;

  function flushParagraph() {
    if (paragraph.length === 0) {
      return;
    }

    blocks.push(
      <p key={`p-${blocks.length}`}>{parseInline(paragraph.join(" "))}</p>
    );
    paragraph = [];
  }

  function flushList() {
    if (!list) {
      return;
    }

    blocks.push(renderList(list, `list-${blocks.length}`));
    list = null;
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const Tag = `h${Math.min(level + 1, 4)}` as "h2" | "h3" | "h4";
      blocks.push(
        <Tag key={`h-${blocks.length}`}>{parseInline(heading[2])}</Tag>
      );
      return;
    }

    const unorderedItem = /^[-*]\s+(.+)$/.exec(line);
    if (unorderedItem) {
      flushParagraph();
      if (list?.type !== "ul") {
        flushList();
        list = { items: [], type: "ul" };
      }
      list.items.push(unorderedItem[1]);
      return;
    }

    const orderedItem = /^\d+[.)]\s+(.+)$/.exec(line);
    if (orderedItem) {
      flushParagraph();
      if (list?.type !== "ol") {
        flushList();
        list = { items: [], type: "ol" };
      }
      list.items.push(orderedItem[1]);
      return;
    }

    flushList();
    paragraph.push(line);
  });

  flushParagraph();
  flushList();

  return <div className="markdown-content">{blocks}</div>;
}
