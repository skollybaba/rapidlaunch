"use client";

import { useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  Link2,
  Loader2,
  PlayCircle,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { readApiError } from "@/lib/feedback";
import { moduleLabelsFor } from "@/types/lms";
import { cn } from "@/lib/utils";

type LessonType = "VIDEO" | "DOCUMENT" | "LINK";

interface EditableLesson {
  id: string;
  title: string;
  type: LessonType;
  description: string;
  youtubeUrl: string;
  documentUrl: string;
  documentFileName: string;
  documentSizeBytes?: number;
  documentContentType?: string;
  linkUrl: string;
  durationMinutes: string;
  isPreview: boolean;
}

interface EditableModule {
  id: string;
  title: string;
  description: string;
  lessons: EditableLesson[];
}

export interface BuilderModule {
  id: string;
  title: string;
  description?: string;
  isOrientation?: boolean;
  lessons: {
    id: string;
    title: string;
    type: LessonType;
    description?: string;
    youtubeUrl?: string;
    documentUrl?: string;
    documentFileName?: string;
    documentSizeBytes?: number;
    documentContentType?: string;
    linkUrl?: string;
    durationMinutes?: number;
    isPreview?: boolean;
  }[];
}

const fieldClasses =
  "mt-2 w-full rounded-[12px] border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-950 placeholder-neutral-300 transition-colors duration-[var(--duration-fast)] focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]";

/**
 * `crypto.randomUUID` is only exposed in secure contexts, so fall back to a
 * random base36 token when the admin is browsing over plain http on a LAN.
 */
function randomToken(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === "function") {
    return webCrypto.randomUUID().replace(/-/g, "").slice(0, 10);
  }
  return Math.random().toString(36).slice(2, 12);
}

/**
 * Content ids are the stable key student progress is recorded against, so a new
 * id must never collide with one already stored in the course. The allocator is
 * seeded with every existing id and refuses to hand out a duplicate, which keeps
 * ids unique across page reloads and across separate modules.
 */
function createIdAllocator(existing: Iterable<string>) {
  const used = new Set(existing);
  return function allocateId(prefix: string): string {
    let candidate = "";
    do {
      candidate = `${prefix}-${randomToken()}`;
    } while (used.has(candidate));
    used.add(candidate);
    return candidate;
  };
}

function contentIdsOf(modules: BuilderModule[]): string[] {
  return modules.flatMap((module) => [
    module.id,
    ...(module.lessons ?? []).map((lesson) => lesson.id),
  ]);
}

/**
 * Maps stored modules into editable form and repairs content ids on the way in.
 *
 * Legacy data can carry blank or repeated ids (older seeds left module ids
 * empty), and the API rejects duplicates because progress is keyed on them.
 * Repairing here means the admin can always save their curriculum instead of
 * hitting an error they cannot act on. Ids that are already valid are kept so
 * existing student progress is preserved.
 */
function toEditable(
  modules: BuilderModule[],
  allocateId: (prefix: string) => string,
): EditableModule[] {
  const seen = new Set<string>();
  const repairId = (id: string | undefined, prefix: string): string => {
    const candidate = (id ?? "").trim();
    if (candidate && !seen.has(candidate)) {
      seen.add(candidate);
      return candidate;
    }
    const replacement = allocateId(prefix);
    seen.add(replacement);
    return replacement;
  };

  return modules.map((module) => ({
    id: repairId(module.id, "module"),
    title: module.title,
    description: module.description ?? "",
    lessons: (module.lessons ?? []).map((lesson) => ({
      id: repairId(lesson.id, "lesson"),
      title: lesson.title,
      type: lesson.type,
      description: lesson.description ?? "",
      youtubeUrl: lesson.youtubeUrl ?? "",
      documentUrl: lesson.documentUrl ?? "",
      documentFileName: lesson.documentFileName ?? "",
      documentSizeBytes: lesson.documentSizeBytes,
      documentContentType: lesson.documentContentType,
      linkUrl: lesson.linkUrl ?? "",
      durationMinutes: lesson.durationMinutes
        ? String(lesson.durationMinutes)
        : "",
      isPreview: lesson.isPreview ?? false,
    })),
  }));
}

/**
 * Returns the first thing standing in the way of a save, or `null` when the
 * curriculum is complete. Extracted so the same rules can be unit tested and so
 * the save handler can report the problem once.
 */
