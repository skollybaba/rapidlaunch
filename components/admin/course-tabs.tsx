"use client";

import { useState, type ComponentProps } from "react";
import { Info, ListTree } from "lucide-react";

import { CourseBuilder } from "@/components/admin/course-builder";
import { CourseForm } from "@/components/admin/course-form";
import { cn } from "@/lib/utils";

type CourseFormProps = ComponentProps<typeof CourseForm>;
type CourseBuilderProps = ComponentProps<typeof CourseBuilder>;

type TabId = "information" | "curriculum";

const TABS: { id: TabId; label: string; icon: typeof Info }[] = [
  { id: "information", label: "Course information", icon: Info },
  { id: "curriculum", label: "Course curriculum", icon: ListTree },
];

export function CourseTabs({
  courseId,
  initial,
  bundleChoices,
  modules,
}: {
  courseId: string;
  initial: CourseFormProps["initial"];
  bundleChoices: CourseFormProps["bundleChoices"];
  modules: CourseBuilderProps["initialModules"];
}) {
  const [active, setActive] = useState<TabId>("information");

  return (
    <div>
      <div className="border-b border-neutral-300">
        <div role="tablist" aria-label="Course editor" className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`course-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`course-panel-${tab.id}`}
                onClick={() => setActive(tab.id)}
                className={cn(
                  "relative inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors",
                  selected
                    ? "text-terracotta-600"
                    : "text-neutral-500 hover:text-neutral-800"
                )}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {tab.label}
                {selected ? (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-terracotta-600" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`course-panel-${active}`}
        aria-labelledby={`course-tab-${active}`}
        className="mt-6"
      >
        {active === "information" ? (
          <CourseForm initial={initial} bundleChoices={bundleChoices} />
        ) : (
          <CourseBuilder courseId={courseId} initialModules={modules} />
        )}
      </div>
    </div>
  );
}
