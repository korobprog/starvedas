"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { useMemo, useState } from "react";
import { toScheduleHtml } from "@/lib/schedule-format";

type ScheduleRichTextEditorProps = {
  initialValue?: string;
  name?: string;
  placeholder?: string;
};

function getEditorFormValue(editor: NonNullable<ReturnType<typeof useEditor>>) {
  return editor.getText().trim().length === 0 ? "" : editor.getHTML();
}

export function ScheduleRichTextEditor({
  initialValue = "",
  name = "body",
  placeholder
}: ScheduleRichTextEditorProps) {
  const initialHtml = useMemo(
    () => toScheduleHtml(initialValue),
    [initialValue]
  );
  const [value, setValue] = useState(initialHtml);

  const editor = useEditor({
    editorProps: {
      attributes: {
        "aria-label": "Текст расписания",
        class: "schedule-rich-editor__content"
      }
    },
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [3, 4]
        }
      }),
      Placeholder.configure({
        placeholder:
          placeholder ??
          "Добавьте даты, названия церемоний и важные условия участия."
      })
    ],
    content: initialHtml,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setValue(getEditorFormValue(editor));
    }
  });

  const toggleButtonClass = (active: boolean) =>
    `schedule-rich-editor__button${active ? " schedule-rich-editor__button--active" : ""}`;

  return (
    <div className="schedule-rich-editor">
      <input name={name} readOnly type="hidden" value={value} />
      <div
        aria-label="Форматирование расписания"
        className="schedule-rich-editor__toolbar"
      >
        <button
          className={toggleButtonClass(editor?.isActive("bold") ?? false)}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          type="button"
        >
          Жирный
        </button>
        <button
          className={toggleButtonClass(editor?.isActive("italic") ?? false)}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          type="button"
        >
          Курсив
        </button>
        <button
          className={toggleButtonClass(
            editor?.isActive("heading", { level: 3 }) ?? false
          )}
          disabled={!editor}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
          type="button"
        >
          Заголовок
        </button>
        <button
          className={toggleButtonClass(editor?.isActive("bulletList") ?? false)}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          type="button"
        >
          Список
        </button>
        <button
          className={toggleButtonClass(
            editor?.isActive("orderedList") ?? false
          )}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          type="button"
        >
          Нумерация
        </button>
        <button
          className={toggleButtonClass(editor?.isActive("blockquote") ?? false)}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          type="button"
        >
          Цитата
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
