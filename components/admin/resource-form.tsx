"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { readApiJson } from "@/lib/http";
import type { ResourceType } from "@/types/resource";

const fieldClasses =
  "mt-2 w-full rounded-[12px] border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-950 placeholder-neutral-300 transition-colors duration-[var(--duration-fast)] focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]";

interface ResourceFormData {
  initial?: {
    id?: string;
    type?: ResourceType;
    title?: string;
    slug?: string;
    summary?: string;
    contentHtml?: string;
    youtubeUrl?: string;
    thumbnailUrl?: string;
    published?: boolean;
  } | null;
}

export function ResourceForm({
  type,
  initial,
  basePath,
  singularLabel,
}: ResourceFormData & {
  type: ResourceType;
  basePath: string;
  singularLabel: string;
}) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [status, setStatus] = useState<string>(
    initial?.published ? "PUBLISHED" : "DRAFT"
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtubeUrl ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(
    initial?.thumbnailUrl ?? ""
  );
  const [contentHtml, setContentHtml] = useState(initial?.contentHtml ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");

    const payload = {
      type,
      title,
      slug,
      summary: summary || undefined,
      contentHtml: contentHtml || undefined,
      youtubeUrl: type === "VIDEO" ? youtubeUrl || undefined : undefined,
      thumbnailUrl: thumbnailUrl || undefined,
      published: status === "PUBLISHED",
    };

    setSaving(true);
    try {
      const response = await fetch(
        editing ? `/api/admin/resources/${initial?.id}` : "/api/admin/resources",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await readApiJson<{ id: string }>(response);
      if (!json?.ok) {
        throw new Error(json?.error?.message ?? "Could not save");
      }
      router.push(basePath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id || saving) return;
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/resources/${initial.id}`, {
        method: "DELETE",
      });
      const json = await readApiJson(response);
      if (!json?.ok) {
        throw new Error(json?.error?.message ?? "Could not delete");
      }
      router.push(basePath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <section className="rounded-[16px] border border-neutral-300 bg-white p-6">
        <h2 className="text-lg font-bold text-neutral-950">Basics</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="r-title" className="text-sm font-medium text-neutral-700">
              Title *
            </label>
            <input
              id="r-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldClasses}
            />
          </div>
          <div>
            <label htmlFor="r-slug" className="text-sm font-medium text-neutral-700">
              Slug *
            </label>
            <input
              id="r-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-insight-slug"
              className={fieldClasses}
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="r-summary" className="text-sm font-medium text-neutral-700">
              Summary
            </label>
            <textarea
              id="r-summary"
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="The first sentence should stand alone on a card."
              className={fieldClasses}
            />
          </div>
          <div>
            <label htmlFor="r-status" className="text-sm font-medium text-neutral-700">
              Status
            </label>
            <select
              id="r-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={fieldClasses}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
        </div>
      </section>

      {type === "VIDEO" ? (
        <section className="rounded-[16px] border border-neutral-300 bg-white p-6">
          <h2 className="text-lg font-bold text-neutral-950">Video</h2>
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="r-youtube" className="text-sm font-medium text-neutral-700">
                YouTube URL *
              </label>
              <input
                id="r-youtube"
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                className={fieldClasses}
              />
            </div>
            <div>
              <label htmlFor="r-thumb" className="text-sm font-medium text-neutral-700">
                Thumbnail URL
              </label>
              <input
                id="r-thumb"
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className={fieldClasses}
              />
              {thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnailUrl}
                  alt="Thumbnail preview"
                  className="mt-3 aspect-video w-full rounded-[12px] border border-neutral-300 object-cover"
                />
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-[16px] border border-neutral-300 bg-white p-6">
        <h2 className="text-lg font-bold text-neutral-950">
          {type === "VIDEO" ? "Session notes" : "Content"}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {type === "VIDEO"
            ? "Optional notes shown below the video details."
            : "Use the editor to write the insight. Every sentence should explain one idea."}
        </p>
        <div className="mt-4">
          <RichTextEditor value={contentHtml} onChange={setContentHtml} />
        </div>
      </section>

      {error ? (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-pill bg-terracotta-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-terracotta-500 disabled:pointer-events-none disabled:opacity-50"
        >
          {saving
            ? "Saving…"
            : editing
              ? `Save ${singularLabel}`
              : `Create ${singularLabel}`}
        </button>
        <button
          type="button"
          onClick={() => router.push(basePath)}
          className="rounded-pill border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
        >
          Cancel
        </button>
        {editing ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="ml-auto rounded-pill border border-danger-600 px-6 py-3 text-sm font-semibold text-danger-600 transition-colors hover:bg-danger-100 disabled:pointer-events-none disabled:opacity-50"
          >
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}