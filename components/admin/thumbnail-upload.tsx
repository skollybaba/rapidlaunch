"use client";

import { useRef, useState } from "react";
import { Frame, ImagePlus, Loader2, Trash2 } from "lucide-react";

import { readApiJson } from "@/lib/http";

const MAX_BYTES = 10 * 1024 * 1024;

interface ThumbnailUploadProps {
  id: string;
  label?: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: "video" | "square";
  help?: string;
  expected?: string;
}

export function ThumbnailUpload({
  id,
  label = "Thumbnail",
  value,
  onChange,
  aspect = "video",
  help,
  expected = "1280 × 720 pixels (16:9)",
}: ThumbnailUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pasteUrl, setPasteUrl] = useState("");

  async function handleFile(file: File) {
    setError("");
    const isImage =
      file.type === "" ||
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|gif|avif|svgz?|bmp|tiff?|ico)$/i.test(file.name);
    if (!isImage) {
      setError(
        "Please choose an image file (JPG, PNG, WebP, GIF, AVIF, SVG, …)."
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be under 10 MB.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      const json = await readApiJson<{ url: string }>(response);
      if (!json?.ok || !json.data?.url) {
        throw new Error(json?.error?.message ?? "Upload failed");
      }
      onChange(json.data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function commitPastedUrl() {
    const trimmed = pasteUrl.trim();
    if (!trimmed) return;
    setError("");
    if (!/^https?:\/\//i.test(trimmed)) {
      setError("Paste a full https:// URL or choose an image instead.");
      return;
    }
    onChange(trimmed);
    setPasteUrl("");
  }

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-neutral-700">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-4">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-pill border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors duration-[var(--duration-fast)] hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus aria-hidden="true" className="h-4 w-4 text-terracotta-600" />
          )}
          {uploading ? "Uploading…" : value ? "Replace image" : "Choose image"}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-pill border border-danger-600 px-4 py-2.5 text-sm font-semibold text-danger-600 transition-colors duration-[var(--duration-fast)] hover:bg-danger-100 disabled:pointer-events-none disabled:opacity-50"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Remove
          </button>
        ) : null}
      </div>
      {help ? (
        <p className="mt-2 text-xs text-neutral-500">{help}</p>
      ) : value ? (
        <p className="mt-2 text-xs text-neutral-500">
          Stored on Cloudinary (free plan, max 10 MB per image).
        </p>
      ) : null}
      {expected ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-neutral-500">
          <Frame aria-hidden="true" className="h-3.5 w-3.5" />
          Recommended: {expected}
        </p>
      ) : null}

      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <span className="text-xs font-medium text-neutral-500">
            Or paste an image URL
          </span>
          <input
            type="url"
            value={pasteUrl}
            onChange={(e) => {
              setPasteUrl(e.target.value);
              if (error) setError("");
            }}
            onBlur={commitPastedUrl}
            placeholder="https://…"
            className="mt-1.5 w-full rounded-[12px] border border-neutral-300 bg-white px-4 py-2.5 text-base text-neutral-950 placeholder-neutral-300 transition-colors duration-[var(--duration-fast)] focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]"
          />
        </div>
      </div>

      {value ? (
        <div className="relative mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className={`${
              aspect === "square" ? "aspect-square" : "aspect-video"
            } w-full rounded-[12px] border border-neutral-300 object-cover`}
          />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}