function findCurriculumProblem(
  modules: EditableModule[],
  labels: string[]
): string | null {
  if (!modules.length) {
    return "Add at least one module before saving the curriculum.";
  }

  for (const [moduleIndex, module] of modules.entries()) {
    if (!module.title.trim()) {
      return `${labels[moduleIndex] ?? "Module"} needs a title.`;
    }
    for (const [lessonIndex, lesson] of module.lessons.entries()) {
      if (!lesson.title.trim()) {
        return `Lesson ${lessonIndex + 1} in “${module.title}” needs a title.`;
      }
      if (lesson.type === "VIDEO" && !lesson.youtubeUrl.trim()) {
        return `“${lesson.title}” needs a YouTube link.`;
      }
      if (lesson.type === "DOCUMENT" && !lesson.documentUrl) {
        return `“${lesson.title}” needs an uploaded document.`;
      }
      if (lesson.type === "LINK" && !lesson.linkUrl.trim()) {
        return `“${lesson.title}” needs a URL.`;
      }
    }
  }

  return null;
}

function emptyLesson(id: string): EditableLesson {
  return {
    id,
    title: "",
    type: "VIDEO",
    description: "",
    youtubeUrl: "",
    documentUrl: "",
    documentFileName: "",
    linkUrl: "",
    durationMinutes: "",
    isPreview: false,
  };
}

