"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Code, Heading1, Italic, List, ListOrdered, Pilcrow, Quote } from "lucide-react";
import { Label } from "@/components/ui/label";

/** TipTap rich-text field for the admin's plain `<form action={...}>` +
 * FormData pattern (see ResourceManager.tsx's MediaField for the same
 * client-state-backed-input approach) — a hidden input mirrors the editor's
 * HTML so the enclosing form submits it like any other field, without
 * needing Formik. The hidden input's value is driven by React state, not an
 * imperative DOM write: TipTap force-re-renders this component on every
 * transaction (its `shouldRerenderOnTransaction` default), and an
 * uncontrolled input's `defaultValue` gets re-applied on those re-renders,
 * silently wiping out anything written to `.value` directly. Ported from
 * prabhucablecar-web's fields/MyEditor.tsx. */
export function RichTextEditor({
  name,
  label,
  initialValue,
  placeholder = "Start typing...",
}: {
  name: string;
  label?: string;
  initialValue: string | null;
  placeholder?: string;
}) {
  const [html, setHtml] = useState(initialValue || "<p></p>");

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialValue || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[200px] p-3 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors prose prose-sm max-w-none",
      },
    },
    onUpdate: ({ editor }) => {
      setHtml(editor.getHTML());
    },
  });

  if (!editor) return null;

  const toolbarButton = (
    active: boolean,
    onClick: () => void,
    title: string,
    children: React.ReactNode,
  ) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded p-1.5 transition-colors hover:bg-slate-200 ${
        active ? "bg-blue-100 text-blue-700" : "text-slate-700"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div>
      {label && <Label className="mb-1.5">{label}</Label>}
      <input type="hidden" name={name} value={html} readOnly />
      <div className="mb-2 flex flex-wrap gap-1 rounded-md border border-slate-200 bg-slate-100 p-2">
        {toolbarButton(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Bold", (
          <Bold size={18} />
        ))}
        {toolbarButton(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Italic", (
          <Italic size={18} />
        ))}
        {toolbarButton(
          editor.isActive("paragraph") && !editor.isActive("bulletList") && !editor.isActive("orderedList"),
          () => editor.chain().focus().setParagraph().run(),
          "Paragraph",
          <Pilcrow size={18} />,
        )}
        {toolbarButton(
          editor.isActive("heading", { level: 1 }),
          () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
          "Heading 1",
          <Heading1 size={18} />,
        )}
        {toolbarButton(
          editor.isActive("heading", { level: 2 }),
          () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          "Heading 2",
          <span className="text-base font-bold">H2</span>,
        )}
        {toolbarButton(
          editor.isActive("heading", { level: 3 }),
          () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          "Heading 3",
          <span className="text-base font-bold">H3</span>,
        )}
        {toolbarButton(
          editor.isActive("heading", { level: 4 }),
          () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
          "Heading 4",
          <span className="text-base font-bold">H4</span>,
        )}
        {toolbarButton(
          editor.isActive("bulletList"),
          () => editor.chain().focus().toggleBulletList().run(),
          "Bullet List",
          <List size={18} />,
        )}
        {toolbarButton(
          editor.isActive("orderedList"),
          () => editor.chain().focus().toggleOrderedList().run(),
          "Numbered List",
          <ListOrdered size={18} />,
        )}
        {toolbarButton(
          editor.isActive("blockquote"),
          () => editor.chain().focus().toggleBlockquote().run(),
          "Quote",
          <Quote size={18} />,
        )}
        {toolbarButton(
          editor.isActive("codeBlock"),
          () => editor.chain().focus().toggleCodeBlock().run(),
          "Code Block",
          <Code size={18} />,
        )}
      </div>
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}
