"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CirclePlay,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Menu,
  PlayCircle,
  X,
} from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { YouTubePlayer } from "@/components/learn/youtube-player";
import { cn } from "@/lib/utils";
import {
  moduleLabelsFor,
  type CourseOutline,
  type LessonView,
  type ModuleView,
} from "@/types/lms";

interface CoursePlayerProps {
  outline: CourseOutline;
}

/** One icon per lesson kind so the type reads at a glance, not from words alone. */
const LESSON_TYPE_ICON = {
  VIDEO: CirclePlay,
  DOCUMENT: BookOpen,
  LINK: Link2,
} as const;

function lessonKindLabel(lesson: LessonView): string {
  switch (lesson.type) {
    case "VIDEO":
      return lesson.durationMinutes
        ? `${lesson.durationMinutes} min video`
        : "Video";
    case "DOCUMENT":
      return "Document";
    case "LINK":
      return "Link";
  }
}

export function CoursePlayer({ outline }: CoursePlayerProps) {
  const lessons = useMemo(
    () => outline.modules.flatMap((module) => module.lessons),
    [outline],
  );

  const firstId = useMemo(() => {
    const resume = outline.lastLessonId;
    if (resume && lessons.some((lesson) => lesson.id === resume)) return resume;
    return lessons[0]?.id ?? null;
  }, [lessons, outline.lastLessonId]);

  const [activeId, setActiveId] = useState<string | null>(firstId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(
    () =>
      new Set(
        lessons.filter((lesson) => lesson.completed).map((lesson) => lesson.id),
      ),
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const toast = useToast();

  const activeIndex = lessons.findIndex((lesson) => lesson.id === activeId);
  const active = activeIndex >= 0 ? lessons[activeIndex] : null;
  const prevLesson = activeIndex > 0 ? lessons[activeIndex - 1] : undefined;
  const nextLesson = activeIndex >= 0 ? lessons[activeIndex + 1] : undefined;

  const trackable = lessons.filter((lesson) => !lesson.isPreview);
  const total = outline.totalLessons;
  const completedCount = trackable.filter((lesson) =>
    completed.has(lesson.id),
  ).length;
  const percent =
    total > 0 ? Math.min(100, Math.round((completedCount / total) * 100)) : 0;

  useEffect(() => {
    if (!activeId) return;
    const controller = new AbortController();
    fetch(`/api/learn/${outline.courseSlug}/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: activeId }),
      signal: controller.signal,
    }).catch(() => {
      // Opening a lesson is best-effort; the player stays usable if it fails.
    });
    return () => controller.abort();
  }, [activeId, outline.courseSlug]);

  const toggleComplete = useCallback(async () => {
    if (!active || saving) return;
    const previous = completed;
    const willComplete = !completed.has(active.id);
    const next = new Set(completed);
    if (willComplete) next.add(active.id);
    else next.delete(active.id);

    setCompleted(next);
    setSaving(true);
    setSaveError(null);

    try {
      const response = await fetch(
        `/api/learn/${outline.courseSlug}/progress`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId: active.id,
            completed: willComplete,
          }),
        },
      );
      if (!response.ok) throw new Error("save failed");
      toast.success({
        title: willComplete ? "Lesson completed" : "Marked as incomplete",
        description: willComplete
          ? "Nice work. Your progress is saved."
          : undefined,
      });
    } catch {
      // Roll back the optimistic update. The same button retries the save.
      setCompleted(previous);
      const reason = "We couldn't save your progress. Please try again.";
      setSaveError(reason);
      toast.error({ title: reason });
    } finally {
      setSaving(false);
    }
  }, [active, completed, outline.courseSlug, saving, toast]);

  const moduleLabels = moduleLabelsFor(
    outline.modules.map((module) => module.isOrientation)
  );
  const orientationIndex = outline.modules.findIndex(
    (module) => module.isOrientation
  );
  const orientationModule =
    orientationIndex >= 0 ? outline.modules[orientationIndex] : undefined;
  const courseModules = outline.modules.filter((module) => !module.isOrientation);
  const activeModule = outline.modules.find(
    (module) => module.id === active?.moduleId
  );
  const activeModuleLabel = activeModule
    ? moduleLabels[outline.modules.indexOf(activeModule)]
    : "";

  /** One accordion card. Rendered twice: once for orientation, once per module. */
  function renderModuleCard(module: ModuleView, label: string) {
    const doneCount = module.lessons.filter(
      (lesson) => completed.has(lesson.id) && !lesson.isPreview
    ).length;
    const isOrientation = module.isOrientation;
    return (
      <li
        key={module.id}
        className="overflow-hidden rounded-[12px] border border-neutral-300 bg-white"
      >
        <details
          className="group"
          open={module.lessons.some((lesson) => lesson.id === activeId)}
        >
          <summary
            className={cn(
              "flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 transition-colors duration-[var(--duration-fast)] hover:bg-lavender-200 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)] [&::-webkit-details-marker]:hidden",
              isOrientation ? "bg-terracotta-100" : "bg-lavender-100"
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-terracotta-600">
                {label}
              </span>
              <span className="mt-0.5 block text-sm font-bold text-neutral-950">
                {module.title}
              </span>
            </span>
            <span className="shrink-0 text-xs font-medium tabular-nums text-neutral-500">
              {doneCount}/{module.lessons.length}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 text-neutral-500 transition-transform duration-[var(--duration-fast)] group-open:rotate-180"
            />
          </summary>
          <ul className="space-y-1 p-2">
            {module.lessons.map((lesson) => {
              const isActive = lesson.id === activeId;
              const isDone = completed.has(lesson.id);
              const TypeIcon = LESSON_TYPE_ICON[lesson.type];
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(lesson.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-[10px] px-3 py-2 text-left transition-colors",
                      isActive ? "bg-terracotta-100" : "hover:bg-neutral-100"
                    )}
                  >
                    <TypeIcon
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        isActive
                          ? "text-terracotta-600"
                          : isDone
                            ? "text-success-600"
                            : "text-neutral-400"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-sm",
                          isActive
                            ? "font-semibold text-neutral-950"
                            : "text-neutral-700"
                        )}
                      >
                        {lesson.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-neutral-500">
                        {lessonKindLabel(lesson)}
                      </span>
                    </span>
                    {isDone ? (
                      <Check
                        aria-label="Completed"
                        className="mt-0.5 size-4 shrink-0 text-success-600"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </details>
      </li>
    );
  }

  if (!lessons.length) {
    return (
      <div className="mx-auto w-[98%] max-w-3xl px-6 py-24 text-center md:w-[min(83%,72rem)]">
        <PlayCircle
          aria-hidden="true"
          className="mx-auto h-12 w-12 text-neutral-300"
        />
        <h1 className="mt-6 text-2xl font-bold text-neutral-950">
          {outline.courseTitle}
        </h1>
        <p className="mt-3 text-neutral-500">
          Lessons for this course are being prepared. Check back soon.
        </p>
        <Link
          href="/account/courses"
          className={buttonStyles({ variant: "secondary", className: "mt-6" })}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to my courses
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper-50">
      <header className="border-b border-neutral-300 bg-white shrink-0">
        <div className="mx-auto flex w-[98%] flex-col gap-3 px-6 py-4 md:w-[min(90%,96rem)] md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/account/courses"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
              aria-label="Back to my courses"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-neutral-950">
                {outline.courseTitle}
              </p>
              <p className="text-xs text-neutral-500">
                {completedCount} of {total} lessons complete
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 md:w-72">
            <div
              className="h-2 flex-1 overflow-hidden rounded-pill bg-neutral-200"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Course progress"
            >
              <div
                className="h-full rounded-pill bg-terracotta-600 transition-[width] duration-[var(--duration-base)]"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="w-10 text-right text-sm font-semibold text-neutral-700">
              {percent}%
            </span>
          </div>
        </div>
        <div className="md:hidden px-6 pb-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 transition-colors"
            aria-expanded={sidebarOpen}
            aria-controls="mobile-curriculum"
            aria-label={sidebarOpen ? "Close curriculum" : "Open curriculum"}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-black/30 animate-fade-in"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="mx-auto grid w-[98%] flex-1 gap-8 px-6 py-8 md:w-[min(90%,96rem)] lg:grid-cols-[340px_1fr] min-h-0 overflow-hidden">
        <nav
          id="mobile-curriculum"
          aria-label="Course curriculum"
          className={cn(
            "order-2 rounded-[16px] border border-neutral-300 bg-white p-4 lg:order-1 lg:sticky lg:top-[6rem] max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin",
            sidebarOpen
              ? "md:hidden fixed inset-y-0 left-0 z-50 w-full max-w-[320px] shadow-xl animate-slide-in"
              : "hidden md:block"
          )}
        >
          {orientationModule ? (
            <section aria-labelledby="orientation-heading" className="mb-5">
              <h2
                id="orientation-heading"
                className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-terracotta-600"
              >
                Orientation
              </h2>
              <ol className="mt-2 space-y-3">
                {renderModuleCard(
                  orientationModule,
                  moduleLabels[orientationIndex]
                )}
              </ol>
            </section>
          ) : null}

          {courseModules.length ? (
            <section aria-labelledby="course-modules-heading">
              <h2
                id="course-modules-heading"
                className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500"
              >
                Course modules
              </h2>
              <ol className="mt-2 space-y-3">
                {courseModules.map((module) =>
                  renderModuleCard(
                    module,
                    moduleLabels[outline.modules.indexOf(module)]
                  )
                )}
              </ol>
            </section>
          ) : null}
        </nav>

        <main className="order-1 min-w-0 lg:order-2 overflow-y-auto max-h-[calc(100vh-6rem)] scrollbar-hide">
          {active ? (
            <article className="rounded-[16px] border border-neutral-300 bg-white p-5 md:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-terracotta-600">
                {activeModuleLabel} · {active.moduleTitle}
              </p>
              <h1 className="mt-2 text-2xl font-bold text-neutral-950 md:text-3xl">
                {active.title}
              </h1>

              <div className="mt-6">
                <LessonContent
                  lesson={active}
                  courseSlug={outline.courseSlug}
                />
              </div>

              {active.description ? (
                <div
                  className="rich-content mt-6 text-sm"
                  dangerouslySetInnerHTML={{ __html: active.description }}
                />
              ) : null}

              {saveError ? (
                <p className="mt-6 rounded-[10px] border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
                  {saveError}
                </p>
              ) : null}

              <div className="mt-8 flex flex-col gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={toggleComplete}
                  disabled={saving}
                  className={buttonStyles({
                    variant: "secondary",
                    className: completed.has(active.id)
                      ? "border-transparent bg-lavender-100 text-ink-800 hover:bg-lavender-200"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100",
                  })}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border",
                      completed.has(active.id)
                        ? "border-terracotta-600 bg-terracotta-600 text-white"
                        : "border-current",
                    )}
                    aria-hidden="true"
                  >
                    {completed.has(active.id) ? (
                      <Check className="h-3 w-3" />
                    ) : null}
                  </span>
                  {saving
                    ? "Saving…"
                    : completed.has(active.id)
                      ? "Completed"
                      : "Mark as complete"}
                </button>
              </div>

              <nav
                aria-label="Lesson navigation"
                className="mt-5 grid grid-cols-2 gap-3"
              >
                <div className="flex flex-col items-start gap-1.5">
                  {prevLesson ? (
                    <button
                      type="button"
                      onClick={() => setActiveId(prevLesson.id)}
                      className={buttonStyles({
                        variant: "secondary",
                        className:
                          "border-transparent bg-lavender-100 text-ink-800 hover:bg-lavender-200",
                      })}
                    >
                      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                      Previous
                    </button>
                  ) : null}
                  {prevLesson ? (
                    <span className="line-clamp-2 text-xs text-neutral-500">
                      {prevLesson.title}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1.5 text-right">
                  {nextLesson ? (
                    <button
                      type="button"
                      onClick={() => setActiveId(nextLesson.id)}
                      className={buttonStyles({ variant: "primary" })}
                    >
                      Next
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </button>
                  ) : null}
                  {nextLesson ? (
                    <span className="line-clamp-2 text-xs text-terracotta-600">
                      {nextLesson.title}
                    </span>
                  ) : null}
                </div>
              </nav>
            </article>
          ) : (
            <div className="rounded-[16px] border border-neutral-300 bg-white p-10 text-center">
              <p className="text-neutral-500">
                Pick a lesson from the curriculum to begin.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function LessonContent({
  lesson,
  courseSlug,
}: {
  lesson: LessonView;
  courseSlug: string;
}) {
  if (lesson.type === "VIDEO") {
    const videoId = lesson.youtubeUrl ? parseId(lesson.youtubeUrl) : "";
    if (!videoId) {
      return <MissingSource label="This video is unavailable right now." />;
    }
    return <YouTubePlayer videoId={videoId} title={lesson.title} />;
  }

  if (lesson.type === "DOCUMENT") {
    if (!lesson.documentUrl) {
      return <MissingSource label="This document is unavailable right now." />;
    }
    const documentHref = `/api/learn/${encodeURIComponent(courseSlug)}/document?lessonId=${encodeURIComponent(lesson.id)}`;
    return (
      <div className="w-full">
        <div className="flex flex-col gap-4 rounded-[12px] border border-neutral-200 bg-paper-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-lavender-100 text-ink-700">
              <FileText aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-neutral-950">
                {lesson.documentFileName || "Course document"}
              </p>
              {lesson.documentSizeBytes ? (
                <p className="text-xs text-neutral-500">
                  {formatBytes(lesson.documentSizeBytes)}
                </p>
              ) : (
                <p className="text-xs text-neutral-500">
                  Download this lesson&apos;s document.
                </p>
              )}
            </div>
          </div>
          <a
            href={documentHref}
            download={lesson.documentFileName || "document"}
            className={buttonStyles({ variant: "primary" })}
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            Download
          </a>
        </div>
      </div>
    );
  }

  if (lesson.type === "LINK") {
    if (!lesson.linkUrl) {
      return <MissingSource label="This resource is unavailable right now." />;
    }
    return (
      <a
        href={lesson.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-start gap-4 rounded-[12px] border border-neutral-200 bg-paper-50 p-5 transition-colors hover:bg-neutral-100 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-lavender-100 text-ink-700">
            <Link2 aria-hidden="true" className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-neutral-950">
            Open this lesson&apos;s resource
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-terracotta-600">
          Visit
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
        </span>
      </a>
    );
  }

  return <MissingSource label="This lesson is unavailable right now." />;
}

function MissingSource({ label }: { label: string }) {
  return (
    <div className="rounded-[12px] border border-neutral-200 bg-paper-50 px-5 py-10 text-center text-sm text-neutral-500">
      {label}
    </div>
  );
}

function parseId(url: string): string {
  // The admin validation guarantees a single-video YouTube URL; re-extract here
  // so the client never interpolates an unvalidated URL into the iframe.
  const match = url.match(
    /(?:v=|\/embed\/|\/shorts\/|\/live\/|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return match ? match[1] : "";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