export function CourseBuilder({
  courseId,
  initialModules,
}: {
  courseId: string;
  initialModules: BuilderModule[];
}) {
  const [allocateId] = useState(() =>
    createIdAllocator(contentIdsOf(initialModules)),
  );
  const [modules, setModules] = useState<EditableModule[]>(() =>
    toEditable(initialModules, allocateId),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  /** Modules the admin has opened. Everything starts folded. */
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  /**
   * Whether module 1 is the orientation module. Orientation is positional and
   * defaults on, so existing courses separate orientation from course modules
   * without a migration. Turning it off makes module 1 "Module 1" again.
   */
  const [orientationEnabled, setOrientationEnabled] = useState(
    () => initialModules[0]?.isOrientation !== false
  );
  const moduleLabels = useMemo(
    () =>
      moduleLabelsFor(
        modules.map((_, index) => orientationEnabled && index === 0)
      ),
    [modules, orientationEnabled]
  );
  const toast = useToast();
  const confirm = useConfirm();

  function updateModule(index: number, patch: Partial<EditableModule>) {
    setModules((current) =>
      current.map((module, i) =>
        i === index ? { ...module, ...patch } : module,
      ),
    );
    setSavedAt(null);
  }

  function addModule() {
    const id = allocateId("module");
    setModules((current) => [
      ...current,
      {
        id,
        title: "",
        description: "",
        lessons: [],
      },
    ]);
    setExpanded((current) => new Set(current).add(id));
    setSavedAt(null);
  }

  function toggleModule(id: string, open: boolean) {
    setExpanded((current) => {
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function removeModule(index: number) {
    const target = modules[index];
    if (!target) return;
    const lessonTotal = target.lessons.length;
    const confirmed = await confirm({
      title: `Remove “${target.title || moduleLabels[index] || "Module"}”?`,
      description: lessonTotal
        ? `This also removes ${lessonTotal} lesson${lessonTotal === 1 ? "" : "s"} from the curriculum. Students will lose access to them.`
        : "This removes the module from the curriculum.",
      confirmLabel: "Remove module",
      tone: "danger",
    });
    if (!confirmed) return;
    setModules((current) => current.filter((_, i) => i !== index));
    setSavedAt(null);
    toast.success({
      title: "Module removed",
      description: "Save the curriculum to make this change permanent.",
    });
  }

  function moveModule(index: number, direction: -1 | 1) {
    setModules((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSavedAt(null);
  }

  function updateLesson(
    moduleIndex: number,
    lessonIndex: number,
    patch: Partial<EditableLesson>,
  ) {
    setModules((current) =>
      current.map((module, i) =>
        i === moduleIndex
          ? {
              ...module,
              lessons: module.lessons.map((lesson, j) =>
                j === lessonIndex ? { ...lesson, ...patch } : lesson,
              ),
            }
          : module,
      ),
    );
    setSavedAt(null);
  }

  function addLesson(moduleIndex: number) {
    setModules((current) =>
      current.map((module, i) =>
        i === moduleIndex
          ? {
              ...module,
              lessons: [...module.lessons, emptyLesson(allocateId("lesson"))],
            }
          : module,
      ),
    );
    setSavedAt(null);
  }

  async function removeLesson(moduleIndex: number, lessonIndex: number) {
    const lesson = modules[moduleIndex]?.lessons[lessonIndex];
    if (!lesson) return;
    const confirmed = await confirm({
      title: `Remove “${lesson.title || `Lesson ${lessonIndex + 1}`}”?`,
      description: lesson.isPreview
        ? "This lesson is visible to visitors before they enrol."
        : "Students will no longer be able to open this lesson.",
      confirmLabel: "Remove lesson",
      tone: "danger",
    });
    if (!confirmed) return;
    setModules((current) =>
      current.map((module, i) =>
        i === moduleIndex
          ? {
              ...module,
              lessons: module.lessons.filter((_, j) => j !== lessonIndex),
            }
          : module,
      ),
    );
    setSavedAt(null);
    toast.success({
      title: "Lesson removed",
      description: "Save the curriculum to make this change permanent.",
    });
  }

  function moveLesson(
    moduleIndex: number,
    lessonIndex: number,
    direction: -1 | 1,
  ) {
    setModules((current) =>
      current.map((module, i) => {
        if (i !== moduleIndex) return module;
        const target = lessonIndex + direction;
        if (target < 0 || target >= module.lessons.length) return module;
        const lessons = [...module.lessons];
        [lessons[lessonIndex], lessons[target]] = [
          lessons[target],
          lessons[lessonIndex],
        ];
        return { ...module, lessons };
      }),
    );
    setSavedAt(null);
  }

  async function handleSave() {
    if (saving) return;
    setError("");
    setSavedAt(null);

    const problem = findCurriculumProblem(modules, moduleLabels);
    if (problem) {
      setError(problem);
      toast.warning({ title: "Curriculum not saved", description: problem });
      return;
    }

    const payload = {
      modules: modules.map((module, moduleIndex) => ({
        id: module.id,
        title: module.title.trim(),
        description: module.description.trim() || undefined,
        isOrientation: orientationEnabled && moduleIndex === 0,
        lessons: module.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title.trim(),
          type: lesson.type,
          description: lesson.description.trim() || undefined,
          youtubeUrl:
            lesson.type === "VIDEO" ? lesson.youtubeUrl.trim() : undefined,
          documentUrl:
            lesson.type === "DOCUMENT" ? lesson.documentUrl : undefined,
          documentFileName:
            lesson.type === "DOCUMENT"
              ? lesson.documentFileName || undefined
              : undefined,
          documentSizeBytes:
            lesson.type === "DOCUMENT" ? lesson.documentSizeBytes : undefined,
          documentContentType:
            lesson.type === "DOCUMENT" ? lesson.documentContentType : undefined,
          linkUrl: lesson.type === "LINK" ? lesson.linkUrl.trim() : undefined,
          durationMinutes: lesson.durationMinutes
            ? Number(lesson.durationMinutes)
            : undefined,
          isPreview: lesson.isPreview || undefined,
        })),
      })),
    };

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(readApiError(json, "Could not save the curriculum."));
      }
      setSavedAt(new Date().toLocaleTimeString());
      toast.success({
        title: "Curriculum saved",
        description: `${modules.length} module${modules.length === 1 ? "" : "s"} published to students.`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save the curriculum.";
      setError(message);
      toast.error({
        title: message,
        description: "Your curriculum is unchanged. You can try saving again.",
        action: { label: "Retry", onClick: () => void handleSave() },
      });
    } finally {
      setSaving(false);
    }
  }

  const lessonCount = modules.reduce((total, m) => total + m.lessons.length, 0);

  return (
    <section className="rounded-[16px] border border-neutral-300 bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-950">
            Course curriculum
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Modules and lessons students see in the LMS player. Progress is
            keyed to these items, so reordering or renaming never resets a
            student.
          </p>
        </div>
        <SaveCurriculumButton saving={saving} onSave={handleSave} />
      </div>

      <p className="mt-4 text-sm text-neutral-500">
        {modules.length} module{modules.length === 1 ? "" : "s"} · {lessonCount}{" "}
        lesson{lessonCount === 1 ? "" : "s"}
      </p>

      {error ? (
        <p className="mt-4 rounded-[10px] border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
          {error}
        </p>
      ) : null}
      {savedAt ? (
        <p className="mt-4 rounded-[10px] border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
          Curriculum saved at {savedAt}.
        </p>
      ) : null}

      <div className="mt-4 rounded-[12px] border border-neutral-200 bg-paper-50 p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={orientationEnabled}
            onChange={(event) => {
              const enabled = event.target.checked;
              setOrientationEnabled(enabled);
              setSavedAt(null);
              toast.info({
                title: enabled
                  ? "Module 1 is now the orientation module"
                  : "Orientation turned off",
                description: enabled
                  ? "Students see it as Orientation, separate from the course modules."
                  : "Module 1 is numbered as Module 1 again.",
              });
            }}
            className="mt-1 size-4 shrink-0 accent-terracotta-600"
          />
          <span>
            <span className="block text-sm font-semibold text-neutral-950">
              Use module 1 as the orientation module
            </span>
            <span className="mt-0.5 block text-sm text-neutral-500">
              Orientation is shown before the course modules and never takes a
              module number. Turn it off to number that module as Module 1.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-6 space-y-5">
        {modules.map((module, moduleIndex) => (
          <div
            key={module.id}
            className="overflow-hidden rounded-[12px] border border-neutral-200 bg-paper-50"
          >
            <details
              className="group"
              open={expanded.has(module.id)}
              onToggle={(event) =>
                toggleModule(module.id, event.currentTarget.open)
              }
            >
              <summary
                className={cn(
                  "flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors duration-[var(--duration-fast)] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)] [&::-webkit-details-marker]:hidden",
                  orientationEnabled && moduleIndex === 0
                    ? "bg-terracotta-100 hover:bg-terracotta-200"
                    : "bg-lavender-100 hover:bg-lavender-200"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-terracotta-600">
                    {moduleLabels[moduleIndex]}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-bold text-neutral-950">
                    {module.title || "Untitled module"}
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {module.lessons.length} lesson
                    {module.lessons.length === 1 ? "" : "s"}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-neutral-600 transition-transform duration-[var(--duration-fast)] group-open:rotate-90"
                />
              </summary>

              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={`module-title-${module.id}`}
                      className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500"
                    >
                      {moduleLabels[moduleIndex]}
                    </label>
                    <input
                      id={`module-title-${module.id}`}
                      value={module.title}
                      onChange={(e) =>
                        updateModule(moduleIndex, { title: e.target.value })
                      }
                      placeholder="Module title"
                      className={fieldClasses}
                    />
                    <input
                      value={module.description}
                      onChange={(e) =>
                        updateModule(moduleIndex, {
                          description: e.target.value,
                        })
                      }
                      placeholder="Optional module description"
                      className={fieldClasses}
                    />
                  </div>
                  <div className="flex shrink-0 flex-col gap-1 pt-6">
                    <button
                      type="button"
                      onClick={() => moveModule(moduleIndex, -1)}
                      className="rounded-[8px] border border-neutral-300 bg-white p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                      disabled={moduleIndex === 0}
                      aria-label="Move module up"
                    >
                      <ChevronUp aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveModule(moduleIndex, 1)}
                      className="rounded-[8px] border border-neutral-300 bg-white p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                      disabled={moduleIndex === modules.length - 1}
                      aria-label="Move module down"
                    >
                      <ChevronDown aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeModule(moduleIndex)}
                      className="rounded-[8px] border border-neutral-300 bg-white p-1.5 text-error-600 hover:bg-error-50"
                      aria-label="Remove module"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <LessonRow
                      key={lesson.id}
                      lesson={lesson}
                      index={lessonIndex}
                      count={module.lessons.length}
                      onChange={(patch) =>
                        updateLesson(moduleIndex, lessonIndex, patch)
                      }
                      onRemove={() =>
                        void removeLesson(moduleIndex, lessonIndex)
                      }
                      onMove={(direction) =>
                        moveLesson(moduleIndex, lessonIndex, direction)
                      }
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => addLesson(moduleIndex)}
                    className={buttonStyles({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    Add lesson
                  </button>
                </div>
              </div>
            </details>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={addModule}
          className={buttonStyles({ variant: "secondary" })}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add module
        </button>
        <SaveCurriculumButton saving={saving} onSave={handleSave} />
      </div>
    </section>
  );
}

function SaveCurriculumButton({
  saving,
  onSave,
  className,
}: {
  saving: boolean;
  onSave: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={saving}
      className={buttonStyles({ variant: "primary", className })}
    >
      {saving ? (
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
      ) : null}
      {saving ? "Saving…" : "Save curriculum"}
    </button>
  );
}

const LESSON_TYPE_OPTIONS: { value: LessonType; label: string }[] = [
  { value: "VIDEO", label: "Video (YouTube)" },
  { value: "DOCUMENT", label: "Document" },
  { value: "LINK", label: "External link" },
];

function LessonRow({
  lesson,
  index,
  count,
  onChange,
  onRemove,
  onMove,
}: {
  lesson: EditableLesson;
  index: number;
  count: number;
  onChange: (patch: Partial<EditableLesson>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleFile(file: File) {
    setUploadError("");
    if (file.size > 25 * 1024 * 1024) {
      setUploadError("Documents must be under 25 MB.");
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
      const json = await response.json();
      if (!json.ok || !json.data?.url) {
        throw new Error(json.error?.message ?? "Upload failed");
      }
      onChange({
        documentUrl: json.data.url,
        documentFileName: json.data.name ?? file.name,
        documentSizeBytes: json.data.size ?? file.size,
        documentContentType: json.data.type ?? file.type,
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const Icon =
    lesson.type === "VIDEO"
      ? PlayCircle
      : lesson.type === "DOCUMENT"
        ? FileText
        : Link2;

  return (
    <div className="rounded-[10px] border border-neutral-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-lavender-100 text-ink-700">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            value={lesson.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={`Lesson ${index + 1} title`}
            className={cn(fieldClasses, "mt-0 sm:col-span-2")}
          />
          <select
            value={lesson.type}
            onChange={(e) => onChange({ type: e.target.value as LessonType })}
            className={cn(fieldClasses, "mt-0")}
            aria-label="Lesson type"
          >
            {LESSON_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            value={lesson.durationMinutes}
            onChange={(e) => onChange({ durationMinutes: e.target.value })}
            placeholder="Duration (min)"
            className={cn(fieldClasses, "mt-0")}
          />

          {lesson.type === "VIDEO" ? (
            <input
              type="url"
              value={lesson.youtubeUrl}
              onChange={(e) => onChange({ youtubeUrl: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=…"
              className={cn(fieldClasses, "mt-0 sm:col-span-2")}
            />
          ) : null}

          {lesson.type === "LINK" ? (
            <input
              type="url"
              value={lesson.linkUrl}
              onChange={(e) => onChange({ linkUrl: e.target.value })}
              placeholder="https://…"
              className={cn(fieldClasses, "mt-0 sm:col-span-2")}
            />
          ) : null}

          {lesson.type === "DOCUMENT" ? (
            <div className="sm:col-span-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.png,.jpg,.jpeg"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={buttonStyles({
                  variant: "secondary",
                  size: "sm",
                  className: "mt-0",
                })}
              >
                {uploading ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                ) : (
                  <UploadCloud aria-hidden="true" className="h-4 w-4" />
                )}
                {lesson.documentFileName
                  ? "Replace document"
                  : "Upload document"}
              </button>
              {lesson.documentFileName ? (
                <p className="mt-2 truncate text-xs text-neutral-500">
                  Attached: {lesson.documentFileName}
                </p>
              ) : null}
              {uploadError ? (
                <p className="mt-2 text-xs text-error-600">{uploadError}</p>
              ) : null}
            </div>
          ) : null}

          <textarea
            value={lesson.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Optional lesson notes shown to the student"
            rows={2}
            className={cn(fieldClasses, "mt-0 sm:col-span-2")}
          />
          <label className="flex items-center gap-2 text-sm text-neutral-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={lesson.isPreview}
              onChange={(e) => onChange({ isPreview: e.target.checked })}
              className="h-4 w-4 rounded border-neutral-300 text-terracotta-600 focus:ring-terracotta-600"
            />
            Free preview lesson
          </label>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="rounded-[8px] border border-neutral-300 bg-white p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
            aria-label="Move lesson up"
          >
            <ChevronUp aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === count - 1}
            className="rounded-[8px] border border-neutral-300 bg-white p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
            aria-label="Move lesson down"
          >
            <ChevronDown aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-[8px] border border-neutral-300 bg-white p-1.5 text-error-600 hover:bg-error-50"
            aria-label="Remove lesson"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
