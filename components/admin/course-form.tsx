"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Trash2, UploadCloud } from "lucide-react";

import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { ThumbnailUpload } from "@/components/admin/thumbnail-upload";
import { PRODUCT_STATUSES, CURRICULUM_MAX_BYTES } from "@/types/product";

const fieldClasses =
  "mt-2 w-full rounded-[12px] border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-950 placeholder-neutral-300 transition-colors duration-[var(--duration-fast)] focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]";

interface BundleChoice {
  id: string;
  title: string;
  slug: string;
  status: string;
}

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
    bundleCourseIds?: string[];
    courseDetails?: {
      instructor?: string;
      instructorImageUrl?: string;
      instructorUrl?: string;
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
    curriculum?: { fileName?: string; size?: number } | null;
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

export function CourseForm({
  initial,
  bundleChoices = [],
}: CourseFormData & { bundleChoices?: BundleChoice[] }) {
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
  const [instructorImageUrl, setInstructorImageUrl] = useState(
    cd?.instructorImageUrl ?? ""
  );
  const [instructorUrl, setInstructorUrl] = useState(cd?.instructorUrl ?? "");
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
  const [bundleCourseIds, setBundleCourseIds] = useState<string[]>(
    initial?.bundleCourseIds ?? []
  );

  const curriculumInputRef = useRef<HTMLInputElement>(null);
  const [curriculumFile, setCurriculumFile] = useState<File | null>(null);
  const [removeCurriculum, setRemoveCurriculum] = useState(false);
  const [curriculumBusy, setCurriculumBusy] = useState(false);
  const [curriculumError, setCurriculumError] = useState("");

  const savedCurriculum =
    !removeCurriculum && initial?.curriculum?.fileName
      ? initial.curriculum
      : null;

  function handleCurriculumFile(file: File) {
    setCurriculumError("");
    const isPdf =
      file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      setCurriculumError("Please choose a PDF file.");
      return;
    }
    if (file.size > CURRICULUM_MAX_BYTES) {
      setCurriculumError("Curriculum PDF must be under 10 MB.");
      return;
    }
    setCurriculumFile(file);
    setRemoveCurriculum(false);
    if (curriculumInputRef.current) curriculumInputRef.current.value = "";
  }

  function toggleBundleCourse(id: string, checked: boolean) {
    setBundleCourseIds((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((courseId) => courseId !== id)
    );
  }

  const bundleOptions = bundleChoices.filter(
    (course) => course.id !== initial?.id
  );
  const bundleCheckedChoices = bundleOptions.filter((course) =>
    bundleCourseIds.includes(course.id)
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
        instructorImageUrl: instructorImageUrl || undefined,
        instructorUrl: instructorUrl || undefined,
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
      bundleCourseIds,
    };

    setSaving(true);
    setCurriculumError("");
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

      const courseId = editing ? initial?.id : (json.data?.id as string);
      if (!courseId) {
        throw new Error("Could not resolve the course id after saving");
      }

      if (removeCurriculum) {
        setCurriculumBusy(true);
        const rmResponse = await fetch(
          `/api/admin/courses/${courseId}/curriculum`,
          { method: "DELETE" }
        );
        const rmJson = await rmResponse.json();
        if (!rmJson.ok) {
          throw new Error(rmJson.error?.message ?? "Could not remove curriculum");
        }
        setCurriculumFile(null);
        setRemoveCurriculum(false);
      } else if (curriculumFile) {
        setCurriculumBusy(true);
        const form = new FormData();
        form.append("file", curriculumFile);
        const upResponse = await fetch(
          `/api/admin/courses/${courseId}/curriculum`,
          { method: "PUT", body: form }
        );
        const upJson = await upResponse.json();
        if (!upJson.ok) {
          throw new Error(upJson.error?.message ?? "Could not upload curriculum");
        }
        setCurriculumFile(null);
      }

      router.push("/admin/courses");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save course";
      setError(message);
      if (curriculumFile || removeCurriculum) setCurriculumError(message);
      setSaving(false);
      setCurriculumBusy(false);
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
            <ThumbnailUpload
              id="c-thumb"
              label="Cover image"
              value={thumbnailUrl}
              onChange={setThumbnailUrl}
              help="Used on the course card and detail page. Leave empty to use the generated artwork."
              expected="1280 × 720 pixels (16:9)"
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
            <label
              htmlFor="c-instructor-url"
              className="text-sm font-medium text-neutral-700"
            >
              Instructor profile link
            </label>
            <input
              id="c-instructor-url"
              type="url"
              value={instructorUrl}
              onChange={(e) => setInstructorUrl(e.target.value)}
              placeholder="https://linkedin.com/in/…"
              className={fieldClasses}
            />
          </div>
          <div className="md:col-span-2">
            <ThumbnailUpload
              id="c-instructor-photo"
              label="Instructor photo"
              aspect="square"
              value={instructorImageUrl}
              onChange={setInstructorImageUrl}
              help="Shown beside the instructor name on the public course page. Leave empty to show a simple icon."
              expected="square portrait"
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

      <section className="rounded-[16px] border border-neutral-300 bg-white p-6">
        <h2 className="text-lg font-bold text-neutral-950">
          Curriculum (PDF)
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Upload the full course curriculum as a PDF. Visitors can download it
          from the public course page. PDFs up to 10 MB.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <input
            ref={curriculumInputRef}
            id="c-curriculum"
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleCurriculumFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => curriculumInputRef.current?.click()}
            disabled={curriculumBusy || saving}
            className="inline-flex items-center gap-2 rounded-pill border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors duration-[var(--duration-fast)] hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-50"
          >
            {curriculumBusy ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud aria-hidden="true" className="h-4 w-4 text-terracotta-600" />
            )}
            {curriculumBusy
              ? "Uploading…"
              : savedCurriculum || curriculumFile
                ? "Replace curriculum"
                : "Choose curriculum PDF"}
          </button>
          {curriculumFile ? (
            <button
              type="button"
              onClick={() => {
                setCurriculumFile(null);
                setCurriculumError("");
                if (curriculumInputRef.current) curriculumInputRef.current.value = "";
              }}
              disabled={curriculumBusy || saving}
              className="text-sm font-semibold text-neutral-500 hover:text-neutral-700 disabled:pointer-events-none disabled:opacity-50"
            >
              Clear
            </button>
          ) : null}
          {savedCurriculum || curriculumFile ? (
            <button
              type="button"
              onClick={() => {
                setRemoveCurriculum(true);
                setCurriculumFile(null);
                setCurriculumError("");
                if (curriculumInputRef.current) curriculumInputRef.current.value = "";
              }}
              disabled={curriculumBusy || saving}
              className="inline-flex items-center gap-1.5 rounded-pill border border-danger-600 px-4 py-2.5 text-sm font-semibold text-danger-600 transition-colors duration-[var(--duration-fast)] hover:bg-danger-100 disabled:pointer-events-none disabled:opacity-50"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Remove
            </button>
          ) : null}
        </div>
        {curriculumFile ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
            <FileText aria-hidden="true" className="h-4 w-4 text-terracotta-600" />
            {curriculumFile.name}{" "}
            <span className="text-neutral-400">
              ({(curriculumFile.size / 1024 / 1024).toFixed(2)} MB) — will be
              uploaded when saved
            </span>
          </p>
        ) : savedCurriculum ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
            <FileText aria-hidden="true" className="h-4 w-4 text-terracotta-600" />
            {savedCurriculum.fileName}
            {savedCurriculum.size ? (
              <span className="text-neutral-400">
                ({(savedCurriculum.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            ) : null}
          </p>
        ) : null}
        {removeCurriculum ? (
          <p className="mt-3 text-sm text-danger-600">
            The current curriculum will be removed when you save.
          </p>
        ) : null}
        {curriculumError ? (
          <p role="alert" className="mt-2 text-sm text-danger-600">
            {curriculumError}
          </p>
        ) : null}
      </section>

      <section className="rounded-[16px] border border-neutral-300 bg-white p-6">
        <h2 className="text-lg font-bold text-neutral-950">Relational bundle</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Tick the courses you want to give away as a bonus. When a customer
          pays for this course they are automatically enrolled into every
          course selected here — at no extra cost. They will see these listed
          as bonus courses on the course page and in their confirmation email.
          The bonus courses are never counted as a separate purchase.
        </p>
        {bundleCheckedChoices.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-400">
            No courses selected. Buyers only get this course.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {bundleCheckedChoices.map((choice) => (
              <li key={choice.id} className="text-sm text-neutral-700">
                {choice.title}
              </li>
            ))}
          </ul>
        )}
        <fieldset className="mt-5">
          <legend className="sr-only">Bonus courses to include in this bundle</legend>
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-[12px] border border-neutral-200 p-3">
            {bundleOptions.length === 0 ? (
              <p className="px-1 py-2 text-sm text-neutral-400">
                No other courses available to bundle yet.
              </p>
            ) : (
              bundleOptions.map((course) => {
                const checked = bundleCourseIds.includes(course.id);
                return (
                  <label
                    key={course.id}
                    className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-neutral-200 bg-neutral-50 px-3 py-2.5 transition-colors hover:bg-neutral-100"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleBundleCourse(course.id, e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 text-terracotta-600 focus:ring-terracotta-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-neutral-950">
                        {course.title}
                      </span>
                      <span className="block truncate text-xs text-neutral-400">
                        /{course.slug}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        course.status === "PUBLISHED"
                          ? "bg-success-100 text-success-600"
                          : "bg-warning-100 text-warning-600"
                      }`}
                    >
                      {course.status === "PUBLISHED" ? "Published" : "Draft"}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </fieldset>
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
