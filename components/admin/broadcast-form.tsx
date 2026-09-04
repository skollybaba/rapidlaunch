"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";

const fieldClasses =
  "mt-2 w-full rounded-[12px] border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-950 placeholder-neutral-300 transition-colors duration-[var(--duration-fast)] focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]";

export interface BroadcastResult {
  recipients: number;
  sent: number;
  failed: number;
}

export function BroadcastForm({
  onSuccess,
}: {
  onSuccess?: (result: BroadcastResult) => void;
}) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BroadcastResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("subject", subject);
    formData.append("body", body);
    if (fileRef.current?.files?.[0]) {
      formData.append("attachment", fileRef.current.files[0]);
    }

    setSending(true);
    try {
      const response = await fetch("/api/admin/broadcast", {
        method: "POST",
        body: formData,
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Could not send broadcast");
      }
      const r = json.data as BroadcastResult;
      setTitle("");
      setSubject("");
      setBody("");
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
      setResult(r);
      onSuccess?.(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send broadcast");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="bc-title" className="text-sm font-medium text-neutral-700">
            Title
          </label>
          <input
            id="bc-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldClasses}
          />
        </div>
        <div>
          <label htmlFor="bc-subject" className="text-sm font-medium text-neutral-700">
            Subject
          </label>
          <input
            id="bc-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={fieldClasses}
          />
        </div>
      </div>

      <div>
        <label htmlFor="bc-body" className="text-sm font-medium text-neutral-700">
          Body
        </label>
        <textarea
          id="bc-body"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={fieldClasses}
        />
      </div>

      <div>
        <label htmlFor="bc-file" className="text-sm font-medium text-neutral-700">
          Attachment (optional)
        </label>
        <input
          id="bc-file"
          ref={fileRef}
          type="file"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          className="mt-2 block w-full text-sm text-neutral-500 file:mr-4 file:rounded-pill file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-neutral-700 hover:file:bg-neutral-200"
        />
        {fileName ? (
          <p className="mt-1 text-xs text-neutral-500">Attached: {fileName}</p>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[12px] border border-danger-100 bg-danger-100/50 p-4"
        >
          <TriangleAlert
            className="mt-0.5 size-5 shrink-0 text-danger-600"
            aria-hidden="true"
          />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      ) : null}

      {result ? (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-[12px] border p-4 ${
            result.failed > 0
              ? "border-amber-200 bg-amber-50"
              : "border-success-100 bg-success-100/50"
          }`}
        >
          {result.failed > 0 ? (
            <TriangleAlert
              className="mt-0.5 size-5 shrink-0 text-amber-600"
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2
              className="mt-0.5 size-5 shrink-0 text-success-600"
              aria-hidden="true"
            />
          )}
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {result.failed > 0
                ? "Broadcast sent with some failures"
                : "Broadcast sent"}
            </p>
            <p className="mt-0.5 text-sm text-neutral-600">
              Sent to {result.sent} of {result.recipients} recipients
              {result.failed > 0 ? ` (${result.failed} failed)` : ""}.
            </p>
          </div>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={sending}
        className="rounded-pill bg-terracotta-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-terracotta-500 disabled:pointer-events-none disabled:opacity-50"
      >
        {sending ? "Sending…" : "Send email"}
      </button>
    </form>
  );
}
