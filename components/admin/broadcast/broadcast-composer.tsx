"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Download,
  Mail,
  Paperclip,
  Send,
  TriangleAlert,
  Upload,
  Users,
  X,
} from "lucide-react";

import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { readApiError } from "@/lib/feedback";
import { parseRecipientsFile } from "@/lib/validation/recipients";
import type { ParsedRecipient } from "@/lib/validation/recipients";
import type { BroadcastOptions } from "@/lib/services/broadcast-service";

const fieldClasses =
  "mt-2 w-full rounded-[12px] border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-950 placeholder-neutral-300 transition-colors duration-[var(--duration-fast)] focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]";

type SegmentType =
  | "ALL_USERS"
  | "COURSE_ENROLLEES"
  | "SESSION_REGISTRANTS"
  | "PENDING_ORDERS"
  | "IMPORTED";

interface SegmentCard {
  type: SegmentType;
  label: string;
  description: string;
  count: number;
}

export interface BroadcastSendResult {
  recipients: number;
  sent: number;
  failed: number;
}

export function BroadcastComposer({
  options,
}: {
  options: BroadcastOptions;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const importRef = useRef<HTMLInputElement>(null);

  const segments: SegmentCard[] = [
    {
      type: "ALL_USERS",
      label: "All users",
      description: "Every registered account.",
      count: options.counts.allUsers,
    },
    {
      type: "COURSE_ENROLLEES",
      label: "Course enrollees",
      description: "Enrolled in a course — pick one or all.",
      count: options.counts.courseEnrollees,
    },
    {
      type: "SESSION_REGISTRANTS",
      label: "Session registrants",
      description: "Booked a 60 / 90-minute session.",
      count: options.counts.sessionRegistrants,
    },
    {
      type: "PENDING_ORDERS",
      label: "Pending orders",
      description: "Started checkout but hasn't paid yet.",
      count: options.counts.pendingOrders,
    },
    {
      type: "IMPORTED",
      label: "Imported list",
      description: "Upload your own name + email CSV or JSON.",
      count: 0,
    },
  ];

  const [segmentType, setSegmentType] = useState<SegmentType>("ALL_USERS");
  const [productId, setProductId] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const attachmentRef = useRef<HTMLInputElement>(null);

  const [imported, setImported] = useState<ParsedRecipient[]>([]);
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const [importFileName, setImportFileName] = useState("");

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BroadcastSendResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");

  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen]);

  function selectSegment(type: SegmentType) {
    setSegmentType(type);
    setProductId("");
    setError("");
    setResult(null);
  }

  function recipientCount(): number {
    if (segmentType === "IMPORTED") return imported.length;
    return segments.find((s) => s.type === segmentType)?.count ?? 0;
  }

  function segmentName(): string {
    if (segmentType === "IMPORTED") {
      return importFileName ? `Imported list (${importFileName})` : "Imported list";
    }
    const segment = segments.find((s) => s.type === segmentType);
    const productTitle = currentProductTitle();
    return productTitle ? `${segment?.label}: ${productTitle}` : segment?.label ?? segmentType;
  }

  function currentProductTitle(): string {
    const list =
      segmentType === "COURSE_ENROLLEES"
        ? options.courses
        : segmentType === "SESSION_REGISTRANTS"
          ? options.sessions
          : segmentType === "PENDING_ORDERS"
            ? options.orderProducts
            : [];
    return list.find((p) => p.id === productId)?.title ?? "";
  }

  async function handleImportFile(file: File) {
    setImportIssues([]);
    setImported([]);
    if (!/\.(csv|json)$/i.test(file.name)) {
      setImportIssues(["Use a .csv or .json file."]);
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseRecipientsFile(file.name, text);
      setImported(parsed.recipients);
      setImportFileName(file.name);
      const issues = parsed.issues.map(
        (issue) =>
          `Row ${issue.row === 0 ? "—" : issue.row}: ${issue.message}`
      );
      setImportIssues(issues.slice(0, 6));
    } catch {
      setImportIssues(["This file could not be read."]);
    }
  }

  async function handlePreview() {
    if (previewing) return;
    setPreviewing(true);
    setError("");
    try {
      const response = await fetch("/api/admin/broadcast/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subject, bodyHtml }),
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(readApiError(json, "Could not render preview"));
      }
      setPreviewHtml(json.data.html as string);
      setPreviewSubject((json.data.subject as string) ?? "");
      setPreviewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not render preview.");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setError("");
    setResult(null);

    const count = recipientCount();
    if (count === 0) {
      setError(
        segmentType === "IMPORTED"
          ? "Import a list with at least one valid recipient first."
          : "This audience is currently empty."
      );
      return;
    }

    const ok = await confirm({
      title: `Send email to ${count.toLocaleString()} recipients?`,
      description: `Audience: ${segmentName()}. This sends immediately — personalisation tokens are filled per recipient.`,
      confirmLabel: "Send now",
      tone: "primary",
    });
    if (!ok) return;

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("subject", subject.trim());
    formData.append("bodyHtml", bodyHtml);
    formData.append("segmentType", segmentType);
    if (productId) formData.append("productId", productId);
    if (segmentType === "IMPORTED" && imported.length > 0) {
      formData.append("importedRecipients", JSON.stringify(imported));
    }
    if (attachmentRef.current?.files?.[0]) {
      formData.append("attachment", attachmentRef.current.files[0]);
    }

    setSending(true);
    try {
      const response = await fetch("/api/admin/broadcast", {
        method: "POST",
        body: formData,
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(readApiError(json, "Could not send broadcast"));
      }
      const r = json.data as BroadcastSendResult;
      setResult(r);
      setTitle("");
      setSubject("");
      setBodyHtml("");
      setImported([]);
      setImportIssues([]);
      setImportFileName("");
      if (attachmentRef.current) attachmentRef.current.value = "";
      toast.success({
        title: "Broadcast sent",
        description: `${r.sent.toLocaleString()} delivered, ${r.failed.toLocaleString()} failed of ${r.recipients.toLocaleString()}.`,
      });
      router.refresh();
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : "Could not send broadcast.";
      setError(reason);
      toast.error({ title: reason });
    } finally {
      setSending(false);
    }
  }

  const productOptions =
    segmentType === "COURSE_ENROLLEES"
      ? options.courses
      : segmentType === "SESSION_REGISTRANTS"
        ? options.sessions
        : segmentType === "PENDING_ORDERS"
          ? options.orderProducts
          : [];

  const productLabel =
    segmentType === "COURSE_ENROLLEES"
      ? "Course"
      : segmentType === "SESSION_REGISTRANTS"
        ? "Session"
        : segmentType === "PENDING_ORDERS"
          ? "Product"
          : "";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8"
      noValidate
      aria-label="Compose and send a broadcast"
    >
      <section className="rounded-[20px] border border-neutral-300 bg-white p-6">
        <h2 className="text-base font-bold text-neutral-950">
          1. Choose your audience
        </h2>
        <div
          role="radiogroup"
          aria-label="Audience segment"
          className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
        >
          {segments.map((segment) => {
            const selected = segmentType === segment.type;
            return (
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                key={segment.type}
                onClick={() => selectSegment(segment.type)}
                className={`rounded-[14px] border p-4 text-left transition-colors duration-[var(--duration-fast)] focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)] ${
                  selected
                    ? "border-terracotta-600 bg-terracotta-100/60 ring-[2px] ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]"
                    : "border-neutral-300 bg-white hover:border-neutral-400 hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-neutral-950">
                    {segment.label}
                  </p>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-pill px-2.5 py-1 text-xs font-bold ${
                      selected
                        ? "bg-terracotta-600 text-white"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {segment.type === "IMPORTED"
                      ? imported.length.toLocaleString()
                      : segment.count.toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  {segment.description}
                </p>
              </button>
            );
          })}
        </div>

        {productOptions.length > 0 ? (
          <div className="mt-5 max-w-sm">
            <label
              htmlFor="bc-product"
              className="block text-xs font-semibold text-neutral-500"
            >
              {productLabel} (optional)
            </label>
            <select
              id="bc-product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className={fieldClasses}
            >
              <option value="">
                {segmentType === "COURSE_ENROLLEES"
                  ? "All courses"
                  : segmentType === "SESSION_REGISTRANTS"
                    ? "Any session"
                    : "Any product"}
              </option>
              {productOptions.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {segmentType === "IMPORTED" ? (
          <div className="mt-5 rounded-[14px] border border-dashed border-neutral-300 bg-neutral-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-neutral-950">
                  Import a subscriber list
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Name and email columns (CSV or JSON array). Up to 2,000
                  recipients.
                </p>
              </div>
              <a
                href="/api/admin/broadcast/template"
                className="inline-flex items-center gap-2 text-sm font-semibold text-terracotta-600 hover:text-terracotta-500"
              >
                <Download className="size-4" aria-hidden="true" />
                Download CSV template
              </a>
            </div>

            <input
              ref={importRef}
              type="file"
              accept=".csv,.json"
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
              }}
            />
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="mt-4 inline-flex h-[42px] items-center gap-2 rounded-pill border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-100"
            >
              <Upload className="size-4" aria-hidden="true" />
              {importFileName ? "Replace file" : "Choose CSV or JSON"}
            </button>

            {importFileName ? (
              <div className="mt-3 space-y-2">
                <p
                  role="status"
                  className="flex items-start gap-2 rounded-[12px] border border-success-100 bg-success-100/40 p-3 text-sm text-neutral-800"
                >
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-success-600"
                    aria-hidden="true"
                  />
                  {importFileName}: {imported.length.toLocaleString()}{" "}
                  valid recipients ready.
                </p>
                {importIssues.length > 0 ? (
                  <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                    <p className="font-semibold">
                      {importIssues.length} issue
                      {importIssues.length === 1 ? "" : "s"} to review:
                    </p>
                    <ul className="mt-1 list-inside list-disc space-y-0.5">
                      {importIssues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                      {imported.length > 0 ? null : (
                        <li>
                          No valid recipients — fix the file or pick another
                          audience.
                        </li>
                      )}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-[20px] border border-neutral-300 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-neutral-950">
            2. Compose your email
          </h2>
          <p className="text-xs text-neutral-500">
            Personalise with <code className="font-mono">{"{{name}}"}</code> and{" "}
            <code className="font-mono">{"{{email}}"}</code>.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="bc-title"
              className="text-sm font-medium text-neutral-700"
            >
              Title
            </label>
            <input
              id="bc-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Big news for course enrollees"
              className={fieldClasses}
            />
          </div>
          <div>
            <label
              htmlFor="bc-subject"
              className="text-sm font-medium text-neutral-700"
            >
              Subject
            </label>
            <input
              id="bc-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="The inbox subject line"
              className={fieldClasses}
            />
          </div>
        </div>

        <div className="mt-5">
          <label
            htmlFor="bc-body"
            className="text-sm font-medium text-neutral-700"
          >
            Body
          </label>
          <div className="mt-2" id="bc-body">
            <RichTextEditor
              value={bodyHtml}
              onChange={setBodyHtml}
              placeholder="Write your message… you can embed images and attach a file below."
            />
          </div>
        </div>

        <div className="mt-5">
          <label
            htmlFor="bc-file"
            className="text-sm font-medium text-neutral-700"
          >
            Attachment (optional)
          </label>
          <input
            id="bc-file"
            ref={attachmentRef}
            type="file"
            onChange={(e) => setAttachmentName(e.target.files?.[0]?.name ?? "")}
            className="mt-2 block w-full text-sm text-neutral-500 file:mr-4 file:rounded-pill file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-neutral-700 hover:file:bg-neutral-200"
          />
          {attachmentName ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-neutral-500">
              <Paperclip className="size-3.5" aria-hidden="true" />
              Attached: {attachmentName}
            </p>
          ) : null}
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-[12px] border border-danger-100 bg-danger-100/50 p-4"
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
            className={`mt-5 flex items-start gap-3 rounded-[12px] border p-4 ${
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
                Sent to {result.sent.toLocaleString()} of{" "}
                {result.recipients.toLocaleString()} recipients
                {result.failed > 0
                  ? ` (${result.failed.toLocaleString()} failed)`
                  : ""}
                . Check the history below.
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-5">
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewing || !title.trim() || !bodyHtml.trim()}
            className="inline-flex h-[46px] items-center gap-2 rounded-pill border border-neutral-300 bg-white px-6 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-50"
          >
            <Mail className="size-4" aria-hidden="true" />
            {previewing ? "Rendering…" : "Preview email"}
          </button>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex h-[46px] items-center gap-2 rounded-pill bg-terracotta-600 px-6 text-sm font-semibold text-white shadow-sm transition-colors duration-[var(--duration-fast)] hover:bg-terracotta-500 disabled:pointer-events-none disabled:opacity-50"
          >
            {sending ? (
              <Send className="size-4 animate-pulse" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            {sending
              ? "Sending…"
              : `Send to ${recipientCount().toLocaleString()} recipient${
                  recipientCount() === 1 ? "" : "s"
                }`}
          </button>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-neutral-500">
            <Users className="size-3.5" aria-hidden="true" />
            {segmentName()}
          </span>
        </div>
      </section>

      {previewOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Email preview"
          onClick={() => setPreviewOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 md:p-6"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="flex h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] bg-neutral-950 shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Preview</p>
                <p className="mt-0.5 truncate text-xs text-white/50">
                  {previewSubject
                    ? `Subject: ${previewSubject} · To: Ada <ada@example.com>`
                    : `To: Ada <ada@example.com>`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                aria-label="Close preview"
                className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-[3px] focus:ring-white/30"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 bg-[#fcfaf8]">
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={previewHtml}
                className="block h-full w-full border-0"
              />
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}