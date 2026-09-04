"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { PRODUCT_STATUSES } from "@/types/product";

const fieldClasses =
  "mt-2 w-full rounded-[12px] border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-950 placeholder-neutral-300 transition-colors duration-[var(--duration-fast)] focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]";

interface CourseFormData {
  initial?: {
    id?: string;
    title?: string;
    slug?: string;
    shortDescription?: string;
    description?: string;
    status?: string;
    currency?: string;
    priceMinor?: number;
    fulfillmentMode?: string;
    thumbnailUrl?: string;
    featured?: boolean;
    courseDetails?: {
      instructor?: string;
      durationMinutes?: number;
      level?: string;
      audience?: string[];
      outcomes?: string[];
      syllabus?: string[];
      classroomCourseId?: string;
      courseJoinUrl?: string;
      enrollmentMode?: string;
      accessInstructions?: string;
    } | null;
  } | null;
}

function listToText(list?: string[]) {
  return (list ?? []).join("\n");
}

const textToList = (value: string) =>
  value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

export function CourseForm({ initial }: CourseFormData) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const priceNaira = initial?.priceMinor ? Number(initial.priceMinor) / 100 : 0;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [shortDescription, setShortDescription] = useState(
    initial?.shortDescription ?? ""
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState(initial?.status ?? "DRAFT");
  const [fulfillmentMode, setFulfillmentMode] = useState(
    initial?.fulfillmentMode ?? "CLASSROOM"
  );
  const [price, setPrice] = useState(priceNaira ? String(priceNaira) : "");
  const [thumbnailUrl, setThumbnailUrl] = useState(initial?.thumbnailUrl ?? "");
  const [featured, setFeatured] = useState(initial?.featured ?? false);

  const cd = initial?.courseDetails;
  const [instructor, setInstructor] = useState(cd?.instructor ?? "");
  const [durationMinutes, setDurationMinutes] = useState(
    cd?.durationMinutes ? String(cd.durationMinutes) : ""
  );
  const [level, setLevel] = useState(cd?.level ?? "BEGINNER");
  const [audience, setAudience] = useState(listToText(cd?.audience));
  const [outcomes, setOutcomes] = useState(listToText(cd?.outcomes));
  const [syllabus, setSyllabus] = useState(listToText(cd?.syllabus));
  const [classroomCourseId, setClassroomCourseId] = useState(
    cd?.classroomCourseId ?? ""
  );
  const [courseJoinUrl, setCourseJoinUrl] = useState(cd?.courseJoinUrl ?? "");
  const [enrollmentMode, setEnrollmentMode] = useState(
    cd?.enrollmentMode ?? "AUTOMATIC"
  );
  const [accessInstructions, setAccessInstructions] = useState(
    cd?.accessInstructions ?? ""
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");

    const priceNum = Number(price) || 0;
    if (priceNum <= 0) {
      setError("Please enter a price in naira (0 allowed only for free/external courses).");
      return;
    }

    const payload = {
      title,
      slug,
      shortDescription: shortDescription || undefined,
      description,
      status,
      fulfillmentMode: fulfillmentMode || undefined,
      priceMinor: Math.round(priceNum * 100),
      currency: "NGN",
      thumbnailUrl: thumbnailUrl || undefined,
      featured,
      courseDetails: {
        instructor: instructor || undefined,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
        level,
        audience: textToList(audience),
        outcomes: textToList(outcomes),
        syllabus: textToList(syllabus),
        classroomCourseId: classroomCourseId || undefined,
        courseJoinUrl: courseJoinUrl || undefined,
        enrollmentMode,
        accessInstructions: accessInstructions || undefined,
      },
    };

    setSaving(true);
    try {
      const response = await fetch(
        editing ? `/api/admin/courses/${initial?.id}` : "/api/admin/courses",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Could not save course");
      }
      router.push("/admin/courses");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save course");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <section className="rounded-[16px] border border-neutral-300 bg-white p-6">
        <h2 className="text-lg font-bold text-neutral-950">Basics</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="c-title" className="text-sm font-medium text-neutral-700">
              Title *
            </label>
            <input
              id="c-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldClasses}
            />
          </div>
          <div>
            <label htmlFor="c-slug" className="text-sm font-medium text-neutral-700">
              Slug *
            </label>
            <input
              id="c-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-course-slug"
              className={fieldClasses}
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="c-short" className="text-sm font-medium text-neutral-700">
              Short description
            </label>
            <input
              id="c-short"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className={fieldClasses}
            />
          </div>
          <div>
            <label htmlFor="c-status" className="text-sm font-medium text-neutral-700">
              Status
            </label>
            <select
              id="c-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={fieldClasses}
            >
              {PRODUCT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="c-price" className="text-sm font-medium text-neutral-700">
              Price (NGN)
            </label>
            <input
              id="c-price"
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={fieldClasses}
            />
          </div>
          <div>
            <label htmlFor="c-fulfill" className="text-sm font-medium text-neutral-700">
              Fulfillment mode
            </label>
            <select
              id="c-fulfill"
              value={fulfillmentMode}
              onChange={(e) => setFulfillmentMode(e.target.value)}
              className={fieldClasses}
            >
              <option value="CLASSROOM">Classroom</option>
              <option value="DOWNLOAD">Download</option>
              <option value="EXTERNAL">External</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="c-thumb" className="text-sm font-medium text-neutral-700">
              Thumbnail URL
            </label>
            <input
              id="c-thumb"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              className={fieldClasses}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-terracotta-600 focus:ring-terracotta-600"
            />
            Featured course
          </label>
        </div>
      </section>

      <section className="rounded-[16px] border border-neutral-300 bg-white p-6">
        <h2 className="text-lg font-bold text-neutral-950">Description</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Use the editor to format the course description.
        </p>
        <div className="mt-4">
          <RichTextEditor value={description} onChange={setDescription} />
        </div>
      </section>

      <section className="rounded-[16px] border border-neutral-300 bg-white p-6">
        <h2 className="text-lg font-bold text-neutral-950">Course details</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="c-instructor" className="text-sm font-medium text-neutral-700">
              Instructor
            </label>
            <input
              id="c-instructor"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              className={fieldClasses}
            />
          </div>
          <div>
            <label htmlFor="c-duration" className="text-sm font-medium text-neutral-700">
              Duration (minutes)
            </label>
            <input
              id="c-duration"
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className={fieldClasses}
            />
          </div>
          <div>
            <label htmlFor="c-level" className="text-sm font-medium text-neutral-700">
              Level
            </label>
            <select
              id="c-level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className={fieldClasses}
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </div>
          <div>
            <label htmlFor="c-classroom" className="text-sm font-medium text-neutral-700">
              Classroom course ID
            </label>
            <input
              id="c-classroom"
              value={classroomCourseId}
              onChange={(e) => setClassroomCourseId(e.target.value)}
              className={fieldClasses}
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="c-join" className="text-sm font-medium text-neutral-700">
              Course join URL
            </label>
            <input
              id="c-join"
              value={courseJoinUrl}
              onChange={(e) => setCourseJoinUrl(e.target.value)}
              className={fieldClasses}
            />
          </div>
          <div>
            <label htmlFor="c-enrollmode" className="text-sm font-medium text-neutral-700">
              Enrollment mode
            </label>
            <select
              id="c-enrollmode"
              value={enrollmentMode}
              onChange={(e) => setEnrollmentMode(e.target.value)}
              className={fieldClasses}
            >
              <option value="AUTOMATIC">Automatic</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="c-audience" className="text-sm font-medium text-neutral-700">
              Audience (one per line)
            </label>
            <textarea
              id="c-audience"
              rows={4}
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className={fieldClasses}
            />
          </div>
          <div>
            <label htmlFor="c-outcomes" className="text-sm font-medium text-neutral-700">
              Outcomes (one per line)
            </label>
            <textarea
              id="c-outcomes"
              rows={4}
              value={outcomes}
              onChange={(e) => setOutcomes(e.target.value)}
              className={fieldClasses}
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="c-syllabus" className="text-sm font-medium text-neutral-700">
              Syllabus (one item per line)
            </label>
            <textarea
              id="c-syllabus"
              rows={5}
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              className={fieldClasses}
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="c-access" className="text-sm font-medium text-neutral-700">
              Access instructions
            </label>
            <textarea
              id="c-access"
              rows={3}
              value={accessInstructions}
              onChange={(e) => setAccessInstructions(e.target.value)}
              className={fieldClasses}
            />
          </div>
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
          {saving ? "Saving…" : editing ? "Save changes" : "Create course"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/courses")}
          className="rounded-pill border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
