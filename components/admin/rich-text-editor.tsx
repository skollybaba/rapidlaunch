"use client";

import { useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Redo2,
  Undo2,
  X,
} from "lucide-react";

import { readApiError } from "@/lib/feedback";

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors disabled:opacity-40 ${
        active
          ? "bg-terracotta-100 text-terracotta-600"
          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950"
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your content here…",
  label,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Announced to assistive tech as the editor's accessible name. */
  label?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const linkRange = useRef<{ from: number; to: number } | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder }), Image],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class:
          "rich-content min-h-[220px] max-h-[420px] overflow-y-auto px-4 py-3 focus:outline-none",
        ...(label ? { "aria-label": label } : {}),
      },
    },
  });

  async function handleImageFile(file: File) {
    if (!editor || uploading) return;
    setImageError("");
    if (!file.type.startsWith("image/")) {
      setImageError("Choose an image file (PNG, JPG, GIF, WebP or SVG).");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(readApiError(json, "Image upload failed"));
      }
      const stored = json.data as { url: string };
      editor
        .chain()
        .focus()
        .insertContent(`<img src="${stored.url}" alt="" />`)
        .run();
    } catch (err) {
      setImageError(
        err instanceof Error ? err.message : "Image upload failed."
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function normalizeLink(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^mailto:/i.test(trimmed)) return trimmed;
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    try {
      const url = new URL(withScheme);
      if (!url.hostname || !["http:", "https:"].includes(url.protocol)) {
        return null;
      }
      return url.href;
    } catch {
      return null;
    }
  }

  function startEditingLink() {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    linkRange.current = empty ? null : { from, to };
    const existing = editor.getAttributes("link").href as string | undefined;
    setLinkUrl(existing ?? "");
    setLinkError("");
    setLinkOpen(true);
  }

  function applyLink() {
    if (!editor) return;
    const href = normalizeLink(linkUrl);
    if (!href) {
      setLinkError("Enter a valid link — https://… or mailto:…");
      return;
    }
    const range = linkRange.current;
    if (range) {
      editor
        .chain()
        .focus()
        .setTextSelection({ from: range.from, to: range.to })
        .setLink({ href })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: href,
          marks: [{ type: "link", attrs: { href } }],
        })
        .run();
    }
    setLinkOpen(false);
    setLinkUrl("");
    setLinkError("");
    linkRange.current = null;
  }

  function removeLink() {
    if (!editor) return;
    const range = linkRange.current;
    if (range) {
      editor
        .chain()
        .focus()
        .setTextSelection({ from: range.from, to: range.to })
        .unsetLink()
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setLinkOpen(false);
    setLinkUrl("");
    linkRange.current = null;
  }

  if (!editor) {
    return (
      <div className="min-h-[220px] rounded-[12px] border border-neutral-300 bg-neutral-50" />
    );
  }

  return (
    <div className="overflow-hidden rounded-[12px] border border-neutral-300 bg-white transition-colors focus-within:border-terracotta-600 focus-within:ring-[3px] focus-within:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]">
      <div className="flex flex-wrap items-center gap-1 border-b border-neutral-200 bg-neutral-50 px-2 py-1.5">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Add or edit link"
          active={editor.isActive("link")}
          onClick={startEditingLink}
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-neutral-200" />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImageFile(file);
          }}
        />
        <ToolbarButton
          label="Insert image"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
          )}
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-neutral-200" />
        <ToolbarButton
          label="Undo"
          disabled={!editor.can().chain().focus().undo().run()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!editor.can().chain().focus().redo().run()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
      {linkOpen ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2">
          <label htmlFor="rte-link-url" className="sr-only">
            Link URL
          </label>
          <input
            id="rte-link-url"
            type="text"
            autoFocus
            value={linkUrl}
            onChange={(e) => {
              setLinkUrl(e.target.value);
              setLinkError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
            placeholder="https://… or mailto:hello@…"
            className="min-w-0 flex-1 rounded-[8px] border border-neutral-300 px-3 py-1.5 text-sm text-neutral-950 placeholder-neutral-300 focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]"
          />
          <button
            type="button"
            onClick={applyLink}
            className="rounded-[8px] bg-terracotta-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-terracotta-500"
          >
            Add link
          </button>
          <button
            type="button"
            onClick={removeLink}
            className="rounded-[8px] border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100"
          >
            Remove
          </button>
          <button
            type="button"
            onClick={() => {
              setLinkOpen(false);
              setLinkUrl("");
              setLinkError("");
              linkRange.current = null;
            }}
            aria-label="Close link editor"
            className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      {linkError ? (
        <p
          role="alert"
          className="border-b border-danger-100 bg-danger-100/50 px-4 py-2 text-xs font-medium text-danger-700"
        >
          {linkError}
        </p>
      ) : null}
      {imageError ? (
        <p
          role="alert"
          className="border-b border-danger-100 bg-danger-100/50 px-4 py-2 text-xs font-medium text-danger-700"
        >
          {imageError}
        </p>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